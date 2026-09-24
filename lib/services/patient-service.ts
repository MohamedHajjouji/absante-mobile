import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  birthDate: string | null;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  providerId: string | null;
}

export interface SearchResultProvider {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  specialty: string;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number | null;
  city: string | null;
  acceptsNewPatients: boolean;
}

export interface ProviderDetail {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  specialty: string;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number | null;
  biography: string | null;
  acceptsNewPatients: boolean;
  licenseNumber: string | null;
  city: string | null;
  facilities: { id: string; name: string; city: string }[];
}

export interface ProviderServiceItem {
  id: string;
  name: string;
  description: string | null;
  serviceType: string;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  currency: string;
}

export interface TimeSlot {
  starts_at: string;
  ends_at: string;
  time: string;
}

export interface PatientAppointment {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar: string | null;
  providerSpecialty: string;
  serviceName: string;
  serviceType: string;
  startsAt: string;
  endsAt: string;
  status: string;
  facilityName: string | null;
  facilityCity: string | null;
  patientNotes: string | null;
  price: number | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  birthDate: string | null;
}

// ── Helpers ─────────────────────────────────────────────────

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ── User Profile ────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, phone, avatar_url, gender, birth_date')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email ?? '',
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    phone: data.phone ?? null,
    avatarUrl: data.avatar_url ?? null,
    gender: data.gender ?? null,
    birthDate: data.birth_date ?? null,
  };
}

export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
  const update: Record<string, any> = {};
  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.phone !== undefined) update.phone = data.phone || null;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Patient ─────────────────────────────────────────────────

export async function getPatientByProfileId(userId: string): Promise<PatientProfile | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    profileId: data.profile_id,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? null,
    avatarUrl: data.avatar_url ?? null,
    gender: data.gender ?? null,
    birthDate: data.birth_date ?? null,
    bloodType: data.blood_type ?? null,
    allergies: data.allergies ?? null,
    chronicConditions: data.chronic_conditions ?? null,
    providerId: data.provider_id ?? null,
  };
}

export async function ensurePatientForProvider(
  userId: string,
  providerId: string,
  firstName?: string,
  lastName?: string,
  phone?: string
): Promise<{ patientId: string; error?: string }> {
  let patient = await getPatientByProfileId(userId);

  if (!patient) {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        profile_id: userId,
        provider_id: providerId,
        first_name: firstName || '',
        last_name: lastName || '',
        phone: phone || null,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { patientId: '', error: error?.message || 'Failed to create patient record' };
    }
    return { patientId: data.id };
  }

  if (!patient.providerId) {
    await supabase
      .from('patients')
      .update({ provider_id: providerId, updated_at: new Date().toISOString() })
      .eq('id', patient.id);
  }

  return { patientId: patient.id };
}

export async function getPatientStats(patientId: string): Promise<{
  appointmentCount: number;
  doctorCount: number;
}> {
  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  const { data: appts } = await supabase
    .from('appointments')
    .select('provider_id')
    .eq('patient_id', patientId);

  const unique = new Set((appts || []).map((a: any) => a.provider_id));
  return { appointmentCount: count ?? 0, doctorCount: unique.size };
}

// ── Professions (categories) ────────────────────────────────

export async function getProfessions(): Promise<
  { id: string; name: string; icon: string | null }[]
> {
  const { data } = await supabase
    .from('professions')
    .select('id, name_fr, icon')
    .order('name_fr');

  if (!data) return [];
  return data.map((p: any) => ({ id: p.id, name: p.name_fr, icon: p.icon ?? null }));
}

// ── Provider Search ─────────────────────────────────────────

