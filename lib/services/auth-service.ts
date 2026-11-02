import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// ── Helpers ───────────────────────────────────────────────

/**
 * Build the redirect URI that Supabase will send the user back to
 * after the OAuth provider authenticates them.
 * Native uses the app's custom scheme (configured in app.json as "absante").
 */
function getRedirectUrl(): string {
  // expo-router's makeRedirectUri is ideal but requires router context;
  // Linking.createURL works anywhere and produces e.g. absante://auth/callback
  //
  // Web (PWA): per the SDK 57 Linking docs, createURL returns an absolute
  // same-origin URL ("Web (prod): https://myapp.com/path"). The path must be
  // the real route that exists (`/callback`, i.e. app/(auth)/callback.tsx) —
  // OAuth redirects, email confirmation and password-reset links all land
  // there. Native keeps its custom-scheme URL byte-for-byte unchanged.
  if (Platform.OS === 'web') {
    return Linking.createURL('callback');
  }
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
      // Web: supabase-js would otherwise `window.location.assign()` the
      // provider URL itself (auth-js `_handleProviderSignIn`), racing our own
      // openAuthSessionAsync below. skipBrowserRedirect keeps the popup flow
      // identical to native. Native: isBrowser() is false there, so this flag
      // changes nothing.
      skipBrowserRedirect: Platform.OS === 'web',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) return { success: false as const, error: error.message };

  if (data?.url) {
    // Open the Google consent screen inside a controlled browser session.
    // On web this must follow the user's tap as closely as possible: mobile
    // browsers throw ERR_WEB_BROWSER_BLOCKED if window.open() fires after a
    // long task (SDK 57 WebBrowser docs).
    let result: Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;
    try {
      result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    } catch (e) {
      if (Platform.OS === 'web') {
        // Popup blocked (common on mobile browsers / installed PWAs) →
        // full-page redirect instead. The /callback route completes the
        // session on return via supabase-js's detectSessionInUrl.
        window.location.assign(data.url);
        return { success: true as const };
      }
      throw e;
    }

    if (result.type === 'success' && result.url) {
      const processed = await processOAuthCallback(result.url);
      // Web only: when the popup consumed the tokens itself, the session
      // lives in shared localStorage but supabase-js has no cross-tab
      // storage events — so re-establish it here to notify AuthContext.
      if (!processed && Platform.OS === 'web') {
        const { data: current } = await supabase.auth.getSession();
        if (current.session) {
          await supabase.auth.setSession({
            access_token: current.session.access_token,
            refresh_token: current.session.refresh_token,
          });
        }
      }
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

/** Link guest bookings made with the account's email to the patient record.
 *  Called after every sign-in (see AuthContext). Non-blocking by design. */
export async function claimGuestBookings(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('claim_guest_patient_rows');
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

/** Sign the current user out. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Request account deletion (Play Store requirement). Auth users cannot
 * delete themselves via the client API, so this files an auditable request
 * row (RLS: own inserts only); an admin completes the deletion and marks it
 * done. Never throws — callers show a generic message on failure.
 */
export async function requestAccountDeletion(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('account_deletion_requests').insert({
      profile_id: userId,
      status: 'pending',
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    console.error('Deletion request failed:', e);
    return { success: false };
  }
}

export { getRedirectUrl, processOAuthCallback };
