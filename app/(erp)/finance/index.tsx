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
import { Linking } from 'react-native';
import { erpFetch, erpInsert, erpUpdate } from '@/lib/erp/client';
import type { Expense, ExpenseCategory } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import {
  pickAnyFile,
  pickImageFromLibrary,
  takePhoto,
  uploadErpFile,
} from '@/lib/services/erp/storage-service';

type Tab = 'expenses' | 'categories';

export default function FinanceScreen() {
  const [tab, setTab] = useState<Tab>('expenses');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const [expOpen, setExpOpen] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCatId, setExpCatId] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expReceipt, setExpReceipt] = useState('');
  const [expSaving, setExpSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [e, c] = await Promise.all([
        erpFetch<Expense>('expenses', {
          select: 'id,expense_number,category_id,amount,expense_date,payment_method,notes,receipt_url',
          order: { column: 'expense_date', ascending: false },
          limit: 200,
        }),
        erpFetch<ExpenseCategory>('expense_categories', {
          select: 'id,name,description',
          order: { column: 'name', ascending: true },
          limit: 200,
        }),
      ]);
      setExpenses(e);
      setCategories(c);
    } catch (err) {
      console.error('Finance load', err);
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

  const catNameById = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? '—';

  const money = (v: number) =>
    new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

  const totalMonth = expenses
    .filter((e) => (e.expense_date ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const submitCategory = async () => {
    if (!catName.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }
    setSaving(true);
    const res = await erpInsert('expense_categories', {
      name: catName.trim(),
      description: catDesc.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer la catégorie.");
      return;
    }
    setFormOpen(false);
    setCatName('');
    setCatDesc('');
    load();
  };

  const submitExpense = async () => {
    const amount = Number(String(expAmount).replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Erreur', 'Montant invalide.');
      return;
    }
    if (!expCatId) {
      Alert.alert('Erreur', 'Choisissez une catégorie.');
      return;
    }
    setExpSaving(true);
    const res = await erpInsert('expenses', {
      expense_number: `EXP-${Date.now().toString(36).toUpperCase()}`,
      category_id: expCatId,
      amount,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      notes: expNotes.trim() || null,
      receipt_url: expReceipt.trim() || null,
    });
    setExpSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer la dépense.");
      return;
    }
    setExpOpen(false);
    setExpAmount('');
    setExpNotes('');
    setExpReceipt('');
    load();
  };

  const attachReceipt = () => {
    Alert.alert('Joindre un reçu', 'Source du fichier', [
      {
        text: 'Photo',
        onPress: () => uploadPicked(takePhoto()),
      },
      {
        text: 'Galerie',
        onPress: () => uploadPicked(pickImageFromLibrary()),
      },
      {
        text: 'Fichier',
        onPress: () => uploadPicked(pickAnyFile()),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const uploadPicked = async (pick: Promise<{ uri: string; name: string; mimeType: string | null; size: number | null } | null>) => {
    setUploading(true);
    try {
      const file = await pick;
      if (!file) return;
      const res = await uploadErpFile(file, 'recus');
      if (!res.ok) {
        Alert.alert('Échec', res.message ?? 'Téléversement impossible.');
        return;
      }
      setExpReceipt(res.url ?? '');
    } catch (e) {
      Alert.alert('Échec', e instanceof Error ? e.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Finance',
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
            <View className="rounded-2xl border border-hairline bg-white p-4">
              <Text className="text-xs font-medium text-grayText">Dépenses ce mois-ci</Text>
              <Text className="mt-1 text-2xl font-bold text-dark">{money(totalMonth)} MAD</Text>
              <Text className="mt-0.5 text-xs text-grayText">{expenses.length} dépense(s) au total</Text>
            </View>
            <View className="mt-3 flex-row gap-2">
              {(['expenses', 'categories'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  className={`rounded-full px-4 py-2 ${tab === t ? 'bg-primary' : 'bg-white border border-hairline'}`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-xs font-semibold ${tab === t ? 'text-white' : 'text-dark'}`}>
                    {t === 'expenses' ? 'Dépenses' : 'Catégories'}
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
            {tab === 'expenses' &&
              (expenses.length === 0 ? (
                <ErpEmptyState
                  icon="cash"
                  title="Aucune dépense"
                  subtitle="Enregistrez votre première dépense."
                  actionLabel="Nouvelle dépense"
                  onAction={() => setExpOpen(true)}
                />
              ) : (
                <View className="gap-2.5">
                  {expenses.map((e) => (
                    <View key={e.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>
                          {e.expense_number}
                        </Text>
                        <Text className="text-sm font-bold text-[#c13515]">
                          −{money(e.amount)} MAD
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-xs text-grayText">
                          {[catNameById(e.category_id), e.expense_date].filter(Boolean).join(' · ')}
                        </Text>
                        {e.receipt_url ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(e.receipt_url as string)}
                            className="flex-row items-center rounded-lg bg-emerald-50 px-2.5 py-1.5"
                            accessibilityLabel="Voir le reçu"
                          >
                            <Ionicons name="receipt" size={14} color="#059669" />
                            <Text className="ml-1 text-[11px] font-semibold text-emerald-700">Reçu</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            {tab === 'categories' &&
              (categories.length === 0 ? (
                <ErpEmptyState
                  icon="folder"
                  title="Aucune catégorie"
                  subtitle="Créez des catégories pour classer vos dépenses."
                  actionLabel="Nouvelle catégorie"
                  onAction={() => setFormOpen(true)}
                />
              ) : (
                <View className="gap-2.5">
                  {categories.map((c) => (
                    <View key={c.id} className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
                        <Ionicons name="folder" size={18} color="#DC2626" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark">{c.name}</Text>
                        {c.description ? (
                          <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                            {c.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => (tab === 'expenses' ? setExpOpen(true) : setFormOpen(true))}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityLabel="Ajouter"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
      <ErpBottomSheet visible={formOpen} onClose={() => setFormOpen(false)} title="Nouvelle catégorie">
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : Loyer"
          value={catName}
          onChangeText={setCatName}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Description</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Optionnel"
          value={catDesc}
          onChangeText={setCatDesc}
        />
        <TouchableOpacity
          onPress={submitCategory}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
      </ErpBottomSheet>
      <ErpBottomSheet visible={expOpen} onClose={() => setExpOpen(false)} title="Nouvelle dépense">
        <Text className="mb-1.5 text-sm font-medium text-dark">Montant (MAD) *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. : 500"
          keyboardType="numeric"
          value={expAmount}
          onChangeText={setExpAmount}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Catégorie *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setExpCatId(c.id)}
                className={`rounded-full px-3 py-2 ${expCatId === c.id ? 'bg-primary' : 'bg-white border border-hairline'}`}
              >
                <Text className={`text-xs font-semibold ${expCatId === c.id ? 'text-white' : 'text-dark'}`}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text className="mb-1.5 text-sm font-medium text-dark">Note</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Optionnel"
          value={expNotes}
          onChangeText={setExpNotes}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Reçu / justificatif</Text>
        <TouchableOpacity
          onPress={attachReceipt}
          disabled={uploading}
          className="mb-5 flex-row items-center rounded-lg border border-dashed border-hairline bg-white px-4 py-3.5"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Joindre un reçu"
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#F53E8A" />
          ) : (
            <Ionicons name={expReceipt ? 'checkmark-circle' : 'camera'} size={18} color={expReceipt ? '#059669' : '#9CA3AF'} />
          )}
          <Text className="ml-2 flex-1 text-sm font-medium text-dark" numberOfLines={1}>
            {uploading ? 'Téléversement…' : expReceipt ? 'Reçu joint ✓ (toucher pour remplacer)' : 'Photo, galerie ou fichier…'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submitExpense}
          disabled={expSaving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
        >
          {expSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
      </ErpBottomSheet>
    </SafeAreaView>
  );
}
