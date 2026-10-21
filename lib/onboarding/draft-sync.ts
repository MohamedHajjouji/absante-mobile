import { supabase } from '@/lib/supabase';

/**
 * Cross-device draft sync for professional onboarding (mobile side).
 * Same `onboarding_drafts` table + SQL as web (`add-onboarding-drafts.sql`,
 * applied manually in Supabase). All functions return null/false when the
 * table is missing — local zustand persist keeps working.
 */
export interface DraftPayload {
  claimedProviderId?: string | null;
  claimedProviderName?: string | null;
  profession?: string | null;
  selectedSpecialtyIds?: string[];
  personalInfo?: Record<string, unknown>;
  organizationInfo?: Record<string, unknown>;
  address?: Record<string, unknown>;
  facility?: Record<string, unknown>;
  services?: unknown[];
  workingHours?: unknown[];
  agreedToTerms?: boolean;
}

export async function saveDraft(
  userId: string,
  currentStep: number,
  data: DraftPayload
): Promise<boolean> {
  try {
    const { error } = await supabase.from('onboarding_drafts').upsert(
      {
        profile_id: userId,
        current_step: currentStep,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    );
    if (error) {
      console.error('Draft save failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Draft save failed:', e);
    return false;
  }
}

export async function loadDraft(userId: string): Promise<{
  currentStep: number;
  data: DraftPayload;
} | null> {
  try {
    const { data, error } = await supabase
      .from('onboarding_drafts')
      .select('current_step, data')
      .eq('profile_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      currentStep: (data as any).current_step ?? 0,
      data: ((data as any).data ?? {}) as DraftPayload,
    };
  } catch (e) {
    console.error('Draft load failed:', e);
    return null;
  }
}

export async function clearDraft(userId: string): Promise<void> {
  try {
    await supabase.from('onboarding_drafts').delete().eq('profile_id', userId);
  } catch (e) {
    console.error('Draft clear failed:', e);
  }
}
