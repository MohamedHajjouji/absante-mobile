import { supabase } from '@/lib/supabase';

/** One remembered patient search (query + specialty + city triple). */
export interface SearchHistoryEntry {
  id: string;
  query: string;
  specialtyId: string | null;
  specialtyName: string | null;
  professionName: string | null;
  city: string | null;
  createdAt: string;
}

export interface SaveSearchInput {
  query: string;
  specialtyId?: string | null;
  specialtyName?: string | null;
  professionName?: string | null;
  city?: string | null;
}

const MAX_ENTRIES = 10;

/** A search is only worth remembering when it actually narrows results. */
export function isMeaningfulSearch(input: SaveSearchInput): boolean {
  return (
    input.query.trim().length >= 2 ||
    !!input.specialtyId ||
    !!input.professionName ||
    (input.city ?? '').trim().length >= 2
  );
}

/** Latest-first recent searches. Empty array when signed out or table missing. */
export async function getRecentSearches(profileId: string): Promise<SearchHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('patient_search_history')
      .select('id, query, specialty_id, specialty_name, profession_name, city, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES);
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      id: r.id,
      query: r.query ?? '',
      specialtyId: r.specialty_id ?? null,
      specialtyName: r.specialty_name ?? null,
      professionName: r.profession_name ?? null,
      city: r.city ?? null,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.error('Failed to load search history:', e);
    return [];
  }
}

/**
 * Remember a search: dedupe the identical triple (bump recency), insert,
 * then prune beyond MAX_ENTRIES. Silent no-op for guests / missing table.
 */
export async function saveSearch(profileId: string, input: SaveSearchInput): Promise<void> {
  if (!isMeaningfulSearch(input)) return;
  try {
    const query = input.query.trim();
    const city = (input.city ?? '').trim() || null;
    const specialtyId = input.specialtyId ?? null;
    const professionName = (input.professionName ?? '').trim() || null;

    // Dedupe: remove the identical combination so re-insert bumps it to the top.
    let dedupe = supabase.from('patient_search_history').delete().eq('profile_id', profileId);
    dedupe = dedupe.eq('query', query);
    if (city) dedupe = dedupe.eq('city', city);
    else dedupe = dedupe.is('city', null);
    if (specialtyId) dedupe = dedupe.eq('specialty_id', specialtyId);
    else dedupe = dedupe.is('specialty_id', null);
    if (professionName) dedupe = dedupe.eq('profession_name', professionName);
    else dedupe = dedupe.is('profession_name', null);
    await dedupe;

    const { error } = await supabase.from('patient_search_history').insert({
      profile_id: profileId,
      query,
      specialty_id: specialtyId,
      specialty_name: input.specialtyName ?? null,
      profession_name: professionName,
      city,
    });
    if (error) return;

    // Prune: keep only the newest MAX_ENTRIES.
    const { data: ids } = await supabase
      .from('patient_search_history')
      .select('id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(MAX_ENTRIES, MAX_ENTRIES * 3);
    const extra = ((ids ?? []) as any[]).map((r) => r.id);
    if (extra.length > 0) {
      await supabase.from('patient_search_history').delete().in('id', extra);
    }
  } catch (e) {
    console.error('Failed to save search:', e);
  }
}

export async function removeSearch(profileId: string, id: string): Promise<void> {
  try {
    await supabase
      .from('patient_search_history')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', id);
  } catch (e) {
    console.error('Failed to remove search:', e);
  }
}

export async function clearSearches(profileId: string): Promise<void> {
  try {
    await supabase.from('patient_search_history').delete().eq('profile_id', profileId);
  } catch (e) {
    console.error('Failed to clear search history:', e);
  }
}
