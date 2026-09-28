import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { createClientProfile } from '@/lib/onboarding/submit-client';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ClientOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createClientProfile(user.id, firstName, lastName, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace('/(onboarding)/completion');
    } catch (e) {
      console.error('Client onboarding failed:', e);
      setError("Erreur de connexion. Vérifiez votre connexion internet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="self-start rounded-full border-hairline bg-white p-3 shadow-soft"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Ionicons name="chevron-back" size={24} color="#3D4B64" />
          </Pressable>
        </View>

        {/* Logo */}
        <View className="items-center pt-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="heart" size={36} color="#F53E8A" />
          </View>
        </View>

        {/* Title */}
        <View className="mt-6 px-6">
          <Text className="text-center text-2xl font-semibold tracking-[-0.3px] text-dark">
            Complétez votre profil
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-grayText">
            Quelques informations pour finaliser votre inscription.
          </Text>
        </View>

        {/* Form */}
        <View className="mt-6 px-5">
          <FormInput
            label="Prénom"
            placeholder="Jean"
            iconName="person"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <FormInput
            label="Nom"
            placeholder="Dupont"
            iconName="person"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <FormInput
            label="Téléphone"
            placeholder="+212 6 12 34 56 78"
            iconName="call"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {error && (
            <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-xs text-[#c13515]">{error}</Text>
            </View>
          )}

          <PrimaryButton
            title="Terminer"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}