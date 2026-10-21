import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useLanguage } from '@/lib/i18n/language-context';
import { signIn, signInWithGoogle } from '@/lib/services/auth-service';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t('auth.errEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.errEmailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.errPasswordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('auth.errPasswordShort');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await signIn({ email, password });
      if (error) {
        Alert.alert(t('auth.error'), getLocalizedErrorMessage(error.message));
      }
      // AuthContext will handle the redirect
    } catch (e) {
      console.error('Sign in failed:', e);
      Alert.alert(t('auth.error'), t('auth.errNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success && result.error) {
        Alert.alert(t('auth.error'), result.error);
      }
      // AuthContext will handle the redirect
    } catch (e) {
      console.error('Google sign in failed:', e);
      Alert.alert(t('auth.error'), t('auth.errNetwork'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const getLocalizedErrorMessage = (message: string): string => {
    if (!message || message === '{}' || message === '[object Object]') {
      return t('auth.errUnexpected');
    }
    const lower = message.toLowerCase();
    if (lower.includes('invalid login')) return t('auth.errInvalidLogin');
    if (lower.includes('email not confirmed')) return t('auth.errEmailNotConfirmed');
    if (lower.includes('network')) return t('auth.errNetwork');
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
            {t('auth.loginTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-grayText">
            {t('auth.loginSub')}
          </Text>
        </View>

        {/* Form */}
        <View className="mt-6 px-5">
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

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable className="mb-4 self-end">
              <Text className="text-sm font-medium text-primary">
                {t('auth.forgot')}
              </Text>
            </Pressable>
          </Link>

          <PrimaryButton
            title={t('auth.loginBtn')}
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
            {t('auth.noAccount')}{' '}
            <Text
              className="font-semibold text-primary"
              onPress={() => router.push('/(auth)/welcome')}
              style={{ includeFontPadding: false }}
            >
              {t('auth.createOne')}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
