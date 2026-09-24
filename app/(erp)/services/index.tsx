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
import { erpFetch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';
import type { Service } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';

const money = (v: number | null | undefined) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

export default function ServicesCatalogScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Service[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unitId, setUnitId] = useState('');
  const [units, setUnits] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      const [s, u] = await Promise.all([
        erpFetch<Service>('services', {
          select: 'id,reference,name,description,unit_id,default_price,is_active',
          search: q ? { query: q, columns: ['name', 'reference'] } : undefined,
          filters: { is_active: true },
          order: { column: 'name', ascending: true },
          limit: 200,
        }),
        erpFetch<{ id: string; name: string; symbol: string }>('units', {
          select: 'id,name,symbol',
          filters: { is_active: true },
          order: { column: 'name', ascending: true },
          limit: 100,
        }),
      ]);
      setRows(s);
      setUnits(u);
    } catch (e) {
      console.error('Services load', e);
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

  const openCreate = () => {
    setEditId(null);
    setName('');
    setPrice('');
    setUnitId(units[0]?.id ?? '');
    setFormOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditId(s.id);
    setName(s.name);
    setPrice(String(s.default_price ?? ''));
    setUnitId(s.unit_id ?? units[0]?.id ?? '');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }
    const resolvedUnitId = unitId || units[0]?.id;
    if (!resolvedUnitId && !editId) {
      Alert.alert('Erreur', 'Aucune unité disponible — créez une unité d’abord.');
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      default_price: Number(String(price).replace(',', '.')) || null,
      is_active: true,
    };
    if (resolvedUnitId) payload.unit_id = resolvedUnitId;
    if (!editId) {
      payload.reference = `S-${Date.now().toString(36).toUpperCase()}`;
    }
    const res = editId
      ? await erpUpdate('services', editId, payload)
      : await erpInsert('services', payload);
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le service.");
      return;
    }
    setFormOpen(false);
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Services',
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
                placeholder="Rechercher un service…"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />
            }
          >
            {rows.length === 0 ? (
              <ErpEmptyState
                icon="briefcase"
                title="Aucun service"
                subtitle="Ajoutez vos prestations au catalogue."
                actionLabel="Nouveau service"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {rows.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => openEdit(s)}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                    activeOpacity={0.8}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                      <Ionicons name="briefcase" size={18} color="#059669" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText">{s.reference}</Text>
                    </View>
                    <Text className="text-sm font-bold text-dark">{money(s.default_price)} MAD</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={openCreate}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityLabel="Nouveau service"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
      <ErpBottomSheet visible={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Modifier le service' : 'Nouveau service'}>
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Consultation à domicile"
          value={name}
          onChangeText={setName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Prix par défaut (MAD)</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : 300"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Unité *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          <View className="flex-row gap-2">
            {units.map((u) => (
              <TouchableOpacity
                key={u.id}
                onPress={() => setUnitId(u.id)}
                className={`rounded-full px-3 py-2 ${unitId === u.id ? 'bg-primary' : 'bg-white border border-hairline'}`}
              >
                <Text className={`text-xs font-semibold ${unitId === u.id ? 'text-white' : 'text-dark'}`}>
                  {u.symbol || u.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
        {editId ? (
          <TouchableOpacity
            onPress={async () => {
              const res = await erpDeactivate('services', editId);
              if (!res.ok) Alert.alert('Erreur', res.message ?? 'Impossible de désactiver.');
              else {
                setFormOpen(false);
                load();
              }
            }}
            className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5"
          >
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>
    </SafeAreaView>
  );
}
