import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { StatusChip } from '@/components/ui/StatusChip';
import { SwitchPill } from '@/components/ui/SwitchPill';
import { getUnreadNotificationCount } from '@/lib/services/notification-service';
import {
  getProviderProfile,
  getProviderId,
  getDashboard,
  setAvailability,
  ProviderProfile,
  DashboardData,
  ProviderAppointment,
} from '@/lib/services/provider-service';

// ── Formatters ──────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatRevenue(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

/** "1,2k" style compact label for tiny chart columns. */
function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')}k`;
  return String(value);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** "Dans 1 h 30" / "Dans 45 min" / "En cours" / null */
function formatCountdown(appt: ProviderAppointment): string | null {
  const now = Date.now();
  const start = new Date(appt.startsAt).getTime();
  const end = new Date(appt.endsAt).getTime();
  if (now >= start && now <= end) return 'En cours';
  const diff = start - now;
  if (diff <= 0) return null;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `Dans ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `Dans ${h} h ${String(m).padStart(2, '0')}` : `Dans ${h} h`;
}

// ── Screen ──────────────────────────────────────────────────

export default function ProfessionalHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [toggling, setToggling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) return;
      if (showSpinner) setLoading(true);
      try {
        const pid = await getProviderId(user.id);
        setProviderId(pid);
        const [prof, dash, unread] = await Promise.all([
          pid ? getProviderProfile(user.id) : Promise.resolve(null),
          pid ? getDashboard(pid) : Promise.resolve(null),
          getUnreadNotificationCount(user.id),
        ]);
        setProfile(prof);
        setDashboard(dash);
        setUnreadCount(unread);
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de charger votre tableau de bord.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh silently on every focus (returning from notifications,
      // agenda, etc.) — the initial mount still shows the spinner via
      // the default `loading` state.
      load(false);
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAvailability = async (value: boolean) => {
    if (!providerId) return;
    setToggling(true);
    try {
      const res = await setAvailability(providerId, value);
      if (!res.success) {
        Alert.alert('Erreur', res.error ?? 'Impossible de mettre à jour la disponibilité.');
        return;
      }
      if (profile) setProfile({ ...profile, acceptsNewPatients: value });
    } catch (e) {
      console.error('Failed to update availability:', e);
      Alert.alert('Erreur', 'Impossible de mettre à jour. Vérifiez votre connexion.');
    } finally {
      setToggling(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────

  const firstName = profile?.firstName || 'Cher professionnel';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : firstName;
  const avatarUri =
    profile?.avatarUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&color=ffffff&background=F53E8A`;

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  );

  const sortedToday = useMemo(
    () =>
      [...(dashboard?.todayAppointments ?? [])].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [dashboard]
  );
  // First appointment of the day that hasn't finished yet
  const nextAppointment = sortedToday.find((a) => new Date(a.endsAt).getTime() >= Date.now());
  const countdown = nextAppointment ? formatCountdown(nextAppointment) : null;

  const isAvailable = profile?.acceptsNewPatients ?? false;
  const isVerified = profile?.verifiedStatus === 'approved';
  const statusDotColor = isVerified ? '#10B981' : '#F59E0B';

  const stats = dashboard?.stats;

  // 7-day strip, starting today
  const weekDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const busyDays = useMemo(
    () => new Set((dashboard?.upcomingAppointments ?? []).map((a) => dayKey(new Date(a.startsAt)))),
    [dashboard]
  );
  const upcomingCount = (dashboard?.upcomingAppointments ?? []).length;

  const quickActions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    onPress: () => void;
  }[] = [
    {
      key: 'agenda',
      label: 'Agenda',
      icon: 'calendar',
      color: '#F53E8A',
      bg: '#FDF2F8',
      onPress: () => router.push('/(professional)/agenda'),
    },
    {
      key: 'patients',
      label: 'Patients',
      icon: 'people',
      color: '#0D61B6',
      bg: '#ECF2FA',
      onPress: () => router.push('/(professional)/patients'),
    },
    {
      key: 'services',
      label: 'Services',
      icon: 'briefcase',
      color: '#10B981',
      bg: '#ECFDF5',
      onPress: () => router.push('/(professional)/services'),
    },
    {
      key: 'profile',
      label: 'Profil',
      icon: 'person',
      color: '#F59E0B',
      bg: '#FFFBEB',
      onPress: () => router.push('/(professional)/profile'),
    },
  ];

  // ── Renderers ─────────────────────────────────────────────

  const renderTimelineItem = (appt: ProviderAppointment, index: number) => {
    const isLast = index === sortedToday.length - 1;
    const isNext = nextAppointment?.id === appt.id;
    return (
      <View key={appt.id} className="flex-row">
        {/* Time gutter */}
        <View className="w-12 items-end pt-4">
          <Text className="text-sm font-semibold text-dark">{formatTime(appt.startsAt)}</Text>
          <Text className="mt-0.5 text-[10px] font-medium text-grayText">
            {formatTime(appt.endsAt)}
          </Text>
        </View>

        {/* Rail */}
        <View className="items-center px-3">
          <View
            className={`mt-[22px] h-2.5 w-2.5 rounded-full ${
              isNext ? 'bg-primary' : 'bg-primary-200'
            }`}
          />
          {!isLast && <View className="mt-1 w-[2px] flex-1 rounded-full bg-primary-100" />}
        </View>

        {/* Card */}
        <TouchableOpacity
          onPress={() => router.push('/(professional)/agenda')}
          activeOpacity={0.85}
          className="mb-4 flex-1 rounded-panel border border-hairline bg-white p-4 shadow-panel"
          accessibilityRole="button"
          accessibilityLabel={`Rendez-vous avec ${appt.patientName} à ${formatTime(appt.startsAt)}`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 pr-2 text-base font-semibold text-dark" numberOfLines={1}>
              {appt.patientName}
            </Text>
            <StatusChip status={appt.status} />
          </View>
          <Text className="mt-1 text-xs font-medium text-grayText" numberOfLines={1}>
            {appt.serviceName ?? 'Consultation'}
            {appt.servicePrice != null ? ` · ${appt.servicePrice} MAD` : ''}
          </Text>
          {appt.reason ? (
            <Text className="mt-1.5 text-xs font-medium italic text-grayText" numberOfLines={1}>
              “{appt.reason}”
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      {/* Atmospheric pastel backdrop */}
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
        {/* ── Header ─────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(450)} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-grayText">
              {todayLabel}
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                className="h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white shadow-soft"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
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
                onPress={() => router.push('/(professional)/profile')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Voir mon profil"
              >
                <View className="rounded-full border border-hairline bg-white p-[3px] shadow-soft">
                  <Image source={{ uri: avatarUri }} className="h-11 w-11 rounded-full" />
                  <View
                    className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white"
                    style={{ backgroundColor: statusDotColor }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="mt-3 text-[26px] font-semibold tracking-[-0.3px] text-dark">
            Bonjour, {firstName} 👋
          </Text>

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-medium text-grayText">{profile?.specialty}</Text>
            {isVerified && (
              <View className="flex-row items-center gap-1 rounded-full bg-success-50 px-2.5 py-1">
                <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                <Text className="text-[11px] font-semibold text-success">Vérifié</Text>
              </View>
            )}
            {profile && profile.reviewCount > 0 && (
              <View className="flex-row items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1">
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text className="text-[11px] font-semibold text-warning">
                  {(typeof profile.averageRating === 'number' && Number.isFinite(profile.averageRating)
                    ? profile.averageRating
                    : 0
                  ).toFixed(1)} ({profile.reviewCount})
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Availability status ────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(450)}
          className={`mx-5 mt-5 flex-row items-center rounded-panel border p-4 shadow-panel ${
            isAvailable ? 'border-[#A7F3D0] bg-[#F0FDF7]' : 'border-hairline bg-white'
          }`}
        >
          <View
            className={`h-11 w-11 items-center justify-center rounded-full ${
              isAvailable ? 'bg-success-50' : 'bg-softCloud'
            }`}
          >
            <Ionicons
              name={isAvailable ? 'checkmark-circle' : 'remove-circle'}
              size={22}
              color={isAvailable ? '#10B981' : '#6a6a6a'}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-dark">
              {isAvailable ? 'Vous êtes disponible' : 'Vous êtes indisponible'}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-grayText">
              {isAvailable
                ? 'Visible dans les résultats de recherche'
                : 'Masqué des résultats de recherche'}
            </Text>
          </View>
          <SwitchPill
            value={isAvailable}
            onToggle={handleAvailability}
            disabled={toggling || !profile}
            accessibilityLabel="Disponibilité pour les nouveaux patients"
          />
        </Animated.View>

        {/* ── Next appointment hero ──────────────────────── */}
        <Animated.View entering={FadeInDown.delay(140).duration(450)} className="mx-5 mt-4">
          {nextAppointment ? (
            <LinearGradient
              colors={['#F472B6', '#F53E8A', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Decorative translucent circles */}
              <View className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <View className="absolute -bottom-10 right-20 h-28 w-28 rounded-full bg-white/10" />

              <View className="p-5">
                <View className="flex-row items-center">
                  <View className="flex-row items-center rounded-full bg-white/20 px-3 py-1.5">
                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                    <Text className="text-[11px] font-semibold text-white">
                      Prochain rendez-vous
                    </Text>
                  </View>
                  {countdown ? (
                    <View className="ml-auto rounded-full bg-white/20 px-3 py-1.5">
                      <Text className="text-[11px] font-semibold text-white">{countdown}</Text>
                    </View>
                  ) : null}
                </View>

                <View className="mt-4 flex-row items-center">
                  <View className="flex-1 pr-3">
                    <Text className="text-[22px] font-semibold text-white" numberOfLines={1}>
                      {nextAppointment.patientName}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons name="time-outline" size={14} color="#FCE7F3" />
                      <Text className="text-sm font-medium text-pink-100">
                        Aujourd'hui · {formatTime(nextAppointment.startsAt)} –{' '}
                        {formatTime(nextAppointment.endsAt)}
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Ionicons name="briefcase-outline" size={13} color="#FCE7F3" />
                      <Text className="text-sm font-medium text-pink-100" numberOfLines={1}>
                        {nextAppointment.serviceName ?? 'Consultation'}
                        {nextAppointment.servicePrice != null
                          ? ` · ${nextAppointment.servicePrice} MAD`
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Ionicons name="calendar" size={26} color="#FFFFFF" />
                  </View>
                </View>

                <View className="mt-5 flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => router.push('/(professional)/agenda')}
                    className="self-start rounded-full bg-white px-5 py-2.5"
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Voir l'agenda"
                  >
                    <Text className="text-sm font-semibold text-primary">Voir l'agenda</Text>
                  </TouchableOpacity>
                  {nextAppointment.patientPhone ? (
                    <TouchableOpacity
                      onPress={() => {
                        const phone = nextAppointment.patientPhone;
                        if (!phone) return;
                        Linking.canOpenURL(`tel:${phone}`)
                          .then((supported) => {
                            if (supported) return Linking.openURL(`tel:${phone}`);
                            Alert.alert('Erreur', 'Appels non supportés sur cet appareil.');
                          })
                          .catch((e) => {
                            console.error('Failed to place call:', e);
                            Alert.alert('Erreur', 'Impossible de passer cet appel.');
                          });
                      }}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Appeler ${nextAppointment.patientName}`}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
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
                    <Text className="text-xs font-semibold text-success">Votre journée</Text>
                  </View>
                  <Text className="mt-2 text-lg font-semibold text-dark">
                    Aucun RDV prévu aujourd'hui
                  </Text>
                  <Text className="mt-0.5 text-sm font-medium text-grayText">
                    Profitez-en pour préparer votre semaine.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(professional)/agenda')}
                    className="mt-4 self-start rounded-full bg-primary px-5 py-2.5"
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Créer un rendez-vous"
                  >
                    <Text className="text-sm font-semibold text-white">Créer un rendez-vous</Text>
                  </TouchableOpacity>
                </View>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft">
                  <Ionicons name="cafe" size={26} color="#F53E8A" />
                </View>
              </View>
            </LinearGradient>
          )}
        </Animated.View>

        {/* ── Stats strip ────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(450)}
          className="mx-5 mt-4 flex-row gap-3"
        >
          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="calendar" size={16} color="#F53E8A" />
            </View>
            <Text className="mt-2.5 text-lg font-semibold text-dark">{stats?.todayCount ?? 0}</Text>
            <Text className="text-[11px] font-medium text-grayText">Aujourd'hui</Text>
          </View>

          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary-tone-50">
              <Ionicons name="people" size={16} color="#0D61B6" />
            </View>
            <Text className="mt-2.5 text-lg font-semibold text-dark">
              {stats?.totalPatients ?? 0}
            </Text>
            <Text className="text-[11px] font-medium text-grayText">Patients</Text>
          </View>

          <View className="flex-1 rounded-panel border border-hairline bg-white p-3.5 shadow-panel">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-success-50">
              <Ionicons name="wallet" size={16} color="#10B981" />
            </View>
            <View className="mt-2.5 flex-row items-baseline gap-1">
              <Text className="text-lg font-semibold text-dark" numberOfLines={1}>
                {formatRevenue(stats?.revenue ?? 0)}
              </Text>
              <Text className="text-[10px] font-semibold text-grayText">MAD</Text>
            </View>
            <Text className="text-[11px] font-medium text-grayText">Revenus</Text>
          </View>
        </Animated.View>

        {/* ── Revenue performance ───────────────────────── */}
        {dashboard && dashboard.monthlyRevenue.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(240).duration(450)}
            className="mx-5 mt-4 rounded-panel border border-hairline bg-white p-4 shadow-panel"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-dark">Performance</Text>
                <Text className="mt-0.5 text-xs font-medium text-grayText">
                  Revenus · 6 derniers mois
                </Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-success-50">
                <Ionicons name="trending-up" size={18} color="#10B981" />
              </View>
            </View>

            {(() => {
              const max = Math.max(...dashboard.monthlyRevenue.map((m) => m.amount), 1);
              return (
                <View className="mt-4 flex-row items-end justify-between px-1" style={{ height: 96 }}>
                  {dashboard.monthlyRevenue.map((m, i) => {
                    const isCurrent = i === dashboard.monthlyRevenue.length - 1;
                    const h = Math.max(Math.round((m.amount / max) * 80), m.amount > 0 ? 6 : 3);
                    return (
                      <View key={`${m.label}-${i}`} className="items-center" style={{ width: 40 }}>
                        <Text
                          className={`text-[10px] font-semibold ${
                            isCurrent ? 'text-primary' : 'text-grayText'
                          }`}
                        >
                          {formatCompact(m.amount)}
                        </Text>
                        {isCurrent ? (
                          <LinearGradient
                            colors={['#F472B6', '#F53E8A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ height: h, width: 18, marginTop: 6, borderRadius: 6 }}
                          />
                        ) : (
                          <View
                            style={{
                              height: h,
                              width: 18,
                              marginTop: 6,
                              borderRadius: 6,
                              backgroundColor: '#FBCFE8',
                            }}
                          />
                        )}
                        <Text
                          className={`mt-1.5 text-[10px] font-semibold uppercase ${
                            isCurrent ? 'text-primary' : 'text-grayText'
                          }`}
                        >
                          {m.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            <View className="mt-4 flex-row items-center justify-between border-t border-hairline pt-3">
              <Text className="text-xs font-medium text-grayText">Ce mois-ci</Text>
              <Text className="text-sm font-semibold text-dark">
                {formatRevenue(dashboard.monthlyRevenue[dashboard.monthlyRevenue.length - 1].amount)}{' '}
                MAD
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── 7-day strip ────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(260).duration(450)}
          className="mx-5 mt-4 rounded-panel border border-hairline bg-white p-4 shadow-panel"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-dark">Votre semaine</Text>
            <Text className="text-xs font-medium text-grayText">
              {upcomingCount} RDV · 7 jours
            </Text>
          </View>

          <View className="mt-4 flex-row justify-between px-1">
            {weekDays.map((d) => {
              const isToday = dayKey(d) === dayKey(new Date());
              const hasRdvs = busyDays.has(dayKey(d));
              return (
                <View key={dayKey(d)} className="items-center" style={{ width: 36 }}>
                  <Text
                    className={`text-[11px] font-semibold ${
                      isToday ? 'text-primary' : 'text-grayText'
                    }`}
                  >
                    {WEEKDAY_LETTERS[d.getDay()]}
                  </Text>
                  {isToday ? (
                    <LinearGradient
                      colors={['#F472B6', '#F53E8A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.todayCircle}
                    >
                      <Text className="text-sm font-semibold text-white">{d.getDate()}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="mt-1.5 h-9 w-9 items-center justify-center rounded-full">
                      <Text className="text-sm font-medium text-dark">{d.getDate()}</Text>
                    </View>
                  )}
                  <View
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      hasRdvs ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Today's timeline ───────────────────────────── */}
        {sortedToday.length > 0 && (sortedToday.length > 1 || !nextAppointment) && (
          <Animated.View entering={FadeInDown.delay(320).duration(450)} className="mt-7 px-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
                RDV du jour
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(professional)/agenda')}
                accessibilityRole="button"
                accessibilityLabel="Voir l'agenda complet"
              >
                <Text className="text-sm font-medium text-primary">Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-4">{sortedToday.map(renderTimelineItem)}</View>
          </Animated.View>
        )}

        {/* ── Quick actions ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(380).duration(450)} className="mt-7 px-5">
          <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
            Actions rapides
          </Text>

          <View className="mt-5 flex-row justify-between">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                onPress={action.onPress}
                className="items-center"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={action.label}
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

        {/* ── Verification banner ────────────────────────── */}
        {profile && profile.verifiedStatus !== 'approved' && (
          <Animated.View
            entering={FadeInDown.delay(440).duration(450)}
            className="mx-5 mt-7 flex-row items-center rounded-panel border border-[#FDE68A] bg-[#FFFBEB] p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FEF3C7]">
              <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-dark">Validation en cours</Text>
              <Text className="mt-0.5 text-xs font-medium leading-4 text-grayText">
                Votre profil est en cours de vérification par notre équipe.
              </Text>
            </View>
            <View className="rounded-full bg-[#FEF3C7] px-2.5 py-1">
              <Text className="text-[10px] font-semibold text-[#B45309]">24–48 h</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles (gradients & backdrop) ───────────────────────────

const styles = StyleSheet.create({
  backdropGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  backdropBlobPink: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249,168,212,0.18)',
  },
  backdropBlobBlue: {
    position: 'absolute',
    top: 120,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(191,219,254,0.20)',
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#F53E8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCardEmpty: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    shadowColor: '#3D4B64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  todayCircle: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F53E8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
