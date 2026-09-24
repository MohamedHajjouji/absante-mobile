import { erpFetch, erpSearch, erpRpc } from '@/lib/erp/client';
import { ERP_SCHEMA, INBOUND_MOVEMENT_TYPES } from '@/lib/erp/constants';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────

export interface StockLevelRow {
  balanceId: string;
  productId: string;
  productName: string;
  productMin: number | null;
  unitLabel: string;
  locationId: string;
  locationName: string;
  locationType: string;
  quantity: number;
  reserved: number;
}

export interface MovementRow {
  id: string;
  createdAt: string;
  movementType: string;
  quantity: number;
  unitCost: number | null;
  notes: string | null;
  productName: string;
  unitLabel: string | null;
  locationName: string;
  isInbound: boolean;
}

export interface DashboardSummary {
  lowStockCount: number;
  todayIn: number;
  todayOut: number;
  activeProducts: number;
}

export interface ProductStockSummary {
  productId: string;
  productReference: string;
  productName: string;
  currentQuantity: number;
  quantitySold: number;
  quantityPurchased: number;
  quantityRentedOut: number;
  quantityAdjusted: number;
  lastMovementAt: string | null;
}

export interface RecordMovementInput {
  productId: string;
  productUnitId: string;
  locationId: string;
  movementType: string;
  quantity: number;
  unitCost?: number | null;
  batchId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

const STOCK_LEVEL_SELECT =
  'id, quantity, reserved_quantity, product:products(id,name,minimum_stock), ' +
  'product_unit:product_units(id,unit:units(name,symbol)), location:locations(id,name,location_type)';

// ── Stock levels ────────────────────────────────────────────

function mapStockRow(raw: any): StockLevelRow {
  const unit = raw.product_unit?.unit;
  return {
    balanceId: raw.id,
    productId: raw.product?.id ?? raw.product_id,
    productName: raw.product?.name ?? 'Produit',
    productMin: raw.product?.minimum_stock ?? null,
    unitLabel: unit ? unit.symbol ?? unit.name ?? '' : '',
    locationId: raw.location?.id ?? raw.location_id,
    locationName: raw.location?.name ?? 'Emplacement',
    locationType: raw.location?.location_type ?? 'other',
    quantity: Number(raw.quantity ?? 0),
    reserved: Number(raw.reserved_quantity ?? 0),
  };
}

export async function getStockLevels(opts: { search?: string; locationId?: string } = {}): Promise<StockLevelRow[]> {
  const orParts: string[] = [];
  if (opts.search) {
    const term = opts.search.replace(/[*%]/g, '').trim();
    if (term) {
      orParts.push(`products.name.ilike.*${term}*`, `products.reference.ilike.*${term}*`);
    }
  }
  const rows = await erpFetch<any>('stock_balances', {
    select: STOCK_LEVEL_SELECT,
    filters: { location_id: opts.locationId || undefined },
    or: orParts.length > 0 ? orParts.join(',') : undefined,
    order: { column: 'updated_at', ascending: false },
    limit: 300,
  });
  return rows.map(mapStockRow);
}

/** Stock lines at or below their product's `minimum_stock`. */
export async function getLowStockLevels(): Promise<StockLevelRow[]> {
  const rows = await getStockLevels();
  return rows.filter((r) => r.productMin != null && r.quantity <= r.productMin);
}

export async function getLocationsList(): Promise<{ id: string; name: string; location_type: string }[]> {
  return erpFetch('locations', {
    select: 'id,name,location_type',
    filters: { is_active: true },
    order: { column: 'name', ascending: true },
  });
}

// ── Movements ───────────────────────────────────────────────

const MOVEMENT_SELECT =
  'id, created_at, movement_type, quantity, unit_cost, notes, ' +
  'product:products(name), product_unit:product_units(unit:units(name,symbol)), location:locations(name)';

function mapMovementRow(raw: any): MovementRow {
  const unit = raw.product_unit?.unit;
  return {
    id: raw.id,
    createdAt: raw.created_at,
    movementType: raw.movement_type,
    quantity: Number(raw.quantity ?? 0),
    unitCost: raw.unit_cost != null ? Number(raw.unit_cost) : null,
    notes: raw.notes ?? null,
    productName: raw.product?.name ?? 'Produit',
    unitLabel: unit ? unit.symbol ?? unit.name ?? '' : '',
    locationName: raw.location?.name ?? '—',
    isInbound: INBOUND_MOVEMENT_TYPES.includes(raw.movement_type),
  };
}

export async function getMovements(
  opts: { movementType?: string; limit?: number; offset?: number } = {}
): Promise<{ data: MovementRow[]; total: number }> {
  const { data, total } = await erpSearch<any>('stock_movements', {
    select: MOVEMENT_SELECT,
    filters: { movement_type: opts.movementType || undefined },
    order: { column: 'created_at', ascending: false },
    limit: opts.limit,
    offset: opts.offset,
  });
  return { data: data.map(mapMovementRow), total };
}

export async function getRecentMovements(limit = 5): Promise<MovementRow[]> {
  const { data } = await getMovements({ limit });
  return data;
}

// ── Dashboard summary ───────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [lowStock, todayMovements, productsSearch] = await Promise.all([
    getLowStockLevels(),
    erpFetch<any>('stock_movements', {
      select: 'quantity,movement_type',
      ranges: { created_at: { from: new Date().toISOString().slice(0, 10) } },
      limit: 500,
    }),
    erpSearch('products', { select: 'id', filters: { is_active: true }, limit: 1 }),
  ]);

  let todayIn = 0;
  let todayOut = 0;
  for (const m of todayMovements) {
    const q = Number(m.quantity ?? 0);
    if (INBOUND_MOVEMENT_TYPES.includes(m.movement_type)) todayIn += q;
    else todayOut += q;
  }

  return {
    lowStockCount: lowStock.length,
    todayIn,
    todayOut,
    activeProducts: productsSearch.total,
  };
}

