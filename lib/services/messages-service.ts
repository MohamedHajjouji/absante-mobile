import { supabase } from '@/lib/supabase';

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  lastMessage: string | null;
  updatedAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderType: 'provider' | 'patient';
  createdAt: string;
  read: boolean;
}

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Mirrors web getConversations — list by provider with last message + unread. */
export async function getConversations(providerId: string): Promise<Conversation[]> {
  const { data: convos } = await supabase
    .from('conversations')
    .select('id, patient_id, updated_at, patient:patient_id(first_name, last_name)')
    .eq('provider_id', providerId)
    .order('updated_at', { ascending: false });
  if (!convos) return [];

  const convoIds = (convos as any[]).map((c) => c.id);
  const [{ data: lastMsgs }, { data: unread }] = await Promise.all([
    convoIds.length
      ? supabase.from('messages').select('conversation_id, content, created_at').in('conversation_id', convoIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    convoIds.length
      ? supabase.from('messages').select('conversation_id').in('conversation_id', convoIds).eq('read', false).neq('sender_id', providerId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const lastByConvo = new Map<string, any>();
  for (const m of ((lastMsgs ?? []) as any[])) {
    if (!lastByConvo.has(m.conversation_id)) lastByConvo.set(m.conversation_id, m);
  }
  const unreadByConvo = new Map<string, number>();
  for (const m of ((unread ?? []) as any[])) {
    unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
  }

  return (convos as any[]).map((c) => {
    const p = unwrap(c.patient) as any;
    return {
      id: c.id,
      patientId: c.patient_id,
      patientName: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient' : 'Patient',
      lastMessage: lastByConvo.get(c.id)?.content ?? null,
      updatedAt: c.updated_at,
      unreadCount: unreadByConvo.get(c.id) ?? 0,
    };
  });
}

export async function getMessages(conversationId: string, providerId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, content, sender_id, created_at, read')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (!data) return [];
  return (data as any[]).map((m) => ({
    id: m.id,
    content: m.content ?? '',
    senderType: m.sender_id === providerId ? 'provider' : 'patient',
    createdAt: m.created_at,
    read: !!m.read,
  }));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const text = content.trim();
  if (!text) return { success: false, error: 'Message vide' };
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: text,
    read: false,
  });
  if (error) return { success: false, error: error.message };
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  return { success: true };
}

export async function markMessagesAsRead(
  conversationId: string,
  providerId: string
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', providerId);
}
