import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getProviderId,
  getProviderAllPatients,
  createProviderPatient,
  PatientSum,
} from '@/lib/services/provider-service';
import { FormInput } from '@/components/ui/FormInput';

function patientAvatar(p: PatientSum): string {
  if (p.avatarUrl) return p.avatarUrl;
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Patient';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&color=ffffff&background=0D61B6`;
}

export default function PatientsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<PatientSum[]>([]);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const load = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      // Same union as the home counter (linked + appointment patients).
      if (pid) setPatients(await getProviderAllPatients(pid));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger vos patients.');
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

  const openSheet = () => {
    setNewFirst('');
    setNewLast('');
    setNewPhone('');
    setNewEmail('');
    setFormError(null);
    setSheetOpen(true);
  };

  const handleCreate = async () => {
    if (!user?.id || saving) return;
    setFormError(null);
    if (!newFirst.trim() || !newLast.trim()) {
      setFormError('Nom et prénom obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const pid = await getProviderId(user.id);
      if (!pid) {
        setFormError('Profil professionnel introuvable.');
        return;
      }
      const res = await createProviderPatient(pid, {
        firstName: newFirst,
        lastName: newLast,
        phone: newPhone,
        email: newEmail,
      });
      if (!res.success || !res.patient) {
        setFormError(res.error ?? 'Création impossible.');
        return;
      }
      setPatients((prev) => [res.patient!, ...prev]);
      setSheetOpen(false);
      Alert.alert('Patient ajouté', `${res.patient.firstName} ${res.patient.lastName} a été ajouté.`);
    } catch (e) {
      setFormError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const normalized = query.trim().toLowerCase();
  const filtered = patients.filter((p) =>
    !normalized ||
    `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase().includes(normalized) ||
    (p.phone ?? '').toLowerCase().includes(normalized)
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-end justify-between px-5 pt-4">
        <View>
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Mes patients</Text>
          <Text className="mt-0.5 text-sm font-medium text-grayText">Accédez à leurs dossiers</Text>
        </View>
        {patients.length > 0 && (
          <View className="rounded-full bg-primary-50 px-3 py-1">
            <Text className="text-xs font-semibold text-primary">
              {patients.length} patient{patients.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={openSheet}
          className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-primary shadow-soft"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un patient"
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="mx-5 mt-5 flex-row items-center rounded-full border-hairline bg-white px-4 py-3 shadow-pill">
        <Ionicons name="search" size={18} color="#6a6a6a" />
        <TextInput
          className="ml-2 flex-1 py-0.5 text-sm text-dark"
          placeholder="Rechercher un patient..."
          placeholderTextColor="#929292"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Rechercher un patient"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close-circle" size={18} color="#6a6a6a" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 124, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View className="mt-10 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary-tone-50">
              <Ionicons name="people" size={36} color="#0D61B6" />
            </View>
            <Text className="mt-6 text-lg font-semibold text-dark">
              {query ? 'Aucun résultat' : 'Aucun patient'}
            </Text>
            <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
              {query
                ? 'Aucun patient ne correspond à votre recherche.'
                : 'Les patients ayant pris rendez-vous apparaîtront ici. Utilisez le bouton + pour créer un dossier.'}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {filtered.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() =>
                  router.push({ pathname: '/(professional)/patients/[id]', params: { id: p.id } })
                }
                className="flex-row items-center rounded-panel border-hairline bg-white p-4 shadow-panel"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir le dossier de ${p.firstName} ${p.lastName}`}
              >
                <View className="h-12 w-12 overflow-hidden rounded-full bg-secondary-tone-50">
                  <Image source={{ uri: patientAvatar(p) }} className="h-full w-full" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-dark">
                    {p.firstName} {p.lastName}
                  </Text>
                  {p.phone ? (
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <Ionicons name="call-outline" size={11} color="#929292" />
                      <Text className="text-xs font-medium text-grayText">{p.phone}</Text>
                    </View>
                  ) : (
                    <Text className="mt-0.5 text-xs font-medium text-grayText">
                      {p.email ?? 'Aucun contact renseigné'}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#929292" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add-patient sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={() => setSheetOpen(false)}
          />
          <View className="rounded-t-3xl bg-white">
            <SafeAreaView edges={['bottom']}>
              <View className="flex-row items-center justify-between border-b border-hairline px-5 pb-3 pt-4">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-dark">Nouveau patient</Text>
                  <Text className="mt-0.5 text-xs text-grayText">
                    Le dossier sera lié automatiquement à son compte s'il s'inscrit avec cet e-mail.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSheetOpen(false)}
                  className="h-9 w-9 items-center justify-center rounded-full bg-softCloud"
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                >
                  <Ionicons name="close" size={18} color="#3D4B64" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="max-h-[75%]"
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <FormInput
                  label="Prénom *"
                  placeholder="Prénom"
                  iconName="person"
                  value={newFirst}
                  onChangeText={setNewFirst}
                  autoCapitalize="words"
                />
                <FormInput
                  label="Nom *"
                  placeholder="Nom"
                  iconName="person"
                  value={newLast}
                  onChangeText={setNewLast}
                  autoCapitalize="words"
                />
                <FormInput
                  label="Téléphone"
                  placeholder="+212 6 12 34 56 78"
                  iconName="call"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                />
                <FormInput
                  label="E-mail"
                  placeholder="patient@email.com"
                  iconName="mail"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formError && (
                  <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <Text className="text-xs text-[#c13515]">{formError}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={saving}
                  className="w-full items-center justify-center rounded-lg bg-primary py-4"
                  accessibilityRole="button"
                  accessibilityLabel="Créer le dossier patient"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-base font-medium text-white">Créer le dossier</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
