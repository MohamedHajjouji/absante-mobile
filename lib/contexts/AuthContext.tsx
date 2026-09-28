import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { processOAuthCallback, claimGuestBookings } from '@/lib/services/auth-service';

export type UserRole = 'professional' | 'patient';

export interface AuthContextType {
  /** `false` until the initial session check has finished. */
  isLoaded: boolean;
  /** Whether the user currently has a valid session. */
  isSignedIn: boolean;
  /**
   * Detected role:
   *  - `'professional'` → has a `providers` row (or metadata fallback)
   *  - `'patient'`      → has a `patients` row (or metadata fallback)
   *  - `null`           → not resolvable (not signed in / no records yet)
   */
  role: UserRole | null;
  /**
   * True when the user is an ERP "agency owner" — `profiles.role === 'admin'`,
   * the same rule the web app uses to route admins to `/erp`.
   */
  isAdmin: boolean;
  /** The raw Supabase user object (or null). */
  user: any;
  /**
   * Which onboarding flow the user still needs:
   *  - `'professional'` → 5-step professional wizard
   *  - `'patient'`      → client name + phone form
   *  - `null`           → everything is done (or not auth'd)
   */
  needsOnboarding: 'professional' | 'patient' | null;
  /**
   * Re-runs profile detection (role + onboarding). Useful after
   * onboarding completes so the app routes correctly without a restart.
   */
  refreshProfile: () => Promise<UserRole | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<'professional' | 'patient' | null>(null);
  const [user, setUser] = useState<any>(null);

  const determineProfile = async (userId: string): Promise<UserRole | null> => {
    try {
      // ERP "agency owner" flag — independent of the provider/patient role.
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      setIsAdmin((prof as { role?: string } | null)?.role === 'admin');

      // 1. Professional → a row exists in `providers`
      const { data: provider } = await supabase
        .from('providers')
        .select('onboarding_completed')
        .eq('profile_id', userId)
        .maybeSingle();

      if (provider) {
        setRole('professional');
        setNeedsOnboarding(provider.onboarding_completed ? null : 'professional');
        return 'professional';
      }

      // 2. Patient → a row exists in `patients`
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle();

      if (patient) {
        setRole('patient');
        setNeedsOnboarding(null);
        return 'patient';
      }

      // 3. Fallback → user metadata (set during sign-up)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userType = authUser?.user_metadata?.user_type;
      if (userType === 'professional') {
        setRole('professional');
        setNeedsOnboarding('professional');
        return 'professional';
      }
      if (userType === 'client') {
        setRole('patient');
        setNeedsOnboarding('patient');
        return 'patient';
      }
      setRole(null);
      setNeedsOnboarding(null);
      return null;
    } catch (error) {
      console.error('Error determining user role:', error);
      setRole(null);
      setIsAdmin(false);
      setNeedsOnboarding(null);
      return null;
    }
  };

  // Handle a deep link that may contain an OAuth callback token.
  // Never throws — a bad/missing link must not block app startup.
  const handleDeepLink = async (url: string | null | undefined) => {
    if (!url) return;
    try {
      await processOAuthCallback(url);
    } catch (error) {
      console.warn('Ignoring unprocessable deep link:', error);
    }
  };

  const refreshProfile = useCallback(async (): Promise<UserRole | null> => {
    if (!user?.id) return null;
    return determineProfile(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // Process any pending deep-link URL (e.g. OAuth callback cold start)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleDeepLink(initialUrl);
        }

        // Check the current session
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted && session?.user) {
          setIsSignedIn(true);
          setUser(session.user);
          await determineProfile(session.user.id);
        }
      } catch (error) {
        // Offline / corrupt storage / missing env must still let the app
        // open (as a guest) instead of hanging on the splash screen.
        console.error('Auth initialization failed, continuing as guest:', error);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    initialize();

    // Listen for auth state changes (login, logout, OAuth callback, etc.)
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setIsSignedIn(true);
        setUser(session.user);
        // Link any bookings made as a guest with this email (web booking
        // without an account) so they show up in the app. Non-blocking and
        // never fatal — offline failures must not kill the session.
        try {
          await claimGuestBookings();
        } catch (error) {
          console.warn('claimGuestBookings failed, skipping:', error);
        }
        await determineProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsSignedIn(false);
        setUser(null);
        setRole(null);
        setIsAdmin(false);
        setNeedsOnboarding(null);
      }
    });

    // Listen for deep links (OAuth callback when the app is in foreground)
    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoaded, isSignedIn, role, isAdmin, user, needsOnboarding, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook for consuming components — throws if used outside <AuthProvider>. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
