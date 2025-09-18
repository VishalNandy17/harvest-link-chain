-- Persist farmer dashboard state across reloads with QR-backed records

-- 1) Ensure batches carries minimal metadata useful for dashboard
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS product_count INT NOT NULL DEFAULT 1;

-- 2) Backfill procedures automatically from batches (single-source of truth)
CREATE OR REPLACE FUNCTION public.populate_procedure_from_batch()
RETURNS TRIGGER AS $$
DECLARE
  c RECORD;
BEGIN
  -- Load crop to derive farmer_id and off-chain metadata
  SELECT 
    cr.id AS crop_id,
    cr.farmer_id AS farmer_id,
    cr.name,
    cr.description,
    cr.quantity,
    cr.unit,
    cr.price_per_unit,
    cr.predicted_price,
    cr.msp_per_kg,
    cr.region,
    cr.image_hash,
    cr.farmer_wallet
  INTO c
  FROM public.crops cr
  WHERE cr.id = NEW.crop_id;

  IF c.crop_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert or upsert a procedure row mapped to this batch
  INSERT INTO public.procedures (
    farmer_id,
    crop_id,
    batch_id,
    name,
    description,
    quantity,
    unit,
    price_per_unit,
    msp_per_kg,
    predicted_price,
    region,
    image_hash,
    farmer_wallet,
    qr_code,
    status
  ) VALUES (
    c.farmer_id,
    c.crop_id,
    NEW.id,
    c.name,
    COALESCE(c.description, ''),
    NEW.quantity,
    COALESCE(NEW.unit, c.unit),
    NEW.price_per_unit,
    c.msp_per_kg,
    c.predicted_price,
    c.region,
    c.image_hash,
    c.farmer_wallet,
    NEW.qr_code,
    COALESCE(NEW.status, 'available')
  )
  ON CONFLICT (qr_code) DO UPDATE SET
    batch_id = EXCLUDED.batch_id,
    price_per_unit = EXCLUDED.price_per_unit,
    quantity = EXCLUDED.quantity,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batches_after_insert_populate_procedure ON public.batches;
CREATE TRIGGER trg_batches_after_insert_populate_procedure
AFTER INSERT ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.populate_procedure_from_batch();

-- Keep procedures.qr_code in sync if batch QR changes
CREATE OR REPLACE FUNCTION public.sync_procedure_qr_on_batch_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.qr_code IS DISTINCT FROM OLD.qr_code) THEN
    UPDATE public.procedures SET qr_code = NEW.qr_code, updated_at = now()
    WHERE batch_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batches_after_update_sync_qr ON public.batches;
CREATE TRIGGER trg_batches_after_update_sync_qr
AFTER UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_procedure_qr_on_batch_update();

-- 3) Views tailored for dashboard queries
CREATE OR REPLACE VIEW public.my_batches_with_qr AS
SELECT
  b.id,
  b.batch_number,
  b.qr_code,
  b.quantity,
  b.unit,
  b.price_per_unit,
  b.status,
  b.location,
  b.product_count,
  b.created_at,
  c.farmer_id,
  c.name AS crop_name
FROM public.batches b
JOIN public.crops c ON c.id = b.crop_id;

CREATE OR REPLACE VIEW public.my_produce_listings AS
SELECT
  pr.id,
  pr.qr_code,
  pr.name AS crop_name,
  pr.quantity,
  pr.unit,
  pr.price_per_unit,
  pr.msp_per_kg,
  pr.predicted_price,
  pr.status,
  pr.created_at,
  pr.farmer_id
FROM public.procedures pr;

-- 4) RLS policies so each farmer reads only their dashboard data
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batches_select_own ON public.batches;
CREATE POLICY batches_select_own ON public.batches
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crops cr
    JOIN public.profiles p ON p.id = cr.farmer_id
    WHERE cr.id = batches.crop_id
      AND p.user_id = auth.uid()
  )
);

-- Views inherit base table policies in Supabase
-- Procedures RLS already added in previous migration

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_batches_qr_code ON public.batches(qr_code);
CREATE INDEX IF NOT EXISTS idx_batches_crop_id ON public.batches(crop_id);


