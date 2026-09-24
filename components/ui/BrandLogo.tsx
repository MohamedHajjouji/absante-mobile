import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

/**
 * Reusable brand logo component. Uses the official "AB Santé" logo
 * (same as the web app) with configurable size and variant.
 *
 * Variants:
 *   - "navbar": appsplash.png — transparent bg (headers/navbars)
 *   - "standard": appsplash.png — transparent bg (auth screens/footers)
 *
 * Note: applogo.png (opaque white bg) is reserved exclusively for the OS
 * app icon via app.json — never render it inside the app UI.
 */
interface BrandLogoProps {
  variant?: 'navbar' | 'standard';
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function BrandLogo({
  variant = 'navbar',
  width,
  height,
  style,
}: BrandLogoProps) {
  const source =
    variant === 'standard'
      ? require('@/assets/appsplash.png')
      : require('@/assets/appsplash.png');

  // Defaults aligned with the web app's navbar sizing
  const defaultW = variant === 'standard' ? 160 : 120;
  const defaultH = variant === 'standard' ? 48 : 48;

  return (
    <Image
      source={source}
      style={[
        { width: width ?? defaultW, height: height ?? defaultH },
        style,
      ]}

      resizeMode="contain"
      accessibilityLabel="AB Santé"
      accessibilityRole="image"
    />
  );
}