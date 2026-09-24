import { erpFetch, erpSearch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';
import type { Category, Product, ProductUnit, Unit } from '@/lib/erp/types';

// ── Types ───────────────────────────────────────────────────

export type ErpProductRow = Product & {
  product_units: ProductUnit[];
  categories: { name: string } | null;
};

export interface ErpLocation {
  id: string;
  name: string;
  location_type: string;
  is_active: boolean;
}

// ── Products ────────────────────────────────────────────────

const PRODUCT_SELECT =
  '*, product_units(*, unit:units(name,symbol)), categories(name)';

export async function getProducts(search?: string): Promise<ErpProductRow[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`name.ilike.*${term}*`, `reference.ilike.*${term}*`, `brand.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<ErpProductRow>('products', {
    select: PRODUCT_SELECT,
    filters: { is_active: true },
    or,
    order: { column: 'name', ascending: true },
    limit: 300,
  });
}

export interface SaveProductUnit {
  id?: string;
  unit_id?: string;
  purchase_price?: number | null;
  selling_price?: number | null;
  is_default?: boolean;
  sku?: string | null;
}

export interface SaveProductInput {
  id?: string;
  name: string;
  reference?: string;
  brand?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  minimum_stock?: number | null;
  maximum_stock?: number | null;
  is_sellable?: boolean;
  is_rentable?: boolean;
  is_active?: boolean;
  units?: SaveProductUnit[];
}

/**
 * Creates or updates a product, plus its `product_units` (per-unit purchase
 * and selling prices and the default flag). Mirrors web `saveProductWithPrice`.
 * The product-level fields update first, then each unit provided via `units`
 * is patched individually — this avoids clobbering units that exist on the
 * product but weren't part of the edit.
 */
export async function saveProduct(
  input: SaveProductInput
): Promise<{ ok: boolean; id?: string; message?: string }> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    reference: input.reference?.trim() || undefined,
    brand: input.brand?.trim() || null,
    image_url: input.image_url?.trim() || null,
    category_id: input.category_id || null,
    minimum_stock: input.minimum_stock,
    maximum_stock: input.maximum_stock,
    is_sellable: input.is_sellable ?? true,
    is_rentable: input.is_rentable ?? false,
    is_active: input.is_active ?? true,
  };

  let productId: string | undefined = input.id;
  let firstError = '';

  if (productId) {
    const res = await erpUpdate('products', productId, payload);
    if (!res.ok) return { ok: false, id: productId, message: res.message };
  } else {
    if (!payload.reference) {
      payload.reference = `P-${Date.now().toString(36).toUpperCase()}`;
    }
    const res = await erpInsert('products', payload);
    if (!res.ok) return { ok: false, message: res.message };
    productId = res.id;
  }

    if (productId && input.units && input.units.length > 0) {
    for (const u of input.units) {
      let unitRes;
      if (u.id) {
        unitRes = await saveProductUnit(u.id, {
          purchase_price: u.purchase_price,
          selling_price: u.selling_price,
          is_default: u.is_default,
        });
      } else {
        if (!u.unit_id) {
          unitRes = {
            ok: false,
            message: "Unité manquante pour une ligne de prix.",
          };
        } else {
          unitRes = await erpInsert('product_units', {
            product_id: productId,
            unit_id: u.unit_id,
            conversion_factor: 1,
            purchase_price: u.purchase_price ?? null,
            selling_price: u.selling_price ?? null,
            sku: u.sku?.trim() || null,
            is_sale_unit: true,
            is_default: u.is_default ?? false,
          });
        }
      }
      if (!unitRes.ok && !firstError) {
        firstError = unitRes.message ?? 'Erreur lors de la mise à jour d\'une unité.';
      }
    }
  }

  return {
    ok: firstError === '',
    id: productId,
    message: firstError || undefined,
  };
}

export async function saveProductUnit(
  unitId: string,
  input: { purchase_price?: number | null; selling_price?: number | null; is_default?: boolean }
): Promise<{ ok: boolean; message?: string }> {
  const res = await erpUpdate('product_units', unitId, {
    purchase_price: input.purchase_price ?? null,
    selling_price: input.selling_price ?? null,
    is_default: input.is_default ?? false,
  });
  return { ok: res.ok, message: res.message };
}

/** Product units for a given product, with the unit name/symbol joined in. */
export async function getProductUnits(productId: string): Promise<ProductUnit[]> {
  return erpFetch<ProductUnit>('product_units', {
    select: '*, unit:units(name,symbol)',
    filters: { product_id: productId },
    order: { column: 'is_default', ascending: false },
  });
}

// ── Categories & units ──────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return erpFetch<Category>('categories', {
    select: 'id,name,description,is_active',
    filters: { is_active: true },
    order: { column: 'name', ascending: true },
  });
}

export interface SaveCategoryInput {
  id?: string;
  name: string;
  description?: string | null;
}

/** Creates or updates a product category. */
export async function saveCategory(
  input: SaveCategoryInput
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis' };
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
  };
  if (input.id) {
    const res = await erpUpdate('categories', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('categories', { ...payload, is_active: true });
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateCategory(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('categories', id);
  return { ok: res.ok, message: res.message };
}

export async function getUnits(): Promise<Unit[]> {
  return erpFetch<Unit>('units', {
    select: 'id,name,symbol,is_active',
    filters: { is_active: true },
    order: { column: 'name', ascending: true },
  });
}

export interface SaveUnitInput {
  id?: string;
  name: string;
  symbol: string;
}

/** Creates or updates a measurement unit. `symbol` is required (e.g. "boîte"). */
export async function saveUnit(
  input: SaveUnitInput
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis' };
  if (!input.symbol.trim()) return { ok: false, message: 'Le symbole est requis' };
  const payload = {
    name: input.name.trim(),
    symbol: input.symbol.trim(),
  };
  if (input.id) {
    const res = await erpUpdate('units', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('units', { ...payload, is_active: true });
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateUnit(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('units', id);
  return { ok: res.ok, message: res.message };
}

// ── Locations ───────────────────────────────────────────────

export async function getLocations(includeInactive = false): Promise<ErpLocation[]> {
  return erpFetch<ErpLocation>('locations', {
    select: 'id,name,location_type,is_active',
    filters: includeInactive ? undefined : { is_active: true },
    order: { column: 'name', ascending: true },
  });
}

export async function saveLocation(
  input: { id?: string; name: string; location_type: string }
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis' };
  if (input.id) {
    const res = await erpUpdate('locations', input.id, {
      name: input.name.trim(),
      location_type: input.location_type,
    });
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('locations', {
    name: input.name.trim(),
    location_type: input.location_type,
    is_active: true,
  });
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateLocation(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('locations', id);
  return { ok: res.ok, message: res.message };
}
