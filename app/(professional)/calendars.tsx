import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId } from '@/lib/services/provider-service';
import { getMyCalendars, toggleCalendarActive, ProCalendar } from '@/lib/services/calendars-service';

const WEEKDAY_FR: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim',
};

export default function CalendarsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendars, setCalendars] = useState<ProCalendar[]>([]);

  const load = useCallback(async (spinner = false) => {
    if (!user?.id) return;
    if (spinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      if (pid) setCalendars(await getMyCalendars(pid));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos calendriers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(true); }, [load]);

  const handleToggle = async (c: ProCalendar) => {
    const res = await toggleCalendarActive(c.id, !c.active);
    if (!res.success) { Alert.alert('Erreur', res.error ?? 'Échec'); return; }
    setCalendars((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
  };

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
        contentContainerStyle={{ paddingBottom: 124 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-semibold text-dark">Calendriers</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">Horaires et disponibilités (Africa/Casablanca)</Text>
        </View>
        <View className="mt-5 gap-4 px-5">
          {calendars.length === 0 ? (
            <View className="items-center rounded-panel border border-hairline bg-white p-8">
              <Ionicons name="calendar-outline" size={36} color="#929292" />
              <Text className="mt-4 text-base font-semibold text-dark">Aucun calendrier</Text>
              <Text className="mt-1 text-center text-sm text-grayText">Créez votre calendrier depuis l'onboarding.</Text>
            </View>
          ) : calendars.map((c) => (
            <View key={c.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-dark">{c.name}</Text>
                <Text className={`rounded-full px-2 py-1 text-[11px] ${c.active ? 'bg-success-50 text-success' : 'bg-gray-100 text-grayText'}`}>
                  {c.active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              {c.facilityName && <Text className="mt-0.5 text-xs text-grayText">{c.facilityName} · créneau {c.slotInterval} min</Text>}
              {c.hours.length > 0 && (
                <View className="mt-3 gap-1.5">
                  {c.hours.map((h, i) => (
                    <View key={`${h.weekday}-${i}`} className="flex-row items-center justify-between rounded-lg bg-softCloud/60 px-3 py-2">
                      <Text className="text-xs font-semibold text-dark">{WEEKDAY_FR[h.weekday] ?? h.weekday}</Text>
                      <Text className="text-xs font-medium text-grayText">{h.start} – {h.end}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View className="mt-3 flex-row gap-2">
                <Text className="rounded-full bg-softCloud px-2 py-1 text-[11px] text-grayText">{c.serviceCount} services</Text>
                <Text className="rounded-full bg-softCloud px-2 py-1 text-[11px] text-grayText">{c.appointmentCount} RDV</Text>
              </View>
              <TouchableOpacity onPress={() => handleToggle(c)} className="mt-3 rounded-lg bg-softCloud py-2.5">
                <Text className="text-center text-xs font-medium text-dark">{c.active ? 'Désactiver' : 'Activer'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
