import { supabase } from '@/lib/supabase';

// ── Storage helpers ───────────────────────────────────────

/**
 * Upload an avatar image (React Native asset URI) to the `avatars`
 * storage bucket and return the public URL.
 */
export async function uploadAvatar(uri: string, userId: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return publicUrl;
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return null;
  }
}

/**
 * Upload a verification document to the `provider-documents` storage
 * bucket and return the public URL.
 */
export async function uploadVerificationDocument(
  uri: string,
  userId: string,
  docType: string
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `verification/${userId}/${docType}_${Date.now()}`;

    const { error: uploadError } = await supabase.storage
      .from('provider-documents')
      .upload(fileName, blob);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('provider-documents')
      .getPublicUrl(fileName);
    return publicUrl;
  } catch (error) {
    console.error('Document upload failed:', error);
    return null;
  }
}

// ── User lookups ──────────────────────────────────────────

/**
 * Determine whether the authenticated user is a *professional*
 * (has a row in `providers`) or a *client* (has a row in `patients`).
 *
 * Falls back to `user_metadata.user_type` when no DB row exists yet,
 * which handles the window between sign-up and onboarding completion.
 */
export async function getUserRole(userId: string): Promise<'professional' | 'client' | null> {
  // Check user metadata first
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userType = user?.user_metadata?.user_type;

  // Check providers table
  const { data: provider } = await supabase
    .from('providers')
    .select('onboarding_completed')
    .eq('profile_id', userId)
    .maybeSingle();

  if (provider) {
    return 'professional';
  }

  // Check patients table
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (patient) {
    return 'client';
  }

  // Fallback to metadata
  if (userType === 'professional') return 'professional';
  if (userType === 'client') return 'client';
  return null;
}

/** Returns `true` when the professional's onboarding is 100 % complete. */
export async function isProfessionalOnboardingComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('providers')
    .select('onboarding_completed')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.onboarding_completed === true;
}

/** Returns `true` when the client already has a `patients` row. */
export async function isClientProfileComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

/**
 * Combined helper used by the root layout:
 * - `null`  → user needs onboarding (the returned string tells you which)
 * - `'done'` → no onboarding needed, go to tabs
 */
export async function checkOnboardingStatus(userId: string): Promise<'professional' | 'client' | 'done'> {
  const role = await getUserRole(userId);

  if (role === 'professional') {
    const complete = await isProfessionalOnboardingComplete(userId);
    return complete ? 'done' : 'professional';
  }

  if (role === 'client') {
    const complete = await isClientProfileComplete(userId);
    return complete ? 'done' : 'client';
  }

  // No DB records — rely on metadata to decide which flow to show
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userType = user?.user_metadata?.user_type;
  if (userType === 'professional') return 'professional';
  if (userType === 'client') return 'client';
  return 'done';
}
