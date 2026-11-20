-- ============================================================
-- HarvestLink Complete Schema for New Supabase Project: qjfzmbqqldyowgocqrqk
-- Compliant with IEEE Manuscript T4-2026-044
-- Includes:
--   - Core PDS entities (profiles, crops, batches, transactions, blockchain_records)
--   - G1: Reconciliation (expected stock, discrepancies, residuals, exceptions)
--   - G2: Offline-First queue & event hash-chains (Eq 11-12)
--   - G3: Physical-to-Digital handover & weighment evidence (Eq 13)
--   - G7 / GAT: Graph anomalies, transfer features, prioritisations (Eq 14-27)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'farmer','distributor','retailer','consumer','admin',
    'procurement','warehouse','transporter','auditor'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── CORE TABLES ──────────────────────────────────────────────

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
  certifications  TEXT[] DEFAULT '{}',
  farmer_wallet   TEXT,
  image_hash      TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','registered','processing','available','sold')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- batches (represents on-chain lots)
CREATE TABLE IF NOT EXISTS public.batches (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id         UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  parent_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  batch_number    TEXT NOT NULL UNIQUE,
  qr_code         TEXT NOT NULL UNIQUE,
  quantity        NUMERIC NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'kg',
  price_per_unit  NUMERIC NOT NULL DEFAULT 0,
  custodian       TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','available','purchased','in_transit','received','allocated','delivered','depleted','recalled')),
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
  total_price      NUMERIC NOT NULL DEFAULT 0,
  transaction_hash TEXT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- blockchain_records (verified Ethereum events and commitments)
CREATE TABLE IF NOT EXISTS public.blockchain_records (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  batch_id         UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  record_type      TEXT NOT NULL
                     CHECK (record_type IN ('crop_registration','transaction','custody_transfer','warehouse_receipt','allocation','entitlement_issue','redemption','recall','record_correction')),
  data             JSONB NOT NULL DEFAULT '{}',
  hash             TEXT NOT NULL UNIQUE,
  previous_hash    TEXT,
  verified         BOOLEAN NOT NULL DEFAULT false,
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

-- ── G1: QUANTITY RECONCILIATION TABLES (Eq 6 - 10) ───────────

-- facility stock ledgers (Eq 6)
CREATE TABLE IF NOT EXISTS public.facility_stock_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT NOT NULL,
  facility_name   TEXT NOT NULL,
  facility_type   TEXT NOT NULL CHECK (facility_type IN ('procurement', 'warehouse', 'transporter', 'fps')),
  commodity       TEXT NOT NULL,
  period          TEXT NOT NULL,
  s_obs_prev      NUMERIC NOT NULL DEFAULT 0,  -- S^obs_{v, t-1}
  inbound_qty     NUMERIC NOT NULL DEFAULT 0,  -- I_{v,t}
  outbound_qty    NUMERIC NOT NULL DEFAULT 0,  -- O_{v,t}
  beneficiary_qty NUMERIC NOT NULL DEFAULT 0,  -- B_{v,t}
  loss_qty        NUMERIC NOT NULL DEFAULT 0,  -- L_{v,t}
  s_exp           NUMERIC NOT NULL DEFAULT 0,  -- S^exp_{v,t}
  s_obs           NUMERIC NOT NULL DEFAULT 0,  -- S^obs_{v,t}
  discrepancy     NUMERIC NOT NULL DEFAULT 0,  -- Delta_{v,t} = S^exp - S^obs
  rel_discrepancy NUMERIC NOT NULL DEFAULT 0,  -- z_{v,t}
  tolerance_tau   NUMERIC NOT NULL DEFAULT 0,  -- tau_{v,t}
  is_exception    BOOLEAN NOT NULL DEFAULT false, -- a^rule_{v,t}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- reconciliation exceptions
CREATE TABLE IF NOT EXISTS public.reconciliation_exceptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type  TEXT NOT NULL CHECK (exception_type IN ('facility_discrepancy', 'lot_residual', 'sub_skimming', 'evidence_gap')),
  facility_id     TEXT,
  lot_id          TEXT,
  period          TEXT,
  expected_qty    NUMERIC NOT NULL,
  observed_qty    NUMERIC NOT NULL,
  discrepancy     NUMERIC NOT NULL,
  tolerance       NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISPUTED')),
  notes           TEXT,
  reviewed_by     UUID REFERENCES public.profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── G2: OFFLINE-FIRST EVENT QUEUE (Eq 11 - 12) ────────────────

CREATE TABLE IF NOT EXISTS public.offline_event_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        TEXT NOT NULL UNIQUE,
  device_id       TEXT NOT NULL,
  actor_wallet    TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL,
  pred_hash       TEXT NOT NULL,
  payload_hash    TEXT NOT NULL,
  chain_pi        TEXT NOT NULL,   -- pi_e = H(event_id || n_e || pi_pred || H(payload))
  signature       TEXT NOT NULL,
  payload         JSONB NOT NULL,
  sync_status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'VALIDATED', 'COMMITTED', 'QUARANTINED', 'REJECTED')),
  quarantine_reason TEXT,
  chain_tx_hash   TEXT,
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── G3: PHYSICAL-TO-DIGITAL EVIDENCE (Eq 13) ──────────────────

