-- ============================================================================
-- Supabase SQL Editor Script: Permissions, RLS & Order Creation
-- Run this in the Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Ensure Postgres roles have permissions on the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Ensure orders table has all expected columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Categories Policies
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (true);

-- Menu Items Policies
DROP POLICY IF EXISTS "Public read menu items" ON public.menu_items;
CREATE POLICY "Public read menu items" ON public.menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage menu items" ON public.menu_items;
CREATE POLICY "Admins manage menu items" ON public.menu_items
  FOR ALL TO authenticated USING (true);

-- Orders Policies
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Customers view order by token or id" ON public.orders;
CREATE POLICY "Customers view order by token or id" ON public.orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow order insertion" ON public.orders;
CREATE POLICY "Allow order insertion" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Order Items Policies
DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read order items" ON public.order_items;
CREATE POLICY "Public read order items" ON public.order_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow order items insertion" ON public.order_items;
CREATE POLICY "Allow order items insertion" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 4. Atomic Order Creation Function (supports p_notes and p_items)
CREATE OR REPLACE FUNCTION public.create_cafeteria_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_order_type TEXT,
  p_table_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_num INT;
  v_item JSONB;
  v_subtotal NUMERIC(10, 2) := 0;
  v_item_price NUMERIC(10, 2);
  v_item_name TEXT;
  v_qty INT;
  v_line_total NUMERIC(10, 2);
  v_tracking_token TEXT;
BEGIN
  IF trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  -- Determine next integer order number
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_order_num FROM public.orders;
  v_tracking_token := encode(gen_random_bytes(16), 'hex');

  -- Create primary order record
  INSERT INTO public.orders (
    order_number,
    customer_name,
    customer_phone,
    order_type,
    table_number,
    notes,
    status,
    payment_status,
    subtotal,
    tracking_token,
    created_at,
    updated_at
  ) VALUES (
    v_order_num,
    trim(p_customer_name),
    trim(p_customer_phone),
    p_order_type,
    p_table_number,
    p_notes,
    'pending',
    'pending',
    0,
    v_tracking_token,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ) RETURNING id INTO v_order_id;

  -- Verify each item and insert into order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    IF v_qty <= 0 THEN
      v_qty := 1;
    END IF;

    SELECT name, price INTO v_item_name, v_item_price
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID;

    IF FOUND THEN
      v_line_total := v_item_price * v_qty;
      v_subtotal := v_subtotal + v_line_total;

      INSERT INTO public.order_items (
        order_id,
        menu_item_id,
        item_name,
        unit_price,
        quantity,
        line_total,
        created_at
      ) VALUES (
        v_order_id,
        (v_item->>'menu_item_id')::UUID,
        v_item_name,
        v_item_price,
        v_qty,
        v_line_total,
        timezone('utc'::text, now())
      );
    END IF;
  END LOOP;

  -- Update order with verified subtotal
  UPDATE public.orders
  SET subtotal = v_subtotal,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_num,
    'tracking_token', v_tracking_token,
    'subtotal', v_subtotal,
    'status', 'pending'
  );
END;
$$;
