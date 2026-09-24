import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// expo-secure-store is a native-only module. On web (including the Node.js
// static-rendering environment used by `expo export`), fall back to
// localStorage when available, otherwise use an in-memory store so the
// Supabase client can still persist its session during SSR.
const memoryStorage = new Map<string, string>();

const secureStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key: string) => {
          const value =
            typeof localStorage !== 'undefined'
              ? localStorage.getItem(key)
              : memoryStorage.get(key) ?? null;
          return value ? JSON.parse(value) : null;
        },
        setItem: async (key: string, value: string) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            memoryStorage.set(key, JSON.stringify(value));
          }
        },
        removeItem: async (key: string) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          } else {
            memoryStorage.delete(key);
          }
        },
      }
    : {
        getItem: async (key: string) => {
          const value = await SecureStore.getItemAsync(key);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (key: string, value: string) => {
          await SecureStore.setItemAsync(key, JSON.stringify(value));
        },
        removeItem: async (key: string) => {
          await SecureStore.deleteItemAsync(key);
        },
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
  },
});