import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Full-screen loading / splash view. Matches the app's brand colors while
 * keeping the Airbnb discipline: centered brand mark, tight typography.
 * Shown while the root layout determines the initial route.
 */
export function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-pageBg">
      <View className="items-center">
        {/* Brand mark */}
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <Ionicons name="heart" size={40} color="#F53E8A" />
        </View>

        <Text className="mt-6 text-2xl font-semibold tracking-[-0.3px] text-dark">
          AB<Text className="text-primary"> Santé</Text>
        </Text>

        <Text className="mt-2 text-sm text-grayText">
          Votre santé, notre priorité
        </Text>

        <ActivityIndicator
          size="large"
          color="#F53E8A"
          style={{ marginTop: 24 }}
        />
      </View>
    </View>
  );
}