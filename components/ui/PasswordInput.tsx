import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
}

/**
 * Airbnb-adapted password input with an eye-toggle.
 * Mirrors FormInput: white surface, 1px Hairline border, 8px radius,
 * Ink focus border and Error Red for validation.
 *
 * The inner TextInput is memoized so focus/blur state changes re-render only
 * the wrapper border, never the native input — this prevents Android from
 * dropping focus and jumping to the next field.
 */
const MemoizedInput = React.memo(TextInput);

export function PasswordInput({
  label,
  error,
  helperText,
  onFocus,
  onBlur,
  ...props
}: PasswordInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  const borderColor = error
    ? '#c13515'
    : isFocused
      ? '#3D4B64'
      : '#DDDDDD';

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-dark">{label}</Text>

      <View
        className="flex-row items-center rounded-lg bg-white px-4"
        style={{
          borderWidth: 1,
          borderColor,
        }}
      >
        <Ionicons
          name="lock-closed"
          size={18}
          color={isFocused ? '#3D4B64' : '#6a6a6a'}
          style={{ marginRight: 12 }}
        />

        <MemoizedInput
          style={{ flex: 1, width: '100%', paddingVertical: 9 }}
          className="flex-1 min-w-full  py-4 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          secureTextEntry={!showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          className="pl-2 pr-1 py-1"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Ionicons
            name={showPassword ? 'eye' : 'eye-off'}
            size={20}
            color="#929292"
          />
        </Pressable>
      </View>

      {error && (
        <Text className="mt-1 text-xs text-[#c13515]">{error}</Text>
      )}
      {helperText && !error && (
        <Text className="mt-1 text-xs text-grayText">{helperText}</Text>
      )}
    </View>
  );
}