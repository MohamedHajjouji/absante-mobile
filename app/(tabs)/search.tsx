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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getRecentSearches,
  saveSearch,
  removeSearch,
  clearSearches,
  type SearchHistoryEntry,
} from '@/lib/services/search-history-service';
import {
  searchProviders,
  getProfessions,
  getCities,
  getProviderPins,
  SearchResultProvider,
  ProviderPin,
} from '@/lib/services/patient-service';
import {
  getSpecialties,
  searchSpecialties,
  Specialty,
} from '@/lib/services/specialties-service';
import { useLanguage } from '@/lib/i18n/language-context';
import { DoctorMap } from '@/components/map/DoctorMap';
import { MapModal } from '@/components/map/MapModal';

function RatingBadge({ rating, count }: { rating: number | null | undefined; count: number }) {
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
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const specName = (s: Specialty) => (lang === 'ar' ? s.name_ar || s.name_fr : s.name_fr);
  const params = useLocalSearchParams<{ specialty?: string; city?: string; q?: string }>();
  const [query, setQuery] = useState('');
  const [professions, setProfessions] = useState<{ id: string; name: string }[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [cities, setCities] = useState<{ id: string; name_fr: string; slug: string }[]>([]);
  const [activeProfession, setActiveProfession] = useState<string | null>(null);
  const [activeSpecialty, setActiveSpecialty] = useState<Specialty | null>(null);
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [specialtyResults, setSpecialtyResults] = useState<Specialty[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [results, setResults] = useState<SearchResultProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState<ProviderPin[]>([]);
  const [recents, setRecents] = useState<SearchHistoryEntry[]>([]);
  const [mapOpen, setMapOpen] = useState(false);

  const loadRecents = useCallback(async () => {
    if (!user?.id) {
      setRecents([]);
      return;
    }
    setRecents(await getRecentSearches(user.id));
  }, [user?.id]);

  useEffect(() => {
    loadRecents();
  }, [loadRecents]);

  useFocusEffect(
    useCallback(() => {
      loadRecents();
    }, [loadRecents])
  );

  // Autosave meaningful searches (debounced): query ≥2 chars, a specialty,
  // or a city. Profession alone doesn't trigger — it's preselected by default.
  useEffect(() => {
    if (!user?.id) return;
    const q = query.trim();
    const c = cityFilter.trim();
    if (q.length < 2 && !activeSpecialty && c.length < 2) return;
    const spec = activeSpecialty;
    const timer = setTimeout(() => {
      void saveSearch(user.id, {
        query: q,
        specialtyId: spec?.id ?? null,
        specialtyName: spec ? specName(spec) : null,
        professionName: activeProfession,
        city: c || null,
      }).then(() => loadRecents());
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeSpecialty, cityFilter, user?.id]);

  const rememberProfession = useCallback(
    (profName: string | null) => {
      if (!user?.id) return;
      const q = query.trim();
      const c = cityFilter.trim();
      void saveSearch(user.id, {
        query: q,
        specialtyId: activeSpecialty?.id ?? null,
        specialtyName: activeSpecialty ? specName(activeSpecialty) : null,
        professionName: profName,
        city: c || null,
      }).then(() => loadRecents());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, query, activeSpecialty, cityFilter]
  );

  const applyRecent = useCallback(
    async (entry: SearchHistoryEntry) => {
      setQuery(entry.query);
      setCityFilter(entry.city ?? '');
      if (entry.specialtyId) {
        const hit = specialties.find((s) => s.id === entry.specialtyId);
        if (hit) {
          setActiveSpecialty(hit);
          setSpecialtyQuery(specName(hit));
        } else if (entry.specialtyName) {
          try {
            const res = await searchSpecialties(entry.specialtyName, 1);
            if (res.length > 0) {
              setActiveSpecialty(res[0]);
              setSpecialtyQuery(specName(res[0]));
            } else {
              setActiveSpecialty(null);
              setSpecialtyQuery(entry.specialtyName);
            }
          } catch {
            setActiveSpecialty(null);
            setSpecialtyQuery(entry.specialtyName);
          }
        } else {
          setActiveSpecialty(null);
          setSpecialtyQuery('');
        }
      } else {
        setActiveSpecialty(null);
        setSpecialtyQuery('');
      }
      if (entry.professionName && professions.some((p) => p.name === entry.professionName)) {
        setActiveProfession(entry.professionName);
      } else if (!entry.professionName) {
        setActiveProfession(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specialties, professions]
  );

  // Deep-link params (home categories → search with specialty slug).
  useEffect(() => {
    if (typeof params.q === 'string' && params.q) setQuery(params.q);
    if (typeof params.city === 'string' && params.city) setCityFilter(params.city);
  }, [params.q, params.city]);

  // Load professions + specialties + cities once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, specs, c] = await Promise.all([
          getProfessions(),
          getSpecialties(60),
          getCities(40),
        ]);
        if (!active) return;
        setProfessions(p);
        setSpecialties(specs);
        setCities(c as any);
        // Deep-linked specialty slug → pre-select it.
        if (typeof params.specialty === 'string' && params.specialty) {
          const hit = specs.find((s) => s.slug === params.specialty);
          if (hit) {
            setActiveSpecialty(hit);
            setSpecialtyQuery(lang === 'ar' ? hit.name_ar || hit.name_fr : hit.name_fr);
          }
        }
        // No else branch: the default stays "Tous" (activeProfession=null).
        // Preselecting Médecin silently hid dentists, pharmacists, ... from
        // the default view and from name searches — users narrow down
        // explicitly via the profession chips instead.
      } catch (e) {
        console.error('Failed to load filters:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Specialty autocomplete (mirrors web /api/specialties/autocomplete).
  useEffect(() => {
    const q = specialtyQuery.trim();
    if (q.length < 1 || (activeSpecialty && specName(activeSpecialty) === q)) {
      setSpecialtyResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSpecialtyResults(await searchSpecialties(q, 8));
      } catch {
        setSpecialtyResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [specialtyQuery, activeSpecialty]);

  const doSearch = useCallback(
    async (q: string, profName: string | null, spec: Specialty | null, city: string) => {
      setLoading(true);
      try {
        const prof = professions.find((p) => p.name === profName);
        const data = await searchProviders({
          query: q || undefined,
          professionId: prof?.id,
          specialtyId: spec?.id,
          city: city || undefined,
          limit: 50,
        });
        setResults(data);
      } catch (e) {
        console.error('Search failed:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [professions]
  );

  // Debounced search — runs on mount too (empty query + "Tous" = all doctors).
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query, activeProfession, activeSpecialty, cityFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeProfession, activeSpecialty, cityFilter, professions, doSearch]);

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} className="px-5 pt-4">
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">{t('search.title')}</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">{t('search.subtitle')}</Text>
        </Animated.View>

        {/* Search pill */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} className="mx-5 mt-5 flex-row items-center rounded-[32px] border border-hairline bg-white px-5 py-3 shadow-pill">
          <Ionicons name="search" size={20} color="#6a6a6a" />
          <TextInput
            className="ml-3 flex-1 py-1 text-sm font-medium text-dark"
            placeholder={t('search.ph')}
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

        {/* Specialty autocomplete — same source as web (specialties table) */}
        <View className="mx-5 mt-3 rounded-2xl border border-hairline bg-white px-4 py-2.5">
          <View className="flex-row items-center">
            <Ionicons name="medkit-outline" size={18} color="#0D61B6" />
            <TextInput
              className="ml-2 flex-1 py-1 text-sm font-medium text-dark"
              placeholder={t('search.specPh')}
              placeholderTextColor="#929292"
              value={specialtyQuery}
              onChangeText={(text) => {
                setSpecialtyQuery(text);
                if (activeSpecialty && text !== specName(activeSpecialty)) setActiveSpecialty(null);
              }}
            />
            {activeSpecialty && (
              <Pressable
                onPress={() => {
                  setActiveSpecialty(null);
                  setSpecialtyQuery('');
                }}
              >
                <Ionicons name="close-circle" size={18} color="#929292" />
              </Pressable>
            )}
          </View>
          {specialtyResults.length > 0 && (
            <View className="mt-2 border-t border-hairline">
              {specialtyResults.map((s) => (
                <Pressable
                  key={s.id}
                  className="py-2.5"
                  onPress={() => {
                    setActiveSpecialty(s);
                    setSpecialtyQuery(specName(s));
                    setSpecialtyResults([]);
                  }}
                >
                  <Text className="text-sm font-medium text-dark">{specName(s)}</Text>
                  {lang !== 'ar' && s.name_ar ? <Text className="text-xs text-grayText">{s.name_ar}</Text> : null}
                  {lang === 'ar' ? <Text className="text-xs text-grayText">{s.name_fr}</Text> : null}
                </Pressable>
              ))}
            </View>
          )}
          {activeSpecialty && (
            <View className="mt-2 self-start rounded-full bg-primary px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">{specName(activeSpecialty)}</Text>
            </View>
          )}
        </View>

        {/* City filter — same source as web (cities table) */}
        <View className="mx-5 mt-3 flex-row items-center rounded-2xl border border-hairline bg-white px-4 py-2.5">
          <Ionicons name="location-outline" size={18} color="#0D61B6" />
          <TextInput
            className="ml-2 flex-1 py-1 text-sm font-medium text-dark"
            placeholder={t('search.cityPh')}
            placeholderTextColor="#929292"
            value={cityFilter}
            onChangeText={setCityFilter}
          />
          {cityFilter.length > 0 && (
            <Pressable onPress={() => setCityFilter('')}>
              <Ionicons name="close-circle" size={18} color="#929292" />
            </Pressable>
          )}
        </View>
        {cities.length > 0 && !cityFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 10 }}
          >
            {cities.slice(0, 8).map((c) => (
              <Pressable
                key={c.id}
                className="rounded-full border border-hairline bg-white px-3 py-1.5"
                onPress={() => setCityFilter(c.name_fr)}
              >
                <Text className="text-xs font-medium text-dark">{c.name_fr}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Profession chips */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 14 }}
          >
            <Pressable
              className={`rounded-full px-4 py-2 ${!activeProfession && !activeSpecialty ? 'bg-primary' : 'border border-hairline bg-white'}`}
              onPress={() => {
                setActiveProfession(null);
                setActiveSpecialty(null);
                setSpecialtyQuery('');
                rememberProfession(null);
              }}
            >
              <Text className={`text-sm font-medium ${!activeProfession && !activeSpecialty ? 'text-white' : 'text-dark'}`}>{t('search.all')}</Text>
            </Pressable>
            {professions.map((prof) => {
              const active = activeProfession === prof.name;
              return (
                <Pressable
                  key={prof.id}
                  className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border border-hairline bg-white'}`}
                  onPress={() => {
                    const next = active ? null : prof.name;
                    setActiveProfession(next);
                    rememberProfession(next);
                  }}
                >
                  <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-dark'}`}>{prof.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Popular specialties shortcuts (DB-driven, like web landing) */}
        {!activeSpecialty && specialties.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 10 }}
          >
            {specialties.slice(0, 10).map((s) => (
              <Pressable
                key={s.id}
                className="rounded-full bg-secondary-tone-50 px-3 py-1.5"
                onPress={() => {
                  setActiveSpecialty(s);
                  setSpecialtyQuery(specName(s));
                }}
              >
                <Text className="text-xs font-medium text-secondary-tone">{specName(s)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Recent searches — one-tap re-run, synced across devices */}
        {user?.id && recents.length > 0 && !query && !activeSpecialty && !cityFilter && (
          <View className="mt-5 px-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-dark">{t('search.recent')}</Text>
              <Pressable
                onPress={() => {
                  if (!user?.id) return;
                  void clearSearches(user.id).then(() => loadRecents());
                }}
                accessibilityRole="button"
                accessibilityLabel={t('search.clearHistory')}
              >
                <Text className="text-xs font-medium text-grayText">{t('search.clearHistory')}</Text>
              </Pressable>
            </View>
            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {recents.map((r) => {
                const label = [r.query, r.specialtyName ?? r.professionName, r.city]
                  .filter((p) => p && p.trim().length > 0)
                  .join(' · ');
                return (
                  <View
                    key={r.id}
                    className="max-w-full flex-row items-center rounded-full border border-hairline bg-white py-1.5 pl-3 pr-1.5"
                  >
                    <Pressable
                      className="min-w-0 flex-1 flex-row items-center gap-1.5"
                      onPress={() => applyRecent(r)}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                    >
                      <Ionicons name="time-outline" size={14} color="#929292" />
                      <Text className="text-xs font-medium text-dark" numberOfLines={1}>
                        {label}
                      </Text>
                    </Pressable>
                    <Pressable
                      className="ml-1 p-1"
                      onPress={() => {
                        if (!user?.id) return;
                        void removeSearch(user.id, r.id).then(() => loadRecents());
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('search.clearHistory')}: ${label}`}
                    >
                      <Ionicons name="close" size={14} color="#929292" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Results */}
        <View className="mt-6 px-5">
          {pins.length > 0 && (
            <View className="mb-4 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
              {/* Static preview — gestures off so the page scroll still works; tap opens the full-screen map */}
              <DoctorMap
                key={pins.map((p) => p.provider_id).join(',')}
                pins={pins.map((p) => ({
                  lat: p.lat,
                  lng: p.lng,
                  title: p.name,
                  description: p.city ?? undefined,
                }))}
                height={220}
                preview
                onOpen={() => setMapOpen(true)}
              />
              <Text className="px-4 py-2.5 text-xs text-grayText">
                {t('search.mapOn', { count: pins.length, plural: lang === 'ar' ? '' : pins.length > 1 ? 'x' : '' })}
              </Text>
            </View>
          )}
          {results.length > 0 ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">{t('search.results')}</Text>
                <Text className="text-sm font-medium text-grayText">{t('search.found', { n: results.length, plural: lang === 'ar' || lang === 'en' ? '' : results.length > 1 ? 's' : '' })}</Text>
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
                                <Text className="text-xs text-grayText">{t('common.years', { n: doc.yearsOfExperience })}</Text>
                              </View>
                            )}
                          </View>
                          <View className="mt-2.5 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-1.5">
                              {doc.acceptsNewPatients ? (
                                <>
                                  <View className="h-2 w-2 rounded-full bg-success" />
                                  <Text className="text-xs font-medium text-success">{t('search.accepts')}</Text>
                                </>
                              ) : (
                                <>
                                  <View className="h-2 w-2 rounded-full bg-grayText" />
                                  <Text className="text-xs font-medium text-grayText">{t('search.unavailable')}</Text>
                                </>
                              )}
                            </View>
                            <TouchableOpacity
                              className="rounded-lg bg-primary px-4 py-2"
                              activeOpacity={0.8}
                              onPress={() => router.push(`/doctor/${doc.id}`)}
                            >
                              <Text className="text-xs font-medium text-white">{t('search.viewProfile')}</Text>
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
              <Text className="mt-6 text-lg font-semibold text-dark">{t('search.noResult')}</Text>
              <Text className="mt-2 text-center text-sm text-grayText">{t('search.noResultBody')}</Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Full-screen interactive map (opened from the preview card) */}
      <MapModal visible={mapOpen} title={t('search.mapTitle')} onClose={() => setMapOpen(false)}>
        <DoctorMap
          key={`modal-${pins.map((p) => p.provider_id).join(',')}`}
          pins={pins.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            title: p.name,
            description: p.city ?? undefined,
          }))}
          full
        />
      </MapModal>
    </SafeAreaView>
  );
}
