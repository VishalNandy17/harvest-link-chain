-- ============================================================
-- HarvestLink Master Schema
-- Clean consolidated migration for fresh Supabase project
-- Generated: 2026-11-19
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'farmer','distributor','retailer','consumer','admin',
    'procurement','warehouse','transporter','auditor'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── TABLES ───────────────────────────────────────────────────

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'consumer'
                    CHECK (role IN ('farmer','distributor','retailer','consumer','admin',
                                    'procurement','warehouse','transporter','auditor')),
  requested_role  TEXT NOT NULL DEFAULT 'consumer'
                    CHECK (requested_role IN ('farmer','distributor','retailer','consumer',
                                              'procurement','warehouse','transporter','auditor')),
  wallet_address  TEXT,
  phone           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wallet_address_unique
  ON public.profiles (lower(wallet_address))
  WHERE wallet_address IS NOT NULL;

-- crops
CREATE TABLE IF NOT EXISTS public.crops (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  quantity        NUMERIC NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'kg',
  price_per_unit  NUMERIC NOT NULL DEFAULT 0,
  predicted_price NUMERIC,
  msp_per_kg      NUMERIC,
  harvest_date    DATE,
  location        TEXT,
  region          TEXT,
  certifications  TEXT[],
  farmer_wallet   TEXT,
  image_hash      TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','registered','processing','available','sold')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- batches
CREATE TABLE IF NOT EXISTS public.batches (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id         UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  batch_number    TEXT NOT NULL UNIQUE,
  qr_code         TEXT NOT NULL UNIQUE,
  quantity        NUMERIC NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'kg',
  price_per_unit  NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','available','purchased','in_transit','delivered')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id         UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  buyer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity         NUMERIC NOT NULL,
  total_price      NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- price_predictions
CREATE TABLE IF NOT EXISTS public.price_predictions (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name        TEXT NOT NULL,
  current_price    NUMERIC NOT NULL,
  predicted_price  NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  factors          JSONB,
  valid_until      TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- blockchain_records
CREATE TABLE IF NOT EXISTS public.blockchain_records (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  batch_id         UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  record_type      TEXT NOT NULL
                     CHECK (record_type IN ('crop_registration','transaction','quality_check','transfer')),
  data             JSONB NOT NULL DEFAULT '{}',
  hash             TEXT NOT NULL UNIQUE,
  previous_hash    TEXT,
  verified         BOOLEAN NOT NULL DEFAULT false,
  -- Ethereum fields (added in later migration)
  chain_id         TEXT,
  contract_address TEXT,
  transaction_hash TEXT,
  event_name       TEXT,
  block_number     BIGINT,
  log_index        INTEGER,
  verified_at      TIMESTAMPTZ,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blockchain_records_chain_event_unique
  ON public.blockchain_records (chain_id, transaction_hash, log_index)
  WHERE transaction_hash IS NOT NULL AND log_index IS NOT NULL;

-- procedures
CREATE TABLE IF NOT EXISTS public.procedures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_id         UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  batch_id        UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  quantity        NUMERIC NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'kg',
  price_per_unit  NUMERIC NOT NULL,
  msp_per_kg      NUMERIC,
  predicted_price NUMERIC,
  region          TEXT,
  image_hash      TEXT,
  farmer_wallet   TEXT,
  qr_code         TEXT UNIQUE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'listed'
                    CHECK (status IN ('listed','in_transit','delivered','sold')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crops_farmer_id ON public.crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_crop_id ON public.batches(crop_id);
CREATE INDEX IF NOT EXISTS idx_batches_qr_code ON public.batches(qr_code);
CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON public.transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_batch_id ON public.blockchain_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_procedures_farmer_id ON public.procedures(farmer_id);
CREATE INDEX IF NOT EXISTS idx_procedures_qr_code ON public.procedures(qr_code);

-- ── FUNCTIONS ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user: called on auth.users INSERT
-- Signup requests a role; it never grants the role. Admin must approve.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested TEXT;
BEGIN
  requested := lower(coalesce(NEW.raw_user_meta_data->>'requestedRole', 'consumer'));
  IF requested NOT IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor') THEN
    requested := 'consumer';
  END IF;
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    NEW.email,
    'consumer',
    requested
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- prevent_self_role_change: users cannot change their own role or wallet via RLS
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Role changes require administrator approval';
    END IF;
    IF NEW.wallet_address IS DISTINCT FROM OLD.wallet_address THEN
      RAISE EXCEPTION 'Wallet changes require a verified wallet signature';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── TRIGGERS ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crops_updated_at ON public.crops;
CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_batches_updated_at ON public.batches;
CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

DROP TRIGGER IF EXISTS trg_procedures_updated_at ON public.procedures;
CREATE TRIGGER trg_procedures_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures        ENABLE ROW LEVEL SECURITY;

-- profiles: users can only see/edit their own
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- crops
CREATE POLICY crops_select_own ON public.crops
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = crops.farmer_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Farmers can insert their own crops" ON public.crops
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = farmer_id AND user_id = auth.uid() AND role = 'farmer'
  ));
CREATE POLICY "Farmers can update their own crops" ON public.crops
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = farmer_id AND user_id = auth.uid() AND role = 'farmer'
  ));

-- batches
CREATE POLICY batches_select_own ON public.batches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crops c
    JOIN public.profiles p ON p.id = c.farmer_id
    WHERE c.id = batches.crop_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Farmers can insert batches for their crops" ON public.batches
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.crops c
    JOIN public.profiles p ON c.farmer_id = p.id
    WHERE c.id = crop_id AND p.user_id = auth.uid() AND p.role = 'farmer'
  ));
