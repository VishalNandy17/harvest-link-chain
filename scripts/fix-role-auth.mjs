import fs from 'fs';

const token = fs.readFileSync('D:/harvest-link-chain/.sb_token', 'utf8').trim();
const projectRef = 'qjfzmbqqldyowgocqrqk';

async function executeSql(query, description) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[FAIL] ${description}:\n${err}\n`);
    return false;
  }
  console.log(`[OK] ${description}`);
  return true;
}

async function main() {
  console.log('Fixing Supabase Role Authentication & State Management...\n');

  // 1. Update handle_new_user to set the actual requested role on signup
  await executeSql(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    SET search_path = public, pg_temp
    AS $$
    DECLARE
      target_role TEXT;
    BEGIN
      target_role := lower(coalesce(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'requestedRole', 'consumer'));
      IF target_role NOT IN ('farmer','distributor','retailer','consumer','admin','procurement','warehouse','transporter','auditor') THEN
        target_role := 'consumer';
      END IF;

      INSERT INTO public.profiles (user_id, first_name, last_name, email, role, requested_role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'firstName', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
        COALESCE(NEW.email, ''),
        target_role,
        target_role
      )
      ON CONFLICT (user_id) DO UPDATE 
      SET email = EXCLUDED.email,
          role = target_role,
          requested_role = target_role,
          first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
          last_name = CASE WHEN profiles.last_name = '' THEN EXCLUDED.last_name ELSE profiles.last_name END;

      RETURN NEW;
    END;
    $$;
  `, 'Update handle_new_user with dynamic role assignment');

  // 2. Update prevent_self_role_change trigger: block escalation to admin, allow operational roles
  await executeSql(`
    CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
    RETURNS TRIGGER 
    LANGUAGE plpgsql 
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
    BEGIN
      IF auth.uid() IS NOT NULL THEN
        -- Strictly guard admin role from self-assignment
        IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
          RAISE EXCEPTION 'OWASP Violation: Role escalation to admin requires root authorization.';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$;
  `, 'Update prevent_self_role_change to allow operational role selection');

  // 3. Create RPC function for explicit role switching in UI
  await executeSql(`
    CREATE OR REPLACE FUNCTION public.switch_active_role(new_role TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
    DECLARE
      caller_id UUID;
    BEGIN
      caller_id := auth.uid();
      IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
      END IF;

      new_role := lower(new_role);
      IF new_role NOT IN ('farmer','distributor','retailer','consumer','procurement','warehouse','transporter','auditor') THEN
        RAISE EXCEPTION 'Invalid role requested: %', new_role;
      END IF;

      UPDATE public.profiles
      SET role = new_role,
          requested_role = new_role,
          updated_at = now()
      WHERE user_id = caller_id;

      RETURN jsonb_build_object('success', true, 'role', new_role);
    END;
    $$;
  `, 'Create RPC switch_active_role');

  // 4. Update any existing profile whose role was stuck in 'consumer'
  await executeSql(`
    UPDATE public.profiles
    SET role = requested_role
    WHERE role = 'consumer' AND requested_role IS NOT NULL AND requested_role != 'consumer';
  `, 'Upgrade existing profiles to their requested_role');

  console.log('\nRole authentication fixed in database!');
}

main().catch(console.error);
