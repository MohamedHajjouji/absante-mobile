import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { StepIdentityCheck } from '@/components/onboarding/StepIdentityCheck';
import { StepProfession } from '@/components/onboarding/StepProfession';
import { StepPersonalInfo } from '@/components/onboarding/StepPersonalInfo';
import { StepOrganization } from '@/components/onboarding/StepOrganization';
import { StepServices } from '@/components/onboarding/StepServices';
import { StepVerification } from '@/components/onboarding/StepVerification';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useOnboardingStore } from '@/lib/onboarding/onboarding-store';
import { submitOnboarding, saveVerificationDocument } from '@/lib/onboarding/submit-onboarding';
import { useAuth } from '@/lib/contexts/AuthContext';
import { uploadAvatar } from '@/lib/services/user-service';

const STEPS = [StepIdentityCheck, StepProfession, StepPersonalInfo, StepOrganization, StepServices, StepVerification];

export default function ProfessionalOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentStep, nextStep, prevStep, reset, claimedProviderId, claimedProviderName, profession, personalInfo, organizationInfo, address, facility, services, workingHours, verificationDocs, agreedToTerms } = useOnboardingStore();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClaimMode = claimedProviderId !== null;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return true; // identity check is optional — claim or new
      case 1: return profession != null;
      case 2: return !!personalInfo.firstName && !!personalInfo.lastName && !!personalInfo.phone;
      case 3: return !!organizationInfo.name && !!address.city && !!address.streetAddress;
      case 4: return services.length > 0;
      case 5: return agreedToTerms;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (!canProceed()) {
      Alert.alert('Information manquante', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (currentStep < STEPS.length - 1) {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) prevStep();
  };

  const handleSubmit = async () => {
    if (!canProceed() || !user?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload avatar if selected
      if (personalInfo.avatarUrl) {
        await uploadAvatar(personalInfo.avatarUrl, user.id);
      }

      // 2. Submit onboarding data (claim mode reuses the directory row +
      // files a profile_claims request; new mode creates a fresh provider)
      const result = await submitOnboarding({
        claimedProviderId,
        profession: profession ?? '',
        personalInfo,
        organizationInfo,
        address,
        facility,
        services,
        workingHours,
      });

      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      const providerId = result.providerId;

      // 3. Upload verification documents
      const docUploads = [
        { key: 'licenseDocument' as const, docs: verificationDocs.licenseDocument, type: 'license' },
        { key: 'nationalIdDocument' as const, docs: verificationDocs.nationalIdDocument, type: 'national_id' },
        { key: 'professionalOrderDocument' as const, docs: verificationDocs.professionalOrderDocument, type: 'professional_order' },
      ];

      for (const doc of docUploads) {
        if (doc.docs && providerId) {
          await saveVerificationDocument(providerId, doc.type, doc.docs.uri);
        }
      }

      // 4. Success — pass the request type to the completion screen
      // (store is reset, so params carry claim vs add).
      const mode = isClaimMode ? 'claim' : 'add';
      reset();
      router.replace({
        pathname: '/(onboarding)/completion',
        params: mode === 'claim' ? { mode, name: claimedProviderName ?? '' } : { mode },
      });
    } catch (e) {
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setSubmitting(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-pageBg">
      <StepIndicator />

      <View className="flex-1">
        <CurrentStepComponent />
      </View>

      {/* Error message */}
      {error && (
        <View className="mx-5 mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <Text className="text-xs text-[#c13515]">{error}</Text>
        </View>
      )}

      {/* Navigation buttons */}
      <View className="flex-row  items-center px-5 pb-2 pt-2 ">
        {/*
        {currentStep > 0 && (
          <Pressable
            onPress={handlePrev}
            className="flex-1 rounded-lg border-hairline bg-white py-4"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text className="text-center text-base font-medium text-dark">Retour</Text>
          </Pressable>
        )}*/}

        {!isLastStep ? (
          <PrimaryButton
            title={currentStep === 0 ? (isClaimMode ? 'Revendiquer et continuer' : 'Continuer comme nouveau') : 'Continuer'}
            onPress={handleNext}
            disabled={!canProceed()}
            className={currentStep > 0 ? 'flex-1' : 'w-full'}
          />
        ) : (
          <PrimaryButton
            title={submitting ? 'Envoi en cours...' : isClaimMode ? 'Demander la revendication' : "Demander l'ajout"}
            onPress={handleSubmit}
            loading={submitting}
            className="flex-1"
          />
        )}
      </View>
    </SafeAreaView>
  );
}