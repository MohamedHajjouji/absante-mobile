import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listClaims, reviewClaim, ClaimRow } from '@/lib/services/admin-service';

export default function ClaimsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try {
      setClaims(await listClaims('pending'));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les revendications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const handleReview = async (c: ClaimRow, approve: boolean) => {
    setBusyId(c.id);
    try {
      const res = await reviewClaim(c.id, approve);
      if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
      setClaims((prev) => prev.filter((x) => x.id !== c.id));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
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
          <Text className="text-2xl font-bold text-dark">Revendications</Text>
          <Text className="mt-1 text-sm text-grayText">{claims.length} en attente (comme /admin/claims)</Text>
        </View>
        <View className="mt-4 gap-3 px-5">
          {claims.length === 0 ? (
            <View className="items-center rounded-2xl border border-hairline bg-white p-8">
              <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
              <Text className="mt-3 text-base font-semibold text-dark">Aucune demande en attente</Text>
            </View>
          ) : claims.map((c) => (
            <View key={c.id} className="rounded-2xl border border-hairline bg-white p-4">
              <Text className="text-sm font-semibold text-dark">{c.providerName}</Text>
              <Text className="mt-0.5 text-xs text-grayText">{c.claimantEmail ?? 'Sans email'} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}</Text>
              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => handleReview(c, true)}
                  disabled={busyId === c.id}
                  className="flex-1 rounded-lg bg-success py-2.5"
                >
                  <Text className="text-center text-xs font-semibold text-white">Approuver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleReview(c, false)}
                  disabled={busyId === c.id}
                  className="flex-1 rounded-lg bg-red-50 py-2.5"
                >
                  <Text className="text-center text-xs font-semibold text-[#c13515]">Refuser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
