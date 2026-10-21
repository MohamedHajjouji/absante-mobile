import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId } from '@/lib/services/provider-service';
import { getMyFacilities, toggleFacilityActive, setPrimaryFacility, ProFacility } from '@/lib/services/facilities-service';

export default function LieuxScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<ProFacility[]>([]);

  const load = useCallback(async (spinner = false) => {
    if (!user?.id) return;
    if (spinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      setProviderId(pid);
      if (pid) setFacilities(await getMyFacilities(pid));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos lieux.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(true); }, [load]);

  const handleToggle = async (f: ProFacility) => {
    const res = await toggleFacilityActive(f.id, !f.active);
    if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
    setFacilities((prev) => prev.map((x) => (x.id === f.id ? { ...x, active: !f.active } : x)));
  };

  const handlePrimary = async (f: ProFacility) => {
    if (!providerId) return;
    const res = await setPrimaryFacility(providerId, f.id);
    if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
    setFacilities((prev) => prev.map((x) => ({ ...x, primary: x.id === f.id })));
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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 124 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-semibold text-dark">Mes lieux</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">
            {facilities.length > 0 ? `${facilities.length} lieu${facilities.length > 1 ? 'x' : ''}` : 'Vos cabinets et cliniques'}
          </Text>
        </View>
        <View className="mt-5 gap-4 px-5">
          {facilities.length === 0 ? (
            <View className="items-center rounded-panel border border-hairline bg-white p-8">
              <Ionicons name="business-outline" size={36} color="#929292" />
              <Text className="mt-4 text-base font-semibold text-dark">Aucun lieu</Text>
              <Text className="mt-1 text-center text-sm text-grayText">Ajoutez un lieu depuis l'onboarding ou le site web.</Text>
            </View>
          ) : facilities.map((f) => (
            <View key={f.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary-tone-50">
                  <Ionicons name="business" size={22} color="#0D61B6" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-dark">{f.name}</Text>
                  <Text className="text-xs text-grayText">{[f.street, f.city].filter(Boolean).join(' · ') || 'Adresse non renseignée'}</Text>
                </View>
                {f.primary && (
                  <View className="rounded-full bg-primary-50 px-2 py-1">
                    <Text className="text-[11px] font-semibold text-primary">Principal</Text>
                  </View>
                )}
              </View>
              <View className="mt-3 flex-row gap-2">
                <Text className="rounded-full bg-softCloud px-2 py-1 text-[11px] text-grayText">{f.calendarCount} calendrier{f.calendarCount > 1 ? 's' : ''}</Text>
                <Text className="rounded-full bg-softCloud px-2 py-1 text-[11px] text-grayText">{f.appointmentCount} RDV</Text>
                <Text className={`rounded-full px-2 py-1 text-[11px] ${f.active ? 'bg-success-50 text-success' : 'bg-gray-100 text-grayText'}`}>
                  {f.active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                {!f.primary && (
                  <TouchableOpacity onPress={() => handlePrimary(f)} className="flex-1 rounded-lg border-hairline bg-white py-2.5">
                    <Text className="text-center text-xs font-medium text-dark">Définir principal</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleToggle(f)} className="flex-1 rounded-lg bg-softCloud py-2.5">
                  <Text className="text-center text-xs font-medium text-dark">{f.active ? 'Désactiver' : 'Activer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
