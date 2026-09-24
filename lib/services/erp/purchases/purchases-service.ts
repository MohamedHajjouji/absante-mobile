import { erpFetch, erpSearch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';

// ── Types ───────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  notes: string | null;
  is_active: boolean;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  reference: string;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  total: number;
  totalTax: number;
  totalDiscount: number;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  expectedDate: string | null;
  notes: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
  createdBy: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  productReference: string;
  quantity: number;
  unitLabel: string;
  unitSymbol: string | null;
  price: number;
  discount: number;
  taxRate: number;
  total: number;
}

// ── Suppliers ────────────────────────────────────────────────

export async function getSuppliers(search?: string): Promise<Supplier[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`name.ilike.*${term}*`, `email.ilike.*${term}*`, `phone.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<Supplier>('suppliers', {
    select: 'id,name,email,phone,address,city,postal_code,country,tax_id,notes,is_active',
    filters: { is_active: true },
    or,
    order: { column: 'name', ascending: true },
    limit: 300,
  });
}

export interface SaveSupplierInput {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

export async function saveSupplier(input: SaveSupplierInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis' };
  const payload = {
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    postal_code: input.postalCode?.trim() || null,
    country: input.country?.trim() || null,
    tax_id: input.taxId?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: true,
  };
  let supplierId: string | undefined = input.id;
  if (supplierId) {
    const res = await erpUpdate('suppliers', supplierId, payload);
    return { ok: res.ok, id: supplierId, message: res.message };
  }
  const res = await erpInsert('suppliers', { ...payload, is_active: true });
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateSupplier(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('suppliers', id);
  return { ok: res.ok, message: res.message };
}

// ── Purchase Orders ─────────────────────────────────────────

export interface SavePurchaseOrderInput {
  id?: string;
  supplierId: string;
  supplierName: string;
  reference?: string;
  items: SavePurchaseOrderItemInput[];
  notes?: string | null;
  discountAmount?: number;
  taxRate?: number;
}

export interface SavePurchaseOrderItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export async function getPurchaseOrders(search?: string): Promise<PurchaseOrder[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`reference.ilike.*${term}*`, `supplierName.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<PurchaseOrder>('purchases', {
    select: '*',
    filters: undefined,
    or,
    order: { column: 'created_at', ascending: false },
    limit: 300,
  });
}

export async function savePurchaseOrder(input: SavePurchaseOrderInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  const payload: Record<string, unknown> = {
    supplier_id: input.supplierId,
    supplier_name: input.supplierName,
    reference: input.reference || `DEV-${Date.now().toString(36).toUpperCase()}`,
    status: 'draft',
    total: 0,
    total_tax: 0,
    total_discount: input.discountAmount ?? 0,
    subtotal: 0,
    discount_amount: input.discountAmount ?? 0,
    tax_rate: input.taxRate ?? 20,
    expected_date: input.items.length > 0 ? null : null,
    notes: input.notes || null,
    items: input.items || [],
  };

  let poId: string | undefined = input.id;
  if (input.id) {
    const res = await erpUpdate('purchases', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('purchases', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

// ── Payments received against POs (simple) ──────────────────

export async function getPoPayments(poId?: string): Promise<any[]> {
  const filters: Record<string, string | number | boolean | string[] | null | undefined> = {};
  if (poId) filters.purchase_order_id = poId;
  return erpFetch<any>('payments', {
    select: 'id,amount,method,status,recorded_at',
    filters,
    order: { column: 'recorded_at', ascending: false },
    limit: 100,
  });
}