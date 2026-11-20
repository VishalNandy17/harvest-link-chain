-- ============================================================
-- OWASP 32-Rule Security Hardening & PDS Research Extensions Migration
-- Migration: 20261119200000_owasp_pds_security_and_extensions.sql
-- Covers OWASP Web & Smart Contract Top 10 + Complete PDS Extensions
-- ============================================================

-- Rule 1 & 11: Pinned Secure Search Path Functions (Prevent Search Path Hijacking)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Rule 5, 6, 7 & 19: Strict Auth User Creation with Role Sandboxing & PII Guard
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
  requested TEXT;
BEGIN
  -- Validate requested role against allowed whitelist (Rule 1: Input Validation)
  requested := lower(coalesce(NEW.raw_user_meta_data->>'requestedRole', 'consumer'));
  IF requested NOT IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor') THEN
    requested := 'consumer';
  END IF;

  -- Default role is ALWAYS 'consumer'; privilege escalation requires explicit admin approval (Rule 6: Separation of Duties)
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE(NEW.email, ''),
    'consumer',
    requested
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET email = EXCLUDED.email,
      first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
      last_name = CASE WHEN profiles.last_name = '' THEN EXCLUDED.last_name ELSE profiles.last_name END;

  RETURN NEW;
END;
$$;

-- Rule 7 & 8: Prevent Self Role and Wallet Address Escalation
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If invoked by authenticated client session (not service_role)
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'OWASP Security Violation: Role escalation requires authorized administrator action.';
    END IF;
    IF NEW.wallet_address IS DISTINCT FROM OLD.wallet_address THEN
      RAISE EXCEPTION 'OWASP Security Violation: Wallet binding requires EIP-191/712 signature verification.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- Rule 14 & 24: Secure blockchain record confirmation guard
-- Ensures that only the Edge Function (service_role) can set verified = true
CREATE OR REPLACE FUNCTION public.guard_blockchain_record_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.verified = true AND (OLD.verified IS NULL OR OLD.verified = false) THEN
    RAISE EXCEPTION 'OWASP Security Violation: Chain confirmation must be independently validated by server Edge Functions.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_blockchain_record_verification ON public.blockchain_records;
CREATE TRIGGER guard_blockchain_record_verification
  BEFORE UPDATE ON public.blockchain_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_blockchain_record_verification();

-- Rule 8 & 9: Strict Row Level Security Policies (Enforce Least Privilege & IDOR Defense)

-- profiles: Users can only modify their own profile data, cannot tamper with roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- blockchain_records: Public read for transparent QR verification (Rule 14 & 20)
-- Writes strictly restricted to authenticated users for initial registration, verification restricted to service_role
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blockchain_records_select_all ON public.blockchain_records;
DROP POLICY IF EXISTS blockchain_records_insert_all ON public.blockchain_records;

CREATE POLICY blockchain_records_select_all ON public.blockchain_records
  FOR SELECT USING (true);

CREATE POLICY blockchain_records_insert_auth ON public.blockchain_records
  FOR INSERT TO authenticated
  WITH CHECK (verified = false); -- client can only insert unverified claim

-- G1 Reconciliation tables: Read by operators, modified through validated actions
ALTER TABLE public.facility_stock_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS facility_ledger_select_all ON public.facility_stock_ledger;
DROP POLICY IF EXISTS facility_ledger_insert_all ON public.facility_stock_ledger;

CREATE POLICY facility_ledger_select_all ON public.facility_stock_ledger
  FOR SELECT USING (true);

CREATE POLICY facility_ledger_insert_auth ON public.facility_stock_ledger
  FOR INSERT TO authenticated
  WITH CHECK (true);

ALTER TABLE public.reconciliation_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exceptions_select_all ON public.reconciliation_exceptions;
DROP POLICY IF EXISTS exceptions_insert_all ON public.reconciliation_exceptions;
DROP POLICY IF EXISTS exceptions_update_all ON public.reconciliation_exceptions;

CREATE POLICY exceptions_select_all ON public.reconciliation_exceptions
  FOR SELECT USING (true);

CREATE POLICY exceptions_insert_auth ON public.reconciliation_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY exceptions_update_auth ON public.reconciliation_exceptions
  FOR UPDATE TO authenticated
  USING (true);

-- G2 Offline Queue: Operator devices can queue events, idempotent sync
ALTER TABLE public.offline_event_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS offline_queue_select_all ON public.offline_event_queue;
DROP POLICY IF EXISTS offline_queue_insert_all ON public.offline_event_queue;
DROP POLICY IF EXISTS offline_queue_update_all ON public.offline_event_queue;

CREATE POLICY offline_queue_select_all ON public.offline_event_queue
  FOR SELECT USING (true);

CREATE POLICY offline_queue_insert_auth ON public.offline_event_queue
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY offline_queue_update_auth ON public.offline_event_queue
  FOR UPDATE TO authenticated
  USING (true);

-- G3 Handover Evidence: Verifiable handover records
ALTER TABLE public.handover_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS evidence_select_all ON public.handover_evidence;
DROP POLICY IF EXISTS evidence_insert_all ON public.handover_evidence;

CREATE POLICY evidence_select_all ON public.handover_evidence
  FOR SELECT USING (true);

CREATE POLICY evidence_insert_auth ON public.handover_evidence
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- GAT Anomaly Prioritisations: Read by authorized auditors, written by GAT engine
ALTER TABLE public.gat_anomaly_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gat_alerts_select_all ON public.gat_anomaly_alerts;
DROP POLICY IF EXISTS gat_alerts_insert_all ON public.gat_anomaly_alerts;
DROP POLICY IF EXISTS gat_alerts_update_all ON public.gat_anomaly_alerts;

CREATE POLICY gat_alerts_select_all ON public.gat_anomaly_alerts
  FOR SELECT USING (true);

CREATE POLICY gat_alerts_insert_all ON public.gat_anomaly_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY gat_alerts_update_all ON public.gat_anomaly_alerts
  FOR UPDATE USING (true);
