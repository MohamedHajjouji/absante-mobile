import { supabase } from '@/lib/supabase';

export interface DirectoryDoctor {
  id: string;
  firstName: string;
  lastName: string;
  license: string | null;
  phone: string | null;
  active: boolean;
  isRegistered: boolean;
  specialties: string[];
  city: string | null;
}

export interface ClaimRow {
  id: string;
  providerId: string;
  providerName: string;
  claimantEmail: string | null;
  status: string;
  createdAt: string;
}

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Mirrors web getDirectoryDoctors — admin directory list. */
export async function getDirectoryDoctors(search = ''): Promise<DirectoryDoctor[]> {
  let q = supabase
    .from('providers')
    .select(
      'id, first_name, last_name, license_number, phone, active, profile_id, provider_specialties(specialty:specialty_id(name_fr)), provider_facilities(facility:facilities(address:addresses(city)))'
    )
    .order('created_at', { ascending: false })
    .limit(100);
  const { data } = await q;
  if (!data) return [];
  let rows = (data as any[]).map((p) => {
    const specs = (p.provider_specialties || [])
      .map((ps: any) => (Array.isArray(ps.specialty) ? ps.specialty[0]?.name_fr : ps.specialty?.name_fr))
      .filter(Boolean);
    const fac = (p.provider_facilities?.[0]?.facility ?? null) as any;
    const addr = fac ? unwrap(fac.address) as any : null;
    return {
      id: p.id,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      license: p.license_number ?? null,
      phone: p.phone ?? null,
      active: !!p.active,
      isRegistered: p.profile_id != null,
      specialties: specs,
      city: addr?.city ?? null,
    } as DirectoryDoctor;
  });
  const needle = search.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(needle) ||
      (r.license ?? '').toLowerCase().includes(needle) ||
      r.specialties.join(' ').toLowerCase().includes(needle)
    );
  }
  return rows;
}

export async function toggleDirectoryDoctorActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('providers').update({ active }).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Mirrors web listClaims + reviewClaim (approve via admin_review_claim RPC, fallback to direct update). */
export async function listClaims(status = 'pending'): Promise<ClaimRow[]> {
  const { data } = await supabase
    .from('profile_claims')
    .select('id, provider_id, profile_id, status, created_at, provider:provider_id(first_name, last_name), claimant:profile_id(email)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!data) return [];
  return (data as any[]).map((c) => {
    const p = unwrap(c.provider) as any;
    const claimant = unwrap(c.claimant) as any;
    return {
      id: c.id,
      providerId: c.provider_id,
      providerName: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Profil' : 'Profil',
      claimantEmail: claimant?.email ?? null,
      status: c.status,
      createdAt: c.created_at,
    };
  });
}

export async function reviewClaim(
  claimId: string,
  approve: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error: rpcError } = await supabase.rpc('admin_review_claim', {
    p_claim_id: claimId,
    p_approve: approve,
  } as any);
  if (!rpcError) return { success: true };
  // Fallback when RPC is missing: direct status update (admin RLS required).
  const { error } = await supabase
    .from('profile_claims')
    .update({ status: approve ? 'approved' : 'rejected' })
    .eq('id', claimId);
  if (error) return { success: false, error: rpcError?.message ?? error.message };
  return { success: true };
}
