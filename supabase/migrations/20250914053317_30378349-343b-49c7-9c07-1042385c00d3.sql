-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'distributor', 'retailer', 'consumer', 'admin')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crops table for farmer crop registrations
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit DECIMAL NOT NULL,
  predicted_price DECIMAL,
  description TEXT,
  harvest_date DATE,
  location TEXT,
  certifications TEXT[],
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'processing', 'available', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batches table for tracking crop batches
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL UNIQUE,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'purchased', 'in_transit', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for purchase records
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  transaction_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_predictions table for AI predictions
CREATE TABLE public.price_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name TEXT NOT NULL,
  current_price DECIMAL NOT NULL,
  predicted_price DECIMAL NOT NULL,
  confidence_score DECIMAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  factors JSONB,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blockchain_records table for verification
CREATE TABLE public.blockchain_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('crop_registration', 'transaction', 'quality_check', 'transfer')),
  data JSONB NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  previous_hash TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for crops
CREATE POLICY "Anyone can view crops" ON public.crops FOR SELECT USING (true);
CREATE POLICY "Farmers can insert their own crops" ON public.crops FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = farmer_id AND user_id = auth.uid() AND role = 'farmer'
  )
);
CREATE POLICY "Farmers can update their own crops" ON public.crops FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = farmer_id AND user_id = auth.uid() AND role = 'farmer'
  )
);

-- RLS Policies for batches
CREATE POLICY "Anyone can view batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Farmers can insert batches for their crops" ON public.batches FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crops c
    JOIN public.profiles p ON c.farmer_id = p.id
    WHERE c.id = crop_id AND p.user_id = auth.uid() AND p.role = 'farmer'
  )
);
CREATE POLICY "Farmers can update their own batches" ON public.batches FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.crops c
    JOIN public.profiles p ON c.farmer_id = p.id
    WHERE c.id = crop_id AND p.user_id = auth.uid() AND p.role = 'farmer'
  )
);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id IN (buyer_id, seller_id) AND user_id = auth.uid()
  )
);
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = buyer_id AND user_id = auth.uid()
  )
);

-- RLS Policies for price_predictions
CREATE POLICY "Anyone can view price predictions" ON public.price_predictions FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert predictions" ON public.price_predictions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for blockchain_records
CREATE POLICY "Anyone can view blockchain records" ON public.blockchain_records FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert blockchain records" ON public.blockchain_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'firstName', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'lastName', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'consumer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.crops REPLICA IDENTITY FULL;
ALTER TABLE public.batches REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.price_predictions REPLICA IDENTITY FULL;
ALTER TABLE public.blockchain_records REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blockchain_records;