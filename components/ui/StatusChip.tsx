import React from 'react';
import { View, Text } from 'react-native';
import { useLanguage } from '@/lib/i18n/language-context';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-warning-50', text: 'text-warning' },
  confirmed: { bg: 'bg-secondary-50', text: 'text-secondary-tone' },
  completed: { bg: 'bg-success-50', text: 'text-success' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-500' },
  no_show: { bg: 'bg-softCloud', text: 'text-grayText' },
};

/**
 * Airbnb-adapted badge chip: compact 11px / 600 label pill.
 */
export function StatusChip({ status }: { status: string }) {
  const { t } = useLanguage();
  const style = STATUS_STYLE[status] ?? { bg: 'bg-softCloud', text: 'text-grayText' };
  const label = t(`rdv.status.${status}`);
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
      <Text className={`text-[11px] font-semibold ${style.text}`}>{label === `rdv.status.${status}` ? status : label}</Text>
    </View>
  );
}
