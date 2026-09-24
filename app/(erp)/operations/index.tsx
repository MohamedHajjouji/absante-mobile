import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { erpFetch } from '@/lib/erp/client';
import type { ServiceOrder, ServiceVisit, PatientAssignment } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';

type Tab = 'orders' | 'visits' | 'assignments' | 'report';

interface StaffReportRow {
  staff_id: string;
  staff_name: string;
  split_percentage: number;
  prestations: number;
  ca_genere: number;
  consumables: number;
  frais: number;
  net: number;
  part_soignant: number;
  part_agence: number;
}

const currentMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  scheduled: '#0D61B6',
  in_progress: '#B45309',
  completed: '#059669',
  cancelled: '#DC2626',
  active: '#059669',
  pending: '#B45309',
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}14` }}>
      <Text className="text-[10px] font-semibold" style={{ color }}>
        {status}
      </Text>
    </View>
  );
}

export default function OperationsScreen() {
  const [tab, setTab] = useState<Tab>('orders');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [visits, setVisits] = useState<ServiceVisit[]>([]);
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<StaffReportRow[]>([]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      const [o, v, a] = await Promise.all([
        erpFetch<ServiceOrder>('service_orders', {
          select: 'id,order_number,service_type,status,priority,start_date,end_date,assigned_staff_id,notes',
          search: q ? { query: q, columns: ['order_number', 'notes'] } : undefined,
          order: { column: 'start_date', ascending: false },
          limit: 200,
        }),
        erpFetch<ServiceVisit>('service_visits', {
          select: 'id,service_order_id,scheduled_start,scheduled_end,status,notes',
          order: { column: 'scheduled_start', ascending: false },
          limit: 200,
        }),
        erpFetch<PatientAssignment>('patient_assignments', {
          select: 'id,patient_id,staff_id,start_date,end_date,status,notes',
          order: { column: 'start_date', ascending: false },
          limit: 200,
        }),
      ]);
      setOrders(o);
      setVisits(v);
      setAssignments(a);
      await loadReport(month);
    } catch (e) {
      console.error('Operations load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, month]);

  /** Staff monthly report — same aggregation as web `staff-report/page.tsx`. */
  const loadReport = async (targetMonth: string) => {
    try {
      const [y, m] = targetMonth.split('-').map(Number);
      const startDate = `${targetMonth}-01`;
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      const rows = await erpFetch<any>('service_orders', {
        select: 'id,assigned_staff_id,service_price,consumables_cost,agency_fee,travel_cost,other_cost,status,staff:staff_members(id,first_name,last_name,split_percentage)',
        filters: { status: ['completed', 'in_progress', 'assigned', 'pending'] },
        ranges: { start_date: { from: startDate, to: endDate } },
        limit: 10000,
      });
      const map = new Map<string, StaffReportRow>();
      for (const order of rows) {
        const staff = order.staff as { id: string; first_name: string; last_name: string; split_percentage?: number } | null;
        if (!staff) continue;
        if (!map.has(staff.id)) {
          map.set(staff.id, {
            staff_id: staff.id,
            staff_name: `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim(),
            split_percentage: Number(staff.split_percentage ?? 50),
            prestations: 0,
            ca_genere: 0,
            consumables: 0,
            frais: 0,
            net: 0,
            part_soignant: 0,
            part_agence: 0,
          });
        }
        const row = map.get(staff.id)!;
        const price = Number(order.service_price) || 0;
        const cons = Number(order.consumables_cost) || 0;
        const costs = cons + (Number(order.agency_fee) || 0) + (Number(order.travel_cost) || 0) + (Number(order.other_cost) || 0);
        const net = Math.max(price - costs, 0);
        const nurse = Math.round(((net * row.split_percentage) / 100) * 100) / 100;
        row.prestations += 1;
        row.ca_genere += price;
        row.consumables += cons;
        row.frais += costs - cons;
        row.net += net;
        row.part_soignant += nurse;
        row.part_agence += Math.round((net - nurse) * 100) / 100;
      }
      const r2 = (n: number) => Math.round(n * 100) / 100;
      setReport(
        Array.from(map.values())
          .map((r) => ({ ...r, ca_genere: r2(r.ca_genere), consumables: r2(r.consumables), frais: r2(r.frais), net: r2(r.net), part_soignant: r2(r.part_soignant), part_agence: r2(r.part_agence) }))
          .sort((x, y) => y.ca_genere - x.ca_genere)
      );
    } catch (e) {
      console.error('Staff report load', e);
    }
  };

  useEffect(() => {
    load(true);
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => load(false), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Opérations',
          headerTintColor: '#3D4B64',
          headerStyle: { backgroundColor: '#FEFBFC' },
          headerShadowVisible: false,
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F53E8A" />
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-5 pt-3">
            <View className="flex-row items-center rounded-lg border border-hairline bg-white px-3 py-2.5">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                className="ml-2 flex-1 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="Rechercher…"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-2">
                {(['orders', 'visits', 'assignments', 'report'] as Tab[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    className={`rounded-full px-4 py-2 ${tab === t ? 'bg-primary' : 'bg-white border border-hairline'}`}
                    activeOpacity={0.8}
                  >
                    <Text className={`text-xs font-semibold ${tab === t ? 'text-white' : 'text-dark'}`}>
                      {t === 'orders' ? 'Ordres' : t === 'visits' ? 'Visites' : t === 'assignments' ? 'Affectations' : 'Rapport staff'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />
            }
          >
            {tab === 'orders' &&
              (orders.length === 0 ? (
                <ErpEmptyState icon="construct" title="Aucun ordre" subtitle="Les ordres de service créés sur le web apparaîtront ici." />
              ) : (
                <View className="gap-2.5">
                  {orders.map((o) => (
                    <View key={o.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-dark">{o.order_number}</Text>
                        <StatusPill status={o.status} />
                      </View>
                      <Text className="mt-1 text-xs text-grayText">
                        {[o.service_type, o.start_date].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            {tab === 'visits' &&
              (visits.length === 0 ? (
                <ErpEmptyState icon="home" title="Aucune visite" subtitle="Les visites planifiées apparaîtront ici." />
              ) : (
                <View className="gap-2.5">
                  {visits.map((v) => (
                    <View key={v.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                          {String(v.scheduled_start ?? '').slice(0, 16).replace('T', ' ')}
                        </Text>
                        <StatusPill status={v.status} />
                      </View>
                      {v.notes ? (
                        <Text className="mt-1 text-xs text-grayText" numberOfLines={2}>
                          {v.notes}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            {tab === 'assignments' &&
              (assignments.length === 0 ? (
                <ErpEmptyState icon="people" title="Aucune affectation" subtitle="Les affectations patient ↔ soignant apparaîtront ici." />
              ) : (
                <View className="gap-2.5">
                  {assignments.map((a) => (
                    <View key={a.id} className="rounded-xl border border-hairline bg-white p-3.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-dark">
                          {[a.start_date, a.end_date].filter(Boolean).join(' → ') || 'Affectation'}
                        </Text>
                        <StatusPill status={a.status} />
                      </View>
                      {a.notes ? (
                        <Text className="mt-1 text-xs text-grayText" numberOfLines={2}>
                          {a.notes}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            {tab === 'report' && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between rounded-xl border border-hairline bg-white p-3.5">
                  <TouchableOpacity
                    onPress={() => setMonth((m) => shiftMonth(m, -1))}
                    className="h-9 w-9 items-center justify-center rounded-full bg-softCloud"
                    accessibilityLabel="Mois précédent"
                  >
                    <Ionicons name="chevron-back" size={18} color="#3D4B64" />
                  </TouchableOpacity>
                  <Text className="text-sm font-semibold capitalize text-dark">
                    {new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setMonth((m) => shiftMonth(m, 1))}
                    className="h-9 w-9 items-center justify-center rounded-full bg-softCloud"
                    accessibilityLabel="Mois suivant"
                  >
                    <Ionicons name="chevron-forward" size={18} color="#3D4B64" />
                  </TouchableOpacity>
                </View>
                {report.length === 0 ? (
                  <ErpEmptyState icon="bar-chart" title="Aucune prestation" subtitle="Aucun ordre facturable sur ce mois." />
                ) : (
                  <>
                    <View className="rounded-xl border border-primary-100 bg-primary-50 p-4">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-primary">Total agence</Text>
                      <View className="mt-2 flex-row justify-between">
                        <View>
                          <Text className="text-xl font-bold text-dark">
                            {report.reduce((s, r) => s + r.prestations, 0)}
                          </Text>
                          <Text className="text-[11px] text-grayText">Prestations</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-xl font-bold text-dark">
                            {new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(report.reduce((s, r) => s + r.net, 0))} MAD
                          </Text>
                          <Text className="text-[11px] text-grayText">Net total</Text>
                        </View>
                      </View>
                    </View>
                    {report.map((r) => (
                      <View key={r.staff_id} className="rounded-xl border border-hairline bg-white p-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>
                            {r.staff_name}
                          </Text>
                          <Text className="text-[11px] font-semibold text-grayText">{r.split_percentage}%</Text>
                        </View>
                        <Text className="mt-0.5 text-xs text-grayText">
                          {r.prestations} prestation(s) · CA {new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.ca_genere)} MAD
                        </Text>
                        <View className="mt-3 gap-1.5">
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-grayText">Consommables</Text>
                            <Text className="text-xs font-semibold text-dark">{new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.consumables)} MAD</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-grayText">Frais (agence + déplac.)</Text>
                            <Text className="text-xs font-semibold text-dark">{new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.frais)} MAD</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-xs text-grayText">Net</Text>
                            <Text className="text-xs font-bold text-dark">{new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.net)} MAD</Text>
                          </View>
                          <View className="mt-1 flex-row gap-2 border-t border-hairline pt-2.5">
                            <View className="flex-1 rounded-lg bg-emerald-50 px-3 py-2">
                              <Text className="text-[10px] font-semibold uppercase text-emerald-700">Part soignant</Text>
                              <Text className="text-sm font-bold text-emerald-700">{new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.part_soignant)} MAD</Text>
                            </View>
                            <View className="flex-1 rounded-lg bg-primary-50 px-3 py-2">
                              <Text className="text-[10px] font-semibold uppercase text-primary">Part agence</Text>
                              <Text className="text-sm font-bold text-primary">{new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(r.part_agence)} MAD</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
