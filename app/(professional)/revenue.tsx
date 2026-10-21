import React, { useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getProviderId,
  getDashboard,
  type DashboardData,
} from '@/lib/services/provider-service';

function formatRevenue(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

/** Full month label + year, mirroring getDashboard's 6-month window (oldest → newest). */
function monthLabel(indexFromOldest: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - (5 - indexFromOldest), 1);
  const name = d.toLocaleDateString('fr-FR', { month: 'long' });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${d.getFullYear()}`;
}

export default function RevenueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) return;
      if (showSpinner) setLoading(true);
      try {
        const pid = await getProviderId(user.id);
        if (pid) setDashboard(await getDashboard(pid));
      } catch (e) {
        console.error('Failed to load revenue:', e);
        Alert.alert('Erreur', 'Impossible de charger vos revenus.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  const months = dashboard?.monthlyRevenue ?? [];
  const max = Math.max(...months.map((m) => m.amount), 1);
  const total = months.reduce((s, m) => s + m.amount, 0);
  const totalCount = months.reduce((s, m) => s + m.count, 0);
  const current = months[months.length - 1];

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={{ borderWidth: 1, borderColor: '#F2F2F2' }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={22} color="#3D4B64" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-dark">Revenus</Text>
          <View className="h-11 w-11" />
        </View>

        {/* Total hero */}
        <View className="mx-5 mt-5 overflow-hidden rounded-panel">
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <Text className="text-xs font-medium text-white/80">Total · 6 derniers mois</Text>
            <View className="mt-1 flex-row items-baseline gap-1.5">
              <Text className="text-3xl font-semibold text-white">{formatRevenue(total)}</Text>
              <Text className="text-sm font-medium text-white/80">MAD</Text>
            </View>
            <Text className="mt-1 text-xs font-medium text-white/80">
              {totalCount} RDV · {formatRevenue(Math.round(total / 6))} MAD/mois en moyenne
            </Text>
          </LinearGradient>
        </View>

        {/* This month + today */}
        <View className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Text className="text-[11px] font-medium text-grayText">Ce mois-ci</Text>
            <Text className="mt-1 text-lg font-semibold text-dark">
              {formatRevenue(current?.amount ?? 0)} <Text className="text-[10px] text-grayText">MAD</Text>
            </Text>
            <Text className="mt-0.5 text-[11px] font-medium text-grayText">
              {current?.count ?? 0} RDV
            </Text>
          </View>
          <View className="flex-1 rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Text className="text-[11px] font-medium text-grayText">Aujourd&apos;hui</Text>
            <Text className="mt-1 text-lg font-semibold text-dark">
              {formatRevenue(dashboard?.stats.todayRevenue ?? 0)}{' '}
              <Text className="text-[10px] text-grayText">MAD</Text>
            </Text>
            <Text className="mt-0.5 text-[11px] font-medium text-grayText">
              {dashboard?.stats.todayCount ?? 0} RDV
            </Text>
          </View>
        </View>

        {/* Month-by-month detail */}
        <Text className="mx-5 mt-7 text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
          Mois par mois
        </Text>
        <View className="mx-5 mt-4 gap-3">
          {months
            .map((m, i) => ({ ...m, fullLabel: monthLabel(i), isCurrent: i === months.length - 1 }))
            .reverse()
            .map((m) => (
              <View
                key={m.fullLabel}
                className="rounded-panel border border-hairline bg-white p-4 shadow-panel"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-dark">
                    {m.fullLabel}
                    {m.isCurrent ? ' · en cours' : ''}
                  </Text>
                  <Text className="text-sm font-semibold text-primary">
                    {formatRevenue(m.amount)} MAD
                  </Text>
                </View>
                <View className="mt-2.5 h-2 overflow-hidden rounded-full bg-softCloud">
                  <View
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max(Math.round((m.amount / max) * 100), m.amount > 0 ? 4 : 0)}%` }}
                  />
                </View>
                <Text className="mt-1.5 text-xs text-grayText">{m.count} rendez-vous</Text>
              </View>
            ))}
        </View>

        <Text className="mx-5 mt-5 text-center text-[11px] leading-4 text-grayText">
          RDV annulés exclus. Les montants reprennent les tarifs des prestations.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
