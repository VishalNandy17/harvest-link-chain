-- Ethereum transaction references for truthful, independently verifiable chain status.
ALTER TABLE public.blockchain_records
  ADD COLUMN IF NOT EXISTS chain_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_address TEXT,
  ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS log_index INTEGER,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS blockchain_records_chain_event_unique
  ON public.blockchain_records (chain_id, transaction_hash, log_index)
  WHERE transaction_hash IS NOT NULL AND log_index IS NOT NULL;

-- Historical locally-computed hashes are not Ethereum proofs.
UPDATE public.blockchain_records
SET verified = false
WHERE transaction_hash IS NULL;

-- Chain confirmation is written by the service-role verification function only.
DROP POLICY IF EXISTS "Only authenticated users can insert blockchain records" ON public.blockchain_records;
