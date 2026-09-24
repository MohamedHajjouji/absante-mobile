import { erpFetch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';
import type { Customer, Quote, Invoice, Payment, CreditNote } from '@/lib/erp/types';

// ── Customers ────────────────────────────────────────────────

export async function getCustomers(search?: string): Promise<Customer[]> {
  const q = search?.trim() || undefined;
  return erpFetch<Customer>('customers', {
    select: 'id,customer_type,name,company_name,phone,email,address,city,is_active',
    search: q ? { query: q, columns: ['name', 'company_name', 'phone', 'email'] } : undefined,
    filters: { is_active: true },
    order: { column: 'name', ascending: true },
    limit: 200,
  });
}

export interface SaveCustomerInput {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
}

export async function saveCustomer(
  input: SaveCustomerInput
): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis.' };
  const payload = {
    customer_type: 'individual',
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    is_active: true,
  };
  if (input.id) {
    const res = await erpUpdate('customers', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('customers', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateCustomer(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('customers', id);
  return { ok: res.ok, message: res.message };
}

// ── Quotes / Invoices / Payments / Credit notes (read) ──────

export async function getQuotes(search?: string): Promise<Quote[]> {
  const q = search?.trim() || undefined;
  return erpFetch<Quote>('quotes', {
    select: 'id,quote_number,customer_id,issue_date,valid_until,status,subtotal,discount,tax,total',
    search: q ? { query: q, columns: ['quote_number'] } : undefined,
    order: { column: 'issue_date', ascending: false },
    limit: 200,
  });
}

export async function getInvoices(search?: string): Promise<Invoice[]> {
  const q = search?.trim() || undefined;
  return erpFetch<Invoice>('invoices', {
    select: 'id,invoice_number,customer_id,issue_date,due_date,status,payment_status,subtotal,total',
    search: q ? { query: q, columns: ['invoice_number'] } : undefined,
    order: { column: 'issue_date', ascending: false },
    limit: 200,
  });
}

export async function getPayments(search?: string): Promise<Payment[]> {
  const q = search?.trim() || undefined;
  return erpFetch<Payment>('payments', {
    select: 'id,payment_number,invoice_id,payment_date,amount,payment_method,reference',
    search: q ? { query: q, columns: ['payment_number', 'reference'] } : undefined,
    order: { column: 'payment_date', ascending: false },
    limit: 200,
  });
}

export async function getCreditNotes(search?: string): Promise<CreditNote[]> {
  const q = search?.trim() || undefined;
  return erpFetch<CreditNote>('credit_notes', {
    select: 'id,credit_note_number,invoice_id,customer_id,issue_date,reason,status,subtotal,total',
    search: q ? { query: q, columns: ['credit_note_number'] } : undefined,
    order: { column: 'issue_date', ascending: false },
    limit: 200,
  });
}
