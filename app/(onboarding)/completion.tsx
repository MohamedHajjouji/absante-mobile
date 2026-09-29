import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OnboardingCompletionScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const params = useLocalSearchParams<{ mode?: string; name?: string }>();
  const isClaimMode = params.mode === 'claim';
  const claimedName = Array.isArray(params.name) ? params.name[0] : params.name;
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Re-run profile detection so routing picks the right shell for this
      // user's role without requiring a full app restart.
      const role = await refreshProfile();
      if (role === 'professional') {
        router.replace('/(professional)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      // Offline / backend unreachable: fall through to the default shell
      // instead of sticking on a spinner — tabs will show retry UI if needed.
      console.error('Profile refresh failed, continuing to tabs:', e);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center pt-12">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-success-50">
            <Ionicons name="checkmark-circle" size={56} color="#10B981" />
          </View>
        </View>

        <View className="mt-8 px-6">
          <Text className="text-center text-2xl font-semibold tracking-[-0.3px] text-dark">
            {isClaimMode ? 'Demande de revendication envoyée !' : "Demande d'ajout envoyée !"}
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-5 text-grayText">
            {isClaimMode ? (
              <>Votre demande pour le profil Dr {claimedName} est en cours de vérification. Nous vous contacterons si besoin avant de vous lier le profil.</>
            ) : (
              <>Votre inscription est en cours de validation. Notre équipe examinera votre profil et vous recevra une notification dès que votre compte sera activé.</>
            )}
          </Text>
        </View>

        <View className="mt-8 items-center px-5">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            className="w-full items-center justify-center rounded-lg bg-primary py-4"
            accessibilityRole="button"
            accessibilityLabel="Accéder à l'application"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-center text-base font-medium text-white">
                Accéder à l'application
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
