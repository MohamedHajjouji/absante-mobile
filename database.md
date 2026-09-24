before u continue i ordered the removal of the settings section, no need for it 
and also here is the updated database structure i have rn
-- WARNING: This schema is for context only and is not meant to be run.

-- Table order and constraints may not be valid for execution.

CREATE TABLE ab_erp.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  description text,
  parent_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ab_erp.categories(id)
);
CREATE TABLE ab_erp.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM name)) > 0),
  symbol text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM symbol)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT units_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM reference)) > 0),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  description text,
  category_id uuid,
  brand text,
  tracking_type text NOT NULL DEFAULT 'quantity'::text CHECK (tracking_type = ANY (ARRAY['quantity'::text, 'batch'::text, 'serialized'::text])),
  is_sellable boolean NOT NULL DEFAULT true,
  is_rentable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  minimum_stock numeric CHECK (minimum_stock IS NULL OR minimum_stock >= 0::numeric),
  maximum_stock numeric CHECK (maximum_stock IS NULL OR maximum_stock >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES ab_erp.categories(id)
);
CREATE TABLE ab_erp.product_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  conversion_factor numeric NOT NULL DEFAULT 1 CHECK (conversion_factor > 0::numeric),
  barcode text,
  purchase_price numeric CHECK (purchase_price IS NULL OR purchase_price >= 0::numeric),
  selling_price numeric CHECK (selling_price IS NULL OR selling_price >= 0::numeric),
  rental_price numeric CHECK (rental_price IS NULL OR rental_price >= 0::numeric),
  is_purchase_unit boolean NOT NULL DEFAULT false,
  is_sale_unit boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_units_pkey PRIMARY KEY (id),
  CONSTRAINT product_units_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT product_units_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES ab_erp.units(id)
);
CREATE TABLE ab_erp.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM reference)) > 0),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  description text,
  category_id uuid,
  unit_id uuid NOT NULL,
  default_price numeric CHECK (default_price IS NULL OR default_price >= 0::numeric),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0::numeric AND tax_rate <= 100::numeric),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES ab_erp.categories(id),
  CONSTRAINT services_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES ab_erp.units(id)
);
CREATE TABLE ab_erp.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  location_type text NOT NULL DEFAULT 'warehouse'::text CHECK (location_type = ANY (ARRAY['warehouse'::text, 'storage_room'::text, 'vehicle'::text, 'clinic'::text, 'office'::text, 'other'::text])),
  facility_id uuid,
  address_id uuid,
  parent_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT locations_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id),
  CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ab_erp.locations(id)
);
CREATE TABLE ab_erp.stock_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_unit_id uuid NOT NULL,
  location_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0::numeric),
  reserved_quantity numeric NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0::numeric),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_balances_pkey PRIMARY KEY (id),
  CONSTRAINT stock_balances_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT stock_balances_product_unit_id_fkey FOREIGN KEY (product_unit_id) REFERENCES ab_erp.product_units(id),
  CONSTRAINT stock_balances_location_id_fkey FOREIGN KEY (location_id) REFERENCES ab_erp.locations(id)
);
CREATE TABLE ab_erp.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_unit_id uuid NOT NULL,
  location_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'rental_out'::text, 'rental_return'::text, 'care_usage'::text, 'transfer_in'::text, 'transfer_out'::text, 'damaged'::text, 'expired'::text, 'adjustment_in'::text, 'adjustment_out'::text, 'customer_return'::text])),
  quantity numeric NOT NULL CHECK (quantity > 0::numeric),
  unit_cost numeric CHECK (unit_cost IS NULL OR unit_cost >= 0::numeric),
  batch_id uuid,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES ab_erp.locations(id),
  CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT stock_movements_product_unit_id_fkey FOREIGN KEY (product_unit_id) REFERENCES ab_erp.product_units(id),
  CONSTRAINT stock_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES ab_erp.product_batches(id)
);
CREATE TABLE ab_erp.product_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  batch_number text NOT NULL CHECK (length(TRIM(BOTH FROM batch_number)) > 0),
  manufacturing_date date,
  expiry_date date,
  supplier_id uuid,
  purchase_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_batches_pkey PRIMARY KEY (id),
  CONSTRAINT product_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id)
);
CREATE TABLE ab_erp.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  asset_reference text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM asset_reference)) > 0),
  serial_number text UNIQUE,
  barcode text UNIQUE,
  location_id uuid,
  status text NOT NULL DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'reserved'::text, 'rented'::text, 'in_repair'::text, 'damaged'::text, 'lost'::text, 'retired'::text])),
  condition text NOT NULL DEFAULT 'good'::text CHECK (condition = ANY (ARRAY['new'::text, 'good'::text, 'fair'::text, 'poor'::text, 'damaged'::text])),
  purchase_date date,
  purchase_price numeric CHECK (purchase_price IS NULL OR purchase_price >= 0::numeric),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT assets_location_id_fkey FOREIGN KEY (location_id) REFERENCES ab_erp.locations(id)
);
CREATE TABLE ab_erp.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  company_name text,
  ice text,
  if_number text,
  rc_number text,
  phone text,
  email text,
  address text,
  city text,
  country text DEFAULT 'Morocco'::text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_number text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM purchase_number)) > 0),
  supplier_id uuid NOT NULL,
  location_id uuid NOT NULL,
  supplier_invoice_number text,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'ordered'::text, 'partially_received'::text, 'received'::text, 'cancelled'::text])),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0::numeric),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES ab_erp.suppliers(id),
  CONSTRAINT purchases_location_id_fkey FOREIGN KEY (location_id) REFERENCES ab_erp.locations(id),
  CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.purchase_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_unit_id uuid NOT NULL,
  batch_id uuid,
  quantity numeric NOT NULL CHECK (quantity > 0::numeric),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0::numeric AND tax_rate <= 100::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchase_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES ab_erp.purchases(id)
);
CREATE TABLE ab_erp.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_type text NOT NULL DEFAULT 'individual'::text CHECK (customer_type = ANY (ARRAY['individual'::text, 'company'::text, 'clinic'::text, 'organization'::text, 'other'::text])),
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  company_name text,
  patient_id uuid,
  phone text,
  email text,
  address text,
  city text,
  country text DEFAULT 'Morocco'::text,
  ice text,
  if_number text,
  rc_number text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE ab_erp.document_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type = ANY (ARRAY['quote'::text, 'invoice'::text, 'purchase'::text, 'credit_note'::text, 'rental'::text])),
  prefix text NOT NULL CHECK (length(TRIM(BOTH FROM prefix)) > 0),
  year integer NOT NULL CHECK (year >= 2000),
  current_number integer NOT NULL DEFAULT 0 CHECK (current_number >= 0),
  padding integer NOT NULL DEFAULT 5 CHECK (padding >= 1 AND padding <= 10),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_sequences_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM quote_number)) > 0),
  customer_id uuid NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0::numeric),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  notes text,
  terms text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ab_erp.customers(id),
  CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['product'::text, 'service'::text])),
  product_id uuid,
  product_unit_id uuid,
  service_id uuid,
  description text NOT NULL CHECK (length(TRIM(BOTH FROM description)) > 0),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0::numeric AND tax_rate <= 100::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quote_items_pkey PRIMARY KEY (id),
  CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES ab_erp.quotes(id),
  CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT quote_items_product_unit_id_fkey FOREIGN KEY (product_unit_id) REFERENCES ab_erp.product_units(id),
  CONSTRAINT quote_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES ab_erp.services(id)
);
CREATE TABLE ab_erp.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM invoice_number)) > 0),
  customer_id uuid NOT NULL,
  quote_id uuid,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text])),
  payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'paid'::text, 'overdue'::text])),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0::numeric),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  notes text,
  terms text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ab_erp.customers(id),
  CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES ab_erp.quotes(id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['product'::text, 'service'::text])),
  product_id uuid,
  product_unit_id uuid,
  service_id uuid,
  description text NOT NULL CHECK (length(TRIM(BOTH FROM description)) > 0),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0::numeric AND tax_rate <= 100::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ab_erp.invoices(id),
  CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT invoice_items_product_unit_id_fkey FOREIGN KEY (product_unit_id) REFERENCES ab_erp.product_units(id),
  CONSTRAINT invoice_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES ab_erp.services(id)
);
CREATE TABLE ab_erp.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  payment_number text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM payment_number)) > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'card'::text, 'cheque'::text, 'online'::text, 'other'::text])),
  reference text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ab_erp.invoices(id),
  CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.credit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM credit_note_number)) > 0),
  invoice_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text])),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0::numeric),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT credit_notes_pkey PRIMARY KEY (id),
  CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ab_erp.invoices(id),
  CONSTRAINT credit_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ab_erp.customers(id)
);
CREATE TABLE ab_erp.credit_note_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['product'::text, 'service'::text])),
  product_id uuid,
  product_unit_id uuid,
  service_id uuid,
  description text NOT NULL CHECK (length(TRIM(BOTH FROM description)) > 0),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0::numeric),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0::numeric),
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0::numeric AND tax_rate <= 100::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT credit_note_items_pkey PRIMARY KEY (id),
  CONSTRAINT credit_note_items_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES ab_erp.credit_notes(id),
  CONSTRAINT credit_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT credit_note_items_product_unit_id_fkey FOREIGN KEY (product_unit_id) REFERENCES ab_erp.product_units(id),
  CONSTRAINT credit_note_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES ab_erp.services(id)
);
CREATE TABLE ab_erp.rentals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rental_number text NOT NULL UNIQUE,
  customer_id uuid,
  patient_id uuid,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'partially_returned'::text, 'returned'::text, 'overdue'::text, 'cancelled'::text])),
  deposit_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rentals_pkey PRIMARY KEY (id),
  CONSTRAINT rentals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT rentals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT rentals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ab_erp.customers(id)
);
CREATE TABLE ab_erp.rental_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL,
  asset_id uuid,
  product_id uuid,
  rental_start timestamp with time zone NOT NULL,
  expected_return timestamp with time zone NOT NULL,
  actual_return timestamp with time zone,
  rental_price numeric NOT NULL DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  condition_before text,
  condition_after text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rental_items_pkey PRIMARY KEY (id),
  CONSTRAINT rental_items_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES ab_erp.rentals(id),
  CONSTRAINT rental_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES ab_erp.assets(id),
  CONSTRAINT rental_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id)
);
CREATE TABLE ab_erp.asset_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  from_location text,
  to_location text,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['warehouse_to_nurse'::text, 'nurse_to_patient'::text, 'patient_to_warehouse'::text, 'warehouse_to_repair'::text, 'repair_to_warehouse'::text, 'other'::text])),
  rental_id uuid,
  performed_by uuid,
  movement_date timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT asset_movements_pkey PRIMARY KEY (id),
  CONSTRAINT asset_movements_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES ab_erp.rentals(id),
  CONSTRAINT asset_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id),
  CONSTRAINT asset_movements_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES ab_erp.assets(id)
);
CREATE TABLE ab_erp.asset_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  maintenance_date timestamp with time zone DEFAULT now(),
  cost numeric DEFAULT 0,
  provider text,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  next_maintenance_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT asset_maintenance_pkey PRIMARY KEY (id),
  CONSTRAINT asset_maintenance_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES ab_erp.assets(id)
);
CREATE TABLE ab_erp.staff_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  schedule_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  schedule_type text NOT NULL DEFAULT 'work'::text CHECK (schedule_type = ANY (ARRAY['work'::text, 'leave'::text, 'absence'::text, 'on_call'::text])),
  location text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES ab_erp.staff_members(id)
);
CREATE TABLE ab_erp.patient_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT patient_assignments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ab_erp.erp_patients(id),
  CONSTRAINT patient_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES ab_erp.staff_members(id)
);
CREATE TABLE ab_erp.service_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  patient_id uuid,
  customer_id uuid,
  service_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  start_date date,
  end_date date,
  assigned_staff_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_orders_pkey PRIMARY KEY (id),
  CONSTRAINT service_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ab_erp.customers(id),
  CONSTRAINT service_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ab_erp.erp_patients(id),
  CONSTRAINT service_orders_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES ab_erp.staff_members(id)
);
CREATE TABLE ab_erp.service_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL,
  patient_id uuid,
  staff_id uuid,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_visits_pkey PRIMARY KEY (id),
  CONSTRAINT service_visits_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES ab_erp.service_orders(id),
  CONSTRAINT service_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES ab_erp.erp_patients(id),
  CONSTRAINT service_visits_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES ab_erp.staff_members(id)
);
CREATE TABLE ab_erp.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_number text NOT NULL UNIQUE,
  category_id uuid,
  supplier_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  expense_date date DEFAULT CURRENT_DATE,
  payment_method text,
  receipt_url text,
  reference_number text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES ab_erp.expense_categories(id)
);
CREATE TABLE ab_erp.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.stock_counts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid,
  count_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  performed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_counts_pkey PRIMARY KEY (id),
  CONSTRAINT stock_counts_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.stock_count_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL,
  product_id uuid NOT NULL,
  expected_quantity numeric DEFAULT 0,
  counted_quantity numeric DEFAULT 0,
  difference numeric DEFAULT (counted_quantity - expected_quantity),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_count_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_count_items_stock_count_id_fkey FOREIGN KEY (stock_count_id) REFERENCES ab_erp.stock_counts(id),
  CONSTRAINT stock_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id)
);
CREATE TABLE ab_erp.stock_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type = ANY (ARRAY['damaged'::text, 'lost'::text, 'found'::text, 'count_correction'::text, 'expired'::text])),
  quantity numeric NOT NULL,
  location_id uuid,
  reason text,
  performed_by uuid,
  adjustment_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT stock_adjustments_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id),
  CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES ab_erp.products(id),
  CONSTRAINT stock_adjustments_location_id_fkey FOREIGN KEY (location_id) REFERENCES ab_erp.locations(id)
);
CREATE TABLE ab_erp.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  document_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE ab_erp.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name text,
  company_address text,
  company_ice text,
  company_if text,
  company_rc text,
  company_phone text,
  company_email text,
  company_logo_url text,
  default_tax_rate numeric DEFAULT 20,
  invoice_terms text,
  quote_validity_days integer DEFAULT 30,
  currency text DEFAULT 'MAD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.staff_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (length(TRIM(BOTH FROM first_name)) > 0),
  last_name text NOT NULL CHECK (length(TRIM(BOTH FROM last_name)) > 0),
  email text,
  phone text,
  role text NOT NULL DEFAULT 'Personnel'::text CHECK (length(TRIM(BOTH FROM role)) > 0),
  gender text,
  birth_date date,
  hire_date date,
  address text,
  city text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_members_pkey PRIMARY KEY (id)
);
CREATE TABLE ab_erp.erp_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (length(TRIM(BOTH FROM first_name)) > 0),
  last_name text NOT NULL CHECK (length(TRIM(BOTH FROM last_name)) > 0),
  email text,
  phone text,
  gender text,
  birth_date date,
  blood_type text,
  allergies text,
  address text,
  city text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_patients_pkey PRIMARY KEY (id)
);
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email USER-DEFINED NOT NULL UNIQUE,
  phone text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  gender USER-DEFINED,
  birth_date date,
  preferred_language text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_type text,
  allergies text,
  chronic_conditions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  provider_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  gender text,
  avatar_url text,
  birth_date date,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT patients_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'Morocco'::text,
  region text,
  city text NOT NULL,
  postal_code text,
  street_address text NOT NULL,
  latitude double precision,
  longitude double precision,
  location USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  city_id uuid,
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cover_url text,
  description text,
  email USER-DEFINED,
  phone text,
  whatsapp text,
  website text,
  verified boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  address_id uuid,
  name text NOT NULL,
  phone text,
  whatsapp text,
  email USER-DEFINED,
  website text,
  description text,
  parking_available boolean DEFAULT false,
  wheelchair_accessible boolean DEFAULT false,
  emergency_services boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT facilities_pkey PRIMARY KEY (id),
  CONSTRAINT facilities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT facilities_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);
CREATE TABLE public.professions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_ar text,
  name_en text,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT professions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  profession_id uuid NOT NULL,
  biography text,
  years_of_experience integer,
  license_number text,
  gender USER-DEFINED,
  accepts_new_patients boolean DEFAULT true,
  emergency_available boolean DEFAULT false,
  same_day_appointments boolean DEFAULT false,
  response_time_minutes integer,
  average_rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  verified_status USER-DEFINED DEFAULT 'pending'::verification_status_enum,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  onboarding_completed boolean DEFAULT false,
  profile_completion_pct integer DEFAULT 0,
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT providers_profession_id_fkey FOREIGN KEY (profession_id) REFERENCES public.professions(id)
);
CREATE TABLE public.provider_organizations (
  provider_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  primary_organization boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_organizations_pkey PRIMARY KEY (provider_id, organization_id),
  CONSTRAINT provider_organizations_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.provider_facilities (
  provider_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  primary_facility boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_facilities_pkey PRIMARY KEY (provider_id, facility_id),
  CONSTRAINT provider_facilities_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_facilities_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.provider_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  specialty_id uuid,
  name text NOT NULL,
  description text,
  service_type USER-DEFINED NOT NULL,
  booking_mode USER-DEFINED NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  price numeric NOT NULL CHECK (price >= 0::numeric),
  currency character DEFAULT 'MAD'::bpchar,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_services_pkey PRIMARY KEY (id),
  CONSTRAINT provider_services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.provider_calendars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  facility_id uuid,
  name text NOT NULL,
  description text,
  timezone text NOT NULL DEFAULT 'Africa/Casablanca'::text,
  slot_interval_minutes integer NOT NULL DEFAULT 5 CHECK (slot_interval_minutes > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_calendars_pkey PRIMARY KEY (id),
  CONSTRAINT provider_calendars_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_calendars_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.calendar_working_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL,
  weekday USER-DEFINED NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_working_hours_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_working_hours_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendars(id)
);
CREATE TABLE public.calendar_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_exceptions_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_exceptions_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendars(id)
);
CREATE TABLE public.provider_status (
  provider_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  custom_message text,
  next_available_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_status_pkey PRIMARY KEY (provider_id),
  CONSTRAINT provider_status_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.calendar_services (
  calendar_id uuid NOT NULL,
  provider_service_id uuid NOT NULL,
  CONSTRAINT calendar_services_pkey PRIMARY KEY (calendar_id, provider_service_id),
  CONSTRAINT calendar_services_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendars(id),
  CONSTRAINT calendar_services_provider_service_id_fkey FOREIGN KEY (provider_service_id) REFERENCES public.provider_services(id)
);
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  provider_service_id uuid NOT NULL,
  facility_id uuid,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::appointment_status_enum,
  patient_notes text,
  internal_notes text,
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendars(id),
  CONSTRAINT appointments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_provider_service_id_fkey FOREIGN KEY (provider_service_id) REFERENCES public.provider_services(id),
  CONSTRAINT appointments_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.languages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text,
  name_ar text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT languages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_languages (
  provider_id uuid NOT NULL,
  language_id uuid NOT NULL,
  CONSTRAINT provider_languages_pkey PRIMARY KEY (provider_id, language_id),
  CONSTRAINT provider_languages_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_languages_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id)
);
CREATE TABLE public.provider_specialties (
  provider_id uuid NOT NULL,
  specialty_id uuid NOT NULL,
  CONSTRAINT provider_specialties_pkey PRIMARY KEY (provider_id, specialty_id),
  CONSTRAINT provider_specialties_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.insurances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT insurances_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_insurances (
  provider_id uuid NOT NULL,
  insurance_id uuid NOT NULL,
  CONSTRAINT provider_insurances_pkey PRIMARY KEY (provider_id, insurance_id),
  CONSTRAINT provider_insurances_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_insurances_insurance_id_fkey FOREIGN KEY (insurance_id) REFERENCES public.insurances(id)
);
CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  icon text,
  name_fr text,
  name_en text,
  name_ar text,
  CONSTRAINT features_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_features (
  provider_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  CONSTRAINT provider_features_pkey PRIMARY KEY (provider_id, feature_id),
  CONSTRAINT provider_features_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  slug text UNIQUE,
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_payment_methods (
  provider_id uuid NOT NULL,
  payment_method_id uuid NOT NULL,
  CONSTRAINT provider_payment_methods_pkey PRIMARY KEY (provider_id, payment_method_id),
  CONSTRAINT provider_payment_methods_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_payment_methods_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);
CREATE TABLE public.provider_verifications (
  provider_id uuid NOT NULL,
  license_document text,
  national_id_document text,
  professional_order_document text,
  verified_by uuid,
  verified_at timestamp with time zone,
  status USER-DEFINED DEFAULT 'pending'::verification_status_enum,
  rejection_reason text,
  CONSTRAINT provider_verifications_pkey PRIMARY KEY (provider_id),
  CONSTRAINT provider_verifications_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid UNIQUE,
  provider_id uuid,
  patient_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.provider_service_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_service_id uuid NOT NULL,
  facility_id uuid,
  price numeric NOT NULL,
  currency character NOT NULL DEFAULT 'MAD'::bpchar,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_service_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT provider_service_pricing_provider_service_id_fkey FOREIGN KEY (provider_service_id) REFERENCES public.provider_services(id),
  CONSTRAINT provider_service_pricing_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.provider_availability_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  calendar_id uuid NOT NULL,
  provider_service_id uuid,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_availability_cache_pkey PRIMARY KEY (id),
  CONSTRAINT provider_availability_cache_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_availability_cache_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.provider_calendars(id),
  CONSTRAINT provider_availability_cache_provider_service_id_fkey FOREIGN KEY (provider_service_id) REFERENCES public.provider_services(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_profile_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.specialty_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text,
  name_ar text,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT specialty_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text,
  name_en text,
  name_ar text,
  icon text,
  color text,
  description text,
  automatic boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_badges (
  provider_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  awarded_at timestamp with time zone DEFAULT now(),
  awarded_by uuid,
  CONSTRAINT provider_badges_pkey PRIMARY KEY (provider_id, badge_id),
  CONSTRAINT provider_badges_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id),
  CONSTRAINT provider_badges_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.provider_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  facility_id uuid,
  media_type USER-DEFINED NOT NULL,
  storage_path text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_media_pkey PRIMARY KEY (id),
  CONSTRAINT provider_media_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_media_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  appointment_id uuid,
  channel USER-DEFINED,
  title text,
  body text,
  status USER-DEFINED DEFAULT 'pending'::notification_status_enum,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  monthly_price numeric,
  yearly_price numeric,
  appointment_booking boolean DEFAULT false,
  teleconsultation boolean DEFAULT false,
  analytics boolean DEFAULT false,
  whatsapp_reminders boolean DEFAULT false,
  featured_listing boolean DEFAULT false,
  priority_support boolean DEFAULT false,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.provider_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid,
  plan_id uuid,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  status USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT provider_subscriptions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);
CREATE TABLE public.provider_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_staff_pkey PRIMARY KEY (id),
  CONSTRAINT provider_staff_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_staff_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.appointment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  performed_by uuid,
  event_type USER-DEFINED,
  old_data jsonb,
  new_data jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointment_events_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_events_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT appointment_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.provider_verification_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type = ANY (ARRAY['licenseDocument'::text, 'nationalIdDocument'::text, 'professionalOrderDocument'::text])),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_verification_documents_pkey PRIMARY KEY (id),
  CONSTRAINT provider_verification_documents_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.patient_prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  prescribed_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT patient_prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_prescriptions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.patient_consultations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  appointment_id uuid,
  visit_date timestamp with time zone DEFAULT now(),
  reason text,
  diagnosis text,
  treatment_plan text,
  notes text,
  follow_up_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_consultations_pkey PRIMARY KEY (id),
  CONSTRAINT patient_consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_consultations_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT patient_consultations_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);
CREATE TABLE public.patient_vitals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  heart_rate integer,
  temperature numeric,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric,
  oxygen_saturation integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_vitals_pkey PRIMARY KEY (id),
  CONSTRAINT patient_vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_vitals_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.patient_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  document_type text CHECK (document_type = ANY (ARRAY['scan'::text, 'lab_result'::text, 'prescription'::text, 'report'::text, 'referral'::text, 'other'::text])),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_documents_pkey PRIMARY KEY (id),
  CONSTRAINT patient_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_documents_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);
CREATE TABLE public.specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profession_id uuid,
  category_id uuid,
  slug text UNIQUE,
  name_fr text NOT NULL,
  name_ar text,
  name_en text,
  icon text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT specialties_pkey PRIMARY KEY (id),
  CONSTRAINT specialties_profession_id_fkey FOREIGN KEY (profession_id) REFERENCES public.professions(id),
  CONSTRAINT specialties_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.specialty_categories(id)
);
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_fr text NOT NULL,
  name_ar text,
  region text NOT NULL,
  slug text NOT NULL UNIQUE,
  latitude double precision,
  longitude double precision,
  population integer,
  is_major boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cities_pkey PRIMARY KEY (id)
);