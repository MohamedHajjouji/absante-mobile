import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import {
  getProducts,
  getCategories,
  getUnits,
  saveProduct,
  ErpProductRow,
} from '@/lib/services/erp/catalog-service';
import { getProductStockSummary, ProductStockSummary, recordMovement } from '@/lib/services/erp/stock-service';
import { erpDeactivate } from '@/lib/erp/client';
import { formatMAD, formatNumber } from '@/lib/erp/format';
import { ErpSearchInput } from '@/components/erp/ErpSearchInput';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import { ErpOptionPicker, ErpOption } from '@/components/erp/ErpOptionPicker';
import { SwitchPill } from '@/components/ui/SwitchPill';
import { UnitPriceRow } from '@/components/erp/ProductUnitPriceRow';
import { Category, Unit, ProductUnit } from '@/lib/erp/types';
import {
  pickImageFromLibrary,
  takePhoto,
  uploadErpFile,
} from '@/lib/services/erp/storage-service';

interface UnitPickerOption {
  value: string;
  label: string;
  symbol?: string;
}

interface EditingUnit {
  id: string | null;
  unitId: string | null;
  unitName: string;
  symbol?: string | null;
  purchase: string;
  selling: string;
  isDefault: boolean;
}

interface FormState {
  id?: string;
  name: string;
  reference: string;
  brand: string;
  imageUrl: string;
  categoryId: string | null;
  minimumStock: string;
  maximumStock: string;
  isSellable: boolean;
  isRentable: boolean;
  editingUnits: EditingUnit[];
}

const EMPTY_FORM: FormState = {
  name: '',
  reference: '',
  brand: '',
  imageUrl: '',
  categoryId: null,
  minimumStock: '',
  maximumStock: '',
  isSellable: true,
  isRentable: false,
  editingUnits: [],
};

