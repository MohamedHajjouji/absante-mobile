import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps, GestureResponderEvent } from 'react-native';

interface PrimaryButtonProps extends Omit<PressableProps, 'onPress'> {
  title: string;
  onPress: (e: GestureResponderEvent) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

/**
 * Airbnb-adapted CTA button.
 *  - `primary` (default): solid brand pink (#F53E8A) background, white 500-weight label, 8px radius.
 *  - `secondary`: white background, ink label, 1px Hairline border, pill radius.
 *
 * Press feedback: subtle scale (0.98) + focus ring on active, per the Airbnb
 * "Reserve" button spec (Rausch → AB Santé pink).
 */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  className,
  ...props
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={(e) => {
        if (!isDisabled) {
          onPress(e);
        }
      }}
      disabled={isDisabled}
      className={[
        isPrimary ? 'bg-primary' : 'bg-white border border-hairline',
        'items-center justify-center rounded-lg px-6 py-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={({ pressed }) => [
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && { opacity: 0.5 },
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? '#ffffff' : '#3D4B64'}
        />
      ) : (
        <Text
          className={`text-center text-base font-medium tracking-[-0.1px] ${
            isPrimary ? 'text-white' : 'text-dark'
          }`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
