import { supabase } from '@/lib/supabase';

export interface WorkingPeriod {
  weekday: string;
  start: string;
  end: string;
}

export interface ProCalendar {
  id: string;
  name: string;
  facilityName: string | null;
  active: boolean;
  slotInterval: number;
  hours: WorkingPeriod[];
  serviceCount: number;
  appointmentCount: number;
}

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Mirrors web getMyCalendars (managed calendars + hours + counts). */
export async function getMyCalendars(providerId: string): Promise<ProCalendar[]> {
  const { data: calendars } = await supabase
    .from('provider_calendars')
    .select('id, name, active, slot_interval_minutes, facility:facility_id(id, name)')
    .eq('provider_id', providerId)
    .order('created_at');
  if (!calendars) return [];

  const calIds = (calendars as any[]).map((c) => c.id);
  const [{ data: hours }, { data: links }, { data: appts }] = await Promise.all([
    calIds.length
      ? supabase.from('calendar_working_hours').select('calendar_id, weekday, start_time, end_time').in('calendar_id', calIds)
      : Promise.resolve({ data: [] as any[] }),
    calIds.length
      ? supabase.from('calendar_services').select('calendar_id').in('calendar_id', calIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('appointments').select('calendar_id').eq('provider_id', providerId),
  ]);

  const hoursByCal = new Map<string, WorkingPeriod[]>();
  for (const h of ((hours ?? []) as any[])) {
    const list = hoursByCal.get(h.calendar_id) ?? [];
    list.push({ weekday: h.weekday, start: h.start_time?.slice(0, 5) ?? '', end: h.end_time?.slice(0, 5) ?? '' });
    hoursByCal.set(h.calendar_id, list);
  }
  const svcCount = new Map<string, number>();
  for (const l of ((links ?? []) as any[])) svcCount.set(l.calendar_id, (svcCount.get(l.calendar_id) ?? 0) + 1);
  const apptCount = new Map<string, number>();
  for (const a of ((appts ?? []) as any[])) {
    if (a.calendar_id) apptCount.set(a.calendar_id, (apptCount.get(a.calendar_id) ?? 0) + 1);
  }

  return (calendars as any[]).map((c) => ({
    id: c.id,
    name: c.name ?? 'Cabinet',
    facilityName: (unwrap(c.facility) as any)?.name ?? null,
    active: !!c.active,
    slotInterval: c.slot_interval_minutes ?? 30,
    hours: hoursByCal.get(c.id) ?? [],
    serviceCount: svcCount.get(c.id) ?? 0,
    appointmentCount: apptCount.get(c.id) ?? 0,
  }));
}

export async function toggleCalendarActive(
  calendarId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('provider_calendars').update({ active }).eq('id', calendarId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