export async function searchProviders(params: {
  query?: string;
  professionId?: string;
  limit?: number;
}): Promise<SearchResultProvider[]> {
  let q = supabase
    .from('providers')
    .select(
      `id,
       average_rating,
       review_count,
       years_of_experience,
       accepts_new_patients,
       profile:profile_id(first_name, last_name, avatar_url),
       profession:profession_id(name_fr),
       provider_facilities(facility:facilities(name, address:addresses(city)))`
    )
    .eq('active', true)
    .eq('onboarding_completed', true)
    .order('average_rating', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.professionId) {
    q = q.eq('profession_id', params.professionId);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  let results: SearchResultProvider[] = data.map((p: any) => {
    const profile = unwrap(p.profile) as any;
    const profession = unwrap(p.profession) as any;
    const facilityList = (p.provider_facilities || []).map((pf: any) => {
      const f = unwrap(pf.facility) as any;
      const addr = unwrap(f?.address) as any;
      return { city: addr?.city ?? '' };
    });

    return {
      id: p.id,
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      avatarUrl: profile?.avatar_url ?? null,
      specialty: profession?.name_fr ?? 'Professionnel',
      rating: Number(p.average_rating ?? 0),
      reviewCount: Number(p.review_count ?? 0),
      yearsOfExperience: p.years_of_experience ?? null,
      city: facilityList[0]?.city ?? null,
      acceptsNewPatients: !!p.accepts_new_patients,
    };
  });

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q) ||
        (r.city?.toLowerCase().includes(q) ?? false)
    );
  }

  return results;
}

// ── Provider Detail ─────────────────────────────────────────

export async function getProviderDetail(
  providerId: string
): Promise<ProviderDetail | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(
      `id,
       average_rating,
       review_count,
       years_of_experience,
       biography,
       accepts_new_patients,
       license_number,
       profile:profile_id(first_name, last_name, avatar_url),
       profession:profession_id(name_fr),
       provider_facilities(facility:facilities(id, name, address:addresses(city)))`
    )
    .eq('id', providerId)
    .single();

  if (error || !data) return null;

  const p = data as any;
  const profile = unwrap(p.profile) as any;
  const profession = unwrap(p.profession) as any;
  const facilities = (p.provider_facilities || []).map((pf: any) => {
    const f = unwrap(pf.facility) as any;
    const addr = unwrap(f?.address) as any;
    return { id: f?.id ?? '', name: f?.name ?? '', city: addr?.city ?? '' };
  });

  return {
    id: p.id,
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    avatarUrl: profile?.avatar_url ?? null,
    specialty: profession?.name_fr ?? 'Professionnel',
    rating: Number(p.average_rating ?? 0),
    reviewCount: Number(p.review_count ?? 0),
    yearsOfExperience: p.years_of_experience ?? null,
    biography: p.biography ?? null,
    acceptsNewPatients: !!p.accepts_new_patients,
    licenseNumber: p.license_number ?? null,
    city: facilities[0]?.city ?? null,
    facilities,
  };
}

// ── Provider Services ───────────────────────────────────────

export async function getProviderServicesForBooking(
  providerId: string
): Promise<ProviderServiceItem[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .eq('active', true)
    .order('name');

  if (error || !data) return [];
  return data.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    serviceType: s.service_type,
    durationMinutes: s.duration_minutes,
    bufferMinutes: s.buffer_after_minutes ?? 0,
    price: Number(s.price ?? 0),
    currency: s.currency ?? 'MAD',
  }));
}

// ── Calendar / Slots ────────────────────────────────────────

