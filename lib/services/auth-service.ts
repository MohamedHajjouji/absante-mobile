import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// ── Helpers ───────────────────────────────────────────────

/**
 * Build the redirect URI that Supabase will send the user back to
 * after the OAuth provider authenticates them.
 * The URI uses the app's custom scheme (configured in app.json as "absante").
 */
function getRedirectUrl(): string {
  // expo-router's makeRedirectUri is ideal but requires router context;
  // Linking.createURL works anywhere and produces e.g. absante://auth/callback
  return Linking.createURL('auth/callback');
}

/**
 * Extract access_token / refresh_token from an OAuth callback URL's
 * hash fragment and tell the Supabase client to set the session.
 * The onAuthStateChange listener in AuthContext then fires automatically.
 */
async function processOAuthCallback(url: string) {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return false;

  const hash = url.substring(hashIndex + 1);
  const params = new URLSearchParams(hash);

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  return !error;
}

// ── Public API ────────────────────────────────────────────

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  userType: 'professional' | 'client';
}

export interface SignInParams {
  email: string;
  password: string;
}

/** Email + password sign-up. Stores `user_type` in user metadata so the
 *  root layout knows which onboarding flow to show. */
export async function signUp({ email, password, fullName, userType }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: fullName,
        full_name: fullName,
        user_type: userType,
      },
      emailRedirectTo: getRedirectUrl(),
    },
  });

  return { data, error };
}

/** Email + password sign-in. */
export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/** Google OAuth via an in-app auth session. */
export async function signInWithGoogle() {
  const redirectUrl = getRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) return { success: false as const, error: error.message };

  if (data?.url) {
    // Open the Google consent screen inside a controlled browser session.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success' && result.url) {
      await processOAuthCallback(result.url);
      return { success: true as const };
    }
  }

  return { success: false as const, error: 'Authentification interrompue' };
}

/** Send a password-reset email. */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  });
  return { error };
}

/** Sign the current user out. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export { getRedirectUrl, processOAuthCallback };
