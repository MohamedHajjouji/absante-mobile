import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { getLocations, saveLocation, deactivateLocation, ErpLocation } from '@/lib/services/erp/catalog-service';
import { LOCATION_TYPES } from '@/lib/erp/constants';
import { locationTypeLabels } from '@/lib/erp/labels';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import { ErpOptionPicker, ErpOption } from '@/components/erp/ErpOptionPicker';

const TYPE_COLORS: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  warehouse: { color: '#0D61B6', bg: '#ECF2FA', icon: 'business' },
  storage_room: { color: '#8B5CF6', bg: '#F5F3FF', icon: 'file-tray' },
  vehicle: { color: '#F59E0B', bg: '#FFFBEB', icon: 'car' },
  clinic: { color: '#10B981', bg: '#ECFDF5', icon: 'medkit' },
  office: { color: '#06B6D4', bg: '#ECFEFF', icon: 'document-text' },
  other: { color: '#6a6a6a', bg: '#F2F2F2', icon: 'help-circle' },
};

export default function LocationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<ErpLocation[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [locationType, setLocationType] = useState<string>('warehouse');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setLocations(await getLocations());
    } catch (e) {
      console.error('Locations load', e);
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
    setLocationType('warehouse');
    setFormOpen(true);
  };

  const openEdit = (l: ErpLocation) => {
    setEditId(l.id);
    setName(l.name);
    setLocationType(l.location_type);
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await saveLocation({ id: editId ?? undefined, name, location_type: locationType });
      if (!res.ok) {
        Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer l'emplacement.");
        return;
      }
      setFormOpen(false);
      load();
    } catch (e) {
      console.error('Failed to save location:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = (l: ErpLocation) => {
    Alert.alert('Désactiver', `« ${l.name} » sera masqué. Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await deactivateLocation(l.id);
            if (!res.ok) {
              Alert.alert('Erreur', res.message ?? "Impossible de désactiver l'emplacement.");
              return;
            }
            setFormOpen(false);
            load();
          } catch (e) {
            console.error('Failed to deactivate location:', e);
            Alert.alert('Erreur', "Impossible de désactiver. Vérifiez votre connexion.");
          }
        },
      },
    ]);
  };

  const typeOptions: ErpOption[] = LOCATION_TYPES.map((t) => ({ value: t, label: locationTypeLabels[t] ?? t }));
  const meta = TYPE_COLORS[locationType] ?? TYPE_COLORS.other;


  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Emplacements',
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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {locations.length === 0 ? (
              <ErpEmptyState
                icon="business"
                title="Aucun emplacement"
                subtitle="Créez votre premier emplacement de stock (entrepôt, véhicule, clinique…)."
                actionLabel="Nouvel emplacement"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {locations.map((l) => {
                  const m = TYPE_COLORS[l.location_type] ?? TYPE_COLORS.other;
                  return (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => openEdit(l)}
                      className="flex-row items-center rounded-xl border border-hairline bg-white p-4"
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${l.name}`}
                    >
                      <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: m.bg }}>
                        <Ionicons name={m.icon} size={20} color={m.color} />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark">{l.name}</Text>
                        <Text className="mt-0.5 text-xs text-grayText">
                          {locationTypeLabels[l.location_type] ?? l.location_type}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            onPress={openCreate}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Nouvel emplacement"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create / edit sheet */}
      <ErpBottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Modifier l'emplacement" : 'Nouvel emplacement'}
      >
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Entrepôt principal"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          onPress={() => setPicker(true)}
          className="mb-5 flex-row items-center rounded-lg border border-hairline bg-white px-4 py-3.5"
          accessibilityRole="button"
          accessibilityLabel="Type d'emplacement"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xs font-medium text-grayText">Type</Text>
            <Text className="mt-0.5 text-sm font-semibold text-dark">
              {locationTypeLabels[locationType] ?? locationType}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#929292" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer l'emplacement"
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
              const l = locations.find((x) => x.id === editId);
              if (l) confirmDeactivate(l);
            }}
            className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5"
            accessibilityRole="button"
            accessibilityLabel="Désactiver l'emplacement"
          >
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>

      <ErpOptionPicker
        visible={picker}
        onClose={() => setPicker(false)}
        title="Type d'emplacement"
        options={typeOptions}
        selected={locationType}
        onSelect={setLocationType}
      />
    </SafeAreaView>
  );
}