export async function getCalendarForService(
  providerId: string,
  serviceId: string
): Promise<string | null> {
  const { data: cs } = await supabase
    .from('calendar_services')
    .select('calendar_id')
    .eq('provider_service_id', serviceId)
    .limit(1)
    .maybeSingle();

  if (cs) return cs.calendar_id;

  const { data: cal } = await supabase
    .from('provider_calendars')
    .select('id')
    .eq('provider_id', providerId)
    .eq('active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  return cal?.id ?? null;
}

export async function getAvailableSlots(
  calendarId: string,
  date: string,
  serviceDurationMinutes: number,
  bufferMinutes: number = 0
): Promise<TimeSlot[]> {
  const d = new Date(date + 'T12:00:00Z');
  const weekday = WEEKDAYS[d.getUTCDay()];

  const { data: whRows } = await supabase
    .from('calendar_working_hours')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('weekday', weekday);

  if (!whRows || whRows.length === 0) return [];

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [{ data: appts }, { data: exceptions }] = await Promise.all([
    supabase
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('calendar_id', calendarId)
      .gte('starts_at', dayStart)
      .lte('starts_at', dayEnd)
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('calendar_exceptions')
      .select('id')
      .eq('calendar_id', calendarId)
      .lte('starts_at', dayEnd)
      .gte('ends_at', dayStart),
  ]);

  if (exceptions && exceptions.length > 0) return [];

  const slots: TimeSlot[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = date === todayStr;
  const step = serviceDurationMinutes + bufferMinutes;

  for (const wh of whRows) {
    const tp = wh.start_time.split(':');
    const ep = wh.end_time.split(':');
    let cur = parseInt(tp[0], 10) * 60 + parseInt(tp[1], 10);
    const end = parseInt(ep[0], 10) * 60 + parseInt(ep[1], 10);

    while (cur + serviceDurationMinutes <= end) {
      const sH = Math.floor(cur / 60);
      const sM = cur % 60;
      const eMin = cur + serviceDurationMinutes;
      const eH = Math.floor(eMin / 60);
      const eM = eMin % 60;

      const startsAt = `${date}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00Z`;
      const endsAt = `${date}T${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00Z`;

      if (isToday && new Date(startsAt) <= now) {
        cur += step;
        continue;
      }

      const overlaps = (appts || []).some((a) => {
        const as = new Date(a.starts_at).getTime();
        const ae = new Date(a.ends_at).getTime();
        return new Date(startsAt).getTime() < ae && new Date(endsAt).getTime() > as;
      });

      if (!overlaps) {
        slots.push({
          starts_at: startsAt,
          ends_at: endsAt,
          time: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
        });
      }

      cur += step;
    }
  }

  return slots;
}

// ── Appointments ────────────────────────────────────────────

const APPT_SELECT = `
  id, provider_id, starts_at, ends_at, status, patient_notes,
  provider:provider_id(
    id,
    profile:profile_id(first_name, last_name, avatar_url),
    profession:profession_id(name_fr)
  ),
  service:provider_service_id(name, service_type, price, currency),
  facility:facility_id(name, address:address_id(city))
`;

function toPatientAppointment(a: any): PatientAppointment {
  const provider = unwrap(a.provider) as any;
  const profile = unwrap(provider?.profile) as any;
  const profession = unwrap(provider?.profession) as any;
  const service = unwrap(a.service) as any;
  const facility = unwrap(a.facility) as any;
  const address = unwrap(facility?.address) as any;

  return {
    id: a.id,
    providerId: a.provider_id,
    providerName: profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : 'Médecin',
    providerAvatar: profile?.avatar_url ?? null,
    providerSpecialty: profession?.name_fr ?? 'Professionnel',
    serviceName: service?.name ?? 'Consultation',
    serviceType: service?.service_type ?? 'consultation',
    startsAt: a.starts_at,
    endsAt: a.ends_at,
    status: a.status,
    facilityName: facility?.name ?? null,
    facilityCity: address?.city ?? null,
    patientNotes: a.patient_notes ?? null,
    price: service?.price != null ? Number(service.price) : null,
  };
}

export async function getMyAppointments(
  patientId: string
): Promise<PatientAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPT_SELECT)
    .eq('patient_id', patientId)
    .order('starts_at', { ascending: false });

  if (error || !data) return [];
  return data.map(toPatientAppointment);
}

export async function getNextAppointment(
  patientId: string
): Promise<PatientAppointment | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('appointments')
    .select(APPT_SELECT)
    .eq('patient_id', patientId)
    .gte('starts_at', now)
    .not('status', 'eq', 'cancelled')
    .order('starts_at')
    .limit(1)
    .maybeSingle();

  return data ? toPatientAppointment(data) : null;
}

export async function cancelAppointment(
  appointmentId: string,
  patientId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .eq('patient_id', patientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Booking ─────────────────────────────────────────────────

export async function bookAppointment(params: {
  userId: string;
  providerId: string;
  serviceId: string;
  calendarId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string; appointmentId?: string }> {
  const { patientId, error: pErr } = await ensurePatientForProvider(
    params.userId,
    params.providerId,
    params.firstName,
    params.lastName,
    params.phone
  );

  if (pErr || !patientId) {
    return { success: false, error: pErr || 'Could not create patient record' };
  }

  const { data: cal } = await supabase
    .from('provider_calendars')
    .select('facility_id')
    .eq('id', params.calendarId)
    .single();

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      provider_id: params.providerId,
      patient_id: patientId,
      provider_service_id: params.serviceId,
      calendar_id: params.calendarId,
      facility_id: cal?.facility_id ?? null,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      status: 'pending',
      patient_notes: params.notes || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to book appointment' };
  }

  return { success: true, appointmentId: data.id };
}
