# Supabase Authentication Setup

This project now includes proper authentication using Supabase. Follow these steps to set it up:

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
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
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
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'lastName'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 5. Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs for password reset:
   - `http://localhost:5173/reset-password`
   - `https://yourdomain.com/reset-password` (for production)

## 6. Test the Authentication

1. Start your development server: `npm run dev`
2. Navigate to `/signup` to create a new account
3. Check your email for verification
4. Try logging in at `/login`
5. Test password reset at `/forgot-password`

## Features Included

- ✅ User registration with email verification
- ✅ User login/logout
- ✅ Password reset functionality
- ✅ Protected routes
- ✅ User profile management
- ✅ Session management
- ✅ Responsive authentication UI

## Security Features

- Row Level Security (RLS) enabled on user profiles
- Secure password handling
- Email verification required
- JWT token-based authentication
- Automatic session management

## Troubleshooting

If you encounter issues:

1. Check that your environment variables are set correctly
2. Verify your Supabase project is active
3. Check the browser console for error messages
4. Ensure your database tables are created correctly
5. Verify your redirect URLs are configured in Supabase

## Next Steps

After setting up authentication, you can:

1. Add more user profile fields
2. Implement role-based access control
3. Add social authentication providers
4. Create user management dashboard
5. Add audit logging for user actions
