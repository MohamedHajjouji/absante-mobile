import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  appointmentId: string | null;
}

/**
 * Notifications are addressed to a `profiles` row. Because `profiles.id`
 * mirrors `auth.users.id`, the caller can pass the signed-in user's id
 * straight through.
 */
export async function getNotifications(profileId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, read_at, created_at, appointment_id')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!data) return [];

  return (data as any[]).map((n) => ({
    id: n.id,
    title: n.title ?? 'Notification',
    body: n.body ?? null,
    read: !!n.read_at,
    createdAt: n.created_at,
    appointmentId: n.appointment_id ?? null,
  }));
}

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .is('read_at', null);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markAllNotificationsRead(profileId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) return { success: false, error: error.message };
  return { success: true };
}