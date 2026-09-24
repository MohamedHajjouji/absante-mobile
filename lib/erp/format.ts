/**
 * Formatting helpers — ported from `web app/src/lib/erp/format.ts`.
 * `Intl` is available in Hermes (React Native >= 0.65); wrapped defensively
 * so a missing locale never crashes a screen.
 */

function safeFormat(n: number, options: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat('fr-FR', options).format(n);
  } catch {
    // Fallback without Intl
    return n.toFixed(options.minimumFractionDigits ?? 2).replace('.', ',');
  }
}

export function formatMAD(value: number | string | null | undefined): string {
  if (value == null) return '0,00 MAD';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '0,00 MAD';
  return safeFormat(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value == null) return '';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '';
  return safeFormat(n, { maximumFractionDigits: 2 });
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
