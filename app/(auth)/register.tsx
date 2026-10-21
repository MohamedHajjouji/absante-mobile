import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useLanguage } from '@/lib/i18n/language-context';
import { signUp } from '@/lib/services/auth-service';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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

    if (!fullName.trim()) newErrors.fullName = t('auth.errNameRequired');

    if (!email.trim()) {
      newErrors.email = t('auth.errEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.errEmailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.errPasswordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('auth.minChars');
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.errConfirmMismatch');
    }

    if (!agreed) {
      newErrors.terms = t('auth.errTerms');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Helpers ──
  const getLocalizedErrorMessage = (message: string): string => {
    if (!message || message === '{}' || message === '[object Object]') {
      return t('auth.errUnexpected');
    }
    const lower = message.toLowerCase();
    if (lower.includes('email') && lower.includes('already'))
      return t('auth.errEmailExists');
    if (lower.includes('password') && lower.includes('weak'))
      return t('auth.errPasswordShort');
    if (lower.includes('rate') || lower.includes('too many'))
      return t('auth.errRateLimit');
    if (lower.includes('network'))
      return t('auth.errNetwork');
    return message;
  };

  // ── Submit ──
  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    setNeedsEmailConfirmation(false);

    try {
      const { data, error } = await signUp({
        email,
        password,
        fullName,
        userType,
      });

      if (error) {
        Alert.alert(t('auth.error'), getLocalizedErrorMessage(error.message));
        return;
      }

      // If email confirmation is required, Supabase returns a user without a session.
      if (!data?.session) {
        setNeedsEmailConfirmation(true);
      }
      // If session exists, AuthContext's onAuthStateChange listener
      // will detect the new session and redirect to the appropriate route.
    } catch (e) {
      console.error('Sign up failed:', e);
      Alert.alert(t('auth.error'), t('auth.errNetwork'));
    } finally {
      setLoading(false);
    }
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
              {t('auth.confirmEmailTitle')}
            </Text>
            <Text className="mt-3 text-center text-sm font-medium leading-5 text-grayText">
              {t('auth.confirmEmailBody')}{' '}
              <Text className="font-medium text-dark">{email}</Text>
            </Text>
          </View>

          {/* Back to login */}
          <View className="mt-8 items-center px-5">
            <Text
              className="text-sm font-medium text-primary"
              onPress={() => router.push('/(auth)/login')}
              style={{ includeFontPadding: false }}
            >
              {t('auth.backToLogin')}
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={16}
      >
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
              {t('auth.registerTitle')}
            </Text>
            <Text className="mt-2 text-center text-sm font-medium text-grayText">
              {userType === 'professional'
                ? t('auth.registerProSub2')
                : t('auth.registerClientSub2')}
            </Text>
          </View>

          {/* Form */}
          <View className="mt-6 px-5">
            <FormInput
              label={t('auth.fullName')}
              placeholder="Dr. Jean Dupont"
              iconName="person"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />

            <FormInput
              label={t('auth.email')}
              placeholder="vous@exemple.com"
              iconName="mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <PasswordInput
              label={t('auth.password')}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              helperText={t('auth.minChars')}
            />

            <PasswordInput
              label={t('auth.confirmPassword')}
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
                {t('auth.termsAccept')}{' '}
                <Text className="font-semibold text-dark">
                  {t('auth.termsLink')}
                </Text>{' '}
                {t('auth.termsAnd')}{' '}
                <Text className="font-semibold text-dark">
                  {t('auth.privacyLink')}
                </Text>
                .
              </Text>
            </View>
            {errors.terms && (
              <Text className="mb-3 text-xs text-red-500">{errors.terms}</Text>
            )}

            <PrimaryButton
              title={t('auth.createAccount')}
              onPress={handleRegister}
              loading={loading}
            />
          </View>

          {/* Footer */}
          <View className="mt-6 items-center px-5">
            <Text className="text-sm font-medium text-grayText">
              {t('auth.hasAccount')}{' '}
              <Text
                className="font-semibold text-primary"
                onPress={() => router.push('/(auth)/login')}
                style={{ includeFontPadding: false }}
              >
                {t('auth.loginLink')}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
