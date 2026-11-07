-- supabase/migrations/20261108000002_auth_hooks_and_roles.sql
-- Server-side validation triggers, domain verification, and role management

-- 1. Helper function to retrieve the caller's role safely
-- Callable by both authenticated and anon users (returns 'guest' when unauthenticated)
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())),
    'guest'
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO anon, authenticated;

-- 2. Validate email domain on auth.users before insert
-- Enforces @rvce.edu.in on the server for student accounts.
-- Staff accounts (super_admin / technician) without an @rvce.edu.in address
-- are permitted ONLY if present in public.staff_allowlist.
-- Client-supplied app_metadata is strictly ignored for authorization.
CREATE OR REPLACE FUNCTION public.handle_validate_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_allowlisted boolean := false;
BEGIN
  -- 1. Check if email is in the staff allowlist
  SELECT EXISTS (
    SELECT 1 FROM public.staff_allowlist WHERE LOWER(email) = LOWER(NEW.email)
  ) INTO is_allowlisted;

  -- 2. If staff allowlisted, permit signup immediately
  IF is_allowlisted THEN
    RETURN NEW;
  END IF;

  -- 3. Otherwise, strictly enforce student domain pattern: ^[^@]+@rvce\.edu\.in$
  IF NEW.email !~* '^[^@]+@rvce\.edu\.in$' THEN
    RAISE EXCEPTION 'Registration rejected: Student accounts must use a valid @rvce.edu.in email address.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_validate_user_email() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created_validate ON auth.users;
CREATE TRIGGER on_auth_user_created_validate
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_validate_user_email();

-- 3. Automatic Profile Creation on auth.users INSERT
-- Assigns role based solely on the server-side staff_allowlist; defaults to 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  assigned_role text := 'student';
  allowlist_role text;
BEGIN
  -- Check staff allowlist
  SELECT role INTO allowlist_role
  FROM public.staff_allowlist
  WHERE LOWER(email) = LOWER(NEW.email);

  IF allowlist_role IS NOT NULL THEN
    assigned_role := allowlist_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
      updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. Role Tamper Prevention on profiles
-- Direct UPDATE of the 'role' column on public.profiles is strictly forbidden for non-super_admin users.
CREATE OR REPLACE FUNCTION public.protect_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.get_current_role() <> 'super_admin' THEN
      RAISE EXCEPTION 'Permission denied: Users cannot alter their own or another user role. Contact a super_admin.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_role_update() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_update();

-- 5. Dedicated Super Admin Function to Change Roles
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only super_admin can invoke admin_update_user_role.';
  END IF;

  IF new_role NOT IN ('student', 'super_admin', 'technician') THEN
    RAISE EXCEPTION 'Invalid role: Must be student, super_admin, or technician.';
  END IF;

  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO authenticated;
