import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { getUnits, saveUnit, deactivateUnit } from '@/lib/services/erp/catalog-service';
import type { Unit } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';

/**
 * Measurement units (`ab_erp.units`) — e.g. « Boîte » (boîte), « Unité » (u).
 * `symbol` is required by the schema and is what the catalogue shows next to a
 * product name (`product_units.unit.symbol`).
 * Same CRUD pattern as `locations.tsx`.
 */
export default function UnitsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setUnits(await getUnits());
    } catch (e) {
      console.error('Units load', e);
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

  const openCreate = () => {
    setEditId(null);
    setName('');
    setSymbol('');
    setFormOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditId(u.id);
    setName(u.name);
    setSymbol(u.symbol);
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    const res = await saveUnit({ id: editId ?? undefined, name, symbol });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer l'unité.");
      return;
    }
    setFormOpen(false);
    load();
  };

  const confirmDeactivate = (u: Unit) => {
    Alert.alert('Désactiver', `« ${u.name} » sera masquée. Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          const res = await deactivateUnit(u.id);
          if (!res.ok) {
            Alert.alert('Erreur', res.message ?? "Impossible de désactiver l'unité.");
            return;
          }
          setFormOpen(false);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Unités',
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
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />
            }
          >
            {units.length === 0 ? (
              <ErpEmptyState
                icon="beaker"
                title="Aucune unité"
                subtitle="Créez une unité de mesure pour vos produits."
                actionLabel="Nouvelle unité"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {units.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => openEdit(u)}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={u.name}
                  >
                    <View className="h-10 min-w-10 items-center justify-center rounded-full bg-violet-50 px-2">
                      <Text className="text-[11px] font-bold text-violet-600" numberOfLines={1}>
                        {u.symbol}
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {u.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText">Symbole : {u.symbol}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            onPress={openCreate}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle unité"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create / edit sheet */}
      <ErpBottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Modifier l'unité" : 'Nouvelle unité'}
      >
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Boîte"
          value={name}
          onChangeText={setName}
        />

        <Text className="mb-1.5 text-sm font-medium text-dark">Symbole *</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : boîte"
          autoCapitalize="none"
          value={symbol}
          onChangeText={setSymbol}
        />

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer l'unité"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          )}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>

        {editId ? (
          <TouchableOpacity
            onPress={() => {
              const u = units.find((x) => x.id === editId);
              if (u) confirmDeactivate(u);
            }}
            className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5"
            accessibilityRole="button"
            accessibilityLabel="Désactiver l'unité"
          >
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>
    </SafeAreaView>
  );
}