import React from 'react';
import { View, TouchableOpacity } from 'react-native';

/**
 * Airbnb-adapted toggle: pill track with a sliding white thumb.
 * Uses the brand pink when on, soft cloud when off.
 */
export function SwitchPill({
  value,
  onToggle,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      disabled={disabled}
      activeOpacity={0.8}
      className={`h-7 w-12 items-center rounded-full p-0.5 ${
        value ? 'bg-primary' : 'bg-softCloud'
      }`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel ?? 'Interrupteur'}
    >
      <View
        className={`h-6 w-6 rounded-full bg-white shadow-soft ${
          value ? 'ml-auto' : ''
        }`}
      />
    </TouchableOpacity>
  );
}