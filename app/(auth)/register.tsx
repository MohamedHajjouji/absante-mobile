import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { signUp } from '@/lib/services/auth-service';

export default function RegisterScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  // Determine role from the query param sent by the Welcome screen.
  const userType: 'professional' | 'client' =
    searchParams.role === 'professional' ? 'professional' : 'client';

  // ── Form state ──
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const roleLabel = userType === 'professional' ? 'Professionnel' : 'Client';
  const roleIcon: keyof typeof Ionicons.glyphMap =
    userType === 'professional' ? 'medkit' : 'person';
  const roleColor = userType === 'professional' ? '#F53E8A' : '#3578FF';
  const roleBg = userType === 'professional' ? 'bg-primary-50' : 'bg-secondary-50';

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = 'Le nom est requis';

    if (!email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Format d'email invalide";
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!agreed) {
      newErrors.terms = 'Vous devez accepter les conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Helpers ──
  const getFrenchErrorMessage = (message: string): string => {
    if (!message || message === '{}' || message === '[object Object]') {
      return "Une erreur inattendue s'est produite. Veuillez réessayer";
    }
    const lower = message.toLowerCase();
    if (lower.includes('email') && lower.includes('already'))
      return 'Un compte avec cet email existe déjà';
    if (lower.includes('password') && lower.includes('weak'))
      return 'Le mot de passe doit contenir au moins 6 caractères';
    if (lower.includes('rate') || lower.includes('too many'))
      return 'Trop de tentatives. Veuillez patienter avant de réessayer';
    if (lower.includes('network'))
      return "Erreur de connexion. Vérifiez votre connexion internet";
    return message;
  };

  // ── Submit ──
  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    setNeedsEmailConfirmation(false);

    const { data, error } = await signUp({
      email,
      password,
      fullName,
      userType,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erreur', getFrenchErrorMessage(error.message));
      return;
    }

    // If email confirmation is required, Supabase returns a user without a session.
    if (!data?.session) {
      setNeedsEmailConfirmation(true);
    }
    // If session exists, AuthContext's onAuthStateChange listener
    // will detect the new session and redirect to the appropriate route.
  };

  // ── Email confirmation screen ──
  if (needsEmailConfirmation) {
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
        >
          <View className="px-5 pt-4">
            <Pressable
              onPress={() => router.replace('/(auth)/welcome')}
              className="self-start rounded-full border-hairline bg-white p-3 shadow-soft"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Ionicons name="chevron-back" size={24} color="#3D4B64" />
            </Pressable>
          </View>

          {/* Success icon */}
          <View className="items-center pt-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-success-50">
              <Ionicons name="checkmark-circle" size={44} color="#10B981" />
            </View>
          </View>

          {/* Message */}
          <View className="mt-8 px-6">
            <Text className="text-center text-xl font-semibold tracking-[-0.3px] text-dark">
              Email de confirmation envoyé
            </Text>
            <Text className="mt-3 text-center text-sm font-medium leading-5 text-grayText">
              Un email a été envoyé à{' '}
              <Text className="font-medium text-dark">{email}</Text>.
              Cliquez sur le lien pour confirmer votre adresse et
              finaliser votre inscription.
            </Text>
          </View>

          {/* Back to login */}
          <View className="mt-8 items-center px-5">
            <Text
              className="text-sm font-medium text-primary"
              onPress={() => router.push('/(auth)/login')}
              style={{ includeFontPadding: false }}
            >
              Retour à la connexion
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Registration form ──
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
        <View className="items-center pt-8">
          <BrandLogo variant="standard" width={160} height={120} />
        </View>

        {/* Role badge */}
      

        {/* Title */}
        <View className="mt-6 px-6">
          <Text className="text-center text-3xl font-semibold tracking-[-0.5px] text-dark">
            Création de compte
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-grayText">
            {userType === 'professional'
              ? "Créez votre compte pro pour commencer l'onboarding"
              : 'Créez votre compte pour trouver des professionnels de santé'}
          </Text>
        </View>

        {/* Form */}
        <View className="mt-6 px-5">
          <FormInput
            label="Nom complet"
            placeholder="Dr. Jean Dupont"
            iconName="person"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
          />

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

          <PasswordInput
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          {/* Terms checkbox */}
          <View className="mb-4 flex-row items-start gap-2">
            <Pressable
              onPress={() => {
                setAgreed(!agreed);
                if (errors.terms) setErrors((e) => ({ ...e, terms: '' }));
              }}
              className="mt-0.5"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={20}
                color={agreed ? '#F53E8A' : '#94a3af'}
              />
            </Pressable>
            <Text className="text-sm font-medium text-grayText">
              J'accepte les{' '}
              <Text className="font-semibold text-dark">
                conditions d'utilisation
              </Text>{' '}
              et la{' '}
              <Text className="font-semibold text-dark">
                politique de confidentialité
              </Text>
              .
            </Text>
          </View>
          {errors.terms && (
            <Text className="mb-3 text-xs text-red-500">{errors.terms}</Text>
          )}

          <PrimaryButton
            title="Créer mon compte"
            onPress={handleRegister}
            loading={loading}
          />
        </View>

        {/* Footer */}
        <View className="mt-6 items-center px-5">
          <Text className="text-sm font-medium text-grayText">
            Déjà un compte ?{' '}
            <Text
              className="font-semibold text-primary"
              onPress={() => router.push('/(auth)/login')}
              style={{ includeFontPadding: false }}
            >
              Connectez-vous
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
