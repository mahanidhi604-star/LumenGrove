-- Migration: 20261120000003_fix_dashboard_role_updates.sql
-- Description: Allow Supabase Dashboard (Table Editor / SQL Editor) and Super Admins to easily update teammate roles

-- 1. Relax CHECK constraint on public.profiles to accept 'admin' and 'tech' aliases
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'super_admin', 'technician', 'admin', 'tech'));

-- 2. Relax CHECK constraint on public.staff_allowlist
ALTER TABLE public.staff_allowlist DROP CONSTRAINT IF EXISTS staff_allowlist_role_check;
ALTER TABLE public.staff_allowlist ADD CONSTRAINT staff_allowlist_role_check 
  CHECK (role IN ('super_admin', 'technician', 'admin', 'tech'));

-- 3. Update protect_profile_role_update trigger to allow Supabase Dashboard Table Editor
CREATE OR REPLACE FUNCTION public.protect_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Normalize role aliases
  IF LOWER(NEW.role) = 'admin' THEN
    NEW.role := 'super_admin';
  ELSIF LOWER(NEW.role) = 'tech' THEN
    NEW.role := 'technician';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow direct Supabase dashboard edits (where auth.uid() is null, or service_role/postgres)
    IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    -- Allow authenticated super_admin
    IF public.get_current_role() = 'super_admin' THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Permission denied: Users cannot alter their own or another user role. Contact a super_admin.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4. Update staff_allowlist RLS policy to allow Supabase dashboard & super admins
DROP POLICY IF EXISTS "staff_allowlist_super_admin_only" ON public.staff_allowlist;
CREATE POLICY "staff_allowlist_super_admin_only" ON public.staff_allowlist
  FOR ALL
  TO authenticated, anon
  USING (
    public.get_current_role() = 'super_admin' 
    OR auth.uid() IS NULL 
    OR current_user IN ('postgres', 'service_role', 'supabase_admin')
  )
  WITH CHECK (
    public.get_current_role() = 'super_admin' 
    OR auth.uid() IS NULL 
    OR current_user IN ('postgres', 'service_role', 'supabase_admin')
  );

-- 5. Helper Function: Set user role by email (updates both profiles and staff_allowlist)
CREATE OR REPLACE FUNCTION public.set_user_role(
  target_email text,
  new_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_role text;
  matched_count int := 0;
BEGIN
  -- Normalize role
  normalized_role := LOWER(TRIM(new_role));
  IF normalized_role = 'admin' THEN
    normalized_role := 'super_admin';
  ELSIF normalized_role = 'tech' THEN
    normalized_role := 'technician';
  END IF;

  IF normalized_role NOT IN ('student', 'super_admin', 'technician') THEN
    RAISE EXCEPTION 'Invalid role "%". Allowed values: student, super_admin, technician', new_role;
  END IF;

  -- 1. Upsert into staff_allowlist if super_admin or technician
  IF normalized_role IN ('super_admin', 'technician') THEN
    INSERT INTO public.staff_allowlist (email, role)
    VALUES (LOWER(TRIM(target_email)), normalized_role)
    ON CONFLICT (email) DO UPDATE
    SET role = EXCLUDED.role;
  ELSE
    -- If resetting to student, remove from staff_allowlist
    DELETE FROM public.staff_allowlist WHERE LOWER(email) = LOWER(TRIM(target_email));
  END IF;

  -- 2. Update existing profiles table
  UPDATE public.profiles
  SET role = normalized_role,
      updated_at = now()
  WHERE LOWER(email) = LOWER(TRIM(target_email));

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  RETURN format('Successfully configured %s as %s (updated %s profile record(s)).', target_email, normalized_role, matched_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(text, text) TO authenticated, anon;
