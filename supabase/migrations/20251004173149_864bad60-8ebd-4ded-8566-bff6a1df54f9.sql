-- Ensure crops table has proper constraints and indexes
ALTER TABLE public.crops
  ALTER COLUMN farmer_id SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN price_per_unit SET NOT NULL;

-- Ensure batches table has proper constraints
ALTER TABLE public.batches
  ALTER COLUMN farmer_id SET NOT NULL,
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN quantity_kg SET NOT NULL,
  ALTER COLUMN price_per_kg SET NOT NULL;

-- Make sure crop_id in batches can be null (for direct batch creation)
ALTER TABLE public.batches
  ALTER COLUMN crop_id DROP NOT NULL;

-- Add index for faster farmer queries
CREATE INDEX IF NOT EXISTS idx_crops_farmer_id ON public.crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_farmer_id ON public.batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_crop_id ON public.batches(crop_id);

-- Ensure QR codes are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_qr_code ON public.batches(qr_code) WHERE qr_code IS NOT NULL;

-- Add check constraint to ensure quantity is positive
ALTER TABLE public.crops
  DROP CONSTRAINT IF EXISTS crops_quantity_positive,
  ADD CONSTRAINT crops_quantity_positive CHECK (quantity > 0);

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_quantity_positive,
  ADD CONSTRAINT batches_quantity_positive CHECK (quantity_kg > 0);

-- Add check constraint to ensure price is positive
ALTER TABLE public.crops
  DROP CONSTRAINT IF EXISTS crops_price_positive,
  ADD CONSTRAINT crops_price_positive CHECK (price_per_unit > 0);

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_price_positive,
  ADD CONSTRAINT batches_price_positive CHECK (price_per_kg > 0);

-- Update RLS policies to ensure farmers can insert and view their own data
DROP POLICY IF EXISTS "Farmers can insert their own crops" ON public.crops;
CREATE POLICY "Farmers can insert their own crops"
  ON public.crops
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "Farmers can view their own crops" ON public.crops;
CREATE POLICY "Farmers can view their own crops"
  ON public.crops
  FOR SELECT
  TO authenticated
  USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "Farmers can update their own crops" ON public.crops;
CREATE POLICY "Farmers can update their own crops"
  ON public.crops
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "Farmers can insert their own batches" ON public.batches;
CREATE POLICY "Farmers can insert their own batches"
  ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "Farmers can view their own batches" ON public.batches;
CREATE POLICY "Farmers can view their own batches"
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "Farmers can update their own batches" ON public.batches;
CREATE POLICY "Farmers can update their own batches"
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = farmer_id);