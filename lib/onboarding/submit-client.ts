import { supabase } from '@/lib/supabase';

/**
 * Creates / updates a *client* (patient) profile after the user has
 * signed up and provided their name and phone number.
 *
 * Flow:
 *  1. Update the `profiles` row (set first_name, last_name, phone).
 *  2. Insert a row into the `patients` table linked to the profile.
 *
 * The `patients` table allows direct inserts (RLS policy permits it)
 * so a standalone client record can be created without a provider.
 */
export async function createClientProfile(
  userId: string,
  firstName: string,
  lastName: string,
  phone: string
) {
  // 1. Update the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Failed to update profile:', profileError.message);
    // Non-fatal — the patients insert may still work via its own RLS policy
  }

  // 2. Create the patient record
  const { data, error: patientError } = await supabase
    .from('patients')
    .insert({
      profile_id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
    })
    .select('id')
    .single();

  if (patientError) {
    return { success: false, error: patientError.message };
  }

  return { success: true, patientId: data.id };
}
