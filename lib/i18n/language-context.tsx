import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common } from './dictionaries/common';
import { home } from './dictionaries/home';
import { search } from './dictionaries/search';
import { doctor } from './dictionaries/doctor';
import { booking } from './dictionaries/booking';
import { rdv } from './dictionaries/rdv';
import { profile } from './dictionaries/profile';
import { auth } from './dictionaries/auth';
import { onboarding } from './dictionaries/onboarding';
import { misc } from './dictionaries/misc';

export type Lang = 'fr' | 'en' | 'ar';
export type Dict = Record<string, string>;

const SOURCES: Record<string, Record<Lang, Dict>> = {
  common,
  home,
  search,
  doctor,
  booking,
  rdv,
  profile,
  auth,
  onboarding,
  misc,
};

type Dictionaries = Record<Lang, Dict>;
function buildDictionaries(): Dictionaries {
  const out: Dictionaries = { fr: {}, en: {}, ar: {} };
  for (const lang of ['fr', 'en', 'ar'] as Lang[]) {
    for (const section of Object.values(SOURCES)) {
      Object.assign(out[lang], section[lang]);
    }
  }
  return out;
}

const DICTIONARIES = buildDictionaries();

export const LOCALE_TAG: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-MA',
};

const STORAGE_KEY = 'absante-lang';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key, with optional {var} interpolation. Falls back to French, then the key. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeTag: string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
  localeTag: LOCALE_TAG.fr,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'ar' || saved === 'fr') setLangState(saved);
      } catch {
        /* storage unavailable — session-only */
      }
    })();
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[lang];
      let s: string = dict[key] ?? DICTIONARIES.fr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t, localeTag: LOCALE_TAG[lang], isRTL: lang === 'ar' }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