// ── Product Stock Summary (read-only, computed from balances + movements) ──────

export async function getProductStockSummary(productId?: string): Promise<ProductStockSummary[]> {
  const res = await erpRpc<any[]>('get_product_stock_summary', {
    p_product_id: productId ?? null,
  });
  if (!res.ok) throw new Error(res.message ?? 'Failed to fetch product stock summary');
  return (res.data ?? []).map((row) => ({
    productId: row.product_id,
    productReference: row.product_reference,
    productName: row.product_name,
    currentQuantity: Number(row.current_quantity ?? 0),
    quantitySold: Number(row.quantity_sold ?? 0),
    quantityPurchased: Number(row.quantity_purchased ?? 0),
    quantityRentedOut: Number(row.quantity_rented_out ?? 0),
    quantityAdjusted: Number(row.quantity_adjusted ?? 0),
    lastMovementAt: row.last_movement_at ?? null,
  }));
}

// ── Record a movement (atomic RPC) ──────────────────────────

/**
 * Records a stock movement through `ab_erp.ab_erp_record_stock_movement`,
 * which atomically inserts the movement and updates `stock_balances`.
 * Requires the SQL in `web app/edit-erp-rpcs.sql` to be applied.
 */
/**
 * Turns PostgREST/Postgres errors into something an agency owner can act on.
 * The most common failure while the RPCs are not deployed yet is a missing
 * function (PostgREST `PGRST202` / Postgres `42883`).
 */
function friendlyMovementError(message?: string): string {
  const m = message ?? '';
  if (/42883|PGRST202|Could not find the function|function .* does not exist/i.test(m)) {
    return "Fonction serveur indisponible : exécutez « edit-erp-rpcs.sql » dans Supabase, puis réessayez.";
  }
  if (/42501|non autorise|permission denied/i.test(m)) {
    return 'Accès ERP requis pour modifier le stock.';
  }
  if (/quantite doit etre superieure/i.test(m)) {
    return 'La quantité doit être supérieure à 0.';
  }
  if (/stock_balances_quantity_check|violates check constraint/i.test(m)) {
    return 'Stock insuffisant pour cette sortie.';
  }
  if (/Aucune unite par defaut/i.test(m)) {
    return "Ce produit n'a pas d'unité par défaut.";
  }
  return m || "Impossible d'enregistrer le mouvement.";
}

export async function recordMovement(
  input: RecordMovementInput
): Promise<{ ok: boolean; message?: string; movementId?: string }> {
  const res = await erpRpc<string>('ab_erp_record_stock_movement', {
    p_product_id: input.productId,
    p_product_unit_id: input.productUnitId,
    p_location_id: input.locationId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_unit_cost: input.unitCost ?? null,
    p_batch_id: input.batchId ?? null,
    p_reference_type: null,
    p_reference_id: null,
    p_notes: input.notes ?? null,
    p_created_by: input.createdBy ?? null,
  });
  if (!res.ok) return { ok: false, message: friendlyMovementError(res.message) };
  return { ok: true, movementId: res.data ?? undefined };
}

/** True when the atomic RPC is deployed (lets screens degrade gracefully). */
export async function isMovementRpcAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.schema(ERP_SCHEMA).rpc('ab_erp_record_stock_movement', {
      p_product_id: '00000000-0000-0000-0000-000000000000',
      p_product_unit_id: '00000000-0000-0000-0000-000000000000',
      p_location_id: '00000000-0000-0000-0000-000000000000',
      p_movement_type: 'adjustment_in',
      p_quantity: 0,
    });
    // 42883 = undefined_function (Postgres) / PGRST202 = missing function in
    // this schema (PostgREST) → the RPC is not deployed yet.
    return error?.code !== '42883' && error?.code !== 'PGRST202';
  } catch {
    return false;
  }
}