export default function ProductsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ErpProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockSummary, setStockSummary] = useState<Map<string, ProductStockSummary>>(new Map());
  const [search, setSearch] = useState('');

      const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const attachProductPhoto = () => {
    Alert.alert('Photo du produit', 'Source', [
      {
        text: 'Appareil photo',
        onPress: () => uploadPickedPhoto(takePhoto()),
      },
      {
        text: 'Galerie',
        onPress: () => uploadPickedPhoto(pickImageFromLibrary()),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const uploadPickedPhoto = async (
    pick: Promise<{ uri: string; name: string; mimeType: string | null; size: number | null } | null>
  ) => {
    setUploadingPhoto(true);
    try {
      const file = await pick;
      if (!file) return;
      const res = await uploadErpFile(file, 'produits');
      if (!res.ok) {
        Alert.alert('Échec', res.message ?? 'Téléversement impossible.');
        return;
      }
      setForm((f) => ({ ...f, imageUrl: res.url ?? '' }));
    } catch (e) {
      Alert.alert('Échec', e instanceof Error ? e.message : 'Téléversement impossible.');
    } finally {
      setUploadingPhoto(false);
    }
  };
  const [picker, setPicker] = useState<null | 'category' | 'stockProductUnit' | 'stockLocation'>(null);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [allUnits, setAllUnits] = useState<UnitPickerOption[]>([]);

    const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const [prods, cats, units, stock] = await Promise.all([getProducts(search), getCategories(), getUnits(), getProductStockSummary()]);
        setProducts(prods);
        setCategories(cats);
        setAllUnits(units.map((u) => ({ value: u.id, label: u.name, symbol: u.symbol })));
        setStockSummary(new Map(stock.map((s) => [s.productId, s])));
      } catch (e) {
        console.error('Products load', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

    const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const updateUnit = (idx: number, updates: Partial<EditingUnit>) => {
    setForm((f) => {
      const newUnits = [...f.editingUnits];
      newUnits[idx] = { ...newUnits[idx], ...updates };
      if (updates.isDefault === true) {
        newUnits.forEach((u, i) => {
          if (i !== idx) u.isDefault = false;
        });
      }
      return { ...f, editingUnits: newUnits };
    });
  };

  const openCreate = () => {
    const first = allUnits[0];
    setForm({
      ...EMPTY_FORM,
      editingUnits: first
        ? [
            {
              id: null,
              unitId: first.value,
              unitName: first.label,
              symbol: first.symbol ?? null,
              purchase: '',
              selling: '',
              isDefault: true,
            },
          ]
        : [],
    });
    setFormOpen(true);
  };

  const openEdit = (p: ErpProductRow) => {
    const editingUnits = p.product_units.map((u) => ({
      id: u.id ?? null,
      unitId: u.unit_id ?? null,
      unitName: u.unit?.name ?? '',
      symbol: u.unit?.symbol ?? null,
      purchase: u.purchase_price != null ? String(u.purchase_price) : '',
      selling: u.selling_price != null ? String(u.selling_price) : '',
      isDefault: u.is_default,
    }));
    setForm({
      id: p.id,
      name: p.name,
      reference: p.reference,
      brand: p.brand ?? '',
      imageUrl: p.image_url ?? '',
      categoryId: p.category_id ?? null,
      minimumStock: p.minimum_stock != null ? String(p.minimum_stock) : '',
      maximumStock: p.maximum_stock != null ? String(p.maximum_stock) : '',
      isSellable: p.is_sellable,
      isRentable: p.is_rentable,
      editingUnits,
    });
    setFormOpen(true);
  };

    const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Champ requis', 'Le nom du produit est requis.');
      return;
    }
    const min = form.minimumStock ? parseFloat(form.minimumStock.replace(',', '.')) : null;
    const max = form.maximumStock ? parseFloat(form.maximumStock.replace(',', '.')) : null;
    if (min != null && Number.isNaN(min)) {
      Alert.alert('Valeur invalide', 'Le stock minimum doit être un nombre.');
      return;
    }
    if (max != null && Number.isNaN(max)) {
      Alert.alert('Valeur invalide', 'Le stock maximum doit être un nombre.');
      return;
    }

    // Validate & convert unit prices
    const invalidUnit = form.editingUnits.find((u) => {
      const p = u.purchase ? parseFloat(u.purchase.replace(',', '.')) : null;
      const s = u.selling ? parseFloat(u.selling.replace(',', '.')) : null;
      if (u.purchase && (p === null || Number.isNaN(p) || p < 0)) return true;
      if (u.selling && (s === null || Number.isNaN(s) || s < 0)) return true;
      return false;
    });
    if (invalidUnit) {
      Alert.alert('Valeur invalide', 'Les prix doivent être des nombres positifs.');
      return;
    }

    setSaving(true);
    try {
    const units = form.editingUnits.map((u) => ({
      id: u.id ?? undefined,
      unit_id: u.unitId ?? undefined,
      purchase_price: u.purchase ? parseFloat(u.purchase.replace(',', '.')) : null,
      selling_price: u.selling ? parseFloat(u.selling.replace(',', '.')) : null,
      is_default: u.isDefault,
    }));
    const res = await saveProduct({
      id: form.id,
      name: form.name,
      reference: form.reference || undefined,
      brand: form.brand || null,
      image_url: form.imageUrl.trim() || null,
      category_id: form.categoryId,
      minimum_stock: min,
      maximum_stock: max,
      is_sellable: form.isSellable,
      is_rentable: form.isRentable,
      units,
    });
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le produit.");
      return;
    }
    setFormOpen(false);
    load();
    } catch (e) {
      console.error('Failed to save product:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = (p: ErpProductRow) => {
    Alert.alert('Désactiver le produit', `« ${p.name} » sera masqué du catalogue. Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await erpDeactivate('products', p.id);
            if (!res.ok) {
              Alert.alert('Erreur', res.message ?? 'Impossible de désactiver le produit.');
              return;
            }
            setFormOpen(false);
            load();
          } catch (e) {
            console.error('Failed to deactivate product:', e);
            Alert.alert('Erreur', "Impossible de désactiver. Vérifiez votre connexion.");
          }
        },
      },
    ]);
  };

  // Stock adjustment state
  const [adjustStockProduct, setAdjustStockProduct] = useState<ErpProductRow | null>(null);
  const [adjustStockForm, setAdjustStockForm] = useState<{
    productUnitId: string;
    locationId: string;
    movementType: 'adjustment_in' | 'adjustment_out';
    quantity: string;
    unitCost: string;
    notes: string;
  }>({
    productUnitId: '',
    locationId: '',
    movementType: 'adjustment_in',
    quantity: '',
    unitCost: '',
    notes: '',
  });
  const [adjustStockSheetOpen, setAdjustStockSheetOpen] = useState(false);
  const [adjustStockSaving, setAdjustStockSaving] = useState(false);

  const openAdjustStock = (p: ErpProductRow) => {
    // Default to first product unit and first location
    const firstUnit = (p.product_units ?? [])[0];
    setAdjustStockProduct(p);
    setAdjustStockForm({
      productUnitId: firstUnit?.id || '',
      locationId: '',
      movementType: 'adjustment_in',
      quantity: '',
      unitCost: '',
      notes: '',
    });
    setAdjustStockSheetOpen(true);
  };

  const submitAdjustStock = async () => {
    if (!adjustStockProduct) return;
    if (!adjustStockForm.productUnitId || !adjustStockForm.locationId) {
      Alert.alert('Champs requis', 'Unité de produit et emplacement sont requis.');
      return;
    }
    const qty = parseFloat(adjustStockForm.quantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Quantité invalide', 'La quantité doit être un nombre positif.');
      return;
    }
    setAdjustStockSaving(true);
    try {
    const res = await recordMovement({
      productId: adjustStockProduct.id,
      productUnitId: adjustStockForm.productUnitId,
      locationId: adjustStockForm.locationId,
      movementType: adjustStockForm.movementType,
      quantity: qty,
      unitCost: adjustStockForm.unitCost ? parseFloat(adjustStockForm.unitCost.replace(',', '.')) : null,
      notes: adjustStockForm.notes || null,
      createdBy: null,
    });
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'ajuster le stock.");
      return;
    }
    setAdjustStockSheetOpen(false);
    setAdjustStockProduct(null);
    load();
    } catch (e) {
      console.error('Failed to record movement:', e);
      Alert.alert('Erreur', "Impossible d'ajuster le stock. Vérifiez votre connexion.");
    } finally {
      setAdjustStockSaving(false);
    }
  };

  const categoryOptions: ErpOption[] = categories.map((c) => ({ value: c.id, label: c.name }));

  const defaultPriceOf = (p: ErpProductRow): string | null => {
    const units = p.product_units ?? [];
    const defUnit = units.find((u) => u.is_default) ?? units[0];
    return defUnit?.selling_price != null ? formatMAD(defUnit.selling_price) : null;
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Produits',
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

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {products.length === 0 ? (
              <ErpEmptyState
                icon="pricetags"
                title="Aucun produit"
                subtitle="Ajoutez votre premier produit pour alimenter le catalogue."
                actionLabel="Nouveau produit"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-2.5">
                {products.map((p) => {
                  const price = defaultPriceOf(p);
                  const stock = stockSummary.get(p.id);
                  const currentQty = stock?.currentQuantity ?? 0;
                  const purchasedQty = stock?.quantityPurchased ?? 0;
                  const isLow = p.minimum_stock != null && currentQty <= p.minimum_stock;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => openEdit(p)}
                      className="rounded-xl border border-hairline bg-white p-4"
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${p.name}`}
                    >
                      <View className="flex-row items-center justify-between">
                        {p.image_url ? (
                          <Image
                            source={{ uri: p.image_url }}
                            className="mr-3 h-11 w-11 rounded-xl bg-slate-100"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                            <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                          </View>
                        )}
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                            {[p.reference, p.brand, p.categories?.name].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        {price ? <Text className="text-sm font-bold text-dark">{price}</Text> : null}
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          {p.minimum_stock != null ? (
                            <Text className="text-[11px] text-grayText">
                              Min : {formatNumber(p.minimum_stock)}
                            </Text>
                          ) : null}
                          <View className={`flex-row items-center gap-1.5 ${isLow ? 'text-rose-500' : 'text-emerald-500'}`}>
                            <Ionicons name={isLow ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={12} />
                            <Text className="text-[11px] font-medium">
                              Stock : {formatNumber(currentQty)}
                            </Text>
                          </View>
                          {purchasedQty > 0 ? (
                            <View className="flex-row items-center gap-1.5 text-emerald-600">
                              <Ionicons name="download-outline" size={12} />
                              <Text className="text-[11px] font-medium">
                                Acheté : {formatNumber(purchasedQty)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); openAdjustStock(p); }}
                          className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border border-primary-100 bg-primary-50 text-primary-600 text-xs font-medium"
                          activeOpacity={0.7}
                          accessibilityLabel={`Ajuster stock ${p.name}`}
                        >
                          <Ionicons name="add-circle-outline" size={14} />
                          <Text>Ajuster</Text>
                        </TouchableOpacity>
                      </View>
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
            accessibilityLabel="Nouveau produit"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create / edit sheet */}
      <ErpBottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Nom du produit"
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <TouchableOpacity
          onPress={() => setPicker('category')}
          className="mb-4 flex-row items-center rounded-lg border border-hairline bg-white px-4 py-3.5"
          accessibilityRole="button"
          accessibilityLabel="Catégorie"
        >
          <View className="flex-1">
            <Text className="text-xs font-medium text-grayText">Catégorie</Text>
            <Text className="mt-0.5 text-sm font-semibold text-dark">
              {categories.find((c) => c.id === form.categoryId)?.name ?? 'Sélectionner…'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#929292" />
        </TouchableOpacity>
        <Text className="mb-1.5 text-sm font-medium text-dark">Marque</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Optionnel"
          value={form.brand}
          onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))}
        />
        <Text className="mb-1.5 text-sm font-medium text-dark">Photo (boutique)</Text>
        <View className="mb-4 flex-row items-center gap-3">
          {form.imageUrl ? (
            <View className="relative">
              <Image
                source={{ uri: form.imageUrl }}
                className="h-16 w-16 rounded-xl bg-slate-100"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full border border-hairline bg-white"
                accessibilityLabel="Retirer la photo"
              >
                <Ionicons name="close" size={12} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-xl border border-dashed border-hairline bg-white">
              <Ionicons name="image-outline" size={22} color="#9CA3AF" />
            </View>
          )}
          <View className="flex-1 gap-2">
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="https://…"
              autoCapitalize="none"
              value={form.imageUrl}
              onChangeText={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            />
            <TouchableOpacity
              onPress={attachProductPhoto}
              disabled={uploadingPhoto}
              className="flex-row items-center justify-center rounded-lg border border-hairline bg-white py-2.5"
              activeOpacity={0.8}
              accessibilityLabel="Téléverser une photo"
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#F53E8A" />
              ) : (
                <Ionicons name="camera-outline" size={16} color="#3D4B64" />
              )}
              <Text className="ml-1.5 text-xs font-semibold text-dark">
                {uploadingPhoto ? 'Envoi…' : 'Appareil / Galerie'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-dark">Stock minimum</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="0"
              keyboardType="decimal-pad"
              value={form.minimumStock}
              onChangeText={(v) => setForm((f) => ({ ...f, minimumStock: v }))}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-dark">Stock maximum</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="Optionnel"
              keyboardType="decimal-pad"
              value={form.maximumStock}
              onChangeText={(v) => setForm((f) => ({ ...f, maximumStock: v }))}
            />
          </View>
        </View>

        <View className="mb-4 flex-row items-center justify-between rounded-lg border border-hairline bg-white px-4 py-3">
          <Text className="text-sm font-medium text-dark">Vendable</Text>
          <SwitchPill
            value={form.isSellable}
            onToggle={() => setForm((f) => ({ ...f, isSellable: !f.isSellable }))}
            accessibilityLabel="Produit vendable"
          />
        </View>
        <View className="mb-5 flex-row items-center justify-between rounded-lg border border-hairline bg-white px-4 py-3">
          <Text className="text-sm font-medium text-dark">Louable</Text>
          <SwitchPill
            value={form.isRentable}
            onToggle={() => setForm((f) => ({ ...f, isRentable: !f.isRentable }))}
            accessibilityLabel="Produit louable"
          />
        </View>

        {/* Unités et prix */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-dark">Unités et prix</Text>
          {form.editingUnits.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="cube-outline" size={32} color="#929292" />
              <Text className="mt-2 text-sm text-grayText">
                Aucune unité renseignée.
              </Text>
            </View>
          ) : (
            form.editingUnits.map((u, idx) => (
              <UnitPriceRow
                key={u.id ?? `new-${u.unitId ?? idx}`}
                unitLabel={`${u.unitName}${u.symbol ? ` (${u.symbol})` : ''}`}
                unitId={u.id ?? u.unitId ?? ''}
                purchasePrice={u.purchase}
                sellingPrice={u.selling}
                isDefault={u.isDefault}
                onPurchasePriceChange={(v) => updateUnit(idx, { purchase: v })}
                onSellingPriceChange={(v) => updateUnit(idx, { selling: v })}
                onToggleDefault={() => updateUnit(idx, { isDefault: true })}
              />
            ))
          )}
          {form.id ? null : (
            <TouchableOpacity
              onPress={() => setUnitPickerOpen(true)}
              className="mt-2 flex-row items-center justify-center rounded-lg border border-hairline bg-white py-3"
              accessibilityRole="button"
              accessibilityLabel="Ajouter une unité"
            >
              <Ionicons name="add" size={18} color="#F53E8A" />
              <Text className="ml-1 text-sm font-medium text-primary">
                Ajouter une unité
              </Text>
            </TouchableOpacity>
          )}
        </View>


        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer le produit"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          )}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>

        {form.id ? (
          <TouchableOpacity
            onPress={() => {
              const p = products.find((x) => x.id === form.id);
              if (p) confirmDeactivate(p);
            }}
            className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5"
            accessibilityRole="button"
            accessibilityLabel="Désactiver le produit"
          >
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver le produit</Text>
          </TouchableOpacity>
        ) : null}
</ErpBottomSheet>

      {/* Stock adjustment bottom sheet */}
      <ErpBottomSheet
        visible={adjustStockSheetOpen}
        onClose={() => { setAdjustStockSheetOpen(false); setAdjustStockProduct(null); }}
        title={`Ajuster le stock - ${adjustStockProduct?.name}`}
      >
        <Text className="mb-1.5 text-sm font-medium text-dark">Unité de produit *</Text>
        <TouchableOpacity
          onPress={() => setPicker('stockProductUnit')}
          className="mb-4 flex-row items-center rounded-lg border border-hairline bg-white px-4 py-3.5"
          accessibilityRole="button"
          accessibilityLabel="Unité de produit"
        >
          <View className="flex-1">
            <Text className="text-xs font-medium text-grayText">Unité de produit</Text>
            <Text className="mt-0.5 text-sm font-semibold text-dark">
              {adjustStockProduct?.product_units.find((u) => u.id === adjustStockForm.productUnitId)?.unit?.name ?? 'Sélectionner…'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#929292" />
        </TouchableOpacity>

        <Text className="mb-1.5 text-sm font-medium text-dark">Emplacement *</Text>
        <TouchableOpacity
          onPress={() => setPicker('stockLocation')}
          className="mb-4 flex-row items-center rounded-lg border border-hairline bg-white px-4 py-3.5"
          accessibilityRole="button"
          accessibilityLabel="Emplacement"
        >
          <View className="flex-1">
            <Text className="text-xs font-medium text-grayText">Emplacement</Text>
            <Text className="mt-0.5 text-sm font-semibold text-dark">
              {adjustStockForm.locationId ? 'Sélectionné' : 'Sélectionner…'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#929292" />
        </TouchableOpacity>

        <View className="mb-4 flex-row items-center justify-between rounded-lg border border-hairline bg-white px-4 py-3">
          <Text className="text-sm font-medium text-dark">Type d'ajustement</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setAdjustStockForm((f) => ({ ...f, movementType: 'adjustment_in' }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${adjustStockForm.movementType === 'adjustment_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-grayText border border-hairline'}`}
            >
              Entrée (+)
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAdjustStockForm((f) => ({ ...f, movementType: 'adjustment_out' }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${adjustStockForm.movementType === 'adjustment_out' ? 'bg-rose-100 text-rose-700' : 'bg-white text-grayText border border-hairline'}`}
            >
              Sortie (-)
            </TouchableOpacity>
          </View>
        </View>

        <Text className="mb-1.5 text-sm font-medium text-dark">Quantité *</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Ex. 10"
          keyboardType="decimal-pad"
          value={adjustStockForm.quantity}
          onChangeText={(v) => setAdjustStockForm((f) => ({ ...f, quantity: v }))}
        />

        <Text className="mb-1.5 text-sm font-medium text-dark">Coût unitaire (optionnel)</Text>
        <TextInput
          className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={adjustStockForm.unitCost}
          onChangeText={(v) => setAdjustStockForm((f) => ({ ...f, unitCost: v }))}
        />

        <Text className="mb-1.5 text-sm font-medium text-dark">Notes</Text>
        <TextInput
          className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Raison (inventaire, casse, retour fournisseur...)"
          multiline
          numberOfLines={3}
          value={adjustStockForm.notes}
          onChangeText={(v) => setAdjustStockForm((f) => ({ ...f, notes: v }))}
        />

        <TouchableOpacity
          onPress={submitAdjustStock}
          disabled={adjustStockSaving}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Valider l'ajustement"
        >
          {adjustStockSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          )}
          <Text className="ml-2 text-sm font-semibold text-white">Valider l'ajustement</Text>
        </TouchableOpacity>
      </ErpBottomSheet>

      <ErpOptionPicker
        visible={picker === 'category'}
        onClose={() => setPicker(null)}
        title="Choisir une catégorie"
        options={categoryOptions}
        selected={form.categoryId}
        onSelect={(v) => setForm((f) => ({ ...f, categoryId: v }))}
      />
      <ErpOptionPicker
        visible={unitPickerOpen}
        onClose={() => setUnitPickerOpen(false)}
        title="Choisir une unité"
        options={allUnits}
        selected={null}
        onSelect={(unitId) => {
          const unit = allUnits.find((u) => u.value === unitId);
          if (!unit) return;
          const newUnit: EditingUnit = {
            id: null,
            unitId: unit.value,
            unitName: unit.label,
            symbol: unit.symbol ?? null,
            purchase: '',
            selling: '',
            isDefault: form.editingUnits.length === 0,
          };
          setForm((f) => ({
            ...f,
            editingUnits: [...f.editingUnits, newUnit],
          }));
          setUnitPickerOpen(false);
        }}
      />
      <ErpOptionPicker
        visible={picker === 'stockProductUnit'}
        onClose={() => setPicker(null)}
        title="Choisir une unité de produit"
        options={
          adjustStockProduct?.product_units.map((u) => ({
            value: u.id,
            label: `${u.unit?.name ?? 'Unité'}${u.unit?.symbol ? ` (${u.unit?.symbol})` : ''}`,
          })) ?? []
        }
        selected={adjustStockForm.productUnitId}
        onSelect={(v) => setAdjustStockForm((f) => ({ ...f, productUnitId: v }))}
      />
      <ErpOptionPicker
        visible={picker === 'stockLocation'}
        onClose={() => setPicker(null)}
        title="Choisir un emplacement"
        options={[
          { value: 'loc-1', label: 'Entrepôt principal' },
          { value: 'loc-2', label: 'Magasin secondaire' },
          { value: 'loc-3', label: 'Véhicule 1' },
        ]}
        selected={adjustStockForm.locationId}
        onSelect={(v) => setAdjustStockForm((f) => ({ ...f, locationId: v }))}
      />
    </SafeAreaView>
  );
}

