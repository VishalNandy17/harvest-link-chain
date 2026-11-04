-- PDS operator roles and least-privilege profile access.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role TEXT NOT NULL DEFAULT 'consumer',
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('farmer','distributor','retailer','consumer','admin','procurement','warehouse','transporter','auditor'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_requested_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_requested_role_check
  CHECK (requested_role IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor'));

UPDATE public.profiles SET requested_role = role
WHERE role IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor');

-- Signup requests a role; it never grants the role. An administrator must approve it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested TEXT;
BEGIN
  requested := lower(coalesce(NEW.raw_user_meta_data ->> 'requestedRole', 'consumer'));
  IF requested NOT IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor') THEN
    requested := 'consumer';
  END IF;
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'firstName', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'lastName', ''),
    NEW.email,
    'consumer',
    requested
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Role changes require administrator approval';
    END IF;
    IF NEW.wallet_address IS DISTINCT FROM OLD.wallet_address THEN
      RAISE EXCEPTION 'Wallet changes require a verified wallet signature';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wallet_address_unique
  ON public.profiles (lower(wallet_address))
  WHERE wallet_address IS NOT NULL;

-- Profile PII is no longer globally readable. Public QR responses use a fixed,
-- server-side field allowlist instead of exposing profiles through table RLS.
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Lot details and old local hashes are served through allowlisted Edge Function responses.
DROP POLICY IF EXISTS "Anyone can view crops" ON public.crops;
DROP POLICY IF EXISTS "Anyone can view batches" ON public.batches;
DROP POLICY IF EXISTS "Anyone can view blockchain records" ON public.blockchain_records;

CREATE POLICY crops_select_own ON public.crops
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = crops.farmer_id AND p.user_id = auth.uid()
));

CREATE POLICY batches_select_own ON public.batches
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.crops c
  JOIN public.profiles p ON p.id = c.farmer_id
  WHERE c.id = batches.crop_id AND p.user_id = auth.uid()
));
