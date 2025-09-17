-- Add missing fields to crops for MSP, wallet, image proof, and region
ALTER TABLE public.crops
  ADD COLUMN IF NOT EXISTS msp_per_kg DECIMAL NULL,
  ADD COLUMN IF NOT EXISTS farmer_wallet TEXT NULL,
  ADD COLUMN IF NOT EXISTS image_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS region TEXT NULL;

-- Create procedures table to store farmer-created procedures with QR mapping
CREATE TABLE IF NOT EXISTS public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit DECIMAL NOT NULL,
  msp_per_kg DECIMAL NULL,
  predicted_price DECIMAL NULL,
  region TEXT NULL,
  image_hash TEXT NULL,
  farmer_wallet TEXT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'listed' CHECK (status IN ('listed','in_transit','delivered','sold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_procedures_farmer_id ON public.procedures(farmer_id);
CREATE INDEX IF NOT EXISTS idx_procedures_qr_code ON public.procedures(qr_code);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_procedures_updated_at ON public.procedures;
CREATE TRIGGER trg_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS and policies for procedures
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- Allow farmers to insert their own procedures
DROP POLICY IF EXISTS procedures_insert_own ON public.procedures;
CREATE POLICY procedures_insert_own ON public.procedures
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = procedures.farmer_id
      AND p.user_id = auth.uid()
      AND p.role = 'farmer'
  )
);

-- Allow farmers to select their own procedures
DROP POLICY IF EXISTS procedures_select_own ON public.procedures;
CREATE POLICY procedures_select_own ON public.procedures
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = procedures.farmer_id
      AND p.user_id = auth.uid()
  )
);

-- Allow admins to see all
DROP POLICY IF EXISTS procedures_select_admin ON public.procedures;
CREATE POLICY procedures_select_admin ON public.procedures
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Create a convenient view for the UI
CREATE OR REPLACE VIEW public.my_procedures AS
SELECT
  pr.id,
  pr.qr_code,
  pr.name,
  pr.description,
  pr.quantity,
  pr.unit,
  pr.price_per_unit,
  pr.msp_per_kg,
  pr.predicted_price,
  pr.region,
  pr.status,
  pr.created_at,
  pr.updated_at,
  pr.crop_id,
  pr.batch_id,
  pr.farmer_id
FROM public.procedures pr;


