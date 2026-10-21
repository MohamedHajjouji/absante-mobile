import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDirectoryDoctors, toggleDirectoryDoctorActive, DirectoryDoctor } from '@/lib/services/admin-service';

export default function DirectoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [doctors, setDoctors] = useState<DirectoryDoctor[]>([]);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try {
      setDoctors(await getDirectoryDoctors(query));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger l\'annuaire.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleToggle = async (d: DirectoryDoctor) => {
    const res = await toggleDirectoryDoctorActive(d.id, !d.active);
    if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
    setDoctors((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: !d.active } : x)));
  };

  if (loading && doctors.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-bold text-dark">Annuaire</Text>
          <Text className="mt-1 text-sm text-grayText">{doctors.length} profils (comme /admin/doctors sur le web)</Text>
        </View>
        <View className="mx-5 mt-4 flex-row items-center rounded-2xl border border-hairline bg-white px-4 py-2.5">
          <Ionicons name="search" size={18} color="#929292" />
          <TextInput
            className="ml-2 flex-1 py-1 text-sm text-dark"
            placeholder="Nom, licence, spécialité..."
            placeholderTextColor="#929292"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View className="mt-4 gap-3 px-5">
          {doctors.map((d) => (
            <View key={d.id} className="rounded-2xl border border-hairline bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm font-semibold text-dark">
                  Dr {d.firstName} {d.lastName}
                </Text>
                <Text className={`rounded-full px-2 py-1 text-[11px] ${d.active ? 'bg-success-50 text-success' : 'bg-gray-100 text-grayText'}`}>
                  {d.active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-grayText">
                {[d.specialties.join(', '), d.city].filter(Boolean).join(' · ') || 'Sans spécialité'}
              </Text>
              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity onPress={() => handleToggle(d)} className="flex-1 rounded-lg bg-softCloud py-2.5">
                  <Text className="text-center text-xs font-medium text-dark">{d.active ? 'Désactiver' : 'Activer'}</Text>
                </TouchableOpacity>
                <View className={`flex-1 items-center justify-center rounded-lg py-2.5 ${d.isRegistered ? 'bg-success-50' : 'bg-warning-50'}`}>
                  <Text className="text-xs font-medium text-dark">{d.isRegistered ? 'Revendiqué' : 'Annuaire'}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
