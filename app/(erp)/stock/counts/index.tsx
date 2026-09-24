import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { StockCount, StockCountItem } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

export default function StockCountsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<(StockCount & { items?: StockCountItem[] })[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const rows = await erpFetch<StockCount>('stock_counts', {
        select: 'id,location_id,count_date,status,performed_by,notes',
        order: { column: 'count_date', ascending: false },
        limit: 100,
      });
      const withItems = await Promise.all(
        rows.map(async (c) => {
          const items = await erpFetch<StockCountItem>('stock_count_items', {
            select: 'id,product_id,expected_quantity,counted_quantity,difference',
            filters: { stock_count_id: c.id },
            limit: 500,
          });
          return { ...c, items };
        })
      );
      setCounts(withItems);
    } catch (e) {
      console.error('Stock counts load', e);
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
          title: 'Comptes de stock',
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
          {counts.length === 0 ? (
            <ErpEmptyState
              icon="clipboard"
              title="Aucun inventaire"
              subtitle="Lancez un comptage depuis le web, il apparaîtra ici."
            />
          ) : (
            <View className="gap-2.5">
              {counts.map((c) => {
                const items = c.items ?? [];
                const gaps = items.filter((i) => Number(i.difference ?? 0) !== 0).length;
                return (
                  <View key={c.id} className="rounded-xl border border-hairline bg-white p-3.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-dark">
                        {String(c.count_date ?? '').slice(0, 10) || 'Comptage'}
                      </Text>
                      <Text className="text-[11px] font-semibold uppercase text-grayText">
                        {c.status}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-grayText">
                      {items.length} ligne(s) · {gaps} écart(s)
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
