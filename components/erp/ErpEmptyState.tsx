import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** ERP empty-state card used across list screens. */
export function ErpEmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View className="mt-10 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
        <Ionicons name={icon} size={36} color="#F53E8A" />
      </View>
      <Text className="mt-6 text-lg font-semibold text-dark">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          className="mt-6 flex-row items-center justify-center rounded-lg bg-primary px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="ml-1.5 text-sm font-medium text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
