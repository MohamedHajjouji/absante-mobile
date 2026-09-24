/**
 * Document headers + line items — mobile port of web `erpInsertWithItems` /
 * `erpUpdateWithItems` (`web app/src/lib/erp/actions.ts`).
 *
 * Same math, same flow, same column names:
 * - header inserted with zeroed totals, items inserted with the doc FK,
 *   then computed totals written back onto the header;
 * - update = delete existing items, insert new ones, recompute totals;
 * - purchase lines use `unit_cost` (+ auto-created product units);
 * - invoice lines always carry a `reference`.
 */

import { supabase } from '@/lib/supabase';
import { ERP_SCHEMA } from '@/lib/erp/constants';
import { erpDelete } from '@/lib/erp/client';
import { nextDocNumber } from '@/lib/services/erp/doc-number';
import type { DocumentType } from '@/lib/erp/constants';

export type DocTable = 'quotes' | 'invoices' | 'credit_notes' | 'purchases';
export type DocItemTable = 'quote_items' | 'invoice_items' | 'credit_note_items' | 'purchase_items';

const FK_BY_ITEM_TABLE: Record<DocItemTable, string> = {
  quote_items: 'quote_id',
  invoice_items: 'invoice_id',
  credit_note_items: 'credit_note_id',
  purchase_items: 'purchase_id',
};

export interface LineInput {
  item_type?: string;
  product_id?: string | null;
  product_unit_id?: string | null;
  service_id?: string | null;
  description?: string;
  reference?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export interface DocTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Exact port of web `itemTotals`. */
export function computeDocTotals(items: LineInput[]): DocTotals {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let total = 0;
  for (const it of items) {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    const d = Number(it.discount) || 0;
    const t = Number(it.tax_rate) || 0;
    const net = Math.max(q * p - d, 0);
    subtotal += q * p;
    discount += d;
    tax += net * (t / 100);
    total += net + net * (t / 100);
  }
  return { subtotal: r2(subtotal), discount: r2(discount), tax: r2(tax), total: r2(total) };
}

export function lineTotal(it: LineInput): number {
  const q = Number(it.quantity) || 0;
  const p = Number(it.unit_price) || 0;
  const d = Number(it.discount) || 0;
  const t = Number(it.tax_rate) || 0;
  return Math.round((Math.max(q * p - d, 0) * (1 + t / 100) + Number.EPSILON) * 100) / 100;
}

function db() {
  return supabase.schema(ERP_SCHEMA);
}

/** Line items of a document, oldest first. */
export async function getDocItems<T = Record<string, unknown>>(
  itemTable: DocItemTable,
  docId: string
): Promise<T[]> {
  try {
    const fk = FK_BY_ITEM_TABLE[itemTable];
    let q = db().from(itemTable).select('*').eq(fk, docId);
    q = itemTable === 'purchase_items'
      ? q.order('created_at', { ascending: true })
      : q.order('sort_order', { ascending: true });
    const { data, error } = await q;
    if (error) {
      console.error('getDocItems', itemTable, error);
      return [];
    }
    return (data ?? []) as T[];
  } catch (e) {
    console.error('getDocItems', itemTable, e);
    return [];
  }
}

/**
 * Guarantees every purchase line that references a product also references a
 * `product_units` row (creates a default one when missing). Port of web
 * `ensurePurchaseUnits`.
 */
async function ensurePurchaseUnits(items: LineInput[]): Promise<LineInput[]> {
  const needsUnit = items.filter((it) => it.product_id && !it.product_unit_id);
  if (needsUnit.length === 0) return items;

  const { data: existingUnits } = await db()
    .from('units')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  let defaultUnitId = (existingUnits?.[0] as { id: string } | undefined)?.id;
  if (!defaultUnitId) {
    const { data: newUnit, error: unitError } = await db()
      .from('units')
      .insert({ name: 'Unité', symbol: 'U', is_active: true })
      .select('id')
      .single();
    if (unitError) throw new Error(unitError.message);
    defaultUnitId = (newUnit as { id: string }).id;
  }

  const productIds = [...new Set(needsUnit.map((it) => it.product_id).filter(Boolean))] as string[];
  const { data: existingProductUnits } = await db()
    .from('product_units')
    .select('id, product_id')
    .in('product_id', productIds);

  const withUnit = new Set(((existingProductUnits ?? []) as { product_id: string }[]).map((pu) => pu.product_id));
  for (const productId of productIds.filter((id) => !withUnit.has(id))) {
    const price = needsUnit.find((it) => it.product_id === productId)?.unit_price ?? 0;
    const { error: puError } = await db().from('product_units').insert({
      product_id: productId,
      unit_id: defaultUnitId,
      conversion_factor: 1,
      purchase_price: price || null,
      selling_price: null,
      is_purchase_unit: true,
      is_sale_unit: false,
      is_default: true,
    });
    if (puError) throw new Error(puError.message);
  }

  const { data: allProductUnits } = await db()
    .from('product_units')
    .select('id, product_id')
    .in('product_id', productIds);
  const unitByProduct = new Map<string, string>();
  for (const pu of ((allProductUnits ?? []) as { id: string; product_id: string }[])) {
    if (!unitByProduct.has(pu.product_id)) unitByProduct.set(pu.product_id, pu.id);
  }
  return items.map((it) => ({
    ...it,
    product_unit_id: it.product_unit_id || (it.product_id ? unitByProduct.get(it.product_id) ?? null : null),
  }));
}

function toItemRows(itemTable: DocItemTable, items: LineInput[]): Record<string, unknown>[] {
  return items.map((it, i) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    const d = Number(it.discount) || 0;
    const t = Number(it.tax_rate) || 0;
    const total = lineTotal(it);
    if (itemTable === 'purchase_items') {
      return {
        product_id: it.product_id || null,
        product_unit_id: it.product_unit_id || null,
        batch_id: null,
        quantity: q,
        unit_cost: p,
        discount: d,
        tax_rate: t,
        total,
      };
    }
    const row: Record<string, unknown> = {
      item_type: it.item_type || 'product',
      product_id: it.product_id || null,
      product_unit_id: it.product_unit_id || null,
      service_id: it.service_id || null,
      description: it.description || '',
      quantity: q,
      unit_price: p,
      discount: d,
      tax_rate: t,
      total,
      sort_order: i,
    };
    if (itemTable === 'invoice_items') {
      row.reference = (it.reference || it.description || '').trim() || '—';
    }
    return row;
  });
}

