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
import type { ErpPatient } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';

export default function PatientsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<ErpPatient[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      setPatients(
        await erpFetch<ErpPatient>('erp_patients', {
          select: 'id,first_name,last_name,phone,email,city,is_active',
          search: q ? { query: q, columns: ['first_name', 'last_name', 'phone'] } : undefined,
          filters: { is_active: true },
          order: { column: 'last_name', ascending: true },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Patients load', e);
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
    setFirstName('');
    setLastName('');
    setPhone('');
    setCity('');
    setFormOpen(true);
  };

  const openEdit = (p: ErpPatient) => {
    setEditId(p.id);
    setFirstName(p.first_name);
    setLastName(p.last_name);
    setPhone(p.phone ?? '');
    setCity(p.city ?? '');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Prénom et nom requis.');
      return;
    }
    setSaving(true);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
      is_active: true,
    };
    const res = editId
      ? await erpUpdate('erp_patients', editId, payload)
      : await erpInsert('erp_patients', payload);
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le patient.");
      return;
    }
    setFormOpen(false);
    load();
  };

  const confirmDeactivate = (p: ErpPatient) => {
    Alert.alert('Désactiver', `${p.first_name} ${p.last_name} sera masqué(e). Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          const res = await erpDeactivate('erp_patients', p.id);
          if (!res.ok) Alert.alert('Erreur', res.message ?? 'Impossible de désactiver.');
          else load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Patients',
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
                placeholder="Rechercher un patient…"
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
            {patients.length === 0 ? (
              <ErpEmptyState
                icon="person"
                title="Aucun patient"
                subtitle="Ajoutez les dossiers de vos patients."
                actionLabel="Nouveau patient"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {patients.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => openEdit(p)}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                    activeOpacity={0.8}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                      <Ionicons name="person" size={18} color="#8B5CF6" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {p.first_name} {p.last_name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                        {[p.phone, p.city].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={openCreate}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityLabel="Nouveau patient"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
      <ErpBottomSheet visible={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Modifier le patient' : 'Nouveau patient'}>
        <Text className="mb-1.5 text-sm font-medium text-dark">Prénom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Khadija"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Bennani"
          value={lastName}
          onChangeText={setLastName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Téléphone</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="06 XX XX XX XX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Ville</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Rabat"
          value={city}
          onChangeText={setCity}
        />
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
            onPress={() => {
              const p = patients.find((x) => x.id === editId);
              if (p) {
                setFormOpen(false);
                confirmDeactivate(p);
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
