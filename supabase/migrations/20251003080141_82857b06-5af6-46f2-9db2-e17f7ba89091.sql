-- Create crops table
CREATE TABLE IF NOT EXISTS public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL,
  predicted_price NUMERIC,
  harvest_date DATE,
  location TEXT,
  certifications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blockchain_records table
CREATE TABLE IF NOT EXISTS public.blockchain_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT,
  verified BOOLEAN NOT NULL DEFAULT false,
  data_hash TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add crop_id to batches table
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE;

-- Add qr_code column to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Add unit column to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';

-- Enable RLS on new tables
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for crops
CREATE POLICY "Farmers can insert their own crops" ON public.crops FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can view their own crops" ON public.crops FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can update their own crops" ON public.crops FOR UPDATE USING (auth.uid() = farmer_id);
CREATE POLICY "Public can view crops" ON public.crops FOR SELECT USING (true);

-- RLS policies for transactions
CREATE POLICY "Users can view their transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS policies for blockchain_records
CREATE POLICY "Public can view blockchain records" ON public.blockchain_records FOR SELECT USING (true);
CREATE POLICY "System can insert blockchain records" ON public.blockchain_records FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crops_farmer_id ON public.crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_crop_id ON public.batches(crop_id);
CREATE INDEX IF NOT EXISTS idx_batches_qr_code ON public.batches(qr_code);
CREATE INDEX IF NOT EXISTS idx_batches_batch_id ON public.batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON public.transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_batch_id ON public.blockchain_records(batch_id);