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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  searchProviders,
  getProfessions,
  SearchResultProvider,
} from '@/lib/services/patient-service';

type IonIconName = keyof typeof Ionicons.glyphMap;

const SPECIALTY_ICONS: [string, IonIconName][] = [
  ["cardio", "heart"],
  ["ophtal", "eye"],
  ["ocul", "eye"],
  ["orl", "ear"],
  ["neuro", "pulse"],
  ["psychiatr", "pulse"],
  ["dermat", "color-palette"],
  ["pediatr", "body"],
  ["gynec", "woman"],
  ["obste", "woman"],
  ["urolog", "water"],
  ["sport", "fitness"],
  ["radiolog", "scan"],
  ["laborat", "flask"],
  ["analys", "flask"],
  ["dent", "happy"],
  ["stomat", "happy"],
  ["pharmac", "bandage"],
  ["infirm", "medical"],
  ["clinique", "business"],
  ["domicile", "home"],
  ["fourniture", "cube"],
  ["médecin", "heart"],
  ["medecin", "heart"],
];

function specialtyIcon(name: string): IonIconName {
  const n = name.toLowerCase();
  const hit = SPECIALTY_ICONS.find(([key]) => n.includes(key));
  return hit ? hit[1] : "medkit";
}

function RatingBadge({ rating, count }: { rating: number; count: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="star" size={12} color="#F59E0B" />
      <Text className="text-xs font-semibold text-dark">{rating.toFixed(1)}</Text>
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
  const [searched, setSearched] = useState(false);

  useEffect(() => { getProfessions().then((p) => setProfessions(p)); }, []);

  const doSearch = useCallback(async (q: string, profId: string | null) => {
    setLoading(true);
    setSearched(true);
    const data = await searchProviders({ query: q || undefined, professionId: profId || undefined });
    setResults(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 0 || activeFilter) {
        const prof = professions.find((p) => p.name === activeFilter);
        doSearch(query, prof?.id ?? null);
      } else { setResults([]); setSearched(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeFilter, professions, doSearch]);

  const isSearching = query.length > 0 || !!activeFilter;

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
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

        {isSearching ? (
          <>
            {/* Filter chips */}
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
              {loading ? (
                <View className="mt-10 items-center">
                  <ActivityIndicator size="large" color="#F53E8A" />
                </View>
              ) : results.length > 0 ? (
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
              ) : searched ? (
                <Animated.View entering={FadeInDown.duration(400)} className="mt-10 items-center">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-softCloud">
                    <Ionicons name="search-outline" size={36} color="#929292" />
                  </View>
                  <Text className="mt-6 text-lg font-semibold text-dark">Aucun résultat</Text>
                  <Text className="mt-2 text-center text-sm text-grayText">Essayez avec d'autres mots-clés ou filtres</Text>
                </Animated.View>
              ) : null}
            </View>
          </>
        ) : (
          <>
            {/* Popular specialties */}
            <Animated.View entering={FadeInDown.delay(100).duration(450)} className="mt-8 px-5">
              <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
                Spécialités populaires
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                {professions.length === 0 ? (
                  <Text className="py-1 text-sm font-medium text-grayText">Aucune spécialité disponible pour le moment.</Text>
                ) : (
                  professions.slice(0, 6).map((prof) => (
                  <Pressable
                    key={prof.id}
                    className="flex-row items-center rounded-panel border border-hairline bg-white p-3"
                    style={({ pressed }) => [{ flexBasis: "46%", flexGrow: 1 }, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                    onPress={() => setActiveFilter(prof.name)}
                  >
                    <LinearGradient
                      colors={['#FBCFE8', '#F9A8D4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Ionicons name={specialtyIcon(prof.name)} size={20} color="#F53E8A" />
                    </LinearGradient>
                    <Text className="ml-2.5 min-h-[40px] flex-1 text-[13px] font-semibold leading-5 text-dark" numberOfLines={2}>{prof.name}</Text>
                  </Pressable>
                )))}
              </View>
            </Animated.View>

            {/* Quick CTA */}
            <Animated.View entering={FadeInDown.delay(160).duration(450)} className="mx-5 mt-8 overflow-hidden rounded-3xl">
              <LinearGradient
                colors={['#F472B6', '#F53E8A', '#DB2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 24 }}
              >
                <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-semibold text-white">Besoin d'un spécialiste ?</Text>
                    <Text className="mt-1 text-sm text-pink-100">
                      Recherchez par spécialité, ville ou nom du médecin.
                    </Text>
                  </View>
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
                    <Ionicons name="search" size={28} color="#FFFFFF" />
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
