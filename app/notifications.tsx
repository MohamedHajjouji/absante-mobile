import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  AppNotification,
} from '@/lib/services/notification-service';

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(a: Date, b: Date) {
  const y = new Date(b);
  y.setDate(b.getDate() - 1);
  return isSameDay(a, y);
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (isYesterday(d, now)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

type Section = { title: string; items: AppNotification[] };

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, isLoaded } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) return;
      if (showSpinner) setLoading(true);
      try {
        setItems(await getNotifications(user.id));
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de charger vos notifications.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleOpen = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch (e) {
        console.error('Failed to mark notification read:', e);
      }
    }
  };

  const handleMarkAll = async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      const res = await markAllNotificationsRead(user.id);
      if (!res.success) {
        Alert.alert('Erreur', res.error ?? 'Impossible de marquer les notifications comme lues.');
        return;
      }
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch (e) {
      console.error('Failed to mark all notifications read:', e);
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues. Vérifiez votre connexion.');
    }
  };

  // Group into Aujourd'hui / Hier / Plus tôt
  const sections: Section[] = useMemoSections(items);

  if (!isLoaded) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full border-hairline bg-white p-3 shadow-soft"
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="chevron-back" size={24} color="#3D4B64" />
            </TouchableOpacity>
            <View className="ml-3">
              <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">
                Notifications
              </Text>
              <Text className="mt-0.5 text-sm font-medium text-grayText">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Vous êtes à jour'}
              </Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAll}
              className="flex-row items-center rounded-full bg-primary-50 px-3 py-2"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Tout marquer comme lu"
            >
              <Ionicons name="checkmark-done" size={15} color="#F53E8A" />
              <Text className="ml-1 text-xs font-semibold text-primary">Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Body */}
        {items.length === 0 ? (
          <View className="mx-5 mt-14 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="notifications-off-outline" size={34} color="#F53E8A" />
            </View>
            <Text className="mt-6 text-lg font-semibold text-dark">Aucune notification</Text>
            <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
              Les nouvelles demandes de rendez-vous et mises à jour apparaîtront ici.
            </Text>
          </View>
        ) : (
          <View className="mt-5 px-5">
            {sections.map((section) =>
              section.items.length === 0 ? null : (
                <View key={section.title} className="mb-6">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-grayText">
                    {section.title}
                  </Text>
                  <View className="mt-2 overflow-hidden rounded-panel border-hairline bg-white shadow-panel">
                    {section.items.map((n, index) => {
                      const last = index === section.items.length - 1;
                      return (
                        <TouchableOpacity
                          key={n.id}
                          onPress={() => handleOpen(n)}
                          activeOpacity={0.7}
                          className={`flex-row items-center p-4 ${
                            !n.read ? 'bg-primary-50' : 'bg-white'
                          } ${last ? '' : 'border-b border-hairline'}`}
                          accessibilityRole="button"
                          accessibilityLabel={n.title}
                        >
                          <View
                            className={`h-10 w-10 items-center justify-center rounded-full ${
                              n.read ? 'bg-softCloud' : 'bg-primary-100'
                            }`}
                          >
                            <Ionicons
                              name="notifications"
                              size={18}
                              color={n.read ? '#929292' : '#F53E8A'}
                            />
                          </View>
                          <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                              <Text
                                className={`flex-1 text-sm ${
                                  n.read ? 'font-medium text-grayText' : 'font-semibold text-dark'
                                }`}
                              >
                                {n.title}
                              </Text>
                              {!n.read && <View className="ml-2 h-2 w-2 rounded-full bg-primary" />}
                            </View>
                            {n.body ? (
                              <Text className="mt-0.5 text-xs font-medium leading-4 text-grayText">
                                {n.body}
                              </Text>
                            ) : null}
                            <Text className="mt-1 text-[10px] font-medium uppercase tracking-wide text-grayText">
                              {formatRelativeTime(n.createdAt)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Groups notifications into Aujourd'hui / Hier / Plus tôt, preserving order. */
function useMemoSections(items: AppNotification[]): Section[] {
  return React.useMemo(() => {
    const now = new Date();
    const groups: Section[] = [
      { title: "Aujourd'hui", items: [] },
      { title: 'Hier', items: [] },
      { title: 'Plus tôt', items: [] },
    ];
    for (const n of items) {
      const d = new Date(n.createdAt);
      if (isSameDay(d, now)) groups[0].items.push(n);
      else if (isYesterday(d, now)) groups[1].items.push(n);
      else groups[2].items.push(n);
    }
    return groups;
  }, [items]);
}