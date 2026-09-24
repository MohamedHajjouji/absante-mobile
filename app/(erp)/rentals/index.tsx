import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { Rental } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

const money = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

export default function RentalsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rentals, setRentals] = useState<Rental[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setRentals(
        await erpFetch<Rental>('rentals', {
          select: 'id,rental_number,status,starts_at,ends_at,deposit_amount,total_amount,notes',
          order: { column: 'starts_at', ascending: false },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Rentals load', e);
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
          title: 'Locations',
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
          {rentals.length === 0 ? (
            <ErpEmptyState icon="key" title="Aucune location" subtitle="Les locations de matériel apparaîtront ici." />
          ) : (
            <View className="gap-2.5">
              {rentals.map((r) => (
                <View key={r.id} className="rounded-xl border border-hairline bg-white p-3.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-dark">{r.rental_number}</Text>
                    <Text className="text-[11px] font-semibold uppercase text-grayText">{r.status}</Text>
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-xs text-grayText">
                      {[String(r.starts_at ?? '').slice(0, 10), String(r.ends_at ?? '').slice(0, 10)]
                        .filter(Boolean)
                        .join(' → ')}
                    </Text>
                    <Text className="text-sm font-bold text-dark">{money(r.total_amount)} MAD</Text>
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
