import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { getMovements, isMovementRpcAvailable, MovementRow } from '@/lib/services/erp/stock-service';
import { MOVEMENT_TYPES } from '@/lib/erp/constants';
import { movementTypeLabels } from '@/lib/erp/labels';
import { formatDate, formatDateTime, formatNumber } from '@/lib/erp/format';
import { ErpFilterChips, ErpChipOption } from '@/components/erp/ErpFilterChips';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { RecordMovementSheet } from '@/components/erp/RecordMovementSheet';

const PAGE_SIZE = 20;

export default function MovementsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [movementType, setMovementType] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rpcReady, setRpcReady] = useState(true);

  const fetchPage = useCallback(
    async (offset: number) =>
      getMovements({
        movementType: movementType === 'all' ? undefined : movementType,
        limit: PAGE_SIZE,
        offset,
      }),
    [movementType]
  );

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const { data, total: t } = await fetchPage(0);
        setRows(data);
        setTotal(t);
      } catch (e) {
        console.error('Movements load', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // Probe the atomic RPC once, so the screen explains itself up-front when
  // `edit-erp-rpcs.sql` has not been applied yet instead of failing after the
  // user has filled in the whole form.
  useEffect(() => {
    let active = true;
    isMovementRpcAvailable()
      .then((ok) => {
        if (active) setRpcReady(ok);
      })
      .catch((e) => console.error('RPC availability probe failed:', e));
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || rows.length >= total) return;
    setLoadingMore(true);
    try {
      const { data } = await fetchPage(rows.length);
      setRows((prev) => [...prev, ...data]);
    } catch (e) {
      console.error('Failed to load more movements:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, rows.length, total]);

  const chipOptions: ErpChipOption[] = [
    { value: 'all', label: 'Tous' },
    ...MOVEMENT_TYPES.map((t) => ({ value: t, label: movementTypeLabels[t] ?? t })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mouvements de stock',
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
          <ErpFilterChips options={chipOptions} value={movementType} onChange={setMovementType} />

            {!rpcReady ? (
              <View className="mx-5 mt-3 flex-row items-start rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text className="ml-2.5 flex-1 text-xs leading-5 text-amber-800">
                  La saisie de mouvements est indisponible : appliquez « edit-erp-rpcs.sql » dans
                  Supabase pour activer l&apos;écriture du stock.
                </Text>
              </View>
            ) : null}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {rows.length === 0 ? (
              <ErpEmptyState
                icon="swap-horizontal"
                title="Aucun mouvement"
                subtitle="Les entrées et sorties de stock apparaîtront ici."
              />
            ) : (
              <View className="gap-2.5">
                {rows.map((m) => (
                  <View key={m.id} className="rounded-xl border border-hairline bg-white p-4">
                    <View className="flex-row items-center">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          m.isInbound ? 'bg-emerald-50' : 'bg-orange-50'
                        }`}
                      >
                        <Ionicons
                          name={m.isInbound ? 'arrow-down' : 'arrow-up'}
                          size={18}
                          color={m.isInbound ? '#10B981' : '#EA580C'}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                          {m.productName}
                          {m.unitLabel ? ` (${m.unitLabel})` : ''}
                        </Text>
                        <Text className="mt-0.5 text-xs text-grayText">
                          {movementTypeLabels[m.movementType] ?? m.movementType} · {m.locationName}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm font-bold ${m.isInbound ? 'text-emerald-600' : 'text-[#EA580C]'}`}
                      >
                        {m.isInbound ? '+' : '−'}
                        {formatNumber(m.quantity)}
                      </Text>
                    </View>
                    <View className="mt-2.5 flex-row items-center justify-between border-t border-hairline pt-2.5">
                      <Text className="text-[11px] text-grayText">{formatDateTime(m.createdAt)}</Text>
                      {m.unitCost != null && m.unitCost > 0 ? (
                        <Text className="text-[11px] font-medium text-grayText">
                          Coût : {formatNumber(m.unitCost)} MAD
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}

                {rows.length < total ? (
                  <TouchableOpacity
                    onPress={loadMore}
                    disabled={loadingMore}
                    className="items-center rounded-lg border border-hairline bg-white py-3"
                    accessibilityRole="button"
                    accessibilityLabel="Charger plus"
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#F53E8A" />
                    ) : (
                      <Text className="text-sm font-medium text-primary">
                        Charger plus ({total - rows.length} restants)
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            disabled={!rpcReady}
            className={`absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-pill ${
              rpcReady ? 'bg-primary' : 'bg-grayText'
            }`}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: !rpcReady }}
            accessibilityLabel="Nouveau mouvement"
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

