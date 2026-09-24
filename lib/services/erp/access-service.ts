import { supabase } from '@/lib/supabase';

/**
 * ERP access — an "agency owner" is any user whose `profiles.role` is
 * `'admin'` (same rule the web app uses to route admins to `/erp`).
 */

export async function isErpOwner(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    return (data as { role?: string } | null)?.role === 'admin';
  } catch (e) {
    console.error('isErpOwner', e);
    return false;
  }
}
