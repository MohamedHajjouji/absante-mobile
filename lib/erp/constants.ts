/**
 * ERP constants — mobile edition.
 * Ported from `web app/src/lib/erp/constants.ts` and aligned with the actual
 * `ab_erp` DB CHECK constraints (the web constants had drifted from the DB —
 * the DB is the source of truth, so enum lists below mirror its CHECKs).
 */

export const ERP_SCHEMA = 'ab_erp';

export const CURRENCY = 'MAD';

export const DEFAULT_TAX_RATE = 0.2;

export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

/** Sequential document prefixes per entity type. */
export const DOCUMENT_PREFIXES = {
  quote: 'DEV',
  invoice: 'FAC',
  credit_note: 'AV', // avoir
  payment: 'RGL',
  purchase: 'BON',
  rental: 'LOC',
  expense: 'DEP',
  service_order: 'OS',
  stock_count: 'INV',
} as const;

export type DocumentType = keyof typeof DOCUMENT_PREFIXES;

export interface DocumentTypeMeta {
  label: string;
  prefix: string;
  table: string;
  column: string;
}

/** Maps a document type to its source table + sequence column. */
export const DOCUMENT_META: Record<DocumentType, DocumentTypeMeta> = {
  quote: { label: 'Devis', prefix: 'DEV', table: 'quotes', column: 'quote_number' },
  invoice: { label: 'Facture', prefix: 'FAC', table: 'invoices', column: 'invoice_number' },
  credit_note: { label: 'Avoir', prefix: 'AV', table: 'credit_notes', column: 'credit_note_number' },
  payment: { label: 'Règlement', prefix: 'RGL', table: 'payments', column: 'payment_number' },
  purchase: { label: 'Achat', prefix: 'BON', table: 'purchases', column: 'purchase_number' },
  rental: { label: 'Location', prefix: 'LOC', table: 'rentals', column: 'rental_number' },
  expense: { label: 'Dépense', prefix: 'DEP', table: 'expenses', column: 'expense_number' },
  service_order: { label: 'Ordre de service', prefix: 'OS', table: 'service_orders', column: 'order_number' },
  stock_count: { label: 'Inventaire', prefix: 'INV', table: 'stock_counts', column: 'count_number' },
};

/** Types covered by the `document_sequences` CHECK constraint (atomic numbering RPC). */
export const SEQUENCED_DOCUMENT_TYPES = [
  'quote',
  'invoice',
  'purchase',
  'credit_note',
  'rental',
  'expense',
] as const;

/** Tracking types — mirrors `products.tracking_type` CHECK. */
export const TRACKING_TYPES = ['quantity', 'batch', 'serialized'] as const;
export type TrackingType = (typeof TRACKING_TYPES)[number];

/** Stock movement types — mirrors `stock_movements.movement_type` CHECK. */
export const MOVEMENT_TYPES = [
  'purchase',
  'sale',
  'rental_out',
  'rental_return',
  'care_usage',
  'transfer_in',
  'transfer_out',
  'damaged',
  'expired',
  'adjustment_in',
  'adjustment_out',
  'customer_return',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Movement types that INCREASE stock (everything else decreases). */
export const INBOUND_MOVEMENT_TYPES: readonly string[] = [
  'purchase',
  'rental_return',
  'transfer_in',
  'adjustment_in',
  'customer_return',
];

/** Purchase statuses — mirrors `purchases.status` CHECK. */
export const PURCHASE_STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

/** Quote statuses — mirrors `quotes.status` CHECK. */
export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Invoice statuses — mirrors `invoices.status` CHECK. */
export const INVOICE_STATUSES = ['draft', 'issued', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Invoice payment statuses — mirrors `invoices.payment_status` CHECK. */
export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'overdue'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Asset statuses — mirrors `assets.status` CHECK. */
export const ASSET_STATUSES = ['available', 'reserved', 'rented', 'in_repair', 'damaged', 'lost', 'retired'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Asset conditions — mirrors `assets.condition` CHECK. */
export const ASSET_CONDITIONS = ['new', 'good', 'fair', 'poor', 'damaged'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

/** Location types — mirrors `locations.location_type` CHECK. */
export const LOCATION_TYPES = ['warehouse', 'storage_room', 'vehicle', 'clinic', 'office', 'other'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const PAGE_SIZE = 25;
