import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErpBottomSheet } from './ErpBottomSheet';

export interface ErpOption {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: ErpOption[];
  selected?: string | null;
  onSelect: (value: string) => void;
}

/** Single-select option list rendered inside a bottom sheet. */
export function ErpOptionPicker({ visible, onClose, title, options, selected, onSelect }: Props) {
  return (
    <ErpBottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="gap-2">
        {options.map((o) => {
          const active = o.value === selected;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              className={`flex-row items-center rounded-xl border p-3.5 ${
                active ? 'border-primary bg-primary-50' : 'border-hairline bg-white'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
            >
              <View className="flex-1">
                <Text className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark'}`}>
                  {o.label}
                </Text>
                {o.description ? (
                  <Text className="mt-0.5 text-xs text-grayText">{o.description}</Text>
                ) : null}
              </View>
              {active ? <Ionicons name="checkmark-circle" size={20} color="#F53E8A" /> : null}
            </TouchableOpacity>
          );
        })}
        {options.length === 0 ? (
          <Text className="py-4 text-center text-sm text-grayText">Aucune option disponible</Text>
        ) : null}
      </View>
    </ErpBottomSheet>
  );
}
