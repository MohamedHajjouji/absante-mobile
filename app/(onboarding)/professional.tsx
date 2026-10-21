import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
import { loadDraft, saveDraft, clearDraft } from '@/lib/onboarding/draft-sync';
import { submitOnboarding, saveVerificationDocument } from '@/lib/onboarding/submit-onboarding';
import { useAuth } from '@/lib/contexts/AuthContext';
import { uploadAvatar } from '@/lib/services/user-service';

const STEPS = [StepIdentityCheck, StepProfession, StepPersonalInfo, StepOrganization, StepServices, StepVerification];

export default function ProfessionalOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentStep, nextStep, prevStep, reset, claimedProviderId, claimedProviderName, profession, selectedSpecialtyIds, personalInfo, organizationInfo, address, facility, services, workingHours, verificationDocs, agreedToTerms } = useOnboardingStore();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isClaimMode = claimedProviderId !== null;

  // Cross-device resume: hydrate from server draft only when THIS device
  // is pristine — local work always wins.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const draft = await loadDraft(user.id);
      if (cancelled || !draft) return;
      const s = useOnboardingStore.getState();
      const pristine =
        s.currentStep === 0 &&
        s.profession == null &&
        !s.personalInfo.firstName &&
        !s.organizationInfo.name &&
        s.services.length === 0;
      if (!pristine) return;
      if (draft.currentStep === 0 && Object.keys(draft.data ?? {}).length === 0) return;
      const d = draft.data ?? {};
      if (d.claimedProviderId) s.setClaimedProfile(d.claimedProviderId, d.claimedProviderName ?? null);
      if (d.profession) s.setProfession(d.profession as any);
      if (d.selectedSpecialtyIds) s.setSelectedSpecialtyIds(d.selectedSpecialtyIds);
      if (d.personalInfo) s.setPersonalInfo(d.personalInfo as any);
      if (d.organizationInfo) s.setOrganizationInfo(d.organizationInfo as any);
      if (d.address) s.setAddress(d.address as any);
      if (d.facility) s.setFacility(d.facility as any);
      if (d.services) s.setServices(d.services as any);
      if (d.workingHours) s.setWorkingHours(d.workingHours as any);
      if (typeof d.agreedToTerms === 'boolean') s.setAgreedToTerms(d.agreedToTerms);
      s.setCurrentStep(Math.min(Math.max(draft.currentStep, 0), 5));
      setResumed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Autosave server draft (debounced) on any store change.
  useEffect(() => {
    const unsub = useOnboardingStore.subscribe((s) => {
      if (s.isComplete || s.isSubmitting || !user?.id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const cur = useOnboardingStore.getState();
        if (cur.isComplete || cur.isSubmitting) return;
        void saveDraft(user.id, cur.currentStep, {
          claimedProviderId: cur.claimedProviderId,
          claimedProviderName: cur.claimedProviderName,
          profession: cur.profession,
          selectedSpecialtyIds: cur.selectedSpecialtyIds,
          personalInfo: { ...cur.personalInfo, avatarUrl: '' },
          organizationInfo: { ...cur.organizationInfo },
          address: { ...cur.address },
          facility: { ...cur.facility },
          services: cur.services,
          workingHours: cur.workingHours,
          agreedToTerms: cur.agreedToTerms,
        });
      }, 1500);
    });
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user?.id]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return true; // identity check is optional — claim or new
      case 1: return profession != null;
      case 2: return !!personalInfo.firstName && !!personalInfo.lastName && !!personalInfo.phone;
      case 3: return !!organizationInfo.name && !!address.city && !!address.city_id && !!address.streetAddress;
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
        selectedSpecialtyIds,
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
      if (user?.id) void clearDraft(user.id);
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

      {resumed && currentStep > 0 && (
        <View className="mx-5 mt-2 rounded-lg bg-success-50 px-3 py-2.5">
          <Text className="text-center text-xs font-medium text-grayText">
            Reprise automatique — vos informations ont été restaurées.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <CurrentStepComponent />
        </View>
      </KeyboardAvoidingView>

      {/* Error message */}
      {error && (
        <View className="mx-5 mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <Text className="text-xs text-[#c13515]">{error}</Text>
        </View>
      )}

      {/* Navigation — Retour restored: a pro who taps wrong must go back,
          not restart. Hint replaces the dead disabled state. */}
      <View className="px-5 pb-2 pt-2">
        {!canProceed() && currentStep > 0 && (
          <Text className="mb-2 text-center text-xs text-grayText">
            Remplissez les champs obligatoires pour continuer — ou revenez en arrière.
          </Text>
        )}
        <View className="flex-row items-center gap-2">
          {currentStep > 0 && (
            <Pressable
              onPress={handlePrev}
              accessibilityRole="button"
              accessibilityLabel="Retour à l'étape précédente"
              className="rounded-lg border-hairline bg-white px-5 py-4"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text className="text-center text-base font-medium text-dark">Retour</Text>
            </Pressable>
          )}

          {!isLastStep ? (
            <PrimaryButton
              title={currentStep === 0 ? (isClaimMode ? 'Revendiquer et continuer' : 'Continuer comme nouveau') : 'Continuer'}
              onPress={handleNext}
              className="flex-1"
            />
          ) : (
            <PrimaryButton
              title={submitting ? 'Envoi en cours...' : isClaimMode ? 'Demander la revendication' : 'Envoyer mon dossier'}
              onPress={handleSubmit}
              loading={submitting}
              className="flex-1"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}