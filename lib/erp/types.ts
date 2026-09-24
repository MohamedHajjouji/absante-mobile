/**
 * ERP types — ported from `web app/src/lib/erp/types.ts`.
 * Kept in sync with the `ab_erp` schema (see `database.md`).
 */

export interface IdRow {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StaffMember extends IdRow { first_name: string; last_name: string; email?: string | null; phone?: string | null; role: string; gender?: string | null; birth_date?: string | null; hire_date?: string | null; address?: string | null; city?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; notes?: string | null; is_active: boolean; split_percentage?: number | null; }
export interface ErpPatient extends IdRow { first_name: string; last_name: string; email?: string | null; phone?: string | null; gender?: string | null; birth_date?: string | null; blood_type?: string | null; allergies?: string | null; address?: string | null; city?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; notes?: string | null; is_active: boolean; }
export interface Category extends IdRow { name: string; description?: string | null; parent_id?: string | null; is_active: boolean; }
export interface Unit extends IdRow { name: string; symbol: string; is_active: boolean; }
export interface Product extends IdRow { reference: string; name: string; description?: string | null; category_id?: string | null; brand?: string | null; image_url?: string | null; tracking_type: string; is_sellable: boolean; is_rentable: boolean; is_active: boolean; minimum_stock?: number | null; maximum_stock?: number | null; expiry_date?: string | null; product_units?: ProductUnit[] | null; }
export interface UnitRef { name: string; symbol?: string | null; }
export interface ProductUnit extends IdRow { product_id: string; unit_id: string; conversion_factor: number; barcode?: string | null; purchase_price?: number | null; selling_price?: number | null; rental_price?: number | null; is_purchase_unit: boolean; is_sale_unit: boolean; is_default: boolean; unit?: UnitRef | null; }
export interface ProductBatch extends IdRow { product_id: string; batch_number: string; manufacturing_date?: string | null; expiry_date?: string | null; supplier_id?: string | null; purchase_id?: string | null; }
export interface StockAdjustment extends IdRow { product_id: string; adjustment_type: string; quantity: number; location_id?: string | null; reason?: string | null; performed_by?: string | null; }
export interface Asset extends IdRow { product_id: string; asset_reference: string; serial_number?: string | null; barcode?: string | null; location_id?: string | null; status: string; condition: string; purchase_date?: string | null; purchase_price?: number | null; notes?: string | null; }
export interface AssetMovement extends IdRow { asset_id: string; from_location?: string | null; to_location?: string | null; movement_type: string; rental_id?: string | null; performed_by?: string | null; movement_date?: string | null; notes?: string | null; }
export interface AssetMaintenance extends IdRow { asset_id: string; maintenance_type: string; description?: string | null; maintenance_date?: string | null; cost?: number | null; provider?: string | null; status: string; next_maintenance_date?: string | null; notes?: string | null; }
export interface Supplier extends IdRow { name: string; company_name?: string | null; ice?: string | null; if_number?: string | null; rc_number?: string | null; phone?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; notes?: string | null; is_active: boolean; }
export interface Purchase extends IdRow { purchase_number: string; supplier_id: string; location_id: string; supplier_invoice_number?: string | null; purchase_date: string; status: string; subtotal: number; discount: number; tax: number; total: number; notes?: string | null; created_by?: string | null; purchase_items?: PurchaseItem[]; }
export interface PurchaseItem extends IdRow { purchase_id: string; product_id: string; product_unit_id: string; batch_id?: string | null; quantity: number; unit_cost: number; discount: number; tax_rate: number; total: number; }
export interface Customer extends IdRow { customer_type: string; name: string; company_name?: string | null; patient_id?: string | null; phone?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; ice?: string | null; if_number?: string | null; rc_number?: string | null; notes?: string | null; is_active: boolean; }
export interface Quote extends IdRow { quote_number: string; customer_id: string; issue_date: string; valid_until?: string | null; status: string; subtotal: number; discount: number; tax: number; total: number; notes?: string | null; terms?: string | null; created_by?: string | null; }
export interface QuoteItem extends IdRow { quote_id: string; item_type: string; product_id?: string | null; product_unit_id?: string | null; service_id?: string | null; description: string; quantity: number; unit_price: number; discount: number; tax_rate: number; total: number; sort_order: number; }
export interface Invoice extends IdRow { invoice_number: string; customer_id: string; quote_id?: string | null; issue_date: string; due_date?: string | null; status: string; payment_status: string; subtotal: number; discount: number; tax: number; total: number; notes?: string | null; terms?: string | null; created_by?: string | null; }
export interface InvoiceItem extends IdRow { invoice_id: string; item_type: string; product_id?: string | null; product_unit_id?: string | null; service_id?: string | null; description: string; quantity: number; unit_price: number; discount: number; tax_rate: number; total: number; sort_order: number; }
export interface Payment extends IdRow { invoice_id: string; payment_number: string; payment_date: string; amount: number; payment_method: string; reference?: string | null; notes?: string | null; created_by?: string | null; }
export interface CreditNote extends IdRow { credit_note_number: string; invoice_id: string; customer_id: string; issue_date: string; reason?: string | null; status: string; subtotal: number; discount: number; tax: number; total: number; notes?: string | null; created_by?: string | null; }
export interface Rental extends IdRow { rental_number: string; customer_id?: string | null; patient_id?: string | null; starts_at?: string | null; ends_at?: string | null; status: string; deposit_amount?: number | null; total_amount?: number | null; notes?: string | null; created_by?: string | null; }
export interface RentalItem extends IdRow { rental_id: string; asset_id?: string | null; product_id?: string | null; rental_start: string; expected_return: string; actual_return?: string | null; rental_price: number; deposit_amount?: number | null; condition_before?: string | null; condition_after?: string | null; notes?: string | null; }
export interface Service extends IdRow { reference: string; name: string; description?: string | null; category_id?: string | null; unit_id: string; default_price?: number | null; tax_rate?: number | null; is_active: boolean; }
export interface ServiceOrder extends IdRow { order_number: string; patient_id?: string | null; customer_id?: string | null; service_type: string; prestation_category?: string | null; status: string; priority?: string | null; start_date?: string | null; end_date?: string | null; start_time?: string | null; end_time?: string | null; assigned_staff_id?: string | null; notes?: string | null; instructions_practitioner?: string | null; observations_internes?: string | null; service_price?: number | null; discount?: number | null; consumables_cost?: number | null; agency_fee?: number | null; travel_cost?: number | null; other_cost?: number | null; payment_method?: string | null; payment_status?: string | null; amount_paid?: number | null; }
export interface ServiceOrderConsumable extends IdRow { service_order_id: string; product_id: string; product_unit_id?: string | null; quantity: number; unit_cost: number; total: number; }
export interface ServiceOrderDocument extends IdRow { service_order_id: string; file_url: string; file_name: string; document_type?: string | null; file_size?: number | null; uploaded_by?: string | null; }
export interface ServiceVisit extends IdRow { service_order_id: string; patient_id?: string | null; staff_id?: string | null; scheduled_start: string; scheduled_end: string; actual_start?: string | null; actual_end?: string | null; status: string; notes?: string | null; }
export interface StaffSchedule extends IdRow { staff_id: string; schedule_date: string; start_time?: string | null; end_time?: string | null; schedule_type: string; location?: string | null; notes?: string | null; }
export interface PatientAssignment extends IdRow { patient_id: string; staff_id: string; start_date: string; end_date?: string | null; status: string; notes?: string | null; }
export interface Expense extends IdRow { expense_number: string; category_id?: string | null; supplier_id?: string | null; amount: number; tax_amount?: number | null; expense_date?: string | null; payment_method?: string | null; receipt_url?: string | null; reference_number?: string | null; notes?: string | null; created_by?: string | null; }
export interface ExpenseCategory extends IdRow { name: string; slug?: string | null; description?: string | null; }
export interface Document extends IdRow { entity_type: string; entity_id: string; file_url: string; file_name: string; document_type?: string | null; file_size?: number | null; uploaded_by?: string | null; }
export interface Settings extends IdRow { company_name?: string | null; company_address?: string | null; company_ice?: string | null; company_if?: string | null; company_rc?: string | null; company_phone?: string | null; company_email?: string | null; company_logo_url?: string | null; default_tax_rate?: number | null; invoice_terms?: string | null; quote_validity_days?: number | null; currency?: string | null; }
export interface DocumentSequence extends IdRow { document_type: string; prefix: string; year: number; current_number: number; padding: number; }

/** Stable shape returned by every ERP mutation (parity with web `ErpActionResult`). */
export interface ErpActionResult {
  ok: boolean;
  id?: string;
  data?: Record<string, unknown> | null;
  message?: string;
}




export interface Location extends IdRow { name: string; location_type: string; facility_id?: string | null; address_id?: string | null; parent_id?: string | null; is_active: boolean; }
export interface StockBalance extends IdRow { product_id: string; product_unit_id: string; location_id: string; quantity: number; reserved_quantity: number; }
export interface StockMovement extends IdRow { product_id: string; product_unit_id: string; location_id: string; movement_type: string; quantity: number; unit_cost?: number | null; batch_id?: string | null; reference_type?: string | null; reference_id?: string | null; notes?: string | null; created_by?: string | null; }
export interface StockCount extends IdRow { location_id?: string | null; count_date?: string | null; status: string; performed_by?: string | null; notes?: string | null; }
export interface StockCountItem extends IdRow { stock_count_id: string; product_id: string; expected_quantity: number; counted_quantity: number; difference: number; notes?: string | null; }
