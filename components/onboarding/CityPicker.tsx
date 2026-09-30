import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export interface MobileCity {
  id: string;
  name_fr: string;
  region: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface CityPickerProps {
  /** Current city text (store of truth lives in the parent). */
  value: string;
  /** Whether the current text is a genuine list pick (parent clears on diverge). */
  hasSelection: boolean;
  onPick: (city: MobileCity) => void;
  onText: (text: string) => void;
}

/**
 * City field bound to the `cities` table (same source as the web search).
 * Typing without picking from the list doesn't count — the parent enforces
 * a real selection before continuing.
 */
export function CityPicker({ value, hasSelection, onPick, onText }: CityPickerProps) {
  const [text, setText] = useState(value);
  const [results, setResults] = useState<MobileCity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = text.trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('cities')
          .select('id, name_fr, region, slug, latitude, longitude')
          .or(`name_fr.ilike.%${q}%,slug.ilike.%${q}%`)
          .order('is_major', { ascending: false })
          .order('population', { ascending: false, nullsFirst: false })
          .limit(8);
        setResults((data ?? []) as MobileCity[]);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  const showError = text.trim().length > 0 && !hasSelection;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-dark">Ville *</Text>
      <View
        className="flex-row w-full items-center rounded-lg px-4"
        style={{ borderWidth: 1, borderColor: showError ? '#c13515' : focused ? '#3D4B64' : '#DDDDDD' }}
      >
        <Ionicons
          name="location"
          size={18}
          color={focused ? '#3D4B64' : '#6a6a6a'}
          style={{ marginRight: 12 }}
        />
        <TextInput
          style={{ flex: 1, width: '100%', paddingVertical: 9 }}
          className="flex-1 min-w-full py-4 text-sm font-medium text-dark"
          placeholderTextColor="#929292"
          placeholder="Casablanca"
          value={text}
          onChangeText={(t) => {
            setText(t);
            onText(t);
          }}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          accessibilityLabel="Ville — choisissez dans la liste"
        />
        {loading && <ActivityIndicator size="small" color="#F53E8A" />}
      </View>

      {open && results.length > 0 && (
        <View
          className="mt-2 overflow-hidden rounded-xl border border-hairline bg-white"
          style={{ borderWidth: 1 }}
        >
          {results.map((city) => (
            <Pressable
              key={city.id}
              onPress={() => {
                setText(city.name_fr);
                setResults([]);
                setOpen(false);
                onPick(city);
              }}
              className="px-4 py-3"
              style={({ pressed }) => pressed && { opacity: 0.7, backgroundColor: '#F7F7F7' }}
              accessibilityRole="button"
              accessibilityLabel={`Choisir ${city.name_fr}`}
            >
              <Text className="text-sm font-medium text-dark">{city.name_fr}</Text>
              {!!city.region && (
                <Text className="mt-0.5 text-xs text-grayText">{city.region}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {showError ? (
        <Text className="mt-1 text-xs text-[#c13515]">
          Sélectionnez une ville dans la liste
        </Text>
      ) : (
        <Text className="mt-1 text-xs text-grayText">
          La ville doit être choisie dans la liste officielle
        </Text>
      )}
    </View>
  );
}
