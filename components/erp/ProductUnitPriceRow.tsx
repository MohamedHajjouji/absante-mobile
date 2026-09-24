/**
 * Reusable row for a product's unit + purchase/selling prices.
 * Used inside the products edit sheet.
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface UnitPriceRowProps {
  /** Display label, e.g. "Boîte (10 ×unité)". */
  unitLabel: string;
  unitId: string;
  purchasePrice: string;
  sellingPrice: string;
  isDefault: boolean;
  /** Only rendered when the row can be removed (create flow with >1 unit). */
  onRemove?: () => void;
  onPurchasePriceChange: (v: string) => void;
  onSellingPriceChange: (v: string) => void;
  onToggleDefault: () => void;
}

export function UnitPriceRow({
  unitLabel,
  purchasePrice,
  sellingPrice,
  isDefault,
  onRemove,
  onPurchasePriceChange,
  onSellingPriceChange,
  onToggleDefault,
}: UnitPriceRowProps) {
  return (
    <View className="mb-3 rounded-lg border border-hairline bg-white p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-dark">{unitLabel}</Text>
        <TouchableOpacity
          onPress={onToggleDefault}
          className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${
            isDefault ? 'bg-primary/10' : 'bg-gray-100'
          }`}
          accessibilityRole="switch"
          accessibilityLabel="Unité par défaut"
          accessibilityState={{ checked: isDefault }}
        >
          <Ionicons name={isDefault ? 'star' : 'star-outline'} size={14} color={isDefault ? '#F53E8A' : '#929292'} />
          <Text className={`text-xs font-medium ${isDefault ? 'text-primary' : 'text-grayText'}`}>
            défaut
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <Text className="mb-1 text-xs font-medium text-grayText">Achat (MAD)</Text>
          <TextInput
            className="rounded-lg border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
            placeholder="0"
            placeholderTextColor="#929292"
            keyboardType="decimal-pad"
            value={purchasePrice}
            onChangeText={onPurchasePriceChange}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-xs font-medium text-grayText">Vente (MAD)</Text>
          <TextInput
            className="rounded-lg border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
            placeholder="0"
            placeholderTextColor="#929292"
            keyboardType="decimal-pad"
            value={sellingPrice}
            onChangeText={onSellingPriceChange}
          />
        </View>
      </View>

      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          className="mt-2 items-center rounded-lg py-1.5"
          accessibilityRole="button"
          accessibilityLabel="Retirer cette unité"
        >
          <Text className="text-xs font-medium text-red-500">Retirer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}