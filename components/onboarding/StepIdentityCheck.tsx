import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/lib/onboarding/onboarding-store';
import { searchUnclaimedDoctors, type DirectoryHit } from '@/lib/services/patient-service';

/**
 * Step 0 — Identity check.
 * Lets professionals find their existing directory profile (claim mode) or
 * continue as a brand-new profile (add mode). Both continue the same flow;
 * only the final verification request differs in name.
 */
export function StepIdentityCheck() {
  const { claimedProviderId, claimedProviderName, setClaimedProfile, clearClaimedProfile } =
    useOnboardingStore();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<DirectoryHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await searchUnclaimedDoctors(query.trim());
      setHits(res);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const isClaimMode = claimedProviderId !== null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        <Text className="text-center text-lg font-semibold tracking-[-0.3px] text-dark">
          Êtes-vous déjà dans l&apos;annuaire ?
        </Text>
        <Text className="mt-2 text-center text-sm font-medium leading-5 text-grayText">
          Nous avons peut-être déjà une fiche vous concernant. Retrouvez-la pour la
          revendiquer, sinon continuez comme nouveau profil.
        </Text>

        <View className="mt-6 flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center rounded-full bg-white px-5 py-3 shadow-card">
            <Ionicons name="search" size={20} color="#98A2B3" />
            <TextInput
              className="ml-3 flex-1 py-1 text-sm text-dark"
              placeholder="Votre nom de famille..."
              placeholderTextColor="#98A2B3"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              accessibilityLabel="Rechercher votre fiche annuaire"
            />
          </View>
          <Pressable
            onPress={handleSearch}
            disabled={searching || query.trim().length < 2}
            className={`rounded-full px-5 py-3.5 ${searching || query.trim().length < 2 ? 'bg-slate-200' : 'bg-dark'}`}
            accessibilityRole="button"
            accessibilityLabel="Chercher ma fiche"
          >
            {searching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Chercher</Text>
            )}
          </Pressable>
        </View>

        {searched && hits.length === 0 && (
          <View className="mt-4 rounded-xl bg-softCloud px-4 py-3">
            <Text className="text-xs leading-5 text-grayText">
              Aucune fiche trouvée pour « {query.trim()} ». Continuez comme nouveau
              profil — demande d&apos;ajout.
            </Text>
          </View>
        )}

        {hits.length > 0 && (
          <View className="mt-4 gap-2">
            {hits.map((h) => {
              const active = claimedProviderId === h.id;
              return (
                <Pressable
                  key={h.id}
                  onPress={() =>
                    active
                      ? clearClaimedProfile()
                      : setClaimedProfile(h.id, `${h.firstName} ${h.lastName}`.trim())
                  }
                  className={`flex-row items-center gap-3 rounded-2xl border bg-white p-4 ${active ? 'border-primary' : 'border-hairline'}`}
                  accessibilityRole="button"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                    <Ionicons name="medkit" size={20} color="#F53E8A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-dark">
                      {h.firstName} {h.lastName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-grayText">
                      {[h.specialty, h.city].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#F53E8A" />}
                </Pressable>
              );
            })}
          </View>
        )}

        {isClaimMode && (
          <View className="mt-4 rounded-2xl border border-primary bg-primary-50/50 p-4">
            <Text className="text-sm font-semibold text-dark">
              C&apos;est vous : Dr {claimedProviderName} ?
            </Text>
            <Text className="mt-1 text-xs leading-4 text-grayText">
              Continuez le même parcours. À la fin, demande de revendication — vous
              pourrez corriger / compléter la fiche, notre équipe vérifiera votre
              identité.
            </Text>
            <Pressable onPress={clearClaimedProfile} className="mt-2">
              <Text className="text-xs font-medium text-grayText underline">
                Non, ce n&apos;est pas moi
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
