import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';

export interface ErpChipOption {
  value: string;
  label: string;
}

interface Props {
  options: ErpChipOption[];
  value: string;
  onChange: (value: string) => void;
}

/** Horizontal filter chips (e.g. movement types, locations). */
export function ErpFilterChips({ options, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`rounded-full px-3.5 py-2 ${
              active ? 'bg-primary' : 'border border-hairline bg-white'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
          >
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-grayText'}`}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
