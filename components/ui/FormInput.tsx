import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  error?: string;
  helperText?: string;
}

/**
 * Airbnb-adapted text input: white surface, 1px Hairline border, 8px radius.
 * Focus switches the border to Ink (#3D4B64); error switches to Error Red
 * (#c13515) with matching helper text.
 *
 * The inner TextInput is memoized so focus/blur state changes re-render only
 * the wrapper border, never the native input — this prevents Android from
 * dropping focus on the field and jumping to the next one.
 */
const MemoizedInput = React.memo(TextInput);

export function FormInput({
  label,
  iconName,
  error,
  helperText,
  onFocus,
  onBlur,
  ...props
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

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
    ? '#c13515'      // Error Red
    : isFocused
      ? '#3D4B64'   // Ink
      : '#DDDDDD';  // Hairline Gray

  return (
    <View className="mb-4 ">
      <Text className="mb-1.5 text-sm font-medium text-dark">{label}</Text>

      <View
        className="flex-row  w-full items-center rounded-lg px-4"
        style={{
          borderWidth: 1,
          borderColor,
        }}
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={18}
            color={isFocused ? '#3D4B64' : '#6a6a6a'}
            style={{ marginRight: 12 }}
          />
        )}

        <MemoizedInput
          style={{ flex: 1, width: '100%', paddingVertical: 9 }}
          className="flex-1 min-w-full  py-4 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
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