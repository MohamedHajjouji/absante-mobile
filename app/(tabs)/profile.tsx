import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { signOut } from '@/lib/services/auth-service';
import {
  getUserProfile,
  getPatientByProfileId,
  getPatientStats,
  updateUserProfile,
  UserProfile,
} from '@/lib/services/patient-service';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ appointmentCount: 0, doctorCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const [p, patient] = await Promise.all([
      getUserProfile(user.id),
      getPatientByProfileId(user.id),
    ]);
    setProfile(p);
    if (patient) setStats(await getPatientStats(patient.id));
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleSignOut = () => {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => { setSigningOut(true); await signOut(); } },
    ]);
  };

  const openEdit = () => {
    if (!profile) return;
    setEditFirst(profile.firstName);
    setEditLast(profile.lastName);
    setEditPhone(profile.phone ?? '');
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!editFirst.trim() || !editLast.trim()) { Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires.'); return; }
    setSaving(true);
    const result = await updateUserProfile(user.id, { firstName: editFirst.trim(), lastName: editLast.trim(), phone: editPhone.trim() });
    setSaving(false);
    if (result.success) { setEditModal(false); loadData(); } else { Alert.alert('Erreur', result.error || 'Impossible de sauvegarder.'); }
  };

  const menuItems = [
    { icon: 'calendar-outline' as const, label: 'Mes rendez-vous', desc: 'Historique et à venir', color: '#F53E8A', bg: '#fdf2f8', onPress: () => router.push('/(tabs)/rdv') },
    { icon: 'notifications-outline' as const, label: 'Notifications', desc: 'Alertes et rappels', color: '#0D61B6', bg: '#ecf2fa', onPress: () => router.push('/notifications') },
    { icon: 'card-outline' as const, label: 'Mes paiements', desc: 'Moyens de paiement', color: '#3578FF', bg: '#eff6ff', onPress: () => Alert.alert('Bientôt', 'Cette fonctionnalité sera bientôt disponible.') },
    { icon: 'settings-outline' as const, label: 'Paramètres', desc: 'Préférences et sécurité', color: '#F59E0B', bg: '#fffbeb', onPress: () => Alert.alert('Bientôt', 'Cette fonctionnalité sera bientôt disponible.') },
    { icon: 'help-circle-outline' as const, label: 'Aide & support', desc: 'FAQ et assistance', color: '#10B981', bg: '#ecfdf5', onPress: () => Alert.alert('Bientôt', 'Cette fonctionnalité sera bientôt disponible.') },
  ];

  // Personal data — guests are sent to login (placed after hooks).
  if (isLoaded && !user?.id) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Utilisateur';
  const avatarUri = profile?.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&color=ffffff&background=F53E8A&size=200`;

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} className="px-5 pt-4">
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Profil</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">Gérez vos informations personnelles</Text>
        </Animated.View>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} className="mx-5 mt-5 rounded-panel border-hairline bg-white p-6 shadow-panel">
          <TouchableOpacity
            onPress={openEdit}
            className="absolute right-5 top-5 h-10 w-10 items-center justify-center rounded-full bg-primary-50"
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="#F53E8A" />
          </TouchableOpacity>
          <View className="items-center">
            <View className="relative">
              <Image
                source={{ uri: avatarUri }}
                className="h-24 w-24 rounded-full bg-primary-50"
                style={{ borderWidth: 3, borderColor: '#FFFFFF' }}
              />
              <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-success">
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text className="mt-4 text-2xl font-semibold tracking-[-0.3px] text-dark">{fullName}</Text>
            <Text className="mt-1 text-sm font-medium text-grayText">{profile?.email ?? ''}</Text>
            {profile?.phone && (
              <Text className="mt-0.5 text-xs text-grayText">{profile.phone}</Text>
            )}
            <View className="mt-3 flex-row items-center rounded-full bg-success-50 px-3 py-1.5">
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text className="ml-1.5 text-xs font-semibold text-success">Compte actif</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(120).duration(450)} className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-panel border-hairline bg-white p-4 shadow-panel">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="calendar" size={18} color="#F53E8A" />
              </View>
              <Text className="text-2xl font-semibold text-dark">{stats.appointmentCount}</Text>
            </View>
            <Text className="mt-2 text-xs font-medium text-grayText">Rendez-vous</Text>
          </View>
          <View className="flex-1 rounded-panel border-hairline bg-white p-4 shadow-panel">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary-tone-50">
                <Ionicons name="medkit" size={18} color="#0D61B6" />
              </View>
              <Text className="text-2xl font-semibold text-dark">{stats.doctorCount}</Text>
            </View>
            <Text className="mt-2 text-xs font-medium text-grayText">Médecins contactés</Text>
          </View>
        </Animated.View>

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(180).duration(450)} className="mt-8 px-5">
          <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">Compte</Text>
          <View className="mt-4 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                className={`flex-row items-center p-4 ${index > 0 ? 'border-t border-hairline' : ''}`}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: item.bg }}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-dark">{item.label}</Text>
                  <Text className="mt-0.5 text-xs text-grayText">{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#929292" />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(240).duration(450)} className="mx-5 mt-8">
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            className="flex-row items-center justify-center rounded-lg border border-[#c13515] bg-white py-3.5"
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#c13515" />
            ) : (
              <Ionicons name="log-out-outline" size={18} color="#c13515" />
            )}
            <Text className="ml-2 text-sm font-medium text-[#c13515]">
              {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </Text>
          </TouchableOpacity>
          <Text className="mt-4 text-center text-xs text-grayText">AB Santé v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="rounded-t-3xl bg-white px-5 pb-10 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-dark">Modifier le profil</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#3D4B64" />
              </TouchableOpacity>
            </View>
            <View className="mt-6 gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-semibold text-dark">Prénom</Text>
                  <TextInput
                    className="rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                    value={editFirst}
                    onChangeText={setEditFirst}
                    placeholder="Prénom"
                    placeholderTextColor="#929292"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-semibold text-dark">Nom</Text>
                  <TextInput
                    className="rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                    value={editLast}
                    onChangeText={setEditLast}
                    placeholder="Nom"
                    placeholderTextColor="#929292"
                  />
                </View>
              </View>
              <View>
                <Text className="mb-1.5 text-sm font-semibold text-dark">Téléphone</Text>
                <TextInput
                  className="rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+212 6 12 34 56 78"
                  placeholderTextColor="#929292"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <TouchableOpacity
              className={`mt-6 rounded-lg py-4 ${saving ? 'bg-softCloud' : 'bg-primary'}`}
              activeOpacity={saving ? 1 : 0.8}
              onPress={saving ? undefined : handleSave}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#F53E8A" />
              ) : (
                <Text className="text-center text-base font-medium text-white">Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
