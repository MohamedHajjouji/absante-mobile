import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getDashboardSummary,
  getRecentMovements,
  DashboardSummary,
  MovementRow,
} from '@/lib/services/erp/stock-service';
import { movementTypeLabels } from '@/lib/erp/labels';
import { formatNumber } from '@/lib/erp/format';

const QUICK_LINKS: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  href: string;
}[] = [
  { title: 'Stock', subtitle: 'Niveaux & mouvements', icon: 'cube', color: '#0D61B6', bg: '#ECF2FA', href: '/(erp)/stock' },
  { title: 'Produits', subtitle: 'Catalogue', icon: 'pricetags', color: '#10B981', bg: '#ECFDF5', href: '/(erp)/products' },
  { title: 'Emplacements', subtitle: 'Entrepôts, véhicules…', icon: 'business', color: '#F59E0B', bg: '#FFFBEB', href: '/(erp)/locations' },
  { title: 'Catégories', subtitle: 'Classement produits', icon: 'pricetags', color: '#06B6D4', bg: '#ECFEFF', href: '/(erp)/categories' },
  { title: 'Unités', subtitle: 'Boîte, unité…', icon: 'beaker', color: '#8B5CF6', bg: '#F5F3FF', href: '/(erp)/units' },
  { title: 'Mouvements', subtitle: 'Entrées / sorties', icon: 'swap-horizontal', color: '#8B5CF6', bg: '#F5F3FF', href: '/(erp)/stock/movements' },
  { title: 'Comptes de stock', subtitle: 'Inventaire physique', icon: 'checkmark-circle', color: '#059669', bg: '#DCFCE7', href: '/(erp)/stock/counts' },
  { title: 'Ajustements', subtitle: 'Modifications de stock', icon: 'create', color: '#F59E0B', bg: '#FFFBEB', href: '/(erp)/stock/adjustments' },
  { title: 'Ventes', subtitle: 'Devis & factures', icon: 'card', color: '#8B5CF6', bg: '#F5F3FF', href: '/(erp)/sales' },
  { title: 'Achats', subtitle: 'Commandes & fournisseurs', icon: 'basket', color: '#0D9488', bg: '#ECFDF5', href: '/(erp)/purchases' },
  { title: 'Finance', subtitle: 'Dépenses & catégories', icon: 'cash', color: '#DC2626', bg: '#FEE2E2', href: '/(erp)/finance' },
  { title: 'Opérations', subtitle: 'Ordres & visites', icon: 'construct', color: '#EA580C', bg: '#FFF7ED', href: '/(erp)/operations' },
  { title: 'Documents', subtitle: 'Rapports & justificatifs', icon: 'document-text', color: '#7F8C8D', bg: '#E5E7EB', href: '/(erp)/documents' },
  { title: 'Patients', subtitle: 'Dossiers patients', icon: 'person', color: '#8B5CF6', bg: '#F5F3FF', href: '/(erp)/patients' },
  { title: 'Staff', subtitle: 'Membres & plannings', icon: 'people', color: '#0D9488', bg: '#ECFDF5', href: '/(erp)/staff' },
  { title: 'Actifs', subtitle: 'Équipements suivis', icon: 'hardware-chip', color: '#0D61B6', bg: '#ECF2FA', href: '/(erp)/assets' },
  { title: 'Locations', subtitle: 'Matériel loué', icon: 'key', color: '#7C3AED', bg: '#F5F3FF', href: '/(erp)/rentals' },
  { title: 'Maintenance', subtitle: 'Entretiens actifs', icon: 'build', color: '#B45309', bg: '#FFFBEB', href: '/(erp)/maintenance' },
  { title: 'Services', subtitle: 'Catalogue de soins', icon: 'briefcase', color: '#059669', bg: '#DCFCE7', href: '/(erp)/services' },
];

