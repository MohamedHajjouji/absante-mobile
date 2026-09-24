import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { AssetMaintenance } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

const money = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

export default function MaintenanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<AssetMaintenance[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setRows(
        await erpFetch<AssetMaintenance>('asset_maintenance', {
          select: 'id,asset_id,maintenance_type,description,maintenance_date,cost,status,next_maintenance_date,notes',
          order: { column: 'maintenance_date', ascending: false },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Maintenance load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Maintenance',
          headerTintColor: '#3D4B64',
          headerStyle: { backgroundColor: '#FEFBFC' },
          headerShadowVisible: false,
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F53E8A" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />
          }
        >
          {rows.length === 0 ? (
            <ErpEmptyState icon="build" title="Aucun entretien" subtitle="Les entretiens d'équipements apparaîtront ici." />
          ) : (
            <View className="gap-2.5">
              {rows.map((m) => (
                <View key={m.id} className="rounded-xl border border-hairline bg-white p-3.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                      {m.maintenance_type}
                    </Text>
                    <Text className="text-[11px] font-semibold uppercase text-grayText">{m.status}</Text>
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-xs text-grayText">{String(m.maintenance_date ?? '').slice(0, 10)}</Text>
                    <Text className="text-sm font-bold text-dark">{money(m.cost)} MAD</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
