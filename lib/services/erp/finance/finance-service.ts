import { erpFetch, erpSearch, erpInsert, erpUpdate, erpDeactivate } from '@/lib/erp/client';

// ── Types ───────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  reference: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  date: string;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
  createdBy: string | null;
}

// ── Expense Categories ─────────────────────────────────────

export async function getExpenseCategories(search?: string): Promise<ExpenseCategory[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`name.ilike.*${term}*`, `description.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<ExpenseCategory>('expense_categories', {
    select: 'id,name,description,is_active',
    filters: { is_active: true },
    or,
    order: { column: 'name', ascending: true },
    limit: 300,
  });
}

export interface SaveExpenseCategoryInput {
  id?: string;
  name: string;
  description?: string | null;
}

export async function saveExpenseCategory(input: SaveExpenseCategoryInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.name.trim()) return { ok: false, message: 'Le nom est requis' };
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    is_active: true,
  };
  let catId: string | undefined = input.id;
  if (catId) {
    const res = await erpUpdate('expense_categories', catId, payload);
    return { ok: res.ok, id: catId, message: res.message };
  }
  const res = await erpInsert('expense_categories', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deactivateExpenseCategory(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('expense_categories', id);
  return { ok: res.ok, message: res.message };
}

// ── Expenses ───────────────────────────────────────────────

export interface SaveExpenseInput {
  id?: string;
  categoryId: string;
  categoryName: string;
  reference: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  date: string;
  notes?: string | null;
  receiptUrl?: string | null;
}

export async function getExpenses(search?: string): Promise<Expense[]> {
  let or: string | undefined;
  if (search) {
    const term = search.replace(/[*%]/g, '').trim();
    if (term) {
      or = [`reference.ilike.*${term}*`, `categoryName.ilike.*${term}*`, `notes.ilike.*${term}*`].join(',');
    }
  }
  return erpFetch<Expense>('expenses', {
    select: 'id,category_id,category_name,reference,amount,payment_method,date,notes,receipt_url,created_at,created_by',
    filters: undefined,
    or,
    order: { column: 'date', ascending: false },
    limit: 300,
  });
}

export async function saveExpense(input: SaveExpenseInput): Promise<{ ok: boolean; id?: string; message?: string }> {
  const payload = {
    category_id: input.categoryId,
    category_name: input.categoryName,
    reference: input.reference,
    amount: input.amount,
    payment_method: input.paymentMethod,
    date: input.date,
    notes: input.notes || null,
    receipt_url: input.receiptUrl || null,
  };

  let expenseId: string | undefined = input.id;
  if (input.id) {
    const res = await erpUpdate('expenses', input.id, payload);
    return { ok: res.ok, id: input.id, message: res.message };
  }
  const res = await erpInsert('expenses', payload);
  return { ok: res.ok, id: res.id, message: res.message };
}

export async function deleteExpense(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await erpDeactivate('expenses', id);
  return { ok: res.ok, message: res.message };
}