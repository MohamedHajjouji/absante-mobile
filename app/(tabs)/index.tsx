import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n/language-context';
import { getUnreadNotificationCount } from '@/lib/services/notification-service';
import {
  getUserProfile,
  getPatientByProfileId,
  getNextAppointment,
  getProfessions,
  searchProviders,
  getPatientStats,
  UserProfile,
  PatientAppointment,
  SearchResultProvider,
} from '@/lib/services/patient-service';
import { getSpecialties, Specialty } from '@/lib/services/specialties-service';

type IonIconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: [string, IonIconName][] = [
  ["cardio", "heart"],
  ["ophtal", "eye"],
  ["ocul", "eye"],
  ["orl", "ear"],
  ["oto-rhino", "ear"],
  ["neuro", "pulse"],
  ["dermat", "color-palette"],
  ["pediatr", "body"],
  ["pediatre", "body"],
  ["gynec", "woman"],
  ["dent", "happy"],
  ["stomat", "happy"],
  ["orthodont", "happy"],
  ["pharmac", "bandage"],
  ["infirm", "medical"],
  ["kine", "fitness"],
  ["osteo", "body"],
  ["psy", "chatbubbles"],
  ["radio", "scan"],
  ["chirurg", "medkit"],
  ["generaliste", "medkit"],
  ["urgent", "alarm"],
  ["sage-femme", "heart"],
  ["nutrition", "nutrition"],
  ["clinique", "business"],
  ["domicile", "home"],
  ["fourniture", "cube"],
  ["médecin", "heart"],
  ["medecin", "heart"],
];

function categoryIcon(name: string): IonIconName {
  const n = name.toLowerCase();
  const hit = CATEGORY_ICONS.find(([key]) => n.includes(key));
  return hit ? hit[1] : "medkit";
}