/** Port of web `erpInsertWithItems`. */
export async function insertDocWithItems(
  table: DocTable,
  itemTable: DocItemTable,
  values: Record<string, unknown>,
  items: LineInput[]
): Promise<{ ok: boolean; id?: string; message?: string }> {
  try {
    const { data, error } = await db()
      .from(table)
      .insert({ subtotal: 0, discount: 0, tax: 0, total: 0, ...values })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };

    const headerId = (data as { id: string }).id;
    const fk = FK_BY_ITEM_TABLE[itemTable];

    let safeItems = items;
    if (itemTable === 'purchase_items') {
      try {
        safeItems = await ensurePurchaseUnits(items);
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Failed to ensure product units' };
      }
    }

    const rows = toItemRows(itemTable, safeItems);
    if (rows.length > 0) {
      const { error: itemsError } = await db()
        .from(itemTable)
        .insert(rows.map((r) => ({ ...r, [fk]: headerId })));
      if (itemsError) return { ok: false, message: itemsError.message };
    }

    const totals = computeDocTotals(safeItems);
    const { error: totalsError } = await db().from(table).update(totals).eq('id', headerId);
    if (totalsError) return { ok: false, message: totalsError.message };
    return { ok: true, id: headerId };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Insert with items failed' };
  }
}

