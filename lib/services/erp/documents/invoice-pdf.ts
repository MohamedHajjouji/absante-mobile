/**
 * Invoice PDF export — mobile edition.
 *
 * Web renders with jsPDF in the browser (`web app/src/lib/erp/invoice-pdf.ts`);
 * mobile assembles the same data (invoice + customer + items + settings) and
 * renders equivalent HTML through `expo-print`, then shares the PDF file.
 *
 * Legal name on the document is "Sid Santé" (same fallback as web).
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { erpFetch } from '@/lib/erp/client';
import type { Customer, Invoice, Settings } from '@/lib/erp/types';

export interface InvoicePdfItem {
  description: string;
  reference?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
}

export interface InvoicePdfData {
  invoice: Invoice;
  customer: Customer | null;
  items: InvoicePdfItem[];
  settings: Settings | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  cancelled: 'Annulée',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Impayée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmt = (v: number | null | undefined): string =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v ?? 0)
  );

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
};

/** Same payload as web `GET /api/erp/invoices/[id]/export`. */
export async function getInvoicePdfData(invoiceId: string): Promise<InvoicePdfData | null> {
  try {
    const [invoices, items, settings] = await Promise.all([
      erpFetch<Invoice>('invoices', {
        select: 'id,invoice_number,customer_id,quote_id,issue_date,due_date,status,payment_status,subtotal,discount,tax,total,notes,terms',
        filters: { id: invoiceId },
        limit: 1,
      }),
      erpFetch<any>('invoice_items', {
        select: 'description,reference,quantity,unit_price,discount,tax_rate,total,sort_order',
        filters: { invoice_id: invoiceId },
        order: { column: 'sort_order', ascending: true },
        limit: 500,
      }),
      erpFetch<Settings>('settings', { select: '*', limit: 1 }),
    ]);
    const invoice = invoices[0];
    if (!invoice) return null;
    let customer: Customer | null = null;
    if (invoice.customer_id) {
      const res = await erpFetch<Customer>('customers', {
        select: 'id,name,company_name,phone,email,address,city,country,ice,if_number,rc_number',
        filters: { id: invoice.customer_id },
        limit: 1,
      });
      customer = res[0] ?? null;
    }
    return {
      invoice,
      customer,
      items: items.map((it: any) => ({
        description: String(it.description ?? ''),
        reference: it.reference ?? null,
        quantity: Number(it.quantity ?? 0),
        unit_price: Number(it.unit_price ?? 0),
        discount: Number(it.discount ?? 0),
        tax_rate: Number(it.tax_rate ?? 0),
        total: Number(it.total ?? 0),
      })),
      settings: settings[0] ?? null,
    };
  } catch (e) {
    console.error('getInvoicePdfData', e);
    return null;
  }
}

