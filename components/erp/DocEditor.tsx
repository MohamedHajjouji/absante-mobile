import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { computeDocTotals, lineTotal } from '@/lib/services/erp/documents/documents-service';

/**
 * Full-screen document editor with line items — mobile port of the web
 * `Modal` + `LineItemsEditor` combo used by Quotes/Invoices/CreditNotes/
 * Purchases clients. One component serves all 4 document kinds:
 * - sale docs (quote/invoice/credit_note): products (selling price) + services
 * - purchase docs: products (purchase price) only, + location picker
 */

export type DocKind = 'quote' | 'invoice' | 'credit_note' | 'purchase';

export interface EditorPartner {
  id: string;
  name: string;
  sub?: string;
}

export interface EditorProductUnit {
  id: string;
  selling_price: number | null;
  purchase_price: number | null;
  is_default: boolean;
  unitLabel: string;
}

export interface EditorProduct {
  id: string;
  name: string;
  reference: string;
  units: EditorProductUnit[];
}

export interface EditorServiceItem {
  id: string;
  name: string;
  reference?: string | null;
  default_price: number | null;
  tax_rate: number | null;
}

export interface EditorLine {
  key: string;
  item_type: 'product' | 'service';
  product_id: string | null;
  product_unit_id: string | null;
  service_id: string | null;
  description: string;
  reference?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export interface EditorHeader {
  partnerId: string;
  locationId: string;
  issueDate: string;
  secondDate: string;
  notes: string;
  status: string;
  paymentStatus: string;
  invoiceId: string;
  reason: string;
  supplierInvoiceNumber: string;
}

interface Props {
  visible: boolean;
  kind: DocKind;
  title: string;
  subtitle?: string;
  isNew: boolean;
  partners: EditorPartner[];
  partnerLabel: string;
  locations?: EditorPartner[];
  invoices?: { id: string; number: string; partnerId: string }[];
  products: EditorProduct[];
  services?: EditorServiceItem[];
  initialHeader: EditorHeader;
  initialLines: EditorLine[];
  statusOptions: { value: string; label: string }[];
  paymentStatusOptions?: { value: string; label: string }[];
  showPaymentStatus?: boolean;
  secondDateLabel: string;
  saving: boolean;
  onClose: () => void;
  onSave: (header: EditorHeader, lines: EditorLine[]) => void;
}

export function emptyHeader(): EditorHeader {
  const today = new Date().toISOString().split('T')[0];
  return {
    partnerId: '',
    locationId: '',
    issueDate: today,
    secondDate: '',
    notes: '',
    status: 'draft',
    paymentStatus: 'unpaid',
    invoiceId: '',
    reason: '',
    supplierInvoiceNumber: '',
  };
}

let lineSeq = 0;
export function newLineKey(): string {
  lineSeq += 1;
  return `line-${Date.now()}-${lineSeq}`;
}

const parseNum = (text: string): number => {
  const n = Number(String(text).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const money = (v: number) =>
  new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);

function NumInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] font-medium text-grayText">{label}</Text>
      <View className="flex-row items-center rounded-lg border border-hairline bg-white px-2.5 py-2">
        <TextInput
          className="flex-1 p-0 text-sm font-semibold text-dark"
          keyboardType="decimal-pad"
          value={String(value ?? 0)}
          onChangeText={(t) => onChange(parseNum(t))}
        />
        {suffix ? <Text className="ml-1 text-[11px] text-grayText">{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function DocEditor(props: Props) {
  const {
    visible,
    kind,
    title,
    subtitle,
    isNew,
    partners,
    partnerLabel,
    locations = [],
    invoices = [],
    products,
    services = [],
    initialHeader,
    initialLines,
    statusOptions,
    paymentStatusOptions = [],
    showPaymentStatus = false,
    secondDateLabel,
    saving,
    onClose,
    onSave,
  } = props;

  const isPurchase = kind === 'purchase';
  const isCreditNote = kind === 'credit_note';

  const [header, setHeader] = useState<EditorHeader>(initialHeader);
  const [lines, setLines] = useState<EditorLine[]>(initialLines);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'products' | 'services'>('products');
  const [pickerSearch, setPickerSearch] = useState('');

  useEffect(() => {
    if (visible) {
      setHeader(initialHeader);
      setLines(initialLines);
      setPartnerSearch('');
      setPickerOpen(false);
      setPickerSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (patch: Partial<EditorHeader>) => setHeader((h) => ({ ...h, ...patch }));

  const filteredPartners = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    const list = q
      ? partners.filter(
          (p) => p.name.toLowerCase().includes(q) || (p.sub ?? '').toLowerCase().includes(q)
        )
      : partners;
    return list.slice(0, 30);
  }, [partners, partnerSearch]);

  const filteredProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) => p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
        )
      : products;
    return list.slice(0, 40);
  }, [products, pickerSearch]);

