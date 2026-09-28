import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast with a clear message instead of crashing inside `createClient`
// with `undefined`. This happens in production EAS builds when `.env` was
// never uploaded as EAS secrets (`.env` is gitignored): the app would
// otherwise crash on first open with no actionable error.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Local: copy `.env.example` → `.env`. EAS: `eas secret:create --name EXPO_PUBLIC_SUPABASE_URL ...` (same for the anon key) and rebuild.'
  );
}

// expo-secure-store is a native-only module. On web (including the Node.js
// static-rendering environment used by `expo export`), fall back to
// localStorage when available, otherwise use an in-memory store so the
// Supabase client can still persist its session during SSR.
const memoryStorage = new Map<string, string>();

/** Corrupt stored values must never throw — a single bad entry would
 *  otherwise break every Supabase call app-wide. */
function safeParse(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    console.warn('[supabase] Ignoring corrupt stored session value.');
    return null;
  }
}

const secureStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key: string) => {
          try {
            const value =
              typeof localStorage !== 'undefined'
                ? localStorage.getItem(key)
                : memoryStorage.get(key) ?? null;
            return safeParse(value);
          } catch {
            return safeParse(memoryStorage.get(key) ?? null);
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(key, JSON.stringify(value));
            } else {
              memoryStorage.set(key, JSON.stringify(value));
            }
          } catch {
            memoryStorage.set(key, JSON.stringify(value));
          }
        },
        removeItem: async (key: string) => {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(key);
            } else {
              memoryStorage.delete(key);
            }
          } catch {
            memoryStorage.delete(key);
          }
        },
      }
    : {
        // SecureStore throws on devices with a broken keystore / locked
        // hardware. Fall back to memory so auth calls degrade instead of
        // crashing the app.
        getItem: async (key: string) => {
          try {
            return safeParse(await SecureStore.getItemAsync(key));
          } catch (e) {
            console.warn('[supabase] SecureStore read failed, using memory.', e);
            return safeParse(memoryStorage.get(key) ?? null);
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await SecureStore.setItemAsync(key, JSON.stringify(value));
          } catch (e) {
            console.warn('[supabase] SecureStore write failed, using memory.', e);
            memoryStorage.set(key, JSON.stringify(value));
          }
        },
        removeItem: async (key: string) => {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch {
            memoryStorage.delete(key);
          }
        },
      };

export const supabase = createClient(
  supabaseUrl ?? 'https://missing-supabase-url.supabase.co',
  supabaseAnonKey ?? 'missing-anon-key',
  {
    auth: {
      storage: secureStorage,
    },
  }
);

/** `true` when real Supabase credentials are configured. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);