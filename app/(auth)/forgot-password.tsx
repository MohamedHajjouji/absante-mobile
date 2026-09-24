import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { resetPassword } from '@/lib/services/auth-service';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError("L'email est requis");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Format d'email invalide");
      return false;
    }
    setError(null);
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.error) {
      setError(getFrenchErrorMessage(result.error.message));
    } else {
      setSent(true);
    }
  };

  const getFrenchErrorMessage = (message: string): string => {
    if (!message || message === '{}' || message === '[object Object]') {
      return "Une erreur inattendue s'est produite. Veuillez réessayer";
    }
    const lower = message.toLowerCase();
    if (lower.includes('user not found'))
      return "Aucun compte lié à cet email n'a été trouvé";
    if (lower.includes('rate') || lower.includes('too many'))
      return 'Trop de tentatives. Veuillez patienter avant de réessayer';
    if (lower.includes('network'))
      return "Erreur de connexion. Vérifiez votre connexion internet";
    return message;
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header — back button */}
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
            Mot de passe oublié ?
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-grayText">
            Saisissez votre adresse email et nous vous enverrons
            un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        {/* Content */}
        <View className="mt-6 px-5">
          {!sent ? (
            <>
              <FormInput
                label="Email"
                placeholder="vous@exemple.com"
                iconName="mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={error || undefined}
              />

              {error && (
                <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <Text className="text-xs text-[#c13515]">{error}</Text>
                </View>
              )}

              <PrimaryButton
                title="Envoyer le lien de réinitialisation"
                onPress={handleReset}
                loading={loading}
              />
            </>
          ) : (
            <View className="items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success-50">
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>
              <Text className="text-center text-sm text-grayText">
                Un email de réinitialisation a été envoyé à{' '}
                <Text className="font-medium text-dark">{email}</Text>.
                Vérifiez votre boîte de réception et cliquez sur le
                lien pour définir un nouveau mot de passe.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="mt-8 items-center px-5">
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text className="text-sm font-medium text-primary">
              Retour à la connexion
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