CREATE POLICY "Farmers can update their own batches" ON public.batches
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.crops c
    JOIN public.profiles p ON c.farmer_id = p.id
    WHERE c.id = crop_id AND p.user_id = auth.uid() AND p.role = 'farmer'
  ));

-- transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id IN (buyer_id, seller_id) AND user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = buyer_id AND user_id = auth.uid())
  );

-- price_predictions
CREATE POLICY "Anyone can view price predictions" ON public.price_predictions
  FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert predictions" ON public.price_predictions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- blockchain_records: service-role writes, public reads for lot verification
CREATE POLICY "Public can view blockchain records" ON public.blockchain_records
  FOR SELECT USING (true);
CREATE POLICY "System can insert blockchain records" ON public.blockchain_records
  FOR INSERT WITH CHECK (true);

-- procedures
CREATE POLICY procedures_insert_own ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = procedures.farmer_id AND p.user_id = auth.uid() AND p.role = 'farmer'
  ));
CREATE POLICY procedures_select_own ON public.procedures
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = procedures.farmer_id AND p.user_id = auth.uid()
  ));
CREATE POLICY procedures_select_admin ON public.procedures
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  ));

-- ── REALTIME ─────────────────────────────────────────────────
ALTER TABLE public.profiles          REPLICA IDENTITY FULL;
ALTER TABLE public.crops             REPLICA IDENTITY FULL;
ALTER TABLE public.batches           REPLICA IDENTITY FULL;
ALTER TABLE public.transactions      REPLICA IDENTITY FULL;
ALTER TABLE public.price_predictions REPLICA IDENTITY FULL;
ALTER TABLE public.blockchain_records REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blockchain_records;

-- ── VIEWS ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.my_procedures AS
SELECT
  pr.id, pr.qr_code, pr.name, pr.description,
  pr.quantity, pr.unit, pr.price_per_unit, pr.msp_per_kg,
  pr.predicted_price, pr.region, pr.status,
  pr.created_at, pr.updated_at,
  pr.crop_id, pr.batch_id, pr.farmer_id
FROM public.procedures pr;
