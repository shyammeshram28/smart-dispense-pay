CREATE TABLE public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  rfid_uid text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  code text PRIMARY KEY,
  name text NOT NULL,
  price_per_kg numeric(10,2) NOT NULL,
  stock_grams integer NOT NULL DEFAULT 0,
  motor_channel integer NOT NULL DEFAULT 1
);
CREATE TABLE public.devices (
  id text PRIMARY KEY,
  name text NOT NULL,
  api_key text NOT NULL,
  last_seen timestamptz
);
CREATE TABLE public.transactions (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES public.customers(id),
  device_id text REFERENCES public.devices(id),
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'PAYMENT_PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  completed_at timestamptz
);
CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_code text NOT NULL REFERENCES public.products(code),
  qty_grams integer NOT NULL,
  dispensed_grams integer,
  amount numeric(10,2) NOT NULL
);
CREATE TABLE public.tx_counters (day date PRIMARY KEY, n integer NOT NULL DEFAULT 0);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['customers','products','devices','transactions','transaction_items','tx_counters'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.next_tx_id() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'Asia/Kolkata')::date; v integer;
BEGIN
  INSERT INTO tx_counters(day, n) VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET n = tx_counters.n + 1 RETURNING n INTO v;
  RETURN 'TX-' || to_char(d,'YYYYMMDD') || '-' || lpad(v::text, 3, '0');
END $$;
REVOKE EXECUTE ON FUNCTION public.next_tx_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_tx_id() TO service_role;

INSERT INTO public.customers VALUES ('CUST001','Rahul','A1B2C3D4', now()), ('CUST002','Priya','11223344', now()), ('CUST003','Amit','DEADBEEF', now());
INSERT INTO public.products VALUES ('RICE','Rice',25,50000,1), ('SUGAR','Sugar',53.33,30000,2), ('WHEAT','Wheat',30,40000,3);
INSERT INTO public.devices VALUES ('ATM01','Smart Ration ATM #1','atm01-demo-key-7f3k9q', NULL);