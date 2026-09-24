import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/lib/onboarding/onboarding-store';

const STEP_LABELS = [
  'Profession',
  'Infos perso.',
  'Organisation',
  'Services',
  'Vérification',
];

/**
 * Horizontal progress bar with numbered circles and step labels.
 * Highlights the active step in primary pink and completed steps with a
 * green checkmark.
 */
export function StepIndicator() {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  return (
    <View className="px-5 py-4">
      {/* Progress line */}
      <View className="mb-4 h-1.5 w-full flex-row overflow-hidden rounded-full bg-softCloud">
        {STEP_LABELS.map((_, index) => {
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;

          const bgColor = isCompleted || isActive ? 'bg-primary' : 'bg-softCloud';

          return (
            <View
              key={index}
              className={`h-full flex-1 ${bgColor}`}
            />
          );
        })}
      </View>

      {/* Step dots + labels */}
      <View className="flex-row justify-between">
        {STEP_LABELS.map((label, index) => {
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;

          return (
            <View key={label} className="items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  isCompleted || isActive ? 'bg-primary' : 'bg-softCloud'
                }`}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                ) : (
                  <Text className="text-xs font-medium text-white">
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`mt-1 text-xs font-medium ${
                  isCompleted || isActive ? 'text-primary' : 'text-grayText'
                }`}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
