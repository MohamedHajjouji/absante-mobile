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
import type { StaffMember, StaffSchedule } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';

type Tab = 'members' | 'schedules';

export default function StaffScreen() {
  const [tab, setTab] = useState<Tab>('members');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [m, s] = await Promise.all([
        erpFetch<StaffMember>('staff_members', {
          select: 'id,first_name,last_name,role,phone,email,is_active',
          filters: { is_active: true },
          order: { column: 'last_name', ascending: true },
          limit: 200,
        }),
        erpFetch<StaffSchedule>('staff_schedules', {
          select: 'id,staff_id,schedule_date,start_time,end_time,schedule_type,notes',
          order: { column: 'schedule_date', ascending: false },
          limit: 200,
        }),
      ]);
      setMembers(m);
      setSchedules(s);
    } catch (e) {
      console.error('Staff load', e);
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
    setFirstName('');
    setLastName('');
    setRole('');
    setPhone('');
    setFormOpen(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditId(m.id);
    setFirstName(m.first_name);
    setLastName(m.last_name);
    setRole(m.role ?? '');
    setPhone(m.phone ?? '');
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
      role: role.trim() || 'caregiver',
      phone: phone.trim() || null,
      is_active: true,
    };
    const res = editId
      ? await erpUpdate('staff_members', editId, payload)
      : await erpInsert('staff_members', payload);
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le membre.");
      return;
    }
    setFormOpen(false);
    load();
  };

  const confirmDeactivate = (m: StaffMember) => {
    Alert.alert('Désactiver', `${m.first_name} ${m.last_name} sera masqué(e). Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          const res = await erpDeactivate('staff_members', m.id);
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
          title: 'Staff',
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
            <View className="flex-row gap-2">
              {(['members', 'schedules'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  className={`rounded-full px-4 py-2 ${tab === t ? 'bg-primary' : 'bg-white border border-hairline'}`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-xs font-semibold ${tab === t ? 'text-white' : 'text-dark'}`}>
                    {t === 'members' ? 'Membres' : 'Plannings'}
                  </Text>
                </TouchableOpacity>
              ))}
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
            {tab === 'members' &&
              (members.length === 0 ? (
                <ErpEmptyState
                  icon="people"
                  title="Aucun membre"
                  subtitle="Ajoutez votre équipe soignante."
                  actionLabel="Nouveau membre"
                  onAction={openCreate}
                />
              ) : (
                <View className="gap-2.5">
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => openEdit(m)}
                      className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                      activeOpacity={0.8}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                        <Ionicons name="person" size={18} color="#0D9488" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                          {m.first_name} {m.last_name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                          {[m.role, m.phone].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            {tab === 'schedules' &&
              (schedules.length === 0 ? (
                <ErpEmptyState icon="calendar" title="Aucun planning" subtitle="Les plannings créés sur le web apparaîtront ici." />
              ) : (
                <View className="gap-2.5">
                  {schedules.map((s) => (
                    <View key={s.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <Text className="text-sm font-semibold text-dark">{s.schedule_date}</Text>
                      <Text className="mt-1 text-xs text-grayText">
                        {[s.start_time, s.end_time].filter(Boolean).join(' → ') || s.schedule_type}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
          </ScrollView>
          {tab === 'members' && (
            <TouchableOpacity
              onPress={openCreate}
              className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
              activeOpacity={0.8}
              accessibilityLabel="Nouveau membre"
            >
              <Ionicons name="add" size={26} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      )}
      <ErpBottomSheet visible={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Modifier le membre' : 'Nouveau membre'}>
        <Text className="mb-1.5 text-sm font-medium text-dark">Prénom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Salma"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : El Fassi"
          value={lastName}
          onChangeText={setLastName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Rôle</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Infirmière"
          value={role}
          onChangeText={setRole}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Téléphone</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="06 XX XX XX XX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
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
              const m = members.find((x) => x.id === editId);
              if (m) {
                setFormOpen(false);
                confirmDeactivate(m);
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
