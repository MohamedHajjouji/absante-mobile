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
import type { Customer, Quote, Invoice, Payment, CreditNote } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import {
  DocEditor,
  emptyHeader,
  newLineKey,
  type DocKind,
  type EditorHeader,
  type EditorLine,
  type EditorProduct,
  type EditorServiceItem,
} from '@/components/erp/DocEditor';
import {
  getDocItems,
  insertDocWithItems,
  updateDocWithItems,
  cancelDoc,
  deleteDoc,
  nextNumber,
  todayISO,
  plusDaysISO,
  convertQuoteToInvoice,
  creditNoteFromInvoice,
  recordDocPayment,
  type LineInput,
} from '@/lib/services/erp/documents/documents-service';
import { shareInvoicePdf } from '@/lib/services/erp/documents/invoice-pdf';

type Tab = 'customers' | 'quotes' | 'invoices' | 'payments' | 'credit_notes';
type EditorKind = 'quote' | 'invoice' | 'credit_note';

const TABS: { key: Tab; label: string }[] = [
  { key: 'customers', label: 'Clients' },
  { key: 'quotes', label: 'Devis' },
  { key: 'invoices', label: 'Factures' },
  { key: 'payments', label: 'Paiements' },
  { key: 'credit_notes', label: 'Avoirs' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#0D61B6',
  issued: '#0D61B6',
  pending: '#B45309',
  accepted: '#059669',
  paid: '#059669',
  partially_paid: '#B45309',
  unpaid: '#DC2626',
  overdue: '#DC2626',
  completed: '#059669',
  cancelled: '#DC2626',
  rejected: '#DC2626',
  expired: '#6B7280',
};

const QUOTE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
  { value: 'cancelled', label: 'Annulé' },
];

const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'issued', label: 'Émise' },
  { value: 'cancelled', label: 'Annulée' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Impayée' },
  { value: 'partially_paid', label: 'Partielle' },
  { value: 'paid', label: 'Payée' },
  { value: 'overdue', label: 'En retard' },
];

const CN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'issued', label: 'Émis' },
  { value: 'cancelled', label: 'Annulé' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
];

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

function itemRowToLine(r: Record<string, unknown>): EditorLine {
  return {
    key: newLineKey(),
    item_type: r.item_type === 'service' ? 'service' : 'product',
    product_id: (r.product_id as string) ?? null,
    product_unit_id: (r.product_unit_id as string) ?? null,
    service_id: (r.service_id as string) ?? null,
    description: (r.description as string) ?? '',
    reference: (r.reference as string) ?? null,
    quantity: Number(r.quantity ?? 0),
    unit_price: Number((r.unit_price ?? r.unit_cost ?? 0) as number),
    discount: Number(r.discount ?? 0),
    tax_rate: Number(r.tax_rate ?? 0),
  };
}

function lineToInput(l: EditorLine): LineInput {
  return {
    item_type: l.item_type,
    product_id: l.product_id,
    product_unit_id: l.product_unit_id,
    service_id: l.service_id,
    description: l.description,
    reference: l.reference,
    quantity: l.quantity,
    unit_price: l.unit_price,
    discount: l.discount,
    tax_rate: l.tax_rate,
  };
}

const hasContent = (l: EditorLine) =>
  (l.description && l.description.trim()) || l.product_id || l.service_id;

