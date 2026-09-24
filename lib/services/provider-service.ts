import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────

export interface ProviderProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  specialty: string;
  verifiedStatus: string;
  onboardingComplete: boolean;
  acceptsNewPatients: boolean;
  averageRating: number;
  reviewCount: number;
  yearsOfExperience: number | null;
  licenseNumber: string | null;
  biography: string | null;
}

export type ProviderAppointment = {
  id: string;
  patientName: string;
  patientAvatar: string | null;
  patientPhone: string | null;
  patientId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  serviceName: string | null;
  servicePrice: number | null;
  serviceType: string | null;
};

export interface ProviderService {
  id: string;
  name: string;
  description: string | null;
  serviceType: string;
  bookingMode: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface PatientSum {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
}

// ── Provider profile ────────────────────────────────────────
// Note: writes go through this service layer. In a stricter
// production setup these would be Supabase RPC functions so the
// backend stays authoritative (no direct client inserts).

export async function getProviderId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (!data) return null;
  return (data as any).id;
}

export async function getProviderProfile(userId: string): Promise<ProviderProfile | null> {
  const { data: provider } = await supabase
    .from('providers')
    .select(`
      id,
      verified_status,
      onboarding_completed,
      accepts_new_patients,
      average_rating,
      review_count,
      years_of_experience,
      license_number,
      biography,
      profession:profession_id(name_fr),
      profile:profile_id(first_name, last_name, email, phone, avatar_url)
    `)
    .eq('profile_id', userId)
    .maybeSingle();

  if (!provider) return null;

  const p = provider as any;
  const profile = p.profile ?? {};
  return {
    id: p.id,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? null,
    avatarUrl: profile.avatar_url ?? null,
    specialty: p.profession?.name_fr ?? 'Professionnel de santé',
    verifiedStatus: p.verified_status ?? 'pending',
    onboardingComplete: !!p.onboarding_completed,
    acceptsNewPatients: p.accepts_new_patients ?? true,
    averageRating: Number(p.average_rating ?? 0),
    reviewCount: Number(p.review_count ?? 0),
    yearsOfExperience: p.years_of_experience ?? null,
    licenseNumber: p.license_number ?? null,
    biography: p.biography ?? null,
  };
}

export async function setAvailability(
  providerId: string,
  acceptsNewPatients: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('providers')
    .update({ accepts_new_patients: acceptsNewPatients })
    .eq('id', providerId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Appointments ────────────────────────────────────────────

export async function getProviderAppointments(
  providerId: string
): Promise<ProviderAppointment[]> {
  const { data } = await supabase
    .from('appointments')
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      patient_notes,
      patient:patient_id(id, first_name, last_name, avatar_url, phone),
      service:provider_service_id(name, price, service_type)
    `)
    .eq('provider_id', providerId)
    .order('starts_at', { ascending: true });

  if (!data) return [];

  return (data as any[]).map((a) => {
    const patient = a.patient ?? {};
    const service = a.service ?? {};
    return {
      id: a.id,
      patientName:
        `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Patient',
      patientAvatar: patient.avatar_url ?? null,
      patientPhone: patient.phone ?? null,
      patientId: patient.id ?? null,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      status: a.status,
      reason: a.patient_notes ?? null,
      serviceName: service.name ?? null,
      servicePrice: service.price != null ? Number(service.price) : null,
      serviceType: service.service_type ?? null,
    };
  });
}

export interface DashboardData {
  todayAppointments: ProviderAppointment[];
  /** Non-cancelled appointments from today through the next 7 days. */
  upcomingAppointments: ProviderAppointment[];
  stats: {
    todayCount: number;
    totalPatients: number;
    revenue: number;
    todayRevenue: number;
  };
  /** Revenue per month for the last 6 months (incl. the current one). */
  monthlyRevenue: { label: string; amount: number; count: number }[];
}

/** Statuses that should never surface on the live dashboard. */
const INVISIBLE_STATUSES = ['cancelled', 'no_show'];