CREATE TABLE IF NOT EXISTS public.handover_evidence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         TEXT NOT NULL,
  lot_id              TEXT NOT NULL,
  sender_address      TEXT NOT NULL,
  receiver_address    TEXT NOT NULL,
  vehicle_carrier_ref TEXT,
  seal_id             TEXT,
  dispatch_qty        NUMERIC NOT NULL,
  receipt_qty         NUMERIC,
  weighment_slip_ref  TEXT,
  inspection_status   TEXT CHECK (inspection_status IN ('passed', 'flagged', 'rejected', 'pending')),
  moisture_pct        NUMERIC,
  pest_infestation    BOOLEAN DEFAULT false,
  hygiene_passed      BOOLEAN DEFAULT true,
  document_hash       TEXT,
  receiver_signature  TEXT,
  completeness_score  NUMERIC NOT NULL DEFAULT 0, -- C_e in Eq 13
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── G7 & SECTION VI: GAT ANOMALY PRIORITISATIONS (Eq 14 - 27) ──

CREATE TABLE IF NOT EXISTS public.gat_anomaly_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id         TEXT NOT NULL,
  lot_id              TEXT,
  source_entity       TEXT NOT NULL,
  target_entity       TEXT NOT NULL,
  anomaly_prob        NUMERIC NOT NULL,  -- p_{ij}
  decision_threshold  NUMERIC NOT NULL DEFAULT 0.5, -- theta*
  decision            TEXT NOT NULL CHECK (decision IN ('ACCEPT', 'REVIEW', 'REJECT')), -- Eq 27
  rule_flag           BOOLEAN NOT NULL DEFAULT false,
  anomaly_families    TEXT[],            -- ['A1_shortfall', 'A7_sub_skimming', etc.]
  top_attention_edges JSONB DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_AUDIT', 'CLEARED', 'CONFIRMED_ANOMALY')),
  auditor_notes       TEXT,
  audited_by          UUID REFERENCES public.profiles(id),
  audited_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── FUNCTIONS & TRIGGERS ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_predictions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_stock_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_exceptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_event_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_evidence          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gat_anomaly_alerts         ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & public where needed
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY crops_select_all ON public.crops FOR SELECT USING (true);
CREATE POLICY crops_insert_auth ON public.crops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY crops_update_auth ON public.crops FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY batches_select_all ON public.batches FOR SELECT USING (true);
CREATE POLICY batches_insert_auth ON public.batches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY batches_update_auth ON public.batches FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY transactions_select_all ON public.transactions FOR SELECT USING (true);
CREATE POLICY transactions_insert_auth ON public.transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY blockchain_records_select_all ON public.blockchain_records FOR SELECT USING (true);
CREATE POLICY blockchain_records_insert_all ON public.blockchain_records FOR INSERT WITH CHECK (true);

CREATE POLICY facility_ledger_select_all ON public.facility_stock_ledger FOR SELECT USING (true);
CREATE POLICY facility_ledger_insert_all ON public.facility_stock_ledger FOR INSERT WITH CHECK (true);

CREATE POLICY exceptions_select_all ON public.reconciliation_exceptions FOR SELECT USING (true);
CREATE POLICY exceptions_insert_all ON public.reconciliation_exceptions FOR INSERT WITH CHECK (true);
CREATE POLICY exceptions_update_all ON public.reconciliation_exceptions FOR UPDATE USING (true);

CREATE POLICY offline_queue_select_all ON public.offline_event_queue FOR SELECT USING (true);
CREATE POLICY offline_queue_insert_all ON public.offline_event_queue FOR INSERT WITH CHECK (true);
CREATE POLICY offline_queue_update_all ON public.offline_event_queue FOR UPDATE USING (true);

CREATE POLICY evidence_select_all ON public.handover_evidence FOR SELECT USING (true);
CREATE POLICY evidence_insert_all ON public.handover_evidence FOR INSERT WITH CHECK (true);

CREATE POLICY gat_alerts_select_all ON public.gat_anomaly_alerts FOR SELECT USING (true);
CREATE POLICY gat_alerts_insert_all ON public.gat_anomaly_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY gat_alerts_update_all ON public.gat_anomaly_alerts FOR UPDATE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blockchain_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_stock_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reconciliation_exceptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gat_anomaly_alerts;
