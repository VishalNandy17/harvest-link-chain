-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also need to manually create the missing profile for the existing user
INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
VALUES (
  '652f96b0-d3e6-43b8-94ed-6b90b8186a91',
  'Nikotin',
  'Bakshi', 
  'byterush0@gmail.com',
  'farmer'
) ON CONFLICT (user_id) DO NOTHING;