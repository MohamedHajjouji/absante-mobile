import React from 'react';
import { View, Text } from 'react-native';

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'En attente', bg: 'bg-warning-50', text: 'text-warning' },
  confirmed: { label: 'Confirmé', bg: 'bg-secondary-50', text: 'text-secondary-tone' },
  completed: { label: 'Terminé', bg: 'bg-success-50', text: 'text-success' },
  cancelled: { label: 'Annulé', bg: 'bg-red-50', text: 'text-red-500' },
  no_show: { label: 'Absent', bg: 'bg-softCloud', text: 'text-grayText' },
};

/**
 * Airbnb-adapted badge chip: compact 11px / 600 label pill.
 */
export function StatusChip({ status }: { status: string }) {
  const config = STATUS[status] ?? { label: status, bg: 'bg-softCloud', text: 'text-grayText' };
  return (
    <View className={`rounded-full px-2.5 py-1 ${config.bg}`}>
      <Text className={`text-[11px] font-semibold ${config.text}`}>{config.label}</Text>
    </View>
  );
}