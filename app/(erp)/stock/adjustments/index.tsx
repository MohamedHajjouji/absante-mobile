import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { StockAdjustment } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

export default function StockAdjustmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<StockAdjustment[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setRows(
        await erpFetch<StockAdjustment>('stock_adjustments', {
          select: 'id,product_id,adjustment_type,quantity,location_id,reason,performed_by,created_at',
          order: { column: 'created_at', ascending: false },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Adjustments load', e);
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
          title: 'Ajustements',
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
            <ErpEmptyState
              icon="create"
              title="Aucun ajustement"
              subtitle="Ajustez le stock depuis la fiche produit, l'historique apparaîtra ici."
            />
          ) : (
            <View className="gap-2.5">
              {rows.map((a) => {
                const positive = Number(a.quantity ?? 0) >= 0;
                return (
                  <View key={a.id} className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: positive ? '#ECFDF5' : '#FEF2F2' }}
                    >
                      <Ionicons
                        name={positive ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={positive ? '#10B981' : '#DC2626'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {a.adjustment_type} · {a.quantity}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                        {a.reason || String(a.created_at ?? '').slice(0, 16).replace('T', ' ')}
                      </Text>
                    </View>
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
