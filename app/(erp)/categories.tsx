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
import {
  getCategories,
  saveCategory,
  deactivateCategory,
} from '@/lib/services/erp/catalog-service';
import type { Category } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';

/**
 * Product categories (`ab_erp.categories`) — reference data for the catalogue.
 * Mirrors the `locations.tsx` CRUD pattern: list + bottom-sheet form + soft delete
 * (`is_active = false`), so categories referenced by products are never orphaned.
 */
export default function CategoriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setCategories(await getCategories());
    } catch (e) {
      console.error('Categories load', e);
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
    setDescription('');
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditId(c.id);
    setName(c.name);
    setDescription(c.description ?? '');
    setFormOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    const res = await saveCategory({ id: editId ?? undefined, name, description });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer la catégorie.");
      return;
    }
    setFormOpen(false);
    load();
  };

  const confirmDeactivate = (c: Category) => {
    Alert.alert('Désactiver', `« ${c.name} » sera masquée. Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          const res = await deactivateCategory(c.id);
          if (!res.ok) {
            Alert.alert('Erreur', res.message ?? 'Impossible de désactiver la catégorie.');
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
          title: 'Catégories',
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
            {categories.length === 0 ? (
              <ErpEmptyState
                icon="pricetags"
                title="Aucune catégorie"
                subtitle="Créez une catégorie pour classer vos produits."
                actionLabel="Nouvelle catégorie"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => openEdit(c)}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={c.name}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                      <Ionicons name="pricetag" size={18} color="#10B981" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {c.name}
                      </Text>
                      {c.description ? (
                        <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                          {c.description}
                        </Text>
                      ) : null}
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
            accessibilityLabel="Nouvelle catégorie"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create / edit sheet */}
      <ErpBottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      >
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Diagnostic"
          value={name}
          onChangeText={setName}
        />

        <Text className="mb-1.5 text-sm font-medium text-dark">Description</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Optionnel"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer la catégorie"
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
              const c = categories.find((x) => x.id === editId);
              if (c) confirmDeactivate(c);
            }}
            className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5"
            accessibilityRole="button"
            accessibilityLabel="Désactiver la catégorie"
          >
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>
    </SafeAreaView>
  );
}
