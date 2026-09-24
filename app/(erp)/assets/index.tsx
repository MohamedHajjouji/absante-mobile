import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { Asset } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

const STATUS_COLORS: Record<string, string> = {
  available: '#059669',
  in_use: '#0D61B6',
  rented: '#7C3AED',
  maintenance: '#B45309',
  retired: '#6B7280',
  lost: '#DC2626',
};

export default function AssetsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      setAssets(
        await erpFetch<Asset>('assets', {
          select: 'id,asset_reference,product_id,serial_number,status,condition,location_id,purchase_date,notes',
          search: q ? { query: q, columns: ['asset_reference', 'serial_number'] } : undefined,
          order: { column: 'created_at', ascending: false },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Assets load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    load(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(false), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Actifs',
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
        <View className="flex-1">
          <View className="px-5 pt-3">
            <View className="flex-row items-center rounded-lg border border-hairline bg-white px-3 py-2.5">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                className="ml-2 flex-1 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="Référence, n° de série…"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />
            }
          >
            {assets.length === 0 ? (
              <ErpEmptyState icon="hardware-chip" title="Aucun actif" subtitle="Les équipements suivis apparaîtront ici." />
            ) : (
              <View className="gap-2.5">
                {assets.map((a) => {
                  const color = STATUS_COLORS[a.status] ?? '#6B7280';
                  return (
                    <View key={a.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-dark">{a.asset_reference}</Text>
                        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}14` }}>
                          <Text className="text-[10px] font-semibold" style={{ color }}>
                            {a.status}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-xs text-grayText">
                        {[a.serial_number, a.condition].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