export default function SalesScreen() {
  const [tab, setTab] = useState<Tab>('customers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [products, setProducts] = useState<EditorProduct[]>([]);
  const [services, setServices] = useState<EditorServiceItem[]>([]);

  // Customer form (unchanged CRUD)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ id: '', name: '', phone: '', email: '' });
  const [customerSaving, setCustomerSaving] = useState(false);

  // Document editor
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorHeader, setEditorHeader] = useState<EditorHeader>(emptyHeader());
  const [editorLines, setEditorLines] = useState<EditorLine[]>([]);
  const [editorSaving, setEditorSaving] = useState(false);
  const [acting, setActing] = useState(false);

  // Payment sheet
  const [payOpen, setPayOpen] = useState(false);
  const [payEditId, setPayEditId] = useState<string | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const q = search.trim() || undefined;
        const [c, qt, inv, pay, cn, prods, servs] = await Promise.all([
          erpFetch<Customer>('customers', {
            select: 'id,name,company_name,phone,email,city,is_active',
            search: q ? { query: q, columns: ['name', 'company_name', 'phone', 'email'] } : undefined,
            filters: { is_active: true },
            order: { column: 'name', ascending: true },
            limit: 200,
          }),
          erpFetch<Quote>('quotes', {
            select: 'id,quote_number,customer_id,issue_date,valid_until,status,subtotal,discount,tax,total,notes,terms',
            search: q ? { query: q, columns: ['quote_number'] } : undefined,
            order: { column: 'issue_date', ascending: false },
            limit: 200,
          }),
          erpFetch<Invoice>('invoices', {
            select: 'id,invoice_number,customer_id,quote_id,issue_date,due_date,status,payment_status,subtotal,total,notes',
            search: q ? { query: q, columns: ['invoice_number'] } : undefined,
            order: { column: 'issue_date', ascending: false },
            limit: 200,
          }),
          erpFetch<Payment>('payments', {
            select: 'id,payment_number,invoice_id,payment_date,amount,payment_method,reference,notes',
            search: q ? { query: q, columns: ['payment_number', 'reference'] } : undefined,
            order: { column: 'payment_date', ascending: false },
            limit: 200,
          }),
          erpFetch<CreditNote>('credit_notes', {
            select: 'id,credit_note_number,invoice_id,customer_id,issue_date,reason,status,subtotal,total,notes',
            search: q ? { query: q, columns: ['credit_note_number'] } : undefined,
            order: { column: 'issue_date', ascending: false },
            limit: 200,
          }),
          erpFetch<any>('products', {
            select: 'id,name,reference,product_units(id,selling_price,purchase_price,is_default,unit:units(name,symbol))',
            filters: { is_active: true },
            order: { column: 'name', ascending: true },
            limit: 300,
          }),
          erpFetch<any>('services', {
            select: 'id,name,reference,default_price,tax_rate',
            filters: { is_active: true },
            order: { column: 'name', ascending: true },
            limit: 200,
          }),
        ]);
        setCustomers(c);
        setQuotes(qt);
        setInvoices(inv);
        setPayments(pay);
        setCreditNotes(cn);
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
        setServices(
          servs.map((s: any) => ({
            id: s.id,
            name: s.name,
            reference: s.reference ?? null,
            default_price: s.default_price,
            tax_rate: s.tax_rate,
          }))
        );
      } catch (e) {
        console.error('Sales load', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

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

  const customerName = (id?: string | null) =>
    customers.find((c) => c.id === id)?.name ?? '—';

  const money = (v: number) =>
    new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(v ?? 0);

  // ── Customers (CRUD, as before) ────────────────────────────

  const openCustomerModal = (id?: string) => {
    if (id) {
      const c = customers.find((x) => x.id === id);
      if (c) setCustomerForm({ id: c.id, name: c.name, phone: c.phone ?? '', email: c.email ?? '' });
    } else {
      setCustomerForm({ id: '', name: '', phone: '', email: '' });
    }
    setShowCustomerModal(true);
  };

  const handleCustomerSave = async () => {
    if (!customerForm.name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }
    setCustomerSaving(true);
    const payload = {
      customer_type: 'individual',
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || null,
      email: customerForm.email.trim() || null,
      is_active: true,
    };
    const res = customerForm.id
      ? await erpUpdate('customers', customerForm.id, payload)
      : await erpInsert('customers', payload);
    setCustomerSaving(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.message ?? 'Erreur inconnue.');
      return;
    }
    setShowCustomerModal(false);
    load();
  };

  // ── Document editor open/save ──────────────────────────────

  const partnerList = customers.map((c) => ({
    id: c.id,
    name: c.name,
    sub: [c.phone, c.city].filter(Boolean).join(' · '),
  }));

  const openCreate = (kind: EditorKind) => {
    const h = emptyHeader();
    if (kind === 'quote') h.secondDate = plusDaysISO(30);
    setEditorKind(kind);
    setEditingId(null);
    setEditorTitle(kind === 'quote' ? 'Nouveau devis' : kind === 'invoice' ? 'Nouvelle facture' : 'Nouvel avoir');
    setEditorHeader(h);
    setEditorLines([]);
  };

  const openEdit = async (kind: EditorKind, doc: Quote | Invoice | CreditNote) => {
    setActing(true);
    try {
      const itemTable =
        kind === 'quote' ? 'quote_items' : kind === 'invoice' ? 'invoice_items' : 'credit_note_items';
      const rows = await getDocItems<Record<string, unknown>>(itemTable, doc.id);
      const h = emptyHeader();
      if (kind === 'quote') {
        const q = doc as Quote;
        h.partnerId = q.customer_id;
        h.issueDate = q.issue_date;
        h.secondDate = q.valid_until ?? '';
        h.notes = q.notes ?? '';
        h.status = q.status;
        setEditorTitle(q.quote_number);
      } else if (kind === 'invoice') {
        const inv = doc as Invoice;
        h.partnerId = inv.customer_id;
        h.issueDate = inv.issue_date;
        h.secondDate = inv.due_date ?? '';
        h.notes = inv.notes ?? '';
        h.status = inv.status;
        h.paymentStatus = inv.payment_status ?? 'unpaid';
        setEditorTitle(inv.invoice_number);
      } else {
        const cn = doc as CreditNote;
        h.partnerId = cn.customer_id;
        h.issueDate = cn.issue_date;
        h.invoiceId = cn.invoice_id;
        h.reason = cn.reason ?? '';
        h.notes = cn.notes ?? '';
        h.status = cn.status;
        setEditorTitle(cn.credit_note_number);
      }
      setEditorKind(kind);
      setEditingId(doc.id);
      setEditorHeader(h);
      setEditorLines(rows.map(itemRowToLine));
    } finally {
      setActing(false);
    }
  };

  const handleEditorSave = async (header: EditorHeader, lines: EditorLine[]) => {
    if (!editorKind) return;
    if (!header.partnerId) {
      Alert.alert('Erreur', 'Le client est requis.');
      return;
    }
    const items = lines.filter(hasContent).map(lineToInput);
    if (items.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une ligne.');
      return;
    }
    if (editorKind === 'credit_note' && editingId === null) {
      if (!header.invoiceId) {
        Alert.alert('Erreur', 'La facture d’origine est requise.');
        return;
      }
      if (!header.reason.trim()) {
        Alert.alert('Erreur', 'Le motif est requis.');
        return;
      }
    }
    setEditorSaving(true);
    try {
      let res: { ok: boolean; message?: string };
      if (editorKind === 'quote') {
        if (editingId) {
          res = await updateDocWithItems('quotes', 'quote_items', editingId, {
            status: header.status,
            valid_until: header.secondDate || null,
            notes: header.notes || null,
          }, items);
        } else {
          const number = await nextNumber('quote');
          if (!number) {
            Alert.alert('Erreur', 'Impossible de générer le numéro de devis.');
            return;
          }
          res = await insertDocWithItems('quotes', 'quote_items', {
            quote_number: number,
            customer_id: header.partnerId,
            issue_date: header.issueDate || todayISO(),
            valid_until: header.secondDate || null,
            status: 'draft',
            notes: header.notes || null,
          }, items);
        }
      } else if (editorKind === 'invoice') {
        if (editingId) {
          res = await updateDocWithItems('invoices', 'invoice_items', editingId, {
            status: header.status,
            payment_status: header.paymentStatus,
            due_date: header.secondDate || null,
            notes: header.notes || null,
          }, items);
        } else {
          const number = await nextNumber('invoice');
          if (!number) {
            Alert.alert('Erreur', 'Impossible de générer le numéro de facture.');
            return;
          }
          res = await insertDocWithItems('invoices', 'invoice_items', {
            invoice_number: number,
            customer_id: header.partnerId,
            issue_date: header.issueDate || todayISO(),
            due_date: header.secondDate || null,
            status: 'draft',
            payment_status: 'unpaid',
            notes: header.notes || null,
          }, items);
        }
      } else {
        if (editingId) {
          res = await updateDocWithItems('credit_notes', 'credit_note_items', editingId, {
            status: header.status,
            notes: header.notes || null,
          }, items);
        } else {
          const number = await nextNumber('credit_note');
          if (!number) {
            Alert.alert('Erreur', "Impossible de générer le numéro d'avoir.");
            return;
          }
          res = await insertDocWithItems('credit_notes', 'credit_note_items', {
            credit_note_number: number,
            invoice_id: header.invoiceId,
            customer_id: header.partnerId,
            issue_date: header.issueDate || todayISO(),
            reason: header.reason.trim(),
            status: 'draft',
            notes: header.notes || null,
          }, items);
        }
      }
      if (!res.ok) {
        Alert.alert('Erreur', res.message ?? 'Enregistrement impossible.');
        return;
      }
      setEditorKind(null);
      load();
    } finally {
      setEditorSaving(false);
    }
  };

  // ── Row actions (mirror web buttons) ───────────────────────

  const runAct = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setActing(true);
    try {
      const res = await fn();
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Action impossible.');
      else load();
    } finally {
      setActing(false);
    }
  };

  const quoteMenu = (q: Quote) => {
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    if (q.status === 'draft') {
      buttons.push({ text: 'Envoyer', onPress: () => runAct(async () => {
        const r = await erpUpdate('quotes', q.id, { status: 'sent' });
        return { ok: r.ok, message: r.message };
      }) });
    }
    if (q.status === 'draft' || q.status === 'sent') {
      buttons.push({ text: 'Convertir en facture', onPress: () => convertQuote(q) });
    }
    if (q.status !== 'cancelled') {
      buttons.push({ text: 'Annuler', onPress: () => runAct(() => cancelDoc('quotes', q.id)) });
    }
    buttons.push({ text: 'Supprimer définitivement', style: 'destructive', onPress: () => runAct(() => deleteDoc('quotes', q.id)) });
    buttons.push({ text: 'Fermer', style: 'cancel' });
    Alert.alert(q.quote_number, 'Actions', buttons);
  };

  const convertQuote = async (q: Quote) => {
    setActing(true);
    try {
      const rows = await getDocItems<Record<string, unknown>>('quote_items', q.id);
      const res = await convertQuoteToInvoice(
        { id: q.id, customer_id: q.customer_id, valid_until: q.valid_until, notes: q.notes, terms: q.terms },
        rows.map(itemRowToLine).filter(hasContent).map(lineToInput)
      );
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Conversion impossible.');
      else {
        Alert.alert('Succès', 'Facture créée depuis le devis.');
        load();
      }
    } finally {
      setActing(false);
    }
  };

  const exportPdf = async (inv: Invoice) => {
    setActing(true);
    try {
      const res = await shareInvoicePdf(inv.id);
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Export impossible.');
    } finally {
      setActing(false);
    }
  };

  const invoiceMenu = (inv: Invoice) => {
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    buttons.push({ text: 'Exporter PDF', onPress: () => exportPdf(inv) });
    if (inv.status === 'draft') {
      buttons.push({ text: 'Émettre', onPress: () => runAct(async () => {
        const r = await erpUpdate('invoices', inv.id, { status: 'issued' });
        return { ok: r.ok, message: r.message };
      }) });
    }
    if (inv.status === 'issued' && inv.payment_status !== 'paid') {
      buttons.push({ text: 'Encaisser (total)', onPress: () => quickPay(inv) });
    }
    if (inv.payment_status !== 'paid') {
      buttons.push({ text: 'Créer un avoir', onPress: () => creditFromInvoice(inv) });
    }
    if (inv.status !== 'cancelled') {
      buttons.push({ text: 'Annuler', onPress: () => runAct(() => cancelDoc('invoices', inv.id)) });
    }
    buttons.push({ text: 'Supprimer définitivement', style: 'destructive', onPress: () => runAct(() => deleteDoc('invoices', inv.id)) });
    buttons.push({ text: 'Fermer', style: 'cancel' });
    Alert.alert(inv.invoice_number, 'Actions', buttons);
  };

  const quickPay = async (inv: Invoice) => {
    setActing(true);
    try {
      const res = await recordDocPayment({
        invoiceId: inv.id,
        invoiceTotal: Number(inv.total ?? 0),
        amount: Number(inv.total ?? 0),
        method: 'cash',
      });
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Paiement impossible.');
      else load();
    } finally {
      setActing(false);
    }
  };

  const creditFromInvoice = async (inv: Invoice) => {
    setActing(true);
    try {
      const rows = await getDocItems<Record<string, unknown>>('invoice_items', inv.id);
      const res = await creditNoteFromInvoice(
        { id: inv.id, invoice_number: inv.invoice_number, customer_id: inv.customer_id },
        rows.map(itemRowToLine).filter(hasContent).map(lineToInput)
      );
      if (!res.ok) Alert.alert('Erreur', res.message ?? 'Avoir impossible.');
      else {
        await erpUpdate('invoices', inv.id, { status: 'cancelled' });
        Alert.alert('Succès', 'Avoir créé, facture annulée.');
        load();
      }
    } finally {
      setActing(false);
    }
  };

  const cnMenu = (cn: CreditNote) => {
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    if (cn.status === 'draft') {
      buttons.push({ text: 'Émettre', onPress: () => runAct(async () => {
        const r = await erpUpdate('credit_notes', cn.id, { status: 'issued' });
        return { ok: r.ok, message: r.message };
      }) });
    }
    if (cn.status !== 'cancelled') {
      buttons.push({ text: 'Annuler', onPress: () => runAct(() => cancelDoc('credit_notes', cn.id)) });
    }
    buttons.push({ text: 'Supprimer définitivement', style: 'destructive', onPress: () => runAct(() => deleteDoc('credit_notes', cn.id)) });
    buttons.push({ text: 'Fermer', style: 'cancel' });
    Alert.alert(cn.credit_note_number, 'Actions', buttons);
  };

  // ── Payments ───────────────────────────────────────────────

  const openPayCreate = (invoiceId?: string) => {
    const inv = invoices.find((i) => i.id === (invoiceId ?? ''));
    setPayEditId(null);
    setPayInvoiceId(invoiceId ?? '');
    setPayAmount(inv ? String(inv.total ?? '') : '');
    setPayMethod('cash');
    setPayRef('');
    setPayNotes('');
    setPayOpen(true);
  };

  const openPayEdit = (p: Payment) => {
    setPayEditId(p.id);
    setPayInvoiceId(p.invoice_id);
    setPayAmount(String(p.amount ?? ''));
    setPayMethod(p.payment_method ?? 'cash');
    setPayRef(p.reference ?? '');
    setPayNotes((p as unknown as { notes?: string }).notes ?? '');
    setPayOpen(true);
  };

  const handlePaySave = async () => {
    const amount = Number(String(payAmount).replace(',', '.'));
    if (!payInvoiceId) {
      Alert.alert('Erreur', 'Choisissez une facture.');
      return;
    }
    if (!(amount > 0)) {
      Alert.alert('Erreur', 'Montant invalide.');
      return;
    }
    setPaySaving(true);
    try {
      if (payEditId) {
        const res = await erpUpdate('payments', payEditId, {
          amount,
          payment_method: payMethod,
          reference: payRef.trim() || null,
          notes: payNotes.trim() || null,
        });
        if (!res.ok) {
          Alert.alert('Erreur', res.message ?? 'Enregistrement impossible.');
          return;
        }
      } else {
        const inv = invoices.find((i) => i.id === payInvoiceId);
        const res = await recordDocPayment({
          invoiceId: payInvoiceId,
          invoiceTotal: Number(inv?.total ?? amount),
          amount,
          method: payMethod,
          reference: payRef.trim() || null,
          notes: payNotes.trim() || null,
        });
        if (!res.ok) {
          Alert.alert('Erreur', res.message ?? 'Enregistrement impossible.');
          return;
        }
      }
      setPayOpen(false);
      load();
    } finally {
      setPaySaving(false);
    }
  };

  const payMenu = (p: Payment) => {
    Alert.alert(p.payment_number, 'Actions', [
      { text: 'Modifier', onPress: () => openPayEdit(p) },
      { text: 'Supprimer', style: 'destructive', onPress: () => runAct(() => deleteDoc('payments', p.id)) },
      { text: 'Fermer', style: 'cancel' },
    ]);
  };

  const openInvoicesForPicker = invoices.filter((i) => i.payment_status !== 'paid');

  const editorInvoices = invoices.map((i) => ({
    id: i.id,
    number: i.invoice_number,
    partnerId: i.customer_id,
  }));

  const editorStatusOptions =
    editorKind === 'quote' ? QUOTE_STATUS_OPTIONS : editorKind === 'invoice' ? INVOICE_STATUS_OPTIONS : CN_STATUS_OPTIONS;

  const fabAction =
    tab === 'customers' ? () => openCustomerModal()
    : tab === 'quotes' ? () => openCreate('quote')
    : tab === 'invoices' ? () => openCreate('invoice')
    : tab === 'credit_notes' ? () => openCreate('credit_note')
    : () => openPayCreate();

  const fabLabel =
    tab === 'customers' ? 'Nouveau client'
    : tab === 'quotes' ? 'Nouveau devis'
    : tab === 'invoices' ? 'Nouvelle facture'
    : tab === 'credit_notes' ? 'Nouvel avoir'
    : 'Nouveau paiement';

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ventes',
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
                {TABS.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    className={`rounded-full px-4 py-2 ${tab === t.key ? 'bg-primary' : 'bg-white border border-hairline'}`}
                    activeOpacity={0.8}
                  >
                    <Text className={`text-xs font-semibold ${tab === t.key ? 'text-white' : 'text-dark'}`}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />}
          >
            {tab === 'customers' &&
              (customers.length === 0 ? (
                <ErpEmptyState icon="people" title="Aucun client" subtitle="Créez votre premier client pour facturer." actionLabel="Nouveau client" onAction={() => openCustomerModal()} />
              ) : (
                <View className="gap-2.5">
                  {customers.map((c) => (
                    <TouchableOpacity key={c.id} onPress={() => openCustomerModal(c.id)} className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                        <Ionicons name="person" size={18} color="#8B5CF6" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>{c.name}</Text>
                        <Text className="mt-0.5 text-xs text-grayText">{[c.phone, c.city].filter(Boolean).join(' · ') || '—'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

            {tab === 'quotes' &&
              (quotes.length === 0 ? (
                <ErpEmptyState icon="document-text" title="Aucun devis" subtitle="Créez votre premier devis avec lignes." actionLabel="Nouveau devis" onAction={() => openCreate('quote')} />
              ) : (
                <View className="gap-2.5">
                  {quotes.map((x) => (
                    <TouchableOpacity key={x.id} onPress={() => openEdit('quote', x)} className="rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>{x.quote_number}</Text>
                        <StatusPill status={x.status} />
                      </View>
                      <Text className="mt-1 text-xs text-grayText" numberOfLines={1}>{customerName(x.customer_id)} · {x.issue_date ?? ''}</Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-dark">{money(x.total)} MAD</Text>
                        <View className="flex-row items-center gap-1">
                          {(x.status === 'draft' || x.status === 'sent') && (
                            <TouchableOpacity onPress={() => convertQuote(x)} className="flex-row items-center rounded-lg bg-emerald-50 px-2.5 py-1.5" accessibilityLabel="Convertir en facture">
                              <Ionicons name="receipt" size={14} color="#059669" />
                              <Text className="ml-1 text-[11px] font-semibold text-emerald-700">Facturer</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => quoteMenu(x)} className="h-8 w-8 items-center justify-center rounded-lg bg-softCloud" accessibilityLabel="Actions devis">
                            <Ionicons name="ellipsis-horizontal" size={16} color="#3D4B64" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

            {tab === 'invoices' &&
              (invoices.length === 0 ? (
                <ErpEmptyState icon="receipt" title="Aucune facture" subtitle="Créez votre première facture avec lignes." actionLabel="Nouvelle facture" onAction={() => openCreate('invoice')} />
              ) : (
                <View className="gap-2.5">
                  {invoices.map((x) => (
                    <TouchableOpacity key={x.id} onPress={() => openEdit('invoice', x)} className="rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>{x.invoice_number}</Text>
                        <StatusPill status={x.payment_status || x.status} />
                      </View>
                      <Text className="mt-1 text-xs text-grayText" numberOfLines={1}>{customerName(x.customer_id)} · {x.issue_date ?? ''}</Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-dark">{money(x.total)} MAD</Text>
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity onPress={() => exportPdf(x)} className="h-8 w-8 items-center justify-center rounded-lg bg-primary-50" accessibilityLabel="Exporter PDF">
                            <Ionicons name="print" size={15} color="#F53E8A" />
                          </TouchableOpacity>
                          {x.status === 'issued' && x.payment_status !== 'paid' && (
                            <TouchableOpacity onPress={() => quickPay(x)} className="flex-row items-center rounded-lg bg-emerald-50 px-2.5 py-1.5" accessibilityLabel="Encaisser">
                              <Ionicons name="cash" size={14} color="#059669" />
                              <Text className="ml-1 text-[11px] font-semibold text-emerald-700">Encaisser</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => invoiceMenu(x)} className="h-8 w-8 items-center justify-center rounded-lg bg-softCloud" accessibilityLabel="Actions facture">
                            <Ionicons name="ellipsis-horizontal" size={16} color="#3D4B64" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

            {tab === 'payments' &&
              (payments.length === 0 ? (
                <ErpEmptyState icon="card" title="Aucun paiement" subtitle="Enregistrez un règlement sur une facture." actionLabel="Nouveau paiement" onAction={() => openPayCreate()} />
              ) : (
                <View className="gap-2.5">
                  {payments.map((x) => (
                    <TouchableOpacity key={x.id} onPress={() => openPayEdit(x)} className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                        <Ionicons name="cash" size={18} color="#059669" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-semibold text-dark" numberOfLines={1}>{x.payment_number}</Text>
                        <Text className="mt-0.5 text-xs text-grayText">{x.payment_date ?? ''} · {x.payment_method}</Text>
                      </View>
                      <Text className="mr-2 text-sm font-bold text-emerald-600">+{money(x.amount)}</Text>
                      <TouchableOpacity onPress={() => payMenu(x)} className="h-8 w-8 items-center justify-center rounded-lg bg-softCloud" accessibilityLabel="Actions paiement">
                        <Ionicons name="ellipsis-horizontal" size={16} color="#3D4B64" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

            {tab === 'credit_notes' &&
              (creditNotes.length === 0 ? (
                <ErpEmptyState icon="return-up-back" title="Aucun avoir" subtitle="Créez un avoir depuis une facture." actionLabel="Nouvel avoir" onAction={() => openCreate('credit_note')} />
              ) : (
                <View className="gap-2.5">
                  {creditNotes.map((x) => (
                    <TouchableOpacity key={x.id} onPress={() => openEdit('credit_note', x)} className="rounded-xl border border-hairline bg-white p-3.5" activeOpacity={0.8}>
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-dark" numberOfLines={1}>{x.credit_note_number}</Text>
                        <StatusPill status={x.status} />
                      </View>
                      <Text className="mt-1 text-xs text-grayText" numberOfLines={1}>{customerName(x.customer_id)} · {x.reason ?? ''}</Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-dark">{money(x.total)} MAD</Text>
                        <TouchableOpacity onPress={() => cnMenu(x)} className="h-8 w-8 items-center justify-center rounded-lg bg-softCloud" accessibilityLabel="Actions avoir">
                          <Ionicons name="ellipsis-horizontal" size={16} color="#3D4B64" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
          </ScrollView>

          <TouchableOpacity onPress={fabAction} className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill" activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={fabLabel}>
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Customer sheet */}
      <ErpBottomSheet visible={showCustomerModal} onClose={() => setShowCustomerModal(false)} title={customerForm.id ? 'Modifier le client' : 'Nouveau client'}>
        <Text className="mb-1.5 text-sm font-medium text-dark">Nom *</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Ex. : Fatima Zahra" value={customerForm.name} onChangeText={(t) => setCustomerForm((f) => ({ ...f, name: t }))} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Téléphone</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="06 XX XX XX XX" keyboardType="phone-pad" value={customerForm.phone} onChangeText={(t) => setCustomerForm((f) => ({ ...f, phone: t }))} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Email</Text>
        <TextInput className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="client@exemple.ma" keyboardType="email-address" autoCapitalize="none" value={customerForm.email} onChangeText={(t) => setCustomerForm((f) => ({ ...f, email: t }))} />
        <TouchableOpacity onPress={handleCustomerSave} disabled={customerSaving} className="flex-row items-center justify-center rounded-lg bg-primary py-4" activeOpacity={0.8}>
          {customerSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
        {customerForm.id ? (
          <TouchableOpacity onPress={async () => {
            const res = await erpDeactivate('customers', customerForm.id);
            if (!res.ok) Alert.alert('Erreur', res.message ?? 'Impossible de désactiver.');
            else { setShowCustomerModal(false); load(); }
          }} className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5">
            <Text className="text-sm font-semibold text-[#c13515]">Désactiver</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>

      {/* Document editor */}
      {editorKind && (
        <DocEditor
          visible={!!editorKind}
          kind={editorKind as DocKind}
          title={editorTitle}
          subtitle={editingId ? 'Modifier — lignes incluses' : 'Brouillon — lignes incluses'}
          isNew={!editingId}
          partners={partnerList}
          partnerLabel="Client"
          invoices={editorInvoices}
          products={products}
          services={services}
          initialHeader={editorHeader}
          initialLines={editorLines}
          statusOptions={editorStatusOptions}
          showPaymentStatus={editorKind === 'invoice'}
          paymentStatusOptions={PAYMENT_STATUS_OPTIONS}
          secondDateLabel={editorKind === 'quote' ? "Validité jusqu'au" : editorKind === 'invoice' ? 'Échéance' : ''}
          saving={editorSaving}
          onClose={() => setEditorKind(null)}
          onSave={handleEditorSave}
        />
      )}

      {/* Payment sheet */}
      <ErpBottomSheet visible={payOpen} onClose={() => setPayOpen(false)} title={payEditId ? 'Modifier le paiement' : 'Nouveau paiement'}>
        {!payEditId && (
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-dark">Facture *</Text>
            <View className="gap-1.5">
              {openInvoicesForPicker.slice(0, 15).map((inv) => {
                const active = payInvoiceId === inv.id;
                return (
                  <TouchableOpacity key={inv.id} onPress={() => { setPayInvoiceId(inv.id); setPayAmount(String(inv.total ?? '')); }} className={`rounded-lg border px-3 py-2.5 ${active ? 'border-primary bg-primary-50' : 'border-hairline bg-white'}`} activeOpacity={0.8}>
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark'}`} numberOfLines={1}>{inv.invoice_number}</Text>
                      <Text className="text-xs font-bold text-dark">{money(inv.total)} MAD</Text>
                    </View>
                    <Text className="text-[11px] text-grayText">{customerName(inv.customer_id)} · {inv.payment_status}</Text>
                  </TouchableOpacity>
                );
              })}
              {openInvoicesForPicker.length === 0 && (
                <Text className="text-sm text-grayText">Aucune facture impayée.</Text>
              )}
            </View>
          </View>
        )}
        <Text className="mb-1.5 text-sm font-medium text-dark">Montant (MAD) *</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Ex. : 500" keyboardType="decimal-pad" value={payAmount} onChangeText={setPayAmount} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Moyen de paiement</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const active = payMethod === m.value;
            return (
              <TouchableOpacity key={m.value} onPress={() => setPayMethod(m.value)} className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-white border border-hairline'}`} activeOpacity={0.8}>
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text className="mb-1.5 text-sm font-medium text-dark">Référence</Text>
        <TextInput className="mb-4 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Optionnel" value={payRef} onChangeText={setPayRef} />
        <Text className="mb-1.5 text-sm font-medium text-dark">Notes</Text>
        <TextInput className="mb-5 rounded-lg border border-hairline bg-white px-4 py-3.5 text-sm font-medium text-dark" placeholderTextColor="#929292" placeholder="Optionnel" value={payNotes} onChangeText={setPayNotes} />
        <TouchableOpacity onPress={handlePaySave} disabled={paySaving} className="flex-row items-center justify-center rounded-lg bg-primary py-4" activeOpacity={0.8}>
          {paySaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="checkmark" size={18} color="#ffffff" />}
          <Text className="ml-2 text-sm font-semibold text-white">Enregistrer</Text>
        </TouchableOpacity>
        {payEditId ? (
          <TouchableOpacity onPress={() => { setPayOpen(false); const p = payments.find((x) => x.id === payEditId); if (p) payMenu(p); }} className="mt-3 items-center rounded-lg border border-red-100 bg-red-50 py-3.5">
            <Text className="text-sm font-semibold text-[#c13515]">Supprimer…</Text>
          </TouchableOpacity>
        ) : null}
      </ErpBottomSheet>

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
