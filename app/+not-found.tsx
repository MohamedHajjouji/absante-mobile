import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function NotFoundScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, role } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  const handleGoHome = () => {
    if (isSignedIn && role === 'professional') {
      router.replace('/(professional)');
    } else {
      // Guests land on the public tabs (Accueil / Recherche).
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-pageBg px-8" edges={['top']}>
      <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
        <Ionicons name="compass-outline" size={44} color="#F53E8A" />
      </View>
      <Text className="mt-7 text-2xl font-semibold tracking-[-0.3px] text-dark">
        Page introuvable
      </Text>
      <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </Text>
      <TouchableOpacity
        onPress={handleGoHome}
        className="mt-8 flex-row items-center justify-center rounded-lg bg-primary px-8 py-3.5"
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Retour à l'accueil"
      >
        <Ionicons name="home" size={18} color="#FFFFFF" />
        <Text className="ml-2 text-base font-medium text-white">Retour à l'accueil</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}