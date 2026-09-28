import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { erpFetch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';
import type { Supplier, Purchase } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import {
  DocEditor,
  emptyHeader,
  newLineKey,
  type EditorHeader,
  type EditorLine,
  type EditorProduct,
} from '@/components/erp/DocEditor';
import {
  getDocItems,
  insertDocWithItems,
  updateDocWithItems,
  cancelDoc,
  deleteDoc,
  nextNumber,
  todayISO,
  type LineInput,
} from '@/lib/services/erp/documents/documents-service';

type Tab = 'suppliers' | 'orders';

const PO_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'ordered', label: 'Commandé' },
  { value: 'partially_received', label: 'Partiellement reçu' },
  { value: 'received', label: 'Reçu' },
  { value: 'cancelled', label: 'Annulé' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  ordered: '#0D61B6',
  partially_received: '#B45309',
  received: '#059669',
  cancelled: '#DC2626',
};

function itemRowToLine(r: Record<string, unknown>): EditorLine {
  return {
    key: newLineKey(),
    item_type: 'product',
    product_id: (r.product_id as string) ?? null,
    product_unit_id: (r.product_unit_id as string) ?? null,
    service_id: null,
    description: (r.description as string) ?? '',
    reference: (r.reference as string) ?? null,
    quantity: Number(r.quantity ?? 0),
    unit_price: Number((r.unit_cost ?? r.unit_price ?? 0) as number),
    discount: Number(r.discount ?? 0),
    tax_rate: Number(r.tax_rate ?? 0),
  };
}

function lineToInput(l: EditorLine): LineInput {
  return {
    item_type: 'product',
    product_id: l.product_id,
    product_unit_id: l.product_unit_id,
    service_id: null,
    description: l.description,
    reference: l.reference,
    quantity: l.quantity,
    unit_price: l.unit_price,
    discount: l.discount,
    tax_rate: l.tax_rate,
  };
}

const hasContent = (l: EditorLine) =>
  (l.description && l.description.trim()) || l.product_id;

export default function PurchasesScreen() {
  const [tab, setTab] = useState<Tab>('suppliers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<EditorProduct[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Supplier form
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  // PO editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorHeader, setEditorHeader] = useState<EditorHeader>(emptyHeader());
  const [editorLines, setEditorLines] = useState<EditorLine[]>([]);
  const [editorSaving, setEditorSaving] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      const [s, o, prods, locs] = await Promise.all([
        erpFetch<Supplier>('suppliers', {
          select: 'id,name,company_name,phone,email,city,is_active',
          search: q ? { query: q, columns: ['name', 'company_name', 'phone', 'email'] } : undefined,
          filters: { is_active: true },
          order: { column: 'name', ascending: true },
          limit: 200,
        }),
        erpFetch<Purchase>('purchases', {
          select: 'id,purchase_number,supplier_id,location_id,supplier_invoice_number,purchase_date,status,subtotal,total,notes',
          search: q ? { query: q, columns: ['purchase_number'] } : undefined,
          order: { column: 'purchase_date', ascending: false },
          limit: 200,
        }),
        erpFetch<any>('products', {
          select: 'id,name,reference,product_units(id,selling_price,purchase_price,is_default,unit:units(name,symbol))',
          filters: { is_active: true },
          order: { column: 'name', ascending: true },
          limit: 300,
        }),
        erpFetch<{ id: string; name: string }>('locations', {
          select: 'id,name',
          filters: { is_active: true },
          order: { column: 'name', ascending: true },
          limit: 100,
        }),
      ]);
      setSuppliers(s);
      setOrders(o);
      setProducts(
        prods.map((p: any) => ({
          id: p.id,
          name: p.name,
          reference: p.reference ?? '',
          units: (p.product_units ?? []).map((u: any) => ({
            id: u.id,
            selling_price: u.selling_price,
            purchase_price: u.purchase_price,
            is_default: !!u.is_default,
            unitLabel: u.unit?.symbol ?? u.unit?.name ?? '',
          })),
        }))
      );
      setLocations(locs);
    } catch (e) {
      console.error('Purchases load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

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

  const supplierName = (id?: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? '—';

  const money = (v: number) =>
    new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

  // ── Suppliers CRUD ─────────────────────────────────────────

  const openCreate = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setCity('');
    setFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setName(s.name);
    setPhone(s.phone ?? '');
    setCity(s.city ?? '');
    setFormOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }
    setSaving(true);
    try {
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
      is_active: true,
    };
    const res = editId
      ? await erpUpdate('suppliers', editId, payload)
      : await erpInsert('suppliers', payload);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? "Impossible d'enregistrer le fournisseur.");
      return;
    }
    setFormOpen(false);
    load();
    } catch (e) {
      console.error('Failed to save supplier:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = (s: Supplier) => {
    Alert.alert('Désactiver', `« ${s.name} » sera masqué. Continuer ?`, [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Désactiver',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await erpDeactivate('suppliers', s.id);
            if (!res.ok) Alert.alert('Erreur', res.message ?? 'Impossible de désactiver.');
            else load();
          } catch (e) {
            console.error('Failed to deactivate supplier:', e);
            Alert.alert('Erreur', "Impossible de désactiver. Vérifiez votre connexion.");
          }
        },
      },
    ]);
  };

  // ── PO editor ──────────────────────────────────────────────

  const openPoCreate = () => {
    setEditingId(null);
    setEditorTitle('Nouvelle commande');
    setEditorHeader(emptyHeader());
    setEditorLines([]);
    setEditorOpen(true);
  };

  const openPoEdit = async (po: Purchase) => {
    setActing(true);
    try {
      const rows = await getDocItems<Record<string, unknown>>('purchase_items', po.id);
      const h = emptyHeader();
      h.partnerId = po.supplier_id;
      h.locationId = po.location_id;
      h.issueDate = po.purchase_date;
      h.supplierInvoiceNumber = po.supplier_invoice_number ?? '';
      h.notes = po.notes ?? '';
      h.status = po.status;
      setEditingId(po.id);
      setEditorTitle(po.purchase_number);
      setEditorHeader(h);
      setEditorLines(rows.map(itemRowToLine));
      setEditorOpen(true);
    } catch (e) {
      console.error('Failed to load purchase lines:', e);
      Alert.alert('Erreur', "Commande illisible. Vérifiez votre connexion.");
    } finally {
      setActing(false);
    }
  };

  const handlePoSave = async (header: EditorHeader, lines: EditorLine[]) => {
    if (!header.partnerId) {
      Alert.alert('Erreur', 'Le fournisseur est requis.');
      return;
    }
    if (!header.locationId) {
      Alert.alert('Erreur', 'L’emplacement de livraison est requis.');
      return;
    }
    const items = lines.filter(hasContent).map(lineToInput);
    if (items.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une ligne.');
      return;
    }
    setEditorSaving(true);
    try {
      let res: { ok: boolean; message?: string };
      if (editingId) {
        res = await updateDocWithItems('purchases', 'purchase_items', editingId, {
          status: header.status,
          supplier_invoice_number: header.supplierInvoiceNumber.trim() || null,
          notes: header.notes || null,
        }, items);
      } else {
        const number = await nextNumber('purchase');
        if (!number) {
          Alert.alert('Erreur', 'Impossible de générer le numéro de commande.');
          return;
        }
        res = await insertDocWithItems('purchases', 'purchase_items', {
          purchase_number: number,
          supplier_id: header.partnerId,
          location_id: header.locationId,
          supplier_invoice_number: header.supplierInvoiceNumber.trim() || null,
          purchase_date: header.issueDate || todayISO(),
          status: 'draft',
          notes: header.notes || null,
        }, items);
      }
      if (!res.ok) {
        Alert.alert('Erreur', res.message ?? 'Enregistrement impossible.');
        return;
      }
      setEditorOpen(false);
      load();
    } catch (e) {
      console.error('Failed to save purchase:', e);
      Alert.alert('Erreur', "Enregistrement impossible. Vérifiez votre connexion.");
    } finally {
      setEditorSaving(false);
    }
  };

  const runAct = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setActing(true);
    try {
      const res = await fn();
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Action impossible.');
      else load();
    } catch (e) {
      console.error('ERP action failed:', e);
      Alert.alert('Erreur', "Action impossible. Vérifiez votre connexion.");
    } finally {
      setActing(false);
    }
  };

  const poMenu = (po: Purchase) => {
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    if (po.status === 'draft') {
      buttons.push({ text: 'Valider (commandé)', onPress: () => runAct(async () => {
        const r = await erpUpdate('purchases', po.id, { status: 'ordered' });
        return { ok: r.ok, message: r.message };
      }) });
    }
    if (po.status !== 'cancelled') {
      buttons.push({ text: 'Annuler', onPress: () => runAct(() => cancelDoc('purchases', po.id)) });
    }
    buttons.push({ text: 'Supprimer définitivement', style: 'destructive', onPress: () => runAct(() => deleteDoc('purchases', po.id)) });
    buttons.push({ text: 'Fermer', style: 'cancel' });
    Alert.alert(po.purchase_number, 'Actions', buttons);
  };

  const supplierList = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    sub: [s.phone, s.city].filter(Boolean).join(' · '),
  }));

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Achats',
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
            <View className="mt-3 flex-row gap-2">
              {(['suppliers', 'orders'] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  className={`rounded-full px-4 py-2 ${tab === t ? 'bg-primary' : 'bg-white border border-hairline'}`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-xs font-semibold ${tab === t ? 'text-white' : 'text-dark'}`}>
                    {t === 'suppliers' ? 'Fournisseurs' : "Bons d'achat"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />}
          >
            {tab === 'suppliers' &&
              (suppliers.length === 0 ? (
                <ErpEmptyState icon="basket" title="Aucun fournisseur" subtitle="Ajoutez vos fournisseurs pour suivre vos achats." actionLabel="Nouveau fournisseur" onAction={openCreate} />
              ) : (
                <View className="gap-2.5">
                  {suppliers.map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => openEdit(s)} className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                        <Ionicons name="storefront" size={18} color="#0D9488" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>{s.name}</Text>
                        <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>{[s.phone, s.city].filter(Boolean).join(' · ') || '—'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            {tab === 'orders' &&
              (orders.length === 0 ? (
                <ErpEmptyState icon="clipboard" title="Aucun achat" subtitle="Créez votre première commande avec lignes." actionLabel="Nouvelle commande" onAction={openPoCreate} />
              ) : (
                <View className="gap-2.5">
                  {orders.map((o) => {
                    const color = STATUS_COLORS[o.status] ?? '#6B7280';
                    return (
                      <TouchableOpacity key={o.id} onPress={() => openPoEdit(o)} className="rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                        <View className="flex-row items-center justify-between">
                          <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>{o.purchase_number}</Text>
                          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}14` }}>
                            <Text className="text-[10px] font-semibold" style={{ color }}>{o.status}</Text>
                          </View>
                        </View>
                        <Text className="mt-1 text-xs text-grayText" numberOfLines={1}>{supplierName(o.supplier_id)} · {o.purchase_date ?? ''}</Text>
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-sm font-bold text-dark">{money(o.total)} MAD</Text>
                          <View className="flex-row items-center gap-1">
                            {o.status === 'draft' && (
                              <TouchableOpacity onPress={() => runAct(async () => {
                                const r = await erpUpdate('purchases', o.id, { status: 'ordered' });
                                return { ok: r.ok, message: r.message };
                              })} className="flex-row items-center rounded-lg bg-teal-50 px-2.5 py-1.5" accessibilityLabel="Valider la commande">
                                <Ionicons name="checkmark" size={14} color="#0D9488" />
                                <Text className="ml-1 text-[11px] font-semibold text-teal-700">Valider</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => poMenu(o)} className="h-8 w-8 items-center justify-center rounded-lg bg-softCloud" accessibilityLabel="Actions commande">
                              <Ionicons name="ellipsis-horizontal" size={16} color="#3D4B64" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => (tab === 'suppliers' ? openCreate() : openPoCreate())}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityLabel={tab === 'suppliers' ? 'Nouveau fournisseur' : 'Nouvelle commande'}
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      <ErpBottomSheet visible={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}>
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Ex. : Pharma Grossiste" value={name} onChangeText={setName} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Téléphone</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="05 XX XX XX XX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Ville</Text>
        <TextInput className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Casablanca" value={city} onChangeText={setCity} />
        <TouchableOpacity onPress={submit} disabled={saving} className="flex-row items-center justify-center rounded-lg bg-primary py-4" activeOpacity={0.8}>
          {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
        {editId ? (
          <TouchableOpacity onPress={() => {
            const s = suppliers.find((x) => x.id === editId);
            if (s) { setFormOpen(false); confirmDeactivate(s); }
          }} className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5">
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>

      {editorOpen && (
        <DocEditor
          visible={editorOpen}
          kind="purchase"
          title={editorTitle}
          subtitle={editingId ? 'Modifier — lignes incluses' : 'Brouillon — lignes incluses'}
          isNew={!editingId}
          partners={supplierList}
          partnerLabel="Fournisseur"
          locations={locations}
          products={products}
          initialHeader={editorHeader}
          initialLines={editorLines}
          statusOptions={PO_STATUS_OPTIONS}
          secondDateLabel=""
          saving={editorSaving}
          onClose={() => setEditorOpen(false)}
          onSave={handlePoSave}
        />
      )}

      {acting && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="rounded-2xl bg-white p-5">
            <ActivityIndicator size="large" color="#F53E8A" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
