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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId, getProviderPatients, PatientSum } from '@/lib/services/provider-service';

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

  const load = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      if (pid) setPatients(await getProviderPatients(pid));
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
                : 'Les patients ayant pris rendez-vous apparaîtront ici.'}
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
    </SafeAreaView>
  );
}
