import { supabase } from '@/lib/supabase';

export interface Specialty {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  profession_id: string | null;
  icon: string | null;
}

export async function getSpecialties(limit = 100): Promise<Specialty[]> {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, slug, name_fr, name_en, name_ar, profession_id, icon')
    .order('name_fr')
    .limit(limit);
  if (error || !data) return [];
  return data as Specialty[];
}

export async function searchSpecialties(query: string, limit = 10): Promise<Specialty[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { data, error } = await supabase
    .from('specialties')
    .select('id, slug, name_fr, name_en, name_ar, profession_id, icon')
    .or(`name_fr.ilike.%${q}%,name_ar.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`)
    .order('name_fr')
    .limit(limit);
  if (error || !data) return [];
  return data as Specialty[];
}

export async function getProviderSpecialties(providerId: string): Promise<Specialty[]> {
  const { data, error } = await supabase
    .from('provider_specialties')
    .select('specialty:specialty_id(id, slug, name_fr, name_en, name_ar, profession_id, icon)')
    .eq('provider_id', providerId);
  if (error || !data) return [];
  return (data as any[])
    .map((r) => (Array.isArray(r.specialty) ? r.specialty[0] : r.specialty))
    .filter(Boolean);
}

/** Replace all specialties for a provider (used by onboarding + admin). */
export async function setProviderSpecialties(
  providerId: string,
  specialtyIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const { error: delError } = await supabase
    .from('provider_specialties')
    .delete()
    .eq('provider_id', providerId);
  if (delError) return { success: false, error: delError.message };
  if (specialtyIds.length === 0) return { success: true };
  const { error: insError } = await supabase.from('provider_specialties').insert(
    specialtyIds.map((specialty_id) => ({ provider_id: providerId, specialty_id }))
  );
  if (insError) return { success: false, error: insError.message };
  return { success: true };
}
