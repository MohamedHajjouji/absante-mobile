import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { getStockLevels, StockLevelRow } from '@/lib/services/erp/stock-service';
import { getLocations } from '@/lib/services/erp/catalog-service';
import { locationTypeLabels } from '@/lib/erp/labels';
import { formatNumber } from '@/lib/erp/format';
import { ErpSearchInput } from '@/components/erp/ErpSearchInput';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpFilterChips, ErpChipOption } from '@/components/erp/ErpFilterChips';
import { RecordMovementSheet } from '@/components/erp/RecordMovementSheet';

export default function StockLevelsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<StockLevelRow[]>([]);
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<{ id: string; name: string; location_type: string }[]>([]);
  const [locationId, setLocationId] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const [lvls, locs] = await Promise.all([
          getStockLevels({ search, locationId: locationId === 'all' ? undefined : locationId }),
          getLocations(),
        ]);
        setRows(lvls);
        setLocations(locs);
      } catch (e) {
        console.error('Stock levels load', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, locationId]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Re-run the query when the search term settles (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const chipOptions: ErpChipOption[] = [
    { value: 'all', label: 'Tous' },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const isLow = (r: StockLevelRow) => r.productMin != null && r.quantity <= r.productMin;


  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Stock',
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
          <View className="px-5 pb-3">
            <ErpSearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un produit…" />
          </View>
          <ErpFilterChips options={chipOptions} value={locationId} onChange={setLocationId} />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {rows.length === 0 ? (
              <ErpEmptyState
                icon="cube"
                title="Aucune ligne de stock"
                subtitle="Enregistrez un mouvement pour alimenter votre stock."
              />
            ) : (
              <View className="gap-2.5">
                {rows.map((r) => (
                  <View
                    key={r.balanceId}
                    className={`rounded-xl border bg-white p-4 ${
                      isLow(r) ? 'border-red-200' : 'border-hairline'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                          {r.productName}
                        </Text>
                        <Text className="mt-0.5 text-xs text-grayText">
                          {r.locationName} · {locationTypeLabels[r.locationType] ?? r.locationType}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-base font-bold ${isLow(r) ? 'text-[#c13515]' : 'text-dark'}`}
                        >
                          {formatNumber(r.quantity)}
                          {r.unitLabel ? ` ${r.unitLabel}` : ''}
                        </Text>
                        {isLow(r) ? (
                          <View className="mt-0.5 rounded-full bg-red-50 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-[#c13515]">Stock faible</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer un mouvement"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      <RecordMovementSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}