function formatApptDate(iso: string, tag: string, todayLabel: string, tomorrowLabel: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `${todayLabel} · ${time}`;
  if (isTomorrow) return `${tomorrowLabel} · ${time}`;
  return d.toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, localeTag, lang } = useLanguage();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nextAppt, setNextAppt] = useState<PatientAppointment | null>(null);
  const [professions, setProfessions] = useState<{ id: string; name: string }[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [popular, setPopular] = useState<SearchResultProvider[]>([]);
  const [stats, setStats] = useState({ appointmentCount: 0, doctorCount: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Public content loads for everyone (guests included).
      const [profs, specs, providers] = await Promise.all([
        getProfessions(),
        getSpecialties(12),
        searchProviders({ limit: 8 }),
      ]);
      setProfessions(profs);
      setSpecialties(specs);
      setPopular(providers);

      // Personal content requires a session.
      if (user?.id) {
        const [p, unread] = await Promise.all([
          getUserProfile(user.id),
          getUnreadNotificationCount(user.id),
        ]);
        setProfile(p);
        setUnreadCount(unread);

        const patient = await getPatientByProfileId(user.id);
        if (patient) {
          const [next, s] = await Promise.all([
            getNextAppointment(patient.id),
            getPatientStats(patient.id),
          ]);
          setNextAppt(next);
          setStats(s);
        }
      } else {
        setProfile(null);
        setNextAppt(null);
        setUnreadCount(0);
        setStats({ appointmentCount: 0, doctorCount: 0 });
      }
    } catch (e) {
      // Offline / backend unreachable: keep whatever is on screen instead of
      // leaving pull-to-refresh stuck. Individual screens show retry UI.
      console.error('Failed to load home data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const firstName = profile?.firstName || 'Bienvenue';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : firstName;  const avatarUri =
    profile?.avatarUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&color=ffffff&background=F53E8A`;

  const isGuest = !user?.id;
  // Guests are sent to login when tapping personal shortcuts.
  const gate = (href: '/(tabs)/rdv' | '/(tabs)/profile' | '/notifications') => () =>
    router.push(isGuest ? '/(auth)/welcome' : href);

  const quickActions: {
    key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; onPress: () => void;
  }[] = [
    { key: 'search', label: t('home.quickSearch'), icon: 'search', color: '#F53E8A', bg: '#FDF2F8', onPress: () => router.push('/(tabs)/search') },
    { key: 'rdv', label: t('home.quickRdv'), icon: 'calendar', color: '#0D61B6', bg: '#ECF2FA', onPress: gate('/(tabs)/rdv') },
    { key: 'notif', label: t('home.quickNotif'), icon: 'notifications', color: '#F59E0B', bg: '#FFFBEB', onPress: gate('/notifications') },
    { key: 'profile', label: isGuest ? t('home.quickLogin') : t('home.quickProfile'), icon: 'person', color: '#10B981', bg: '#ECFDF5', onPress: gate('/(tabs)/profile') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      {/* Atmospheric backdrop */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#FCE7F3', 'rgba(252,231,243,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.backdropGradient}
        />
        <View style={styles.backdropBlobPink} />
        <View style={styles.backdropBlobBlue} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 124 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} className="flex-row items-center justify-between px-5  pt-4">
          <BrandLogo variant="navbar" width={48} height={48} />
          {isGuest ? (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/welcome')}
              className="flex-row items-center rounded-full bg-primary px-5 py-2.5"
              activeOpacity={0.85}
            >
              <Text className="text-sm font-semibold text-white">{t('home.quickLogin')}</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                className="h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white shadow-soft"
                activeOpacity={0.8}
              >
                {unreadCount > 0 && (
                  <View className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 shadow-soft">
                    <Text className="text-[10px] font-bold leading-3 text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
                <Ionicons name="notifications-outline" size={20} color="#3D4B64" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <View className="rounded-full border border-hairline bg-white p-[3px] shadow-soft">
                  <Image source={{ uri: avatarUri }} className="h-11 w-11 rounded-full" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} className="mt-5 px-5">
          <Text className="text-[26px] font-semibold tracking-[-0.3px] text-dark">
            {isGuest ? t('home.helloGuest') : t('home.hello', { name: firstName })}
          </Text>
          <Text className="mt-1 text-sm font-medium text-grayText">
            {t('home.subtitle')}
          </Text>
        </Animated.View>

        {/* Search pill */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)} className="px-5 mt-4">
          <Pressable
            className="flex-row items-center rounded-[32px] border border-hairline bg-white px-5 py-4 shadow-pill"
            style={({ pressed }) => pressed && { opacity: 0.8 }}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="search" size={18} color="#6a6a6a" />
            <Text className="ml-3 flex-1 text-sm font-medium text-[#929292]">
              {t('home.searchPh')}
            </Text>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        </Animated.View>

        {/* Hero card — next appointment or CTA */}
        <Animated.View entering={FadeInDown.delay(140).duration(450)} className="mx-5 mt-6">
          {nextAppt ? (
            <LinearGradient
              colors={['#F472B6', '#F53E8A', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <View className="absolute -bottom-10 right-20 h-28 w-28 rounded-full bg-white/10" />
              <View className="p-5">
                <View className="flex-row items-center">
                  <View className="flex-row items-center rounded-full bg-white/20 px-3 py-1.5">
                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                    <Text className="text-[11px] font-semibold text-white">{t('home.nextAppt')}</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row items-center">
                  <View className="flex-1 pr-3">
                    <Text className="text-[22px] font-semibold text-white" numberOfLines={1}>
                      {nextAppt.providerName}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons name="time-outline" size={14} color="#FCE7F3" />
                      <Text className="text-sm font-medium text-pink-100">
                        {formatApptDate(nextAppt.startsAt, localeTag, t('home.today'), t('home.tomorrow'))}
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Ionicons name="medkit-outline" size={13} color="#FCE7F3" />
                      <Text className="text-sm font-medium text-pink-100" numberOfLines={1}>
                        {nextAppt.serviceName}
                        {nextAppt.price != null ? ` · ${nextAppt.price} MAD` : ''}
                      </Text>
                    </View>
                  </View>
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Ionicons name="calendar" size={26} color="#FFFFFF" />
                  </View>
                </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/rdv')}
                    className="mt-5 self-start rounded-full bg-white px-5 py-2.5"
                    activeOpacity={0.85}
                  >
                    <Text className="text-sm font-semibold text-primary">{t('home.viewAppt')}</Text>
                  </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#FFFFFF', '#FDF2F8']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroCardEmpty}
            >
              <View className="flex-row items-center p-5">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-success" />
                    <Text className="text-xs font-semibold text-success">{t('home.welcomeTag')}</Text>
                  </View>
                  <Text className="mt-2 text-lg font-semibold text-dark">
                    {t('home.emptyTitle')}
                  </Text>
                  <Text className="mt-1 text-sm font-medium text-grayText">
                    {t('home.emptyBody')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/search')}
                    className="mt-4 self-start rounded-full bg-primary px-5 py-2.5"
                    activeOpacity={0.85}
                  >
                    <Text className="text-sm font-semibold text-white">{t('common.search')}</Text>
                  </TouchableOpacity>
                </View>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft">
                  <Ionicons name="search" size={26} color="#F53E8A" />
                </View>
              </View>
            </LinearGradient>
          )}
        </Animated.View>

        {/* Stats strip — signed-in users only */}
        {!isGuest && (
        <Animated.View entering={FadeInDown.delay(200).duration(450)} className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="calendar" size={16} color="#F53E8A" />
            </View>
            <Text className="mt-2.5 text-lg font-semibold text-dark">{stats.appointmentCount}</Text>
            <Text className="text-[11px] font-medium text-grayText">{t('home.statsAppts')}</Text>
          </View>
          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary-tone-50">
              <Ionicons name="medkit" size={16} color="#0D61B6" />
            </View>
            <Text className="mt-2.5 text-lg font-semibold text-dark">{stats.doctorCount}</Text>
            <Text className="text-[11px] font-medium text-grayText">{t('home.statsDoctors')}</Text>
          </View>
          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-success-50">
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            </View>
            <Text className="mt-2.5 text-sm font-semibold text-dark">{t('home.statsActive')}</Text>
            <Text className="text-[11px] font-medium text-grayText">{t('home.statsStatus')}</Text>
          </View>
        </Animated.View>
        )}

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(260).duration(450)} className="mt-7 px-5">
          <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
            {t('home.quickTitle')}
          </Text>
          <View className="mt-5 flex-row justify-between">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                onPress={action.onPress}
                className="items-center"
                activeOpacity={0.8}
              >
                <View className="h-16 w-16 items-center justify-center rounded-full border border-hairline bg-white shadow-panel">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: action.bg }}
                  >
                    <Ionicons name={action.icon} size={20} color={action.color} />
                  </View>
                </View>
                <Text className="mt-2 text-xs font-medium text-dark">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Categories — specialties first (same source as web), professions fallback */}
        <Animated.View entering={FadeInDown.delay(320).duration(450)} className="mt-8">
          <View className="flex-row items-center justify-between px-5">
            <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
              {t('home.catsTitle')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text className="text-sm font-medium text-dark underline">{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16, marginTop: 14 }}
          >
            {(specialties.length > 0
              ? specialties.slice(0, 8).map((s) => ({ id: s.id, name: lang === 'ar' ? s.name_ar || s.name_fr : s.name_fr, slug: s.slug }))
              : professions.slice(0, 8).map((prof) => ({ id: prof.id, name: prof.name, slug: undefined as string | undefined }))
            ).map((cat) => (
              <Pressable
                key={cat.id}
                className="flex-col items-center"
                style={({ pressed }) => pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }}
                onPress={() =>
                  (cat as any).slug
                    ? router.push({ pathname: '/(tabs)/search', params: { specialty: (cat as any).slug } })
                    : router.push('/(tabs)/search')
                }
              >
                <LinearGradient
                  colors={['#FBCFE8', '#F9A8D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryCircle}
                >
                  <Ionicons name={categoryIcon(cat.name)} size={24} color="#F53E8A" />
                </LinearGradient>
                <Text className="mt-2 w-[76px] text-center text-xs font-semibold leading-4 text-dark" numberOfLines={2}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Popular Doctors */}
        {popular.length > 0 && (
          <Animated.View entering={FadeInDown.delay(380).duration(450)} className="mt-8">
            <View className="flex-row items-center justify-between px-5">
              <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
                {t('home.popular')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <Text className="text-sm font-medium text-dark underline">{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14, marginTop: 12 }}
            >
              {popular.map((doc) => (
                <Pressable
                  key={doc.id}
                  className="w-56 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel"
                  style={({ pressed }) => pressed && { opacity: 0.9 }}
                  onPress={() => router.push(`/doctor/${doc.id}`)}
                >
                  <View className="h-28 items-center justify-center bg-primary-50">
                    <Ionicons name="person" size={48} color="#F53E8A" />
                    <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-white px-2 py-1 shadow-pill">
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text className="text-xs font-semibold text-dark">{(doc.rating ?? 0).toFixed(1)}</Text>
                    </View>
                  </View>
                  <View className="p-3">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="shield-checkmark" size={13} color="#0D61B6" />
                      <Text className="text-xs font-medium text-secondary-tone">{t('home.verified')}</Text>
                    </View>
                    <Text className="mt-1.5 text-sm font-semibold text-dark" numberOfLines={1}>
                      Dr {doc.firstName} {doc.lastName}
                    </Text>
                    <Text className="mt-0.5 text-xs font-medium text-grayText">{doc.specialty}</Text>
                    {doc.city && (
                      <View className="mt-1 flex-row items-center gap-1">
                        <Ionicons name="location-outline" size={12} color="#929292" />
                        <Text className="text-xs text-grayText">{doc.city}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      className="mt-2.5 self-start rounded-lg bg-primary px-4 py-2"
                      activeOpacity={0.8}
                      onPress={() => router.push(`/doctor/${doc.id}`)}
                    >
                      <Text className="text-xs font-medium text-white">{t('common.viewProfile')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(440).duration(450)} className="mt-8 px-5">
          <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
            {t('home.howTitle')}
          </Text>
          <View className="mt-5">
            {[
              { icon: 'search' as const, title: t('home.how0Title'), desc: t('home.how0Desc') },
              { icon: 'time' as const, title: t('home.how1Title'), desc: t('home.how1Desc') },
              { icon: 'checkmark-circle' as const, title: t('home.how2Title'), desc: t('home.how2Desc') },
            ].map((step, idx, arr) => (
              <View key={step.title} className="flex-row">
                <View className="items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-pill" style={{ borderWidth: 1, borderColor: '#F2F2F2' }}>
                    <Ionicons name={step.icon} size={20} color="#3D4B64" />
                  </View>
                  {idx < arr.length - 1 && <View className="w-px flex-1 bg-hairline" />}
                </View>
                <View className="mb-6 flex-1 pl-4">
                  <Text className="text-base font-semibold text-dark">{step.title}</Text>
                  <Text className="mt-1 text-sm leading-5 text-grayText">{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Support CTA */}
        <Animated.View entering={FadeInDown.delay(500).duration(450)} className="mx-5 mt-4 overflow-hidden rounded-panel bg-primary p-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-white">{t('home.helpTitle')}</Text>
              <Text className="mt-1 text-sm text-pink-100">
                {t('home.helpBody')}
              </Text>
            </View>
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="headset" size={28} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdropGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  backdropBlobPink: { position: 'absolute', top: -40, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(249,168,212,0.18)' },
  backdropBlobBlue: { position: 'absolute', top: 120, left: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(191,219,254,0.20)' },
  heroCard: { borderRadius: 24, overflow: 'hidden', shadowColor: '#F53E8A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 },
  heroCardEmpty: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#FBCFE8', shadowColor: '#3D4B64', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  categoryCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