export async function getDashboard(providerId: string): Promise<DashboardData> {
  const appointments = await getProviderAppointments(providerId);

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999
  ).toISOString();

  const todayAppointments = appointments.filter(
    (a) =>
      a.startsAt >= todayStart &&
      a.startsAt <= todayEnd &&
      !INVISIBLE_STATUSES.includes(a.status)
  );

  const weekEnd = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0, 0, 0
  ).toISOString();

  const upcomingAppointments = appointments.filter(
    (a) =>
      a.startsAt >= todayStart &&
      a.startsAt < weekEnd &&
      !INVISIBLE_STATUSES.includes(a.status)
  );

  const revenue = appointments
    .filter((a) => a.status !== 'cancelled')
    .reduce((sum, a) => sum + (a.servicePrice ?? 0), 0);

  const todayRevenue = todayAppointments
    .reduce((sum, a) => sum + (a.servicePrice ?? 0), 0);

  // Last 6 months, oldest → newest, ending with the current month.
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    return {
      label,
      amount: 0,
      count: 0,
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
    };
  });

  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    const start = new Date(a.startsAt);
    const bucket = monthlyRevenue.find(
      (m) => m.monthIndex === start.getMonth() && m.year === start.getFullYear()
    );
    if (bucket) {
      bucket.amount += a.servicePrice ?? 0;
      bucket.count += 1;
    }
  }

  const { count } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId);

  return {
    todayAppointments,
    upcomingAppointments,
    stats: {
      todayCount: todayAppointments.length,
      totalPatients: count ?? 0,
      revenue,
      todayRevenue,
    },
    monthlyRevenue: monthlyRevenue.map(({ label, amount, count: c }) => ({
      label,
      amount,
      count: c,
    })),
  };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();

  const { error } = await supabase.from('appointments').update(patch).eq('id', appointmentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getPrimaryCalendar(providerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('provider_calendars')
    .select('id')
    .eq('provider_id', providerId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return (data as any).id;
}

export async function createAppointment(params: {
  providerId: string;
  calendarId: string;
  serviceId: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('appointments').insert({
    provider_id: params.providerId,
    calendar_id: params.calendarId,
    provider_service_id: params.serviceId,
    patient_id: params.patientId,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    status: 'pending',
    patient_notes: params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}


// ── Patients ────────────────────────────────────────────────

export async function getProviderPatients(providerId: string): Promise<PatientSum[]> {
  const { data: appts } = await supabase
    .from('appointments')
    .select('patient:patient_id(id, first_name, last_name, phone, email, avatar_url)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (!appts) return [];

  const map = new Map<string, PatientSum>();
  for (const a of appts as any[]) {
    const p = a.patient;
    if (p?.id && !map.has(p.id)) {
      map.set(p.id, {
        id: p.id,
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        phone: p.phone ?? null,
        email: p.email ?? null,
        avatarUrl: p.avatar_url ?? null,
      });
    }
  }
  return Array.from(map.values());
}

export async function getPatientDossier(patientId: string, providerId: string) {
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();

  const { data: consultations } = await supabase
    .from('patient_consultations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('provider_id', providerId)
    .order('visit_date', { ascending: false });

  const { data: prescriptions } = await supabase
    .from('patient_prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  const { data: vitals } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('patient_id', patientId)
    .eq('provider_id', providerId)
    .order('recorded_at', { ascending: false });

  const { data: documents } = await supabase
    .from('patient_documents')
    .select('*')
    .eq('patient_id', patientId)
    .eq('provider_id', providerId)
    .order('uploaded_at', { ascending: false });

  return {
    patient: (patient as any) ?? null,
    consultations: (consultations ?? []) as any[],
    prescriptions: (prescriptions ?? []) as any[],
    vitals: (vitals ?? []) as any[],
    documents: (documents ?? []) as any[],
  };
}

// ── Services ────────────────────────────────────────────────

export async function getProviderServices(providerId: string): Promise<ProviderService[]> {
  const { data } = await supabase
    .from('provider_services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  return (data as any[]).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    serviceType: s.service_type,
    bookingMode: s.booking_mode,
    durationMinutes: s.duration_minutes,
    price: Number(s.price ?? 0),
    active: !!s.active,
  }));
}

export interface ServiceInput {
  name: string;
  description?: string | null;
  serviceType: string;
  bookingMode: string;
  durationMinutes: number;
  price: number;
}

export async function createProviderService(
  providerId: string,
  data: ServiceInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('provider_services').insert({
    provider_id: providerId,
    name: data.name,
    description: data.description || null,
    service_type: data.serviceType,
    booking_mode: data.bookingMode,
    duration_minutes: data.durationMinutes,
    price: data.price,
    currency: 'MAD',
    active: true,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateProviderService(
  id: string,
  data: ServiceInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('provider_services')
    .update({
      name: data.name,
      description: data.description || null,
      service_type: data.serviceType,
      booking_mode: data.bookingMode,
      duration_minutes: data.durationMinutes,
      price: data.price,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteProviderService(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('provider_services').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleProviderServiceActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('provider_services')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Profile editing ─────────────────────────────────────────

export interface ProviderProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
  biography?: string | null;
  yearsOfExperience?: number | null;
  licenseNumber?: string | null;
}

export async function updateProviderProfile(
  userId: string,
  data: ProviderProfileInput
): Promise<{ success: boolean; error?: string }> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (profileError) return { success: false, error: profileError.message };

  const { error: providerError } = await supabase
    .from('providers')
    .update({
      biography: data.biography || null,
      years_of_experience: data.yearsOfExperience ?? null,
      license_number: data.licenseNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', userId);
  if (providerError) return { success: false, error: providerError.message };

  return { success: true };
}

