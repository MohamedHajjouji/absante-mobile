import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { signIn, signInWithGoogle } from '@/lib/services/auth-service';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Format d'email invalide";
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Erreur', getFrenchErrorMessage(error.message));
    }
    // AuthContext will handle the redirect
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);

    if (!result.success && result.error) {
      Alert.alert('Erreur', result.error);
    }
    // AuthContext will handle the redirect
  };

  const getFrenchErrorMessage = (message: string): string => {
    if (!message || message === '{}' || message === '[object Object]') {
      return "Une erreur inattendue s'est produite. Veuillez réessayer";
    }
    const lower = message.toLowerCase();
    if (lower.includes('invalid login')) return 'Email ou mot de passe incorrect';
    if (lower.includes('email not confirmed')) return "Veuillez confirmer votre adresse email";
    if (lower.includes('network')) return "Erreur de connexion. Vérifiez votre connexion internet";
    return message;
  };

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-[#FCFBFD]">
      {/* Soft atmospheric background */}
      <View
        pointerEvents="none"
        className="absolute -right-[125px] -top-[170px] h-[300px] w-[300px] rounded-full bg-[#EEF6FF] opacity-70"
      />

      <View
        pointerEvents="none"
        className="absolute -bottom-[190px] -left-[145px] h-[300px] w-[300px] rounded-full bg-[#FFF0F7] opacity-75"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        <View className="items-center pt-8">
          <BrandLogo variant="standard" width={160} height={120} />
        </View>

        {/* Title */}
        <View className="mt-6 px-6">
          <Text className="text-center text-3xl font-semibold tracking-[-0.5px] text-dark">
            Connexion
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-grayText">
            Connectez-vous à votre compte AB Santé
          </Text>
        </View>

        {/* Form */}
        <View className="mt-6 px-5">
          <FormInput
            label="Email"
            placeholder="vous@exemple.com"
            iconName="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <PasswordInput
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            helperText="Minimum 6 caractères"
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable className="mb-4 self-end">
              <Text className="text-sm font-medium text-primary">
                Mot de passe oublié ?
              </Text>
            </Pressable>
          </Link>

          <PrimaryButton
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
          />
        </View>

        {/* Divider 
        <View className="mt-6 flex-row items-center px-5">
          <View className="flex-1 h-px bg-slate-200" />
          <Text className="px-4 text-xs font-medium text-grayText">ou</Text>
          <View className="flex-1 h-px bg-slate-200" />
        </View>


        <View className="mt-6 px-5">
          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            className="flex-row items-center justify-center rounded-full bg-white border border-slate-200 px-6 py-4 shadow"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            {googleLoading ? (
              <Ionicons name="reload" size={20} color="#172554" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            )}
            <Text className="ml-2 text-sm font-medium text-dark">
              Continuer avec Google
            </Text>
          </Pressable>
        </View>*/}

        {/* Footer */}
        <View className="mt-6 items-center px-5">
          <Text className="text-sm font-medium text-grayText">
            Pas de compte ?{' '}
            <Text
              className="font-semibold text-primary"
              onPress={() => router.push('/(auth)/welcome')}
              style={{ includeFontPadding: false }}
            >
              Créez-en un
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
