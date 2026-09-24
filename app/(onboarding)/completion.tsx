import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OnboardingCompletionScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    // Re-run profile detection so routing picks the right shell for this
    // user's role without requiring a full app restart.
    const role = await refreshProfile();
    if (role === 'professional') {
      router.replace('/(professional)');
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
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
            Félicitations !
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-5 text-grayText">
            Votre inscription est en cours de validation. Notre équipe
            examinera votre profil et vous recevra une notification
            dès que votre compte sera activé.
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
