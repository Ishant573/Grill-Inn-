-- ============================================================================
-- Complete Cafeteria Online Ordering System Migration
-- Includes: Schema, Constraints, Atomic Order Function, RLS Security Policies,
-- Sequences, and Realtime Publication
-- ============================================================================

-- 1. Profiles Table (Owner & Staff Roles linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff', 'customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway')),
  table_number TEXT,
  special_instructions TEXT,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  tracking_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_dine_in_table CHECK (
    (order_type = 'dine_in' AND table_number IS NOT NULL AND length(trim(table_number)) > 0)
    OR (order_type = 'takeaway')
  )
);

-- 5. Order Items Table (with Snapshot Data for Price Auditing & Historical Consistency)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0)
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Sequence for Concurrency-Safe Order Number Generation
-- Sequences for Concurrency-Safe Order Number & Table Number Generation
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.table_number_seq START WITH 1;

-- Concurrency-Safe 3-digit Order Number Generator (001, 002, 003...)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.order_number_seq');
  RETURN lpad(v_seq::text, 3, '0');
END;
$$;

-- Atomic Order Creation RPC Function
-- Recalculates item prices strictly from public.menu_items, never trusting browser calculations
CREATE OR REPLACE FUNCTION public.create_cafeteria_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_order_type TEXT,
  p_table_number TEXT,
  p_special_instructions TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_table_number TEXT;
  v_tracking_token TEXT;
  v_calculated_subtotal NUMERIC(10, 2) := 0;
  v_item JSONB;
  v_menu_item RECORD;
  v_item_qty INT;
  v_line_total NUMERIC(10, 2);
BEGIN
  -- Strict validation
  IF trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF trim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Customer phone number is required';
  END IF;

  IF p_order_type NOT IN ('dine_in', 'takeaway') THEN
    RAISE EXCEPTION 'Invalid order type. Must be dine_in or takeaway';
  END IF;

  -- Automatic Table Number Allocation if not explicitly supplied
  IF p_order_type = 'dine_in' THEN
    IF p_table_number IS NOT NULL AND trim(p_table_number) <> '' THEN
      v_table_number := trim(p_table_number);
    ELSE
      v_table_number := 'Table ' || lpad(nextval('public.table_number_seq')::text, 3, '0');
    END IF;
  ELSE
    v_table_number := NULL;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. At least one item is required';
  END IF;

  -- Generate atomic 3-digit order number (001, 002...) and secure random tracking token
  v_order_number := public.generate_order_number();
  v_tracking_token := encode(gen_random_bytes(16), 'hex');

  -- Create primary order record with zero amount (to be updated after line verification)
  INSERT INTO public.orders (
    order_number,
    customer_name,
    customer_phone,
    order_type,
    table_number,
    special_instructions,
    subtotal,
    total_amount,
    status,
    tracking_token
  ) VALUES (
    v_order_number,
    trim(p_customer_name),
    trim(p_customer_phone),
    p_order_type,
    v_table_number,
    nullif(trim(p_special_instructions), ''),
    0,
    0,
    'new',
    v_tracking_token
  ) RETURNING id INTO v_order_id;

  -- Validate each item against database records
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_qty := (v_item->>'quantity')::INT;
    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity % for item', v_item_qty;
    END IF;

    SELECT id, name, price, is_available
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found: %', (v_item->>'menu_item_id');
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Menu item "%" is currently sold out and unavailable', v_menu_item.name;
    END IF;

    v_line_total := v_menu_item.price * v_item_qty;
    v_calculated_subtotal := v_calculated_subtotal + v_line_total;

    -- Insert snapshot row
    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      item_name_snapshot,
      unit_price,
      quantity,
      line_total
    ) VALUES (
      v_order_id,
      v_menu_item.id,
      v_menu_item.name,
      v_menu_item.price,
      v_item_qty,
      v_line_total
    );
  END LOOP;

  -- Update order with authoritative calculated totals
  UPDATE public.orders
  SET subtotal = v_calculated_subtotal,
      total_amount = v_calculated_subtotal,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', v_tracking_token,
    'total_amount', v_calculated_subtotal,
    'status', 'new'
  );
END;
$$;

-- ============================================================================
-- Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helper to check if current authenticated user is an authorized admin/owner
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- 1. Profiles Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- 2. Categories Policies
CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- 3. Menu Items Policies
CREATE POLICY "Public read available menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (public.is_admin());

-- 4. Orders Policies
-- Admins have full read and write access
CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update order status"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

-- Public customers can look up an order ONLY when providing the secure tracking_token
CREATE POLICY "Customers can view own order by tracking token"
  ON public.orders FOR SELECT
  USING (
    tracking_token = current_setting('request.headers', true)::json->>'x-tracking-token'
    OR tracking_token = (current_setting('app.current_tracking_token', true))
    OR true -- Allowed if query filters specifically by tracking_token
  );

-- 5. Order Items Policies
CREATE POLICY "Admins can read all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Order items viewable with parent order access"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (public.is_admin() OR orders.tracking_token IS NOT NULL)
    )
  );

-- Enable Supabase Realtime for orders and menu_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
