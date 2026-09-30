import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  searchProviders,
  getProfessions,
  getProviderPins,
  SearchResultProvider,
  ProviderPin,
} from '@/lib/services/patient-service';
import { DoctorMap } from '@/components/map/DoctorMap';

/** Lowercase + strip accents so "Médecin" matches "medecin". */
function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function RatingBadge({ rating, count }: { rating: number | null | undefined; count: number }) {
  // New providers may have no reviews yet — rating can be null.
  const safe = typeof rating === 'number' && Number.isFinite(rating) ? rating : 0;
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="star" size={12} color="#F59E0B" />
      <Text className="text-xs font-semibold text-dark">{safe.toFixed(1)}</Text>
      <Text className="text-xs text-grayText">({count})</Text>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [professions, setProfessions] = useState<{ id: string; name: string }[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResultProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState<ProviderPin[]>([]);

  // Load professions, then pre-select the Médecin category when present.
  // Falls back to "Tous" (all doctors) when no such category exists.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getProfessions();
        if (!active) return;
        setProfessions(p);
        setActiveFilter((current) => {
          if (current !== null) return current;
          return p.find((prof) => normalizeName(prof.name).includes('medecin'))?.name ?? null;
        });
      } catch (e) {
        console.error('Failed to load professions:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const doSearch = useCallback(async (q: string, profId: string | null) => {
    setLoading(true);
    try {
      const data = await searchProviders({ query: q || undefined, professionId: profId || undefined });
      setResults(data);
    } catch (e) {
      // Offline / backend unreachable: show empty state, never stick the loader.
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search — runs on mount too (empty query + "Tous" = all doctors).
  useEffect(() => {
    const timer = setTimeout(() => {
      const prof = professions.find((p) => p.name === activeFilter);
      doSearch(query, prof?.id ?? null);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeFilter, professions, doSearch]);

  // Map pins for the visible results (only cabinets with picked locations).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getProviderPins(results.map((r) => r.id));
        if (active) setPins(p);
      } catch (e) {
        console.error('Failed to load pins:', e);
        if (active) setPins([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [results]);

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 124 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} className="px-5 pt-4">
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Recherche</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">Trouvez le bon médecin pour vous</Text>
        </Animated.View>

        {/* Search pill */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} className="mx-5 mt-5 flex-row items-center rounded-[32px] border border-hairline bg-white px-5 py-3 shadow-pill">
          <Ionicons name="search" size={20} color="#6a6a6a" />
          <TextInput
            className="ml-3 flex-1 py-1 text-sm font-medium text-dark"
            placeholder="Médecin, spécialité, ville..."
            placeholderTextColor="#929292"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#929292" />
            </Pressable>
          )}
        </Animated.View>

        {/* Filter chips — always visible; Médecin is pre-selected by default */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 14 }}
              >
                <Pressable
                  className={`rounded-full px-4 py-2 ${!activeFilter ? 'bg-primary' : 'border border-hairline bg-white'}`}
                  onPress={() => setActiveFilter(null)}
                >
                  <Text className={`text-sm font-medium ${!activeFilter ? 'text-white' : 'text-dark'}`}>Tous</Text>
                </Pressable>
                {professions.map((prof) => {
                  const active = activeFilter === prof.name;
                  return (
                    <Pressable
                      key={prof.id}
                      className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border border-hairline bg-white'}`}
                      onPress={() => setActiveFilter(active ? null : prof.name)}
                    >
                      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-dark'}`}>{prof.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* Results */}
            <View className="mt-6 px-5">
              {pins.length > 0 && (
                <View className="mb-4 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
                  <DoctorMap
                    key={pins.map((p) => p.provider_id).join(',')}
                    pins={pins.map((p) => ({
                      lat: p.lat,
                      lng: p.lng,
                      title: p.name,
                      description: p.city ?? undefined,
                    }))}
                    height={220}
                  />
                  <Text className="px-4 py-2.5 text-xs text-grayText">
                    {pins.length} lieu{pins.length > 1 ? 'x' : ''} sur la carte
                  </Text>
                </View>
              )}
              {results.length > 0 ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">Résultats</Text>
                    <Text className="text-sm font-medium text-grayText">{results.length} trouvé{results.length > 1 ? 's' : ''}</Text>
                  </View>
                  <View className="mt-4 gap-4">
                    {results.map((doc, index) => (
                      <Animated.View key={doc.id} entering={FadeInDown.delay(120 + index * 50).duration(400)}>
                        <TouchableOpacity
                          className="overflow-hidden rounded-panel border-hairline bg-white shadow-panel"
                          activeOpacity={0.7}
                          onPress={() => router.push(`/doctor/${doc.id}`)}
                        >
                          <View className="flex-row p-4">
                            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                              <Ionicons name="person" size={28} color="#F53E8A" />
                            </View>
                            <View className="ml-3 flex-1">
                              <View className="flex-row items-center justify-between">
                                <Text className="flex-1 text-base font-semibold text-dark" numberOfLines={1}>
                                  Dr {doc.firstName} {doc.lastName}
                                </Text>
                                <RatingBadge rating={doc.rating} count={doc.reviewCount} />
                              </View>
                              <Text className="mt-0.5 text-sm font-medium text-grayText">{doc.specialty}</Text>
                              <View className="mt-1 flex-row items-center gap-3">
                                {doc.city && (
                                  <View className="flex-row items-center gap-1">
                                    <Ionicons name="location-outline" size={12} color="#929292" />
                                    <Text className="text-xs text-grayText">{doc.city}</Text>
                                  </View>
                                )}
                                {doc.yearsOfExperience && (
                                  <View className="flex-row items-center gap-1">
                                    <Ionicons name="time-outline" size={12} color="#929292" />
                                    <Text className="text-xs text-grayText">{doc.yearsOfExperience} ans</Text>
                                  </View>
                                )}
                              </View>
                              <View className="mt-2.5 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-1.5">
                                  {doc.acceptsNewPatients ? (
                                    <>
                                      <View className="h-2 w-2 rounded-full bg-success" />
                                      <Text className="text-xs font-medium text-success">Accepte les patients</Text>
                                    </>
                                  ) : (
                                    <>
                                      <View className="h-2 w-2 rounded-full bg-grayText" />
                                      <Text className="text-xs font-medium text-grayText">Non disponible</Text>
                                    </>
                                  )}
                                </View>
                                <TouchableOpacity
                                  className="rounded-lg bg-primary px-4 py-2"
                                  activeOpacity={0.8}
                                  onPress={() => router.push(`/doctor/${doc.id}`)}
                                >
                                  <Text className="text-xs font-medium text-white">Voir profil</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : loading ? (
                <View className="mt-10 items-center">
                  <ActivityIndicator size="large" color="#F53E8A" />
                </View>
              ) : (
                <Animated.View entering={FadeInDown.duration(400)} className="mt-10 items-center">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-softCloud">
                    <Ionicons name="search-outline" size={36} color="#929292" />
                  </View>
                  <Text className="mt-6 text-lg font-semibold text-dark">Aucun résultat</Text>
                  <Text className="mt-2 text-center text-sm text-grayText">Essayez avec d'autres mots-clés ou filtres</Text>
                </Animated.View>
              )}
            </View>
      </ScrollView>
    </SafeAreaView>
  );
}