/** Port of web `erpUpdateWithItems`. */
export async function updateDocWithItems(
  table: DocTable,
  itemTable: DocItemTable,
  id: string,
  values: Record<string, unknown>,
  items: LineInput[]
): Promise<{ ok: boolean; id?: string; message?: string }> {
  try {
    const fk = FK_BY_ITEM_TABLE[itemTable];
    const { error: deleteError } = await db().from(itemTable).delete().eq(fk, id);
    if (deleteError) return { ok: false, message: deleteError.message };

    let safeItems = items;
    if (itemTable === 'purchase_items') {
      try {
        safeItems = await ensurePurchaseUnits(items);
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Failed to ensure product units' };
      }
    }

    const rows = toItemRows(itemTable, safeItems);
    if (rows.length > 0) {
      const { error: itemsError } = await db()
        .from(itemTable)
        .insert(rows.map((r) => ({ ...r, [fk]: id })));
      if (itemsError) return { ok: false, message: itemsError.message };
    }

    const totals = computeDocTotals(safeItems);
    const { error } = await db().from(table).update({ ...values, ...totals }).eq('id', id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Update with items failed' };
  }
}

/** Soft-cancel a document (status = cancelled). Hard delete via `deleteDoc`. */
export async function cancelDoc(
  table: DocTable,
  id: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const { error } = await db().from(table).update({ status: 'cancelled' }).eq('id', id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Cancel failed' };
  }
}

export async function deleteDoc(
  table: 'quotes' | 'invoices' | 'credit_notes' | 'purchases' | 'payments',
  id: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDelete(table, id);
  return { ok: res.ok, message: res.message };
}

/** Next sequential number via the atomic RPC (null when unavailable). */
export async function nextNumber(type: DocumentType): Promise<string | null> {
  return nextDocNumber(type);
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function plusDaysISO(days: number, from?: string): string {
  const base = from ? new Date(from) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
}

// ── Quote → invoice conversion (port of web `handleConvertToInvoice`) ──

export async function convertQuoteToInvoice(
  quote: { id: string; customer_id: string; valid_until?: string | null; notes?: string | null; terms?: string | null },
  items: LineInput[]
): Promise<{ ok: boolean; id?: string; message?: string }> {
  const invoiceNumber = await nextNumber('invoice');
  if (!invoiceNumber) return { ok: false, message: 'Impossible de générer le numéro de facture.' };
  return insertDocWithItems(
    'invoices',
    'invoice_items',
    {
      invoice_number: invoiceNumber,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      issue_date: todayISO(),
      due_date: quote.valid_until || undefined,
      status: 'draft',
      payment_status: 'unpaid',
      notes: quote.notes || undefined,
      terms: quote.terms || undefined,
    },
    items
  );
}

// ── Invoice → automatic credit note (port of web `handleCreditNote`) ────

export async function creditNoteFromInvoice(
  invoice: { id: string; invoice_number: string; customer_id: string },
  items: LineInput[]
): Promise<{ ok: boolean; id?: string; message?: string }> {
  const cnNumber = await nextNumber('credit_note');
  if (!cnNumber) return { ok: false, message: "Impossible de générer le numéro d'avoir." };
  const res = await insertDocWithItems(
    'credit_notes',
    'credit_note_items',
    {
      credit_note_number: cnNumber,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      issue_date: todayISO(),
      reason: 'Avoir automatique sur facture ' + invoice.invoice_number,
      status: 'draft',
    },
    items
  );
  return res;
}

// ── Payment recording (port of web PaymentsClient + quick "Encaisser") ──

export interface RecordPaymentInput {
  invoiceId: string;
  invoiceTotal: number;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

export async function recordDocPayment(
  input: RecordPaymentInput
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.invoiceId || !(input.amount > 0)) {
    return { ok: false, message: 'Facture et montant sont requis.' };
  }
  const paymentNumber = await nextNumber('payment');
  if (!paymentNumber) return { ok: false, message: 'Impossible de générer le numéro de règlement.' };
  try {
    const { data, error } = await db()
      .from('payments')
      .insert({
        invoice_id: input.invoiceId,
        payment_number: paymentNumber,
        payment_date: todayISO(),
        amount: input.amount,
        payment_method: input.method || 'cash',
        reference: input.reference || null,
        notes: input.notes || null,
      })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    const status = input.amount >= Number(input.invoiceTotal || 0) ? 'paid' : 'partially_paid';
    const { error: upError } = await db()
      .from('invoices')
      .update({ payment_status: status })
      .eq('id', input.invoiceId);
    if (upError) return { ok: false, message: upError.message };
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Payment failed' };
  }
}
