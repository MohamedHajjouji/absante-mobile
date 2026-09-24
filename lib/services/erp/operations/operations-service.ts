import { erpFetch, erpSearch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';

// ── Types ───────────────────────────────────────────────────

export interface StaffSchedule {
  id: string;
  staffMemberId: string;
  staffName: string;
  dayOfWeek: number; // 0=Dimanche, 1=Lundi, ...
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  is_active: boolean;
}

export interface ServiceOrder {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  completedAt: string | null;
  serviceType: string;
  price: number | null;
  staffId: string | null;
  staffName: string | null;
  patientName: string | null;
  patientId: string | null;
  locationId: string | null;
  locationName: string | null;
  notes: string | null;
  createdAt: string;
  items: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitLabel: string;
  price: number;
  total: number;
}

export interface ServiceVisit {
  id: string;
  serviceOrderId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  completedAt: string | null;
  staffId: string;
  staffName: string;
  patientName: string;
  patientId: string;
  notes: string | null;
  createdAt: string;
}

// ── Staff Schedules ────────────────────────────────────────

export async function getStaffSchedules(): Promise<StaffSchedule[]> {
  return erpFetch<StaffSchedule>('staff_schedules', {
    select: 'id,staff_member_id,staff_name,day_of_week,start_time,end_time,is_active',
    filters: { is_active: true },
    order: { column: 'day_of_week', ascending: true },
    limit: 200,
  });
}

export interface SaveStaffScheduleInput {
  id?: string;
  staffMemberId: string;
  staffName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  is_active?: boolean;
}

export async function saveStaffSchedule(input: SaveStaffScheduleInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.staffName.trim()) return { ok: false, message: 'Le nom du staff est requis' };
  const payload = {
    staff_member_id: input.staffMemberId,
    staff_name: input.staffName,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    is_active: input.is_active ?? true,
  };
  let scheduleId: string | undefined = input.id;
  if (scheduleId) {
    const res = await erpUpdate('staff_schedules', scheduleId, payload);
    return { ok: res.ok, id: scheduleId, message: res.message };
  }
  const res = await erpInsert('staff_schedules', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deleteStaffSchedule(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('staff_schedules', id);
  return { ok: res.ok, message: res.message };
}

// ── Service Orders ─────────────────────────────────────────

export async function getServiceOrders(search?: string): Promise<ServiceOrder[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`reference.ilike.*${term}*`, `title.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<ServiceOrder>('service_orders', {
    select: '*',
    filters: undefined,
    or,
    order: { column: 'created_at', ascending: false },
    limit: 200,
  });
}

export interface SaveServiceOrderInput {
  id?: string;
  title: string;
  description?: string | null;
  status?: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt?: string | null;
  serviceType: string;
  price?: number | null;
  staffId?: string | null;
  locationId?: string | null;
  notes?: string | null;
  items?: SaveServiceOrderItemInput[];
}

export interface SaveServiceOrderItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export async function saveServiceOrder(input: SaveServiceOrderInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  const payload: Record<string, unknown> = {
    title: input.title,
    description: input.description || null,
    status: input.status || 'draft',
    scheduled_at: input.scheduledAt || null,
    service_type: input.serviceType,
    price: input.price ?? 0,
    staff_id: input.staffId || null,
    location_id: input.locationId || null,
    notes: input.notes || null,
    items: input.items || [],
  };

  let soId: string | undefined = input.id;
  if (input.id) {
    const res = await erpUpdate('service_orders', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('service_orders', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

// ── Service Visits ─────────────────────────────────────────

export async function getServiceVisits(search?: string): Promise<ServiceVisit[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`title.ilike.*${term}*`, `staffName.ilike.*${term}*`, `patientName.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<ServiceVisit>('service_visits', {
    select: 'id,service_order_id,title,description,status,scheduled_at,completed_at,staff_id,staff_name,patient_name,patient_id,notes,created_at',
    filters: undefined,
    or,
    order: { column: 'scheduled_at', ascending: false },
    limit: 200,
  });
}

export interface SaveServiceVisitInput {
  id?: string;
  serviceOrderId: string;
  title: string;
  description?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  staffId: string;
  staffName: string;
  patientName: string;
  patientId: string;
  notes?: string | null;
}

export async function saveServiceVisit(input: SaveServiceVisitInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  const payload = {
    service_order_id: input.serviceOrderId,
    title: input.title,
    description: input.description || null,
    status: input.status || 'pending',
    scheduled_at: input.scheduledAt,
    staff_id: input.staffId,
    staff_name: input.staffName,
    patient_name: input.patientName,
    patient_id: input.patientId,
    notes: input.notes || null,
  };

  let visitId: string | undefined = input.id;
  if (input.id) {
    const res = await erpUpdate('service_visits', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('service_visits', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}