import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore, ProfessionType } from '@/lib/onboarding/onboarding-store';

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

/**
 * Step 1 — Profession selection.
 * Renders a responsive grid of profession cards. The user taps one to
 * select it; the selected card gets a pink ring and tint.
 */
export function StepProfession() {
  const profession = useOnboardingStore((s) => s.profession);
  const setProfession = useOnboardingStore((s) => s.setProfession);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
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
    </ScrollView>
  );
}
