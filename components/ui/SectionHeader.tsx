import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Airbnb-adapted section header: 22px / 500 subsection heading with an
 * optional action link in Ink underline. Used across home, search, and
 * appointments screens.
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-5">
      <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
        {title}
      </Text>
      {actionLabel && (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className="text-sm font-medium text-dark underline">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}