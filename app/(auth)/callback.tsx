import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

/**
 * Deep-link callback route for:
 *  - Google OAuth redirect (hash fragment with access_token / refresh_token)
 *  - Email confirmation links
 *  - Password-reset links
 *
 * The app is launched via the custom scheme `absante://callback?...`.
 * We process the URL, let the Supabase client establish the session
 * (the onAuthStateChange listener in AuthContext takes over from there),
 * and then redirect to the root so the root layout can send the user
 * to the correct destination.
 */
export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Try to extract auth tokens from the URL hash (OAuth implicit flow)
        const url = getDeepLinkUrl(searchParams);

        if (url) {
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) console.warn('setSession failed:', error.message);
            }
          }

          // 2. Try to exchange an auth code (PKCE / code flow)
          const rawCode = searchParams.code;
          const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
          if (typeof code === 'string' && code.length > 0) {
            try {
              await supabase.auth.exchangeCodeForSession(code);
            } catch {
              // Older client — code flow may not be supported; ignore
            }
          }
        }
      } catch (e) {
        // Never block navigation: a bad callback URL must not trap the user.
        console.warn('Auth callback processing failed:', e);
      }

      // 3. Navigate to root — AuthContext will redirect to the right place
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    };

    handleCallback().catch((e) => {
      console.warn('Auth callback failed:', e);
      router.replace('/(tabs)');
    });
  }, [searchParams, router]);

  return (
    <View className="flex-1 items-center justify-center bg-pageBg">
      <Ionicons name="heart" size={44} color="#F53E8A" />
      <Text className="mt-8 text-2xl font-semibold text-dark">
        AB<Text className="text-primary"> Santé</Text>
      </Text>
      <Text className="mt-4 text-sm font-medium text-grayText">
        Finalisation de la connexion...
      </Text>
    </View>
  );
}

/**
 * Reconstruct the full deep-link URL from Expo Router search params.
 * When the app is opened via a custom-scheme link like
 * `absante://callback#access_token=xxx`, Expo Router parses the
 * query params but the hash fragment is available on the raw URL.
 */
function getDeepLinkUrl(searchParams: Record<string, any>): string | null {
  // Check for common OAuth / confirmation params
  const keys = ['access_token', 'refresh_token', 'code', 'token', 'type', 'error'];
  const hasAuthParam = keys.some((k) => typeof searchParams[k] === 'string');

  if (!hasAuthParam) return null;

  // Rebuild a pseudo-URL so processOAuthCallback can parse the hash
  const query = new URLSearchParams(
    Object.entries(searchParams)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][]
  ).toString();

  return `absante://callback?${query}`;
}
