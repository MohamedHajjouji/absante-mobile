import { supabase } from '@/lib/supabase';

export interface ProFacility {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  street: string | null;
  active: boolean;
  primary: boolean;
  calendarCount: number;
  appointmentCount: number;
}

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Mirrors web getMyFacilities — facilities linked to the provider. */
export async function getMyFacilities(providerId: string): Promise<ProFacility[]> {
  const { data: links } = await supabase
    .from('provider_facilities')
    .select(
      'primary_facility, facility:facilities(id, name, phone, active, address:addresses(city, street_address))'
    )
    .eq('provider_id', providerId);
  if (!links) return [];

  const facilities = (links as any[])
    .map((l) => ({ link: l, f: unwrap(l.facility) as any }))
    .filter((r) => r.f?.id);

  const facilityIds = facilities.map((r) => r.f.id);
  const [{ data: calendars }, { data: appointments }] = await Promise.all([
    facilityIds.length
      ? supabase.from('provider_calendars').select('facility_id').in('facility_id', facilityIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('appointments').select('facility_id').eq('provider_id', providerId),
  ]);

  const calCount = new Map<string, number>();
  for (const c of ((calendars ?? []) as any[])) {
    calCount.set(c.facility_id, (calCount.get(c.facility_id) ?? 0) + 1);
  }
  const apptCount = new Map<string, number>();
  for (const a of ((appointments ?? []) as any[])) {
    if (a.facility_id) apptCount.set(a.facility_id, (apptCount.get(a.facility_id) ?? 0) + 1);
  }

  return facilities.map(({ link, f }) => {
    const addr = unwrap(f.address) as any;
    return {
      id: f.id,
      name: f.name ?? 'Cabinet',
      phone: f.phone ?? null,
      city: addr?.city ?? null,
      street: addr?.street_address ?? null,
      active: f.active ?? true,
      primary: !!link.primary_facility,
      calendarCount: calCount.get(f.id) ?? 0,
      appointmentCount: apptCount.get(f.id) ?? 0,
    };
  });
}

export async function toggleFacilityActive(
  facilityId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('facilities').update({ active }).eq('id', facilityId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setPrimaryFacility(
  providerId: string,
  facilityId: string
): Promise<{ success: boolean; error?: string }> {
  const { error: clearError } = await supabase
    .from('provider_facilities')
    .update({ primary_facility: false })
    .eq('provider_id', providerId);
  if (clearError) return { success: false, error: clearError.message };
  const { error } = await supabase
    .from('provider_facilities')
    .update({ primary_facility: true })
    .eq('provider_id', providerId)
    .eq('facility_id', facilityId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
