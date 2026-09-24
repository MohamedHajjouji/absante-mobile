import React from 'react';
import { View, Text } from 'react-native';
import { badgeColor, statusLabels } from '@/lib/erp/labels';

const TONES: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  yellow: { bg: 'bg-amber-50', text: 'text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-[#c13515]' },
  gray: { bg: 'bg-softCloud', text: 'text-grayText' },
  orange: { bg: 'bg-orange-50', text: 'text-[#EA580C]' },
  blue: { bg: 'bg-[#ECF2FA]', text: 'text-[#0D61B6]' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

/** ERP status pill — French label + tone from the shared `badgeColor` map. */
export function ErpStatusBadge({ status }: { status: string }) {
  const tone = TONES[badgeColor[status] ?? 'gray'] ?? TONES.gray;
  return (
    <View className={`rounded-full px-2.5 py-1 ${tone.bg}`}>
      <Text className={`text-[11px] font-semibold ${tone.text}`}>
        {statusLabels[status] ?? status}
      </Text>
    </View>
  );
}
