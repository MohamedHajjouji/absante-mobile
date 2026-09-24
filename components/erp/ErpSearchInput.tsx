import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** ERP search input — icon + borderless field inside a white pill. */
export function ErpSearchInput({ value, onChangeText, placeholder, ...rest }: Props) {
  return (
    <View className="flex-row items-center rounded-lg border border-hairline bg-white px-3">
      <Ionicons name="search" size={18} color="#929292" />
      <TextInput
        className="flex-1 py-3 pl-2.5 text-sm font-medium text-dark"
        placeholderTextColor="#929292"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Rechercher…'}
        autoCorrect={false}
        {...rest}
      />
      {value.length > 0 ? (
        <Ionicons name="close-circle" size={18} color="#929292" onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}