  const filteredServices = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const list = q
      ? services.filter(
          (s) => s.name.toLowerCase().includes(q) || (s.reference ?? '').toLowerCase().includes(q)
        )
      : services;
    return list.slice(0, 40);
  }, [services, pickerSearch]);

  const totals = useMemo(() => computeDocTotals(lines), [lines]);

  const defaultUnit = (p: EditorProduct) =>
    p.units.find((u) => u.is_default) ?? p.units[0];

  const addProduct = (p: EditorProduct) => {
    const unit = defaultUnit(p);
    const price = isPurchase ? unit?.purchase_price : unit?.selling_price;
    const suffix = unit?.unitLabel ? ` (${unit.unitLabel})` : '';
    setLines((prev) => [
      ...prev,
      {
        key: newLineKey(),
        item_type: 'product',
        product_id: p.id,
        product_unit_id: unit?.id ?? null,
        service_id: null,
        description: `${p.name}${suffix}`,
        reference: p.reference || null,
        quantity: 1,
        unit_price: Number(price) || 0,
        discount: 0,
        tax_rate: 20,
      },
    ]);
  };

  const addService = (s: EditorServiceItem) => {
    setLines((prev) => [
      ...prev,
      {
        key: newLineKey(),
        item_type: 'service',
        product_id: null,
        product_unit_id: null,
        service_id: s.id,
        description: s.name,
        reference: s.reference || null,
        quantity: 1,
        unit_price: Number(s.default_price) || 0,
        discount: 0,
        tax_rate: Number(s.tax_rate) || 20,
      },
    ]);
  };

  const patchLine = (key: string, patch: Partial<EditorLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const partnerLocked = !isNew;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-pageBg" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center border-b border-hairline bg-white px-4 py-3">
          <TouchableOpacity
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full bg-softCloud"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={18} color="#3D4B64" />
          </TouchableOpacity>
          <View className="mx-3 flex-1">
            <Text className="text-base font-semibold text-dark" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-grayText" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => onSave(header, lines)}
            disabled={saving}
            className="flex-row items-center rounded-lg bg-primary px-4 py-2.5"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le document"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            )}
            <Text className="ml-1.5 text-sm font-semibold text-white">Sauver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Partner */}
          <Text className="mb-1.5 text-sm font-semibold text-dark">{partnerLabel} *</Text>
          {partnerLocked ? (
            <View className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5">
              <Text className="text-sm font-semibold text-dark">
                {partners.find((p) => p.id === header.partnerId)?.name ?? '—'}
              </Text>
            </View>
          ) : (
            <View className="mb-4">
              <View className="flex-row items-center rounded-lg border border-hairline bg-white px-3 py-2.5">
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput
                  className="ml-2 flex-1 text-sm text-dark"
                  placeholderTextColor="#929292"
                  placeholder={`Rechercher un ${partnerLabel.toLowerCase()}…`}
                  value={partnerSearch}
                  onChangeText={setPartnerSearch}
                />
              </View>
              <View className="mt-2 gap-1.5">
                {filteredPartners.map((p) => {
                  const active = header.partnerId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => set({ partnerId: active ? '' : p.id })}
                      className={`rounded-lg border px-3 py-2.5 ${active ? 'border-primary bg-primary-50' : 'border-hairline bg-white'}`}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark'}`} numberOfLines={1}>
                        {p.name}
                      </Text>
                      {p.sub ? (
                        <Text className="text-[11px] text-grayText" numberOfLines={1}>
                          {p.sub}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Location (purchase only) */}
          {isPurchase && locations.length > 0 && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Emplacement de livraison *</Text>
              {isNew ? (
                <View className="flex-row flex-wrap gap-2">
                  {locations.map((l) => {
                    const active = header.locationId === l.id;
                    return (
                      <TouchableOpacity
                        key={l.id}
                        onPress={() => set({ locationId: l.id })}
                        className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-white border border-hairline'}`}
                        activeOpacity={0.8}
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>
                          {l.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View className="rounded-lg border border-hairline bg-white px-4 py-3.5">
                  <Text className="text-sm font-semibold text-dark">
                    {locations.find((l) => l.id === header.locationId)?.name ?? '—'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Invoice picker + reason (credit note) */}
          {isCreditNote && isNew && invoices.length > 0 && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Facture d&apos;origine *</Text>
              <View className="gap-1.5">
                {invoices
                  .filter((inv) => !header.partnerId || inv.partnerId === header.partnerId)
                  .slice(0, 10)
                  .map((inv) => {
                    const active = header.invoiceId === inv.id;
                    return (
                      <TouchableOpacity
                        key={inv.id}
                        onPress={() => set({ invoiceId: inv.id })}
                        className={`rounded-lg border px-3 py-2.5 ${active ? 'border-primary bg-primary-50' : 'border-hairline bg-white'}`}
                        activeOpacity={0.8}
                      >
                        <Text className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark'}`}>
                          {inv.number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}
          {isCreditNote && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Motif *</Text>
              <TextInput
                className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="Ex. : Retour marchandise"
                value={header.reason}
                onChangeText={(t) => set({ reason: t })}
              />
            </View>
          )}

          {/* Dates */}
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Date *</Text>
              <TextInput
                className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="AAAA-MM-JJ"
                value={header.issueDate}
                onChangeText={(t) => set({ issueDate: t })}
                editable={isNew}
              />
            </View>
            {secondDateLabel ? (
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-semibold text-dark">{secondDateLabel}</Text>
                <TextInput
                  className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm text-dark"
                  placeholderTextColor="#929292"
                  placeholder="AAAA-MM-JJ"
                  value={header.secondDate}
                  onChangeText={(t) => set({ secondDate: t })}
                />
              </View>
            ) : null}
          </View>

          {/* Supplier invoice ref (purchase) */}
          {isPurchase && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">N° facture fournisseur</Text>
              <TextInput
                className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="Optionnel"
                value={header.supplierInvoiceNumber}
                onChangeText={(t) => set({ supplierInvoiceNumber: t })}
              />
            </View>
          )}

          {/* Status (edit only, like web) */}
          {!isNew && statusOptions.length > 0 && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Statut</Text>
              <View className="flex-row flex-wrap gap-2">
                {statusOptions.map((o) => {
                  const active = header.status === o.value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      onPress={() => set({ status: o.value })}
                      className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-white border border-hairline'}`}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Payment status (invoices, edit only — like web) */}
          {!isNew && showPaymentStatus && paymentStatusOptions.length > 0 && (
            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-semibold text-dark">Statut paiement</Text>
              <View className="flex-row flex-wrap gap-2">
                {paymentStatusOptions.map((o) => {
                  const active = header.paymentStatus === o.value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      onPress={() => set({ paymentStatus: o.value })}
                      className={`rounded-full px-3 py-2 ${active ? 'bg-emerald-600' : 'bg-white border border-hairline'}`}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Notes */}
          <View className="mb-5">
            <Text className="mb-1.5 text-sm font-semibold text-dark">Notes</Text>
            <TextInput
              className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm text-dark"
              placeholderTextColor="#929292"
              placeholder="Optionnel"
              multiline
              value={header.notes}
              onChangeText={(t) => set({ notes: t })}
            />
          </View>

          {/* Lines */}
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-dark">Lignes ({lines.length})</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen((v) => !v)}
              className="flex-row items-center rounded-lg bg-primary-50 px-3 py-2"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ajouter une ligne"
            >
              <Ionicons name="add" size={16} color="#F53E8A" />
              <Text className="ml-1 text-xs font-semibold text-primary">Ajouter</Text>
            </TouchableOpacity>
          </View>

          {pickerOpen && (
            <View className="mb-3 rounded-xl border border-hairline bg-white p-3">
              {!isPurchase && services.length > 0 && (
                <View className="mb-2 flex-row gap-2">
                  {(['products', 'services'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setPickerTab(t)}
                      className={`rounded-full px-3 py-1.5 ${pickerTab === t ? 'bg-primary' : 'bg-softCloud'}`}
                    >
                      <Text className={`text-xs font-semibold ${pickerTab === t ? 'text-white' : 'text-dark'}`}>
                        {t === 'products' ? 'Produits' : 'Services'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View className="mb-2 flex-row items-center rounded-lg border border-hairline bg-pageBg px-3 py-2">
                <Ionicons name="search" size={14} color="#9CA3AF" />
                <TextInput
                  className="ml-2 flex-1 text-sm text-dark"
                  placeholderTextColor="#929292"
                  placeholder="Rechercher…"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>
              {(pickerTab === 'products' ? filteredProducts : []).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => addProduct(p)}
                  className="flex-row items-center border-b border-hairline py-2.5"
                  activeOpacity={0.7}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-[11px] text-grayText">{p.reference}</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color="#F53E8A" />
                </TouchableOpacity>
              ))}
              {(pickerTab === 'services' && !isPurchase ? filteredServices : []).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => addService(s)}
                  className="flex-row items-center border-b border-hairline py-2.5"
                  activeOpacity={0.7}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text className="text-[11px] text-grayText">
                      {s.default_price != null ? `${money(s.default_price)} MAD` : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color="#F53E8A" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {lines.length === 0 ? (
            <View className="mb-3 rounded-xl border border-dashed border-hairline bg-white p-5">
              <Text className="text-center text-sm text-grayText">
                Aucune ligne — ajoutez produits ou services.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {lines.map((l) => (
                <View key={l.key} className="rounded-xl border border-hairline bg-white p-3">
                  <View className="flex-row items-start">
                    <View className="flex-1 pr-2">
                      <TextInput
                        className="p-0 text-sm font-semibold text-dark"
                        value={l.description}
                        onChangeText={(t) => patchLine(l.key, { description: t })}
                        multiline
                      />
                      <Text className="mt-0.5 text-[11px] text-grayText">
                        {l.item_type === 'service' ? 'Service' : 'Produit'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeLine(l.key)}
                      className="h-8 w-8 items-center justify-center rounded-full bg-red-50"
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer la ligne"
                    >
                      <Ionicons name="trash" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  <View className="mt-2.5 flex-row gap-2">
                    <NumInput label="Qté" value={l.quantity} onChange={(n) => patchLine(l.key, { quantity: n })} />
                    <NumInput label={isPurchase ? 'Coût U.' : 'Prix U.'} value={l.unit_price} onChange={(n) => patchLine(l.key, { unit_price: n })} suffix="MAD" />
                  </View>
                  <View className="mt-2 flex-row gap-2">
                    <NumInput label="Remise" value={l.discount} onChange={(n) => patchLine(l.key, { discount: n })} suffix="MAD" />
                    <NumInput label="TVA" value={l.tax_rate} onChange={(n) => patchLine(l.key, { tax_rate: n })} suffix="%" />
                  </View>
                  <View className="mt-2 flex-row justify-end">
                    <Text className="text-sm font-bold text-dark">{money(lineTotal(l))} MAD</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Totals */}
          <View className="mt-4 rounded-xl border border-hairline bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-sm text-grayText">Sous-total HT</Text>
              <Text className="text-sm font-semibold text-dark">{money(totals.subtotal)} MAD</Text>
            </View>
            <View className="mt-1.5 flex-row justify-between">
              <Text className="text-sm text-grayText">Remise</Text>
              <Text className="text-sm font-semibold text-dark">−{money(totals.discount)} MAD</Text>
            </View>
            <View className="mt-1.5 flex-row justify-between">
              <Text className="text-sm text-grayText">TVA</Text>
              <Text className="text-sm font-semibold text-dark">{money(totals.tax)} MAD</Text>
            </View>
            <View className="mt-2.5 flex-row justify-between border-t border-hairline pt-2.5">
              <Text className="text-base font-bold text-dark">Total TTC</Text>
              <Text className="text-base font-bold text-primary">{money(totals.total)} MAD</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onSave(header, lines)}
            disabled={saving}
            className="mt-4 flex-row items-center justify-center rounded-xl bg-primary py-4"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le document"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#ffffff" />
            )}
            <Text className="ml-2 text-sm font-semibold text-white">
              {isNew ? 'Créer le document' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
