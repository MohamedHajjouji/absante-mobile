/**
 * ERP data access — mobile edition.
 * Ports `web app/src/lib/erp/fetch-server.ts` (queries) and the generic parts
 * of `actions.ts` (mutations) onto the mobile Supabase client.
 * All access goes through the `ab_erp` schema, exactly like the web ERP.
 */

import { supabase } from '@/lib/supabase';
import { ERP_SCHEMA } from './constants';
import type { ErpActionResult } from './types';

export interface ErpQueryOptions {
  select?: string;
  /** Exact-match filters applied as AND conditions. Array values become `in` filters. */
  filters?: Record<string, string | number | boolean | string[] | null | undefined>;
  /** Case-insensitive substring search across the given columns (OR-ed together). */
  search?: { query: string; columns: string[] };
  /** Raw PostgREST `or(...)` expression appended to the query. */
  or?: string;
  /** Inclusive date range filters. `to` is normalized to the end of day. */
  ranges?: Record<string, { from?: string; to?: string }>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

/** Removes PostgREST/ILIKE wildcards from user input so it is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[*%]/g, '').trim();
}

/** Wraps a value for use inside a PostgREST `or(...)` expression, quoting when needed. */
function orValue(value: string): string {
  const escaped = value.replace(/"/g, '\\"');
  return /[,()]/.test(escaped) ? `"${escaped}"` : escaped;
}

/** Builds a `column.ilike.*term*` compatible pattern for an `or(...)` expression. */
export function ilikePattern(query: string): string {
  return orValue(`*${escapeLike(query)}*`);
}

async function buildQuery<T>(
  table: string,
  options: ErpQueryOptions & { withCount?: boolean }
): Promise<{ data: T[]; total: number }> {
  try {
    let q = supabase
      .schema(ERP_SCHEMA)
      .from(table)
      .select(options.select ?? '*', options.withCount ? { count: 'exact', head: false } : undefined);

    if (options.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v)) {
          if (v.length > 0) q = q.in(k, v);
        } else {
          q = q.eq(k, v);
        }
      }
    }

    const orParts: string[] = [];
    if (options.search?.query) {
      const pattern = ilikePattern(options.search.query);
      for (const col of options.search.columns) {
        orParts.push(`${col}.ilike.${pattern}`);
      }
    }
    if (options.or) orParts.push(options.or);
    if (orParts.length > 0) q = q.or(orParts.join(','));

    if (options.ranges) {
      for (const [col, range] of Object.entries(options.ranges)) {
        if (range?.from) q = q.gte(col, range.from);
        if (range?.to) {
          const to = range.to.length <= 10 ? `${range.to}T23:59:59` : range.to;
          q = q.lte(col, to);
        }
      }
    }

    if (options.order) q = q.order(options.order.column, { ascending: options.order.ascending ?? true });

    if (options.offset !== undefined) {
      const limit = options.limit ?? 0;
      q = q.range(options.offset, Math.max(options.offset + limit - 1, options.offset));
    } else if (options.limit) {
      q = q.limit(options.limit);
    }

    const { data, count, error } = await q;
    if (error) {
      console.error('ERPFetch ' + table, error);
      return { data: [], total: 0 };
    }
    return { data: (data as unknown as T[]) ?? [], total: count ?? 0 };
  } catch (e) {
    console.error('ERPFetch ' + table, e);
    return { data: [], total: 0 };
  }
}

export async function erpFetch<T = unknown>(table: string, options: ErpQueryOptions = {}): Promise<T[]> {
  const { data } = await buildQuery<T>(table, options);
  return data;
}

/** Like `erpFetch` but also returns the total matching row count (pagination). */
export async function erpSearch<T = unknown>(
  table: string,
  options: ErpQueryOptions = {}
): Promise<{ data: T[]; total: number }> {
  return buildQuery<T>(table, { ...options, withCount: true });
}

/** Resolves ids of rows in `table` whose given columns match the query. */

// ── Mutations ───────────────────────────────────────────────
// Mirrors the web's generic server actions. Soft-delete (`is_active = false`)
// is the default removal path; only tables without `is_active` get hard delete.

export type TableName =
  | 'categories'
  | 'units'
  | 'products'
  | 'product_units'
  | 'product_batches'
  | 'locations'
  | 'suppliers'
  | 'customers'
  | 'services'
  | 'assets'
  | 'settings'
  | 'document_sequences'
  | 'stock_balances'
  | 'stock_movements'
  | 'stock_counts'
  | 'stock_count_items'
  | 'stock_adjustments'
  | 'asset_movements'
  | 'asset_maintenance'
  | 'purchases'
  | 'purchase_items'
  | 'quotes'
  | 'quote_items'
  | 'invoices'
  | 'invoice_items'
  | 'payments'
  | 'credit_notes'
  | 'credit_note_items'
  | 'rentals'
  | 'rental_items'
  | 'service_orders'
  | 'service_visits'
  | 'staff_schedules'
  | 'patient_assignments'
  | 'staff_members'
  | 'erp_patients'
  | 'expenses'
  | 'expense_categories'
  | 'service_order_consumables'
  | 'documents';

function schema() {
  return supabase.schema(ERP_SCHEMA);
}

/** Generic single-row insert in the ab_erp schema. */
export async function erpInsert(table: TableName, values: Record<string, unknown>): Promise<ErpActionResult> {
  try {
    const { data, error } = await schema().from(table).insert(values).select().single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, id: (data as { id?: string })?.id, data: data as Record<string, unknown> };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Insert failed' };
  }
}

/** Generic single-row update in the ab_erp schema. */
export async function erpUpdate(
  table: TableName,
  id: string,
  values: Record<string, unknown>
): Promise<ErpActionResult> {
  try {
    const { data, error } = await schema().from(table).update(values).eq('id', id).select().single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, data: data as Record<string, unknown> };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Update failed' };
  }
}

/** Soft delete (`is_active = false`) — for tables with an `is_active` column. */
export async function erpDeactivate(table: TableName, id: string): Promise<ErpActionResult> {
  return erpUpdate(table, id, { is_active: false });
}

/** Hard delete — use with care; transactional tables keep FK references. */
export async function erpDelete(table: TableName, id: string): Promise<ErpActionResult> {
  try {
    const { error } = await schema().from(table).delete().eq('id', id);
    if (error) return { ok: false, message: error.message };
    return { ok: true, id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Delete failed' };
  }
}

/** Calls an `ab_erp` Postgres function (atomic stock / numbering RPCs). */
export async function erpRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; message?: string; data?: T | null }> {
  try {
    const { data, error } = await supabase.schema(ERP_SCHEMA).rpc(fn, args);
    if (error) return { ok: false, message: error.message };
    return { ok: true, data: (data as T) ?? null };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'RPC failed' };
  }
}

export async function searchIds(table: string, columns: string[], query: string, limit = 1000): Promise<string[]> {
  const data = await erpFetch<{ id: string }>(table, {
    select: 'id',
    search: { query, columns },
    limit,
  });
  return data.map((r) => r.id);
}

export async function erpGet<T = unknown>(table: string, id: string, select?: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .schema(ERP_SCHEMA)
      .from(table)
      .select(select ?? '*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('ERPGet ' + table, error);
      return null;
    }
    return (data as unknown as T) ?? null;
  } catch (e) {
    console.error('ERPGet ' + table, e);
    return null;
  }
}
