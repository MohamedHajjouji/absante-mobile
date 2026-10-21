import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore, ProfessionType } from '@/lib/onboarding/onboarding-store';
import { getSpecialties, searchSpecialties, Specialty } from '@/lib/services/specialties-service';

const PROFESSIONS: {
  value: ProfessionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { value: 'medecin_cabinet', label: 'Médecin (cabinet)', icon: 'medkit', color: '#0D61B6' },
  { value: 'pharmacie', label: 'Pharmacie', icon: 'medical', color: '#3578FF' },
  { value: 'clinique', label: 'Clinique', icon: 'medical', color: '#10B981' },
  { value: 'home_doctor', label: 'Médecin à domicile', icon: 'car-sport', color: '#F59E0B' },
  { value: 'medical_supplies', label: 'Fournitures médicales', icon: 'cube', color: '#8B5CF6' },
  { value: 'nurse', label: 'Infirmier·ère', icon: 'person-circle', color: '#F53E8A' },
];

const NEEDS_SPECIALTY: ProfessionType[] = ['medecin_cabinet', 'home_doctor', 'nurse', 'clinique'];

/**
 * Step 1 — Profession + specialties selection.
 * Specialties come from the same `specialties` table as the web app
 * (practitioner names: Dentiste, Cardiologue...), saved to
 * `provider_specialties` on submit.
 */
export function StepProfession() {
  const profession = useOnboardingStore((s) => s.profession);
  const setProfession = useOnboardingStore((s) => s.setProfession);
  const selectedSpecialtyIds = useOnboardingStore((s) => s.selectedSpecialtyIds);
  const setSelectedSpecialtyIds = useOnboardingStore((s) => s.setSelectedSpecialtyIds);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const list = await getSpecialties(60);
        if (active) {
          setSpecialties(list);
          setResults(list.slice(0, 12));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults(specialties.slice(0, 12));
      return;
    }
    const t = setTimeout(async () => {
      setResults(await searchSpecialties(q, 12));
    }, 300);
    return () => clearTimeout(t);
  }, [query, specialties]);

  const toggle = (id: string) => {
    if (selectedSpecialtyIds.includes(id)) {
      setSelectedSpecialtyIds(selectedSpecialtyIds.filter((s) => s !== id));
    } else {
      setSelectedSpecialtyIds([...selectedSpecialtyIds, id]);
    }
  };

  const showSpecialties = profession != null && NEEDS_SPECIALTY.includes(profession);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-5">
        <Text className="text-center text-lg font-semibold tracking-[-0.3px] text-dark">
          Quelle est votre profession ?
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-grayText">
          Sélectionnez la catégorie qui décrit le mieux votre activité.
        </Text>
      </View>

      <View className="mt-6 flex-row flex-wrap gap-3 px-5">
        {PROFESSIONS.map((p) => {
          const isSelected = profession === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => setProfession(p.value)}
              className={`w-[48%] items-center rounded-listing border bg-white p-4 shadow-panel ${
                isSelected ? 'border-primary' : 'border-hairline'
              }`}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${p.color}15` }}
              >
                <Ionicons name={p.icon} size={26} color={p.color} />
              </View>
              <Text
                className={`mt-2 text-center text-sm font-medium ${
                  isSelected ? 'text-primary' : 'text-dark'
                }`}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showSpecialties && (
        <View className="mt-6 px-5">
          <Text className="text-base font-semibold text-dark">Vos spécialités</Text>
          <Text className="mt-1 text-xs font-medium text-grayText">
            Ex : Dentiste, Cardiologue… (comme sur le site web)
          </Text>
          <View className="mt-3 flex-row items-center rounded-lg border border-hairline bg-white px-3">
            <Ionicons name="search" size={16} color="#929292" />
            <TextInput
              className="ml-2 flex-1 py-2.5 text-sm text-dark"
              placeholder="Rechercher une spécialité..."
              placeholderTextColor="#929292"
              value={query}
              onChangeText={setQuery}
            />
            {loading && <ActivityIndicator size="small" color="#F53E8A" />}
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {results.map((s) => {
              const active = selectedSpecialtyIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggle(s.id)}
                  className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-softCloud'}`}
                >
                  <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-dark'}`}>
                    {s.name_fr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedSpecialtyIds.length > 0 && (
            <Text className="mt-2 text-xs font-medium text-success">
              {selectedSpecialtyIds.length} spécialité{selectedSpecialtyIds.length > 1 ? 's' : ''} sélectionnée{selectedSpecialtyIds.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
