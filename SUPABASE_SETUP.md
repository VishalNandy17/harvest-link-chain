# KrishiSetu Supabase Setup

This project includes authentication and database setup for KrishiSetu using Supabase. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in to your account
3. Create a new project
4. Wait for the project to be set up

## 2. Get Your Project Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key

## 3. Set Environment Variables

Create a `.env` file in your project root with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project credentials.

## 4. Set Up Database Tables

Run the following SQL in your Supabase SQL editor to create the necessary tables:

```sql
-- Create user roles enum
CREATE TYPE user_role AS ENUM ('farmer', 'distributor', 'retailer', 'consumer', 'admin');

-- Create profiles table with role
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role user_role NOT NULL DEFAULT 'consumer',
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'lastName',
    (NEW.raw_user_meta_data->>'role')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create produce table for farmers
CREATE TABLE produce (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  quality_grade TEXT NOT NULL,
  price_per_unit NUMERIC,
  blockchain_hash TEXT,
  qr_code TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on produce
ALTER TABLE produce ENABLE ROW LEVEL SECURITY;

-- Create policies for produce
CREATE POLICY "Farmers can CRUD their own produce" ON produce
  USING (farmer_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'farmer'));
  
CREATE POLICY "Distributors can view all produce" ON produce
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'distributor'));
  
CREATE POLICY "Retailers can view all produce" ON produce
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'retailer'));
  
CREATE POLICY "Admins can view all produce" ON produce
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create transactions table for tracking supply chain
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produce_id UUID REFERENCES produce(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id),
  buyer_id UUID REFERENCES profiles(id),
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blockchain_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (seller_id = auth.uid() OR buyer_id = auth.uid());
  
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

-- Create feedback table for consumer ratings
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  produce_id UUID REFERENCES produce(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback
CREATE POLICY "Consumers can CRUD their own feedback" ON feedback
  USING (consumer_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'consumer'));
  
CREATE POLICY "All users can view feedback" ON feedback
  FOR SELECT USING (true);
  
-- Create blockchain_records table for verification
CREATE TABLE blockchain_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  blockchain_hash TEXT NOT NULL,
  blockchain_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on blockchain_records
ALTER TABLE blockchain_records ENABLE ROW LEVEL SECURITY;

-- Create policies for blockchain_records
CREATE POLICY "All authenticated users can view blockchain records" ON blockchain_records
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Only admins can modify blockchain records" ON blockchain_records
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  
-- Create analytics table for market trends and insights
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL,
  category TEXT NOT NULL,
  region TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on analytics
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics
CREATE POLICY "All authenticated users can view analytics" ON analytics
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Only admins can modify analytics" ON analytics
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

## 5. Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs for password reset:
   - `http://localhost:5173/reset-password`
   - `https://yourdomain.com/reset-password` (for production)

## 6. Test the Authentication

1. Start your development server: `npm run dev`
2. Navigate to `/signup` to create a new account with a role
3. Check your email for verification
4. Try logging in at `/login`
5. Test password reset at `/forgot-password`

## Features Included

- ✅ User registration with role selection
- ✅ Role-based access control
- ✅ User login/logout
- ✅ Password reset functionality
- ✅ Protected routes based on user role
- ✅ User profile management
- ✅ Session management
- ✅ Responsive authentication UI
- ✅ Blockchain record tracking
- ✅ Supply chain transaction management
- ✅ Consumer feedback system
- ✅ Analytics for market trends

## Security Features

- Row Level Security (RLS) enabled on all tables
- Role-based permissions
- Secure password handling
- Email verification required
- JWT token-based authentication
- Automatic session management
- Blockchain verification

## Troubleshooting

If you encounter issues:

1. Check that your environment variables are set correctly
2. Verify your Supabase project is active
3. Check the browser console for error messages
4. Ensure your database tables are created correctly
5. Verify your redirect URLs are configured in Supabase

## Next Steps

After setting up the database:

1. Implement the role-specific dashboards
2. Set up blockchain integration
3. Create QR code generation and scanning
4. Implement AI-powered price prediction
5. Build the farm-to-fork visualization
