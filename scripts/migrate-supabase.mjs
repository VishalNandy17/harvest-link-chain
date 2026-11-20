import fs from 'fs';

const token = fs.readFileSync('D:/harvest-link-chain/.sb_token', 'utf8').trim();
const projectRef = 'qjfzmbqqldyowgocqrqk';

async function executeSql(query, description) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[FAIL] ${description}:\n${err}\n`);
    return false;
  }
  console.log(`[OK] ${description}`);
  return true;
}

async function main() {
  console.log(`Starting schema migration on project ${projectRef}...`);

  // Step 1: Extensions
  await executeSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', 'Extension uuid-ossp');

  // Step 2: Types
  await executeSql(`
    DO $$ BEGIN
      CREATE TYPE public.user_role AS ENUM (
        'farmer','distributor','retailer','consumer','admin',
        'procurement','warehouse','transporter','auditor'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `, 'Enum user_role');

  // Step 3: Profiles table
  await executeSql(`
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
  `, 'Table profiles');

  // Step 4: Crops table
  await executeSql(`
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
    CREATE INDEX IF NOT EXISTS idx_crops_farmer_id ON public.crops(farmer_id);
  `, 'Table crops');

  // Step 5: Batches table
  await executeSql(`
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
    CREATE INDEX IF NOT EXISTS idx_batches_crop_id ON public.batches(crop_id);
    CREATE INDEX IF NOT EXISTS idx_batches_qr_code ON public.batches(qr_code);
  `, 'Table batches');

  // Step 6: Transactions table
  await executeSql(`
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
    CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON public.transactions(batch_id);
  `, 'Table transactions');

  // Step 7: Blockchain records
  await executeSql(`
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
    CREATE INDEX IF NOT EXISTS idx_blockchain_records_batch_id ON public.blockchain_records(batch_id);
  `, 'Table blockchain_records');

  // Step 8: Price predictions and procedures
  await executeSql(`
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
  `, 'Tables price_predictions and procedures');

  // Step 9: G1 Reconciliation tables
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.facility_stock_ledger (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id     TEXT NOT NULL,
      facility_name   TEXT NOT NULL,
      facility_type   TEXT NOT NULL CHECK (facility_type IN ('procurement', 'warehouse', 'transporter', 'fps')),
      commodity       TEXT NOT NULL,
      period          TEXT NOT NULL,
      s_obs_prev      NUMERIC NOT NULL DEFAULT 0,
      inbound_qty     NUMERIC NOT NULL DEFAULT 0,
      outbound_qty    NUMERIC NOT NULL DEFAULT 0,
      beneficiary_qty NUMERIC NOT NULL DEFAULT 0,
      loss_qty        NUMERIC NOT NULL DEFAULT 0,
      s_exp           NUMERIC NOT NULL DEFAULT 0,
      s_obs           NUMERIC NOT NULL DEFAULT 0,
      discrepancy     NUMERIC NOT NULL DEFAULT 0,
      rel_discrepancy NUMERIC NOT NULL DEFAULT 0,
      tolerance_tau   NUMERIC NOT NULL DEFAULT 0,
      is_exception    BOOLEAN NOT NULL DEFAULT false,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
  `, 'G1: Reconciliation tables');

  // Step 10: G2 Offline queue and G3 Handover evidence
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.offline_event_queue (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id        TEXT NOT NULL UNIQUE,
      device_id       TEXT NOT NULL,
      actor_wallet    TEXT NOT NULL,
      sequence_number BIGINT NOT NULL,
      captured_at     TIMESTAMPTZ NOT NULL,
      pred_hash       TEXT NOT NULL,
      payload_hash    TEXT NOT NULL,
      chain_pi        TEXT NOT NULL,
      signature       TEXT NOT NULL,
      payload         JSONB NOT NULL,
      sync_status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'VALIDATED', 'COMMITTED', 'QUARANTINED', 'REJECTED')),
      quarantine_reason TEXT,
      chain_tx_hash   TEXT,
      applied_at      TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
      completeness_score  NUMERIC NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `, 'G2 & G3: Offline queue & Handover evidence');

  // Step 11: GAT anomaly alerts
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.gat_anomaly_alerts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transfer_id         TEXT NOT NULL,
      lot_id              TEXT,
      source_entity       TEXT NOT NULL,
      target_entity       TEXT NOT NULL,
      anomaly_prob        NUMERIC NOT NULL,
      decision_threshold  NUMERIC NOT NULL DEFAULT 0.5,
      decision            TEXT NOT NULL CHECK (decision IN ('ACCEPT', 'REVIEW', 'REJECT')),
      rule_flag           BOOLEAN NOT NULL DEFAULT false,
      anomaly_families    TEXT[],
      top_attention_edges JSONB DEFAULT '[]',
      status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_AUDIT', 'CLEARED', 'CONFIRMED_ANOMALY')),
      auditor_notes       TEXT,
      audited_by          UUID REFERENCES public.profiles(id),
      audited_at          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `, 'GAT Anomaly Alerts table');

  // Step 12: Functions & Triggers
  await executeSql(`
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
  `, 'Triggers and Auth Hooks');

  // Step 13: RLS Policies
  await executeSql(`
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

    DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
    CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);
    DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS crops_select_all ON public.crops;
    CREATE POLICY crops_select_all ON public.crops FOR SELECT USING (true);
    DROP POLICY IF EXISTS crops_insert_auth ON public.crops;
    CREATE POLICY crops_insert_auth ON public.crops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    DROP POLICY IF EXISTS crops_update_auth ON public.crops;
    CREATE POLICY crops_update_auth ON public.crops FOR UPDATE USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS batches_select_all ON public.batches;
    CREATE POLICY batches_select_all ON public.batches FOR SELECT USING (true);
    DROP POLICY IF EXISTS batches_insert_auth ON public.batches;
    CREATE POLICY batches_insert_auth ON public.batches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    DROP POLICY IF EXISTS batches_update_auth ON public.batches;
    CREATE POLICY batches_update_auth ON public.batches FOR UPDATE USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS transactions_select_all ON public.transactions;
    CREATE POLICY transactions_select_all ON public.transactions FOR SELECT USING (true);
    DROP POLICY IF EXISTS transactions_insert_auth ON public.transactions;
    CREATE POLICY transactions_insert_auth ON public.transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS blockchain_records_select_all ON public.blockchain_records;
    CREATE POLICY blockchain_records_select_all ON public.blockchain_records FOR SELECT USING (true);
    DROP POLICY IF EXISTS blockchain_records_insert_all ON public.blockchain_records;
    CREATE POLICY blockchain_records_insert_all ON public.blockchain_records FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS facility_ledger_select_all ON public.facility_stock_ledger;
    CREATE POLICY facility_ledger_select_all ON public.facility_stock_ledger FOR SELECT USING (true);
    DROP POLICY IF EXISTS facility_ledger_insert_all ON public.facility_stock_ledger;
    CREATE POLICY facility_ledger_insert_all ON public.facility_stock_ledger FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS exceptions_select_all ON public.reconciliation_exceptions;
    CREATE POLICY exceptions_select_all ON public.reconciliation_exceptions FOR SELECT USING (true);
    DROP POLICY IF EXISTS exceptions_insert_all ON public.reconciliation_exceptions;
    CREATE POLICY exceptions_insert_all ON public.reconciliation_exceptions FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS exceptions_update_all ON public.reconciliation_exceptions;
    CREATE POLICY exceptions_update_all ON public.reconciliation_exceptions FOR UPDATE USING (true);

    DROP POLICY IF EXISTS offline_queue_select_all ON public.offline_event_queue;
    CREATE POLICY offline_queue_select_all ON public.offline_event_queue FOR SELECT USING (true);
    DROP POLICY IF EXISTS offline_queue_insert_all ON public.offline_event_queue;
    CREATE POLICY offline_queue_insert_all ON public.offline_event_queue FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS offline_queue_update_all ON public.offline_event_queue;
    CREATE POLICY offline_queue_update_all ON public.offline_event_queue FOR UPDATE USING (true);

    DROP POLICY IF EXISTS evidence_select_all ON public.handover_evidence;
    CREATE POLICY evidence_select_all ON public.handover_evidence FOR SELECT USING (true);
    DROP POLICY IF EXISTS evidence_insert_all ON public.handover_evidence;
    CREATE POLICY evidence_insert_all ON public.handover_evidence FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS gat_alerts_select_all ON public.gat_anomaly_alerts;
    CREATE POLICY gat_alerts_select_all ON public.gat_anomaly_alerts FOR SELECT USING (true);
    DROP POLICY IF EXISTS gat_alerts_insert_all ON public.gat_anomaly_alerts;
    CREATE POLICY gat_alerts_insert_all ON public.gat_anomaly_alerts FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS gat_alerts_update_all ON public.gat_anomaly_alerts;
    CREATE POLICY gat_alerts_update_all ON public.gat_anomaly_alerts FOR UPDATE USING (true);
  `, 'Row Level Security (RLS) Policies');

  console.log('\n--- Migration Finished! ---');
}

main().catch(console.error);
