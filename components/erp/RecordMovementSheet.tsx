import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErpBottomSheet } from './ErpBottomSheet';
import { ErpOptionPicker, ErpOption } from './ErpOptionPicker';
import { getProducts, getLocations, ErpProductRow } from '@/lib/services/erp/catalog-service';
import { recordMovement } from '@/lib/services/erp/stock-service';
import { MOVEMENT_TYPES } from '@/lib/erp/constants';
import { movementTypeLabels } from '@/lib/erp/labels';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * "Nouveau mouvement de stock" form — product → unit → location → type →
 * quantity. Writes go through the atomic `ab_erp_record_stock_movement` RPC.
 */
export function RecordMovementSheet({ visible, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<ErpProductRow[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; location_type: string }[]>([]);

  const [productId, setProductId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  const [picker, setPicker] = useState<null | 'product' | 'unit' | 'location' | 'type'>(null);

  const product = products.find((p) => p.id === productId) ?? null;
  const units = product?.product_units ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, locs] = await Promise.all([getProducts(), getLocations()]);
      setProducts(prods);
      setLocations(locs);
    } catch (e) {
      console.error('RecordMovementSheet load', e);
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const reset = () => {
    setProductId(null);
    setUnitId(null);
    setLocationId(null);
    setMovementType(null);
    setQuantity('');
    setUnitCost('');
    setNotes('');
  };

  const productOptions: ErpOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.reference,
  }));

  const unitOptions: ErpOption[] = units.map((pu) => ({
    value: pu.id,
    label: pu.unit?.name ?? 'Unité',
    description: [
      pu.is_default ? 'Par défaut' : null,
      pu.selling_price != null ? `Vente : ${pu.selling_price} MAD` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
  }));

  const locationOptions: ErpOption[] = locations.map((l) => ({ value: l.id, label: l.name }));
  const typeOptions: ErpOption[] = MOVEMENT_TYPES.map((t) => ({ value: t, label: movementTypeLabels[t] ?? t }));

  const selectedUnit = units.find((u) => u.id === unitId);
  const selectedLocation = locations.find((l) => l.id === locationId);

  const submit = async () => {
    if (!productId || !unitId || !locationId || !movementType) {
      Alert.alert('Champs manquants', 'Sélectionnez un produit, une unité, un emplacement et un type de mouvement.');
      return;
    }
    const qty = parseFloat(quantity.replace(',', '.'));
    if (!qty || qty <= 0) {
      Alert.alert('Quantité invalide', 'La quantité doit être supérieure à 0.');
      return;
    }
    setSaving(true);
    const res = await recordMovement({
      productId,
      productUnitId: unitId,
      locationId,
      movementType,
      quantity: qty,
      unitCost: unitCost ? parseFloat(unitCost.replace(',', '.')) : null,
      notes: notes.trim() || null,
      createdBy: user?.id ?? null,
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le mouvement.");
      return;
    }
    reset();
    onSaved();
  };

  const close = () => {
    reset();
    onClose();
  };

  const Selector = ({
    label,
    value,
    placeholder,
    onPress,
  }: {
    label: string;
    value?: string | null;
    placeholder: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 flex-row items-center rounded-lg border border-hairline bg-white px-4 py-3.5"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="flex-1">
        <Text className="text-xs font-medium text-grayText">{label}</Text>
        <Text className={`mt-0.5 text-sm font-semibold ${value ? 'text-dark' : 'text-grayText'}`}>
          {value ?? placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={16} color="#929292" />
    </TouchableOpacity>
  );

  return (
    <ErpBottomSheet
      visible={visible}
      onClose={close}
      title="Nouveau mouvement"
      subtitle="Enregistrer une entrée ou une sortie de stock"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#F53E8A" style={{ marginVertical: 24 }} />
      ) : (
        <>
          <Selector
            label="Produit"
            value={product?.name}
            placeholder="Sélectionner un produit"
            onPress={() => setPicker('product')}
          />
          <Selector
            label="Unité"
            value={selectedUnit?.unit?.name}
            placeholder="Sélectionner une unité"
            onPress={() => setPicker('unit')}
          />
          <Selector
            label="Emplacement"
            value={selectedLocation?.name}
            placeholder="Sélectionner un emplacement"
            onPress={() => setPicker('location')}
          />
          <Selector
            label="Type de mouvement"
            value={movementType ? movementTypeLabels[movementType] : null}
            placeholder="Sélectionner un type"
            onPress={() => setPicker('type')}
          />

          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-dark">Quantité *</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="0"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-dark">Coût unitaire (MAD)</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="Optionnel"
              keyboardType="decimal-pad"
              value={unitCost}
              onChangeText={setUnitCost}
            />
          </View>

          <View className="mb-5">
            <Text className="mb-1.5 text-sm font-medium text-dark">Notes</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark"
              placeholderTextColor="#929292"
              placeholder="Optionnel"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity
            onPress={submit}
            disabled={saving}
            className="flex-row items-center justify-center rounded-lg bg-primary py-4"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le mouvement"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Option pickers */}
      <ErpOptionPicker
        visible={picker === 'product'}
        onClose={() => setPicker(null)}
        title="Choisir un produit"
        options={productOptions}
        selected={productId}
        onSelect={(v) => {
          setProductId(v);
          const p = products.find((x) => x.id === v);
          const def = p?.product_units.find((u) => u.is_default) ?? p?.product_units[0];
          setUnitId(def?.id ?? null);
        }}
      />
      <ErpOptionPicker
        visible={picker === 'unit'}
        onClose={() => setPicker(null)}
        title="Choisir une unité"
        options={unitOptions}
        selected={unitId}
        onSelect={setUnitId}
      />
      <ErpOptionPicker
        visible={picker === 'location'}
        onClose={() => setPicker(null)}
        title="Choisir un emplacement"
        options={locationOptions}
        selected={locationId}
        onSelect={setLocationId}
      />
      <ErpOptionPicker
        visible={picker === 'type'}
        onClose={() => setPicker(null)}
        title="Type de mouvement"
        options={typeOptions}
        selected={movementType}
        onSelect={setMovementType}
      />
    </ErpBottomSheet>
  );
}