export function buildInvoiceHtml(data: InvoicePdfData): string {
  const currency = data.settings?.currency || 'MAD';
  const companyName = data.settings?.company_name || 'Sid Santé';
  const inv = data.invoice;
  const c = data.customer;

  const companyLines: string[] = [];
  if (data.settings?.company_address) companyLines.push(esc(data.settings.company_address));
  if (data.settings?.company_ice) companyLines.push(`ICE : ${esc(data.settings.company_ice)}`);
  if (data.settings?.company_if) companyLines.push(`IF : ${esc(data.settings.company_if)}`);
  if (data.settings?.company_rc) companyLines.push(`RC : ${esc(data.settings.company_rc)}`);
  const contact = [data.settings?.company_phone, data.settings?.company_email]
    .filter(Boolean)
    .map(esc)
    .join('  •  ');
  if (contact) companyLines.push(contact);

  const customerLines: string[] = [];
  if (c?.company_name) customerLines.push(`<strong>${esc(c.company_name)}</strong>`);
  if (c?.name) customerLines.push(esc(c.name));
  if (c?.address) customerLines.push(esc(c.address));
  if (c?.city || c?.country) customerLines.push(esc([c.city, c.country].filter(Boolean).join(', ')));
  if (c?.ice) customerLines.push(`ICE : ${esc(c.ice)}`);
  if (c?.phone) customerLines.push(`Tél : ${esc(c.phone)}`);
  if (c?.email) customerLines.push(esc(c.email));

  const itemRows = data.items
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(it.description)}${it.reference ? `<br/><span class="ref">${esc(it.reference)}</span>` : ''}</td>
        <td class="num">${fmt(it.quantity)}</td>
        <td class="num">${fmt(it.unit_price)}</td>
        <td class="num">${fmt(it.discount)}</td>
        <td class="num">${fmt(it.tax_rate)} %</td>
        <td class="num"><strong>${fmt(it.total)}</strong></td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; font-size: 11px; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .company h1 { font-size: 20px; margin: 0 0 6px 0; color: #1e293b; }
  .company p { margin: 1px 0; color: #64748b; font-size: 10px; }
  .title { text-align: right; }
  .title h2 { font-size: 28px; margin: 0; color: #f53e8a; }
  .title p { margin: 2px 0; color: #64748b; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  .meta { display: flex; justify-content: space-between; }
  .box { background: #f8fafc; border-radius: 8px; padding: 10px 12px; width: 46%; }
  .box h3 { margin: 0 0 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; }
  .box p { margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; color: #64748b; }
  td { border-top: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .ref { color: #64748b; font-size: 9px; }
  .totals { width: 240px; margin-left: auto; margin-top: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { border-top: 2px solid #f53e8a; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: bold; }
  .notes { margin-top: 16px; color: #475569; }
  .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #94a3b8; font-size: 9px; text-align: center; }
</style></head>
<body>
  <div class="header">
    <div class="company">
      <h1>${esc(companyName)}</h1>
      ${companyLines.map((l) => `<p>${l}</p>`).join('')}
    </div>
    <div class="title">
      <h2>FACTURE</h2>
      <p><strong>N° ${esc(inv.invoice_number)}</strong></p>
      <p>${esc(STATUS_LABELS[inv.status] ?? inv.status)} • ${esc(PAYMENT_STATUS_LABELS[inv.payment_status] ?? inv.payment_status)}</p>
    </div>
  </div>
  <hr />
  <div class="meta">
    <div class="box">
      <h3>Facturé à</h3>
      ${customerLines.length > 0 ? customerLines.map((l) => `<p>${l}</p>`).join('') : '<p>—</p>'}
    </div>
    <div class="box">
      <h3>Détails</h3>
      <p>Émise le : <strong>${esc(fmtDate(inv.issue_date))}</strong></p>
      <p>Échéance : <strong>${esc(fmtDate(inv.due_date))}</strong></p>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Désignation</th><th class="num">Qté</th><th class="num">P.U.</th><th class="num">Remise</th><th class="num">TVA</th><th class="num">Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Sous-total HT</span><span>${fmt(inv.subtotal)} ${esc(currency)}</span></div>
    <div class="row"><span>Remise</span><span>−${fmt(inv.discount)} ${esc(currency)}</span></div>
    <div class="row"><span>TVA</span><span>${fmt(inv.tax)} ${esc(currency)}</span></div>
    <div class="row grand"><span>Total TTC</span><span>${fmt(inv.total)} ${esc(currency)}</span></div>
  </div>
  ${inv.notes ? `<div class="notes"><strong>Notes :</strong> ${esc(inv.notes)}</div>` : ''}
  ${inv.terms ? `<div class="notes"><strong>Conditions :</strong> ${esc(inv.terms)}</div>` : ''}
  <div class="footer">${esc(companyName)} — Document généré le ${esc(new Date().toLocaleDateString('fr-FR'))} via Sid Santé ERP</div>
</body></html>`;
}

/** Builds the PDF and opens the share sheet. */
export async function shareInvoicePdf(invoiceId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const data = await getInvoicePdfData(invoiceId);
    if (!data) return { ok: false, message: 'Facture introuvable.' };
    const html = buildInvoiceHtml(data);
    const { uri } = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { ok: false, message: 'Partage indisponible sur cet appareil.' };
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Facture ${data.invoice.invoice_number}`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Export PDF impossible.' };
  }
}