export default function ErpHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<MovementRow[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [sum, movements] = await Promise.all([getDashboardSummary(), getRecentMovements(5)]);
      setSummary(sum);
      setRecent(movements);
    } catch (e) {
      console.error('ERP dashboard load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const MetricCard = ({
    label,
    value,
    icon,
    color,
    bg,
    onPress,
    alert,
  }: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    onPress?: () => void;
    alert?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
      className={`flex-1 rounded-2xl border bg-white p-3.5 ${alert ? 'border-red-200' : 'border-hairline'}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text className={`mt-2.5 text-xl font-bold ${alert ? 'text-[#c13515]' : 'text-dark'}`}>{value}</Text>
      <Text className="mt-0.5 text-[11px] font-medium text-grayText">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F53E8A" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View className="px-5 pt-4">
            <Text className="text-2xl font-bold text-dark">Espace ERP</Text>
            <Text className="mt-1 text-sm text-grayText">
              Bonjour {user?.user_metadata?.first_name ?? ''} — voici votre agence
            </Text>
          </View>

          {/* Metrics */}
          <View className="mt-5 gap-3 px-5">
            <View className="flex-row gap-3">
              <MetricCard
                label="Stock faible"
                value={summary?.lowStockCount ?? 0}
                icon="warning"
                color="#c13515"
                bg="#FEF2F2"
                alert={(summary?.lowStockCount ?? 0) > 0}
                onPress={() => router.push('/(erp)/stock' as any)}
              />
              <MetricCard
                label="Produits actifs"
                value={summary?.activeProducts ?? 0}
                icon="pricetags"
                color="#10B981"
                bg="#ECFDF5"
                onPress={() => router.push('/(erp)/products' as any)}
              />
            </View>
            <View className="flex-row gap-3">
              <MetricCard
                label="Entrées du jour"
                value={formatNumber(summary?.todayIn ?? 0)}
                icon="arrow-down"
                color="#0D61B6"
                bg="#ECF2FA"
                onPress={() => router.push('/(erp)/stock/movements' as any)}
              />
              <MetricCard
                label="Sorties du jour"
                value={formatNumber(summary?.todayOut ?? 0)}
                icon="arrow-up"
                color="#F59E0B"
                bg="#FFFBEB"
                onPress={() => router.push('/(erp)/stock/movements' as any)}
              />
            </View>
          </View>

          {/* Quick links */}
          <View className="mt-6 gap-3 px-5">
            {QUICK_LINKS.map((m) => (
              <TouchableOpacity
                key={m.title}
                onPress={() => router.push(m.href as any)}
                className="flex-row items-center rounded-2xl border border-hairline bg-white p-4 shadow-panel"
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={m.title}
              >
                <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: m.bg }}>
                  <Ionicons name={m.icon} size={24} color={m.color} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold text-dark">{m.title}</Text>
                  <Text className="mt-0.5 text-xs text-grayText">{m.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent movements */}
          <View className="mt-6 px-5 pb-10">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-dark">Derniers mouvements</Text>
              <TouchableOpacity onPress={() => router.push('/(erp)/stock/movements' as any)}>
                <Text className="text-sm font-medium text-primary">Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-3 gap-2">
              {recent.length === 0 ? (
                <Text className="rounded-xl border border-hairline bg-white p-4 text-center text-sm text-grayText">
                  Aucun mouvement enregistré pour le moment.
                </Text>
              ) : (
                recent.map((m) => (
                  <View
                    key={m.id}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                  >
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        m.isInbound ? 'bg-emerald-50' : 'bg-orange-50'
                      }`}
                    >
                      <Ionicons
                        name={m.isInbound ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={m.isInbound ? '#10B981' : '#EA580C'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {m.productName}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText">
                        {movementTypeLabels[m.movementType] ?? m.movementType} · {m.locationName}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-bold ${m.isInbound ? 'text-emerald-600' : 'text-[#EA580C]'}`}
                    >
                      {m.isInbound ? '+' : '−'}
                      {formatNumber(m.quantity)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
