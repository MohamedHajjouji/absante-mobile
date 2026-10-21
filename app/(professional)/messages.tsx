import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId } from '@/lib/services/provider-service';
import { getConversations, getMessages, sendMessage, markMessagesAsRead, Conversation, ChatMessage } from '@/lib/services/messages-service';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (spinner = false) => {
    if (!user?.id) return;
    if (spinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      setProviderId(pid);
      if (pid) setConversations(await getConversations(pid));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(true); }, [load]);

  const openThread = async (c: Conversation) => {
    if (!providerId) return;
    setOpenId(c.id);
    setLoadingThread(true);
    try {
      setMessages(await getMessages(c.id, providerId));
      await markMessagesAsRead(c.id, providerId);
      setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x)));
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSend = async () => {
    if (!openId || !providerId || !draft.trim()) return;
    setSending(true);
    try {
      const res = await sendMessage(openId, providerId, draft);
      if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
      setDraft('');
      setMessages(await getMessages(openId, providerId));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  const openConvo = conversations.find((c) => c.id === openId) ?? null;

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center px-5 pt-4">
          {openId ? (
            <TouchableOpacity onPress={() => setOpenId(null)} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <Ionicons name="arrow-back" size={20} color="#3D4B64" />
            </TouchableOpacity>
          ) : null}
          <View className="flex-1">
            <Text className="text-2xl font-semibold text-dark">{openConvo ? openConvo.patientName : 'Messages'}</Text>
            <Text className="mt-0.5 text-sm font-medium text-grayText">
              {openConvo ? 'Conversation' : `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {!openId ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 124 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          >
            <View className="mt-4 gap-3 px-5">
              {conversations.length === 0 ? (
                <View className="items-center rounded-panel border border-hairline bg-white p-8">
                  <Ionicons name="chatbubbles-outline" size={36} color="#929292" />
                  <Text className="mt-4 text-base font-semibold text-dark">Aucune conversation</Text>
                  <Text className="mt-1 text-center text-sm text-grayText">Les messages de vos patients apparaîtront ici.</Text>
                </View>
              ) : conversations.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => openThread(c)} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
                  <View className="flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                      <Ionicons name="person" size={20} color="#F53E8A" />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-dark">{c.patientName}</Text>
                        {c.unreadCount > 0 && (
                          <View className="min-w-5 items-center rounded-full bg-primary px-1.5 py-0.5">
                            <Text className="text-[10px] font-bold text-white">{c.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>{c.lastMessage ?? 'Aucun message'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 16, gap: 8 }}>
              {loadingThread ? (
                <ActivityIndicator size="small" color="#F53E8A" />
              ) : messages.length === 0 ? (
                <Text className="text-center text-sm text-grayText">Démarrez la conversation.</Text>
              ) : messages.map((m) => (
                <View key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.senderType === 'provider' ? 'self-end bg-primary' : 'self-start bg-white'}`}>
                  <Text className={`text-sm ${m.senderType === 'provider' ? 'text-white' : 'text-dark'}`}>{m.content}</Text>
                </View>
              ))}
            </ScrollView>
            <View className="flex-row items-center gap-2 border-t border-hairline bg-white px-4 py-3">
              <TextInput
                className="flex-1 rounded-full bg-softCloud px-4 py-2.5 text-sm text-dark"
                placeholder="Écrire un message..."
                placeholderTextColor="#929292"
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <TouchableOpacity onPress={handleSend} disabled={sending || !draft.trim()} className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
