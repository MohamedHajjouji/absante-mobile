import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { signOut } from '@/lib/services/auth-service';
import { SwitchPill } from '@/components/ui/SwitchPill';
import {
  getProviderProfile,
  setAvailability,
  updateProviderProfile,
  ProviderProfile,
} from '@/lib/services/provider-service';

const VERIFICATION: Record<
  string,
  { label: string; color: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: {
    label: 'Compte vérifié',
    color: '#10B981',
    tint: 'bg-success-50',
    icon: 'shield-checkmark',
  },
  rejected: {
    label: 'Validation refusée',
    color: '#EF4444',
    tint: 'bg-red-50',
    icon: 'alert-circle',
  },
  pending: {
    label: 'Validation en cours',
    color: '#F59E0B',
    tint: 'bg-warning-50',
    icon: 'time',
  },
};

export default function ProfessionalProfileScreen() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [toggling, setToggling] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      setProfile(await getProviderProfile(user.id));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger votre profil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAvailability = async (value: boolean) => {
    if (!profile) return;
    setToggling(true);
    const res = await setAvailability(profile.id, value);
    setToggling(false);
    if (!res.success) {
      Alert.alert('Erreur', res.error ?? 'Impossible de mettre à jour la disponibilité.');
      return;
    }
    setProfile({ ...profile, acceptsNewPatients: value });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            const { error } = await signOut();
            if (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Professionnel';
  const verification = VERIFICATION[profile?.verifiedStatus ?? 'pending'] ?? VERIFICATION.pending;
  const avatarUri =
    profile?.avatarUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&color=ffffff&background=F53E8A`;

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="px-5 pt-4">
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Profil</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">Gérez vos informations personnelles</Text>
        </View>

        {/* Profile card */}
        <View className="mx-5 mt-5 rounded-panel border-hairline bg-white p-6 shadow-panel">
          <TouchableOpacity
            onPress={() => setEditOpen(true)}
            className="absolute right-5 top-5 h-10 w-10 items-center justify-center rounded-full bg-primary-50"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Modifier mon profil"
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
              <View
                className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-white"
                style={{ backgroundColor: verification.color }}
              >
                <Ionicons name={verification.icon} size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text className="mt-4 text-2xl font-semibold tracking-[-0.3px] text-dark">
              {fullName}
            </Text>
            <Text className="mt-1 text-sm font-medium text-grayText">
              {profile?.specialty || 'Professionnel de santé'}
            </Text>
            <View className={`mt-3 flex-row items-center rounded-full px-3 py-1.5 ${verification.tint}`}>
              <Ionicons name={verification.icon} size={14} color={verification.color} />
              <Text
                className="ml-1.5 text-xs font-medium"
                style={{ color: verification.color }}
              >
                {verification.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats cards */}
        <View className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-panel border-hairline bg-white p-4 shadow-panel">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-warning-50">
                <Ionicons name="star" size={18} color="#F59E0B" />
              </View>
              <Text className="text-2xl font-semibold text-dark">
                {(profile?.averageRating ?? 0).toFixed(1)}
              </Text>
            </View>
            <Text className="mt-2 text-xs font-medium text-grayText">
              {(profile?.reviewCount ?? 0) > 0 ? `${profile?.reviewCount} avis` : 'Aucun avis'}
            </Text>
          </View>
          <View className="flex-1 rounded-panel border-hairline bg-white p-4 shadow-panel">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary-tone-50">
                <Ionicons name="calendar" size={18} color="#0D61B6" />
              </View>
              <Text className="text-2xl font-semibold text-dark">
                {profile?.yearsOfExperience ?? 0}
              </Text>
            </View>
            <Text className="mt-2 text-xs font-medium text-grayText">Années d'expérience</Text>
          </View>
        </View>

        {/* Professional info section */}
        <View className="mt-8 px-5">
          <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
            Informations professionnelles
          </Text>
          <View className="mt-4 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
            <View className="flex-row items-center border-b border-hairline p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary-tone-50">
                <Ionicons name="card" size={20} color="#0D61B6" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs font-medium text-grayText">Numéro de licence</Text>
                <Text className="mt-0.5 text-sm font-medium text-dark">
                  {profile?.licenseNumber || 'Non renseigné'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center border-b border-hairline p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="mail" size={20} color="#F53E8A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs font-medium text-grayText">Email</Text>
                <Text className="mt-0.5 text-sm font-medium text-dark">
                  {profile?.email || user?.email || 'Non renseigné'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-success-50">
                <Ionicons name="medkit" size={20} color="#10B981" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs font-medium text-grayText">Spécialité</Text>
                <Text className="mt-0.5 text-sm font-medium text-dark">
                  {profile?.specialty || 'Professionnel de santé'}
                </Text>
              </View>
            </View>
          </View>

          {profile?.biography ? (
            <View className="mt-4 rounded-panel border border-hairline bg-white p-4 shadow-panel">
              <Text className="text-xs font-medium text-grayText">Biographie</Text>
              <Text className="mt-1 text-sm font-medium leading-5 text-dark">{profile.biography}</Text>
            </View>
          ) : null}
        </View>

        {/* Availability */}
        <View className="mx-5 mt-8 flex-row items-center rounded-panel border-hairline bg-white p-4 shadow-panel">
          <View
            className={`h-11 w-11 items-center justify-center rounded-full ${
              profile?.acceptsNewPatients ? 'bg-success-50' : 'bg-softCloud'
            }`}
          >
            <Ionicons
              name={profile?.acceptsNewPatients ? 'checkmark-circle' : 'remove-circle'}
              size={22}
              color={profile?.acceptsNewPatients ? '#10B981' : '#6a6a6a'}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-medium text-dark">
              Accepter de nouveaux patients
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-grayText">
              Visible dans les résultats de recherche
            </Text>
          </View>
          <SwitchPill
            value={profile?.acceptsNewPatients ?? false}
            onToggle={handleAvailability}
            disabled={toggling || !profile}
            accessibilityLabel="Accepter de nouveaux patients"
          />
        </View>

        {/* ERP (agency owners only) */}
        {isAdmin ? (
          <View className="mt-4 px-5">
            <TouchableOpacity
              onPress={() => router.push('/(erp)')}
              className="flex-row items-center rounded-panel border-hairline bg-white p-4 shadow-panel"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir l'espace ERP"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="grid" size={20} color="#F53E8A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-dark">Espace ERP</Text>
                <Text className="mt-0.5 text-xs font-medium text-grayText">
                  Gérez le stock, les ventes et les achats de votre agence
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Logout */}
        <View className="mt-8 px-5">
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            className="flex-row items-center justify-center rounded-lg border border-[#c13515] bg-white py-3.5"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
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
          <Text className="mt-4 text-center text-xs text-grayText">AB Santé Pro v1.0.0</Text>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        profile={profile}
        userId={user?.id}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function EditProfileModal({
  visible,
  profile,
  userId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  profile: ProviderProfile | null;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [biography, setBiography] = useState('');
  const [years, setYears] = useState('');
  const [license, setLicense] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFirstName(profile?.firstName ?? '');
      setLastName(profile?.lastName ?? '');
      setPhone(profile?.phone ?? '');
      setBiography(profile?.biography ?? '');
      setYears(profile?.yearsOfExperience != null ? String(profile.yearsOfExperience) : '');
      setLicense(profile?.licenseNumber ?? '');
      setError(null);
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!userId) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    const yearsNum = years.trim() === '' ? null : Number(years);
    if (yearsNum != null && (Number.isNaN(yearsNum) || yearsNum < 0)) {
      setError('Veuillez saisir une expérience valide (en années).');
      return;
    }

    setSaving(true);
    const res = await updateProviderProfile(userId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      biography: biography.trim() || null,
      yearsOfExperience: yearsNum,
      licenseNumber: license.trim() || null,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Impossible de sauvegarder vos modifications.');
      return;
    }
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-white p-5 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-dark">Modifier le profil</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={24} color="#3D4B64" />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Prénom</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  value={firstName}
                  onChangeText={setFirstName}
                  accessibilityLabel="Prénom"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Nom</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  value={lastName}
                  onChangeText={setLastName}
                  accessibilityLabel="Nom"
                />
              </View>
            </View>

            <Text className="mt-4 text-sm font-semibold text-dark">Téléphone</Text>
            <TextInput
              className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
              value={phone}
              onChangeText={setPhone}
              placeholder="+212 6 12 34 56 78"
              placeholderTextColor="#929292"
              keyboardType="phone-pad"
              accessibilityLabel="Téléphone"
            />

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Expérience (ans)</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  value={years}
                  onChangeText={setYears}
                  placeholder="5"
                  placeholderTextColor="#929292"
                  keyboardType="numeric"
                  accessibilityLabel="Années d'expérience"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">N° de licence</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  value={license}
                  onChangeText={setLicense}
                  placeholder="12345"
                  placeholderTextColor="#929292"
                  autoCapitalize="none"
                  accessibilityLabel="Numéro de licence"
                />
              </View>
            </View>

            <Text className="mt-4 text-sm font-semibold text-dark">Biographie</Text>
            <TextInput
              className="mt-2 min-h-[96px] rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
              value={biography}
              onChangeText={setBiography}
              placeholder="Parlez de votre parcours..."
              placeholderTextColor="#929292"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Biographie"
            />

            {error && (
              <View className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs text-[#c13515]">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="mt-5 items-center justify-center rounded-lg bg-primary py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Enregistrer les modifications"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-medium text-white">Enregistrer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}