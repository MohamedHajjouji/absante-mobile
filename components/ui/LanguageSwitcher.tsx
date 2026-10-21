import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLanguage, type Lang } from '@/lib/i18n/language-context';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
  { value: 'ar', label: 'عربي' },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <View
      className="flex-row items-center rounded-full border border-hairline bg-white p-1"
      accessibilityRole="radiogroup"
      accessibilityLabel="Language / Langue / اللغة"
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setLang(opt.value)}
            className={`rounded-full px-4 py-1.5 ${active ? 'bg-primary' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-grayText'}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
