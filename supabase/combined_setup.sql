-- LumenGrove Complete Database Setup (Migrations + Triggers + RLS + Functions + Seed)

-- ==========================================
-- supabase/migrations/20261108000001_create_schema.sql
-- ==========================================
-- supabase/migrations/20261108000001_create_schema.sql
-- LumenGrove Schema: Core Tables, Relationships, and Constraints
-- All monetary amounts stored as integer paise (1 INR = 100 paise)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Dedicated sequence for rental human-readable IDs (e.g. LG-1042)
CREATE SEQUENCE IF NOT EXISTS public.rental_id_seq START WITH 1042;

-- 1. PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'super_admin', 'technician')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. STAFF EMAIL ALLOW-LIST (For provisioning staff without @rvce.edu.in emails)
CREATE TABLE IF NOT EXISTS public.staff_allowlist (
  email text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('super_admin', 'technician')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. STATIONS (Campus kiosk stations)
CREATE TABLE IF NOT EXISTS public.stations (
  id text PRIMARY KEY, -- 'library', 'mm', 'mingoes', 'cauvery'
  name text NOT NULL,
  x integer NOT NULL, -- Map coordinate X
  y integer NOT NULL, -- Map coordinate Y
  latitude double precision,
  longitude double precision,
  total_slots integer NOT NULL DEFAULT 8 CHECK (total_slots > 0),
  is_online boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. STATION SECRETS (Hardware authentication isolated from public & client roles)
CREATE TABLE IF NOT EXISTS public.station_secrets (
  station_id text PRIMARY KEY REFERENCES public.stations(id) ON DELETE CASCADE,
  api_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. BANK TYPES (Grove Phone, Grove Laptop, Grove Fast, Grove Wireless)
CREATE TABLE IF NOT EXISTS public.bank_types (
  id text PRIMARY KEY, -- 'std', 'lap', 'fast', 'wl'
  name text NOT NULL,
  power_rating text NOT NULL,
  description text NOT NULL,
  discharge_rate numeric(5, 3) NOT NULL DEFAULT 0.05 CHECK (discharge_rate > 0),
  icon_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. BANKS (Physical battery units - RFID tags restricted to staff)
CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_type_id text NOT NULL REFERENCES public.bank_types(id) ON DELETE RESTRICT,
  rfid_tag text UNIQUE NOT NULL,
  battery_charge integer NOT NULL DEFAULT 100 CHECK (battery_charge BETWEEN 0 AND 100),
  health_status text NOT NULL DEFAULT 'good' CHECK (health_status IN ('good', 'low_health', 'damaged', 'retired')),
  cycle_count integer NOT NULL DEFAULT 0 CHECK (cycle_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banks_type ON public.banks(bank_type_id);
CREATE INDEX IF NOT EXISTS idx_banks_rfid ON public.banks(rfid_tag);

-- 7. SLOTS (Physical locking slots inside stations)
CREATE TABLE IF NOT EXISTS public.slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  slot_number integer NOT NULL CHECK (slot_number >= 1),
  bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'charging', 'reserved', 'out', 'maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_station_slot UNIQUE (station_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_slots_station_status ON public.slots(station_id, status);

-- 8. PRICING RULES (Admin-managed rates in integer paise; duration must be multiple of 0.5h)
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hourly_rate_paise integer NOT NULL CHECK (hourly_rate_paise >= 0),
  grace_period_mins integer NOT NULL DEFAULT 10 CHECK (grace_period_mins >= 0),
  daily_cap_paise integer CHECK (daily_cap_paise >= 0),
  late_fee_per_hour_paise integer CHECK (late_fee_per_hour_paise >= 0),
  deposit_paise integer NOT NULL DEFAULT 0 CHECK (deposit_paise >= 0),
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. RENTALS (Rental lifecycle, PIN hash, 30-min validity, 3-attempt lockout)
CREATE TABLE IF NOT EXISTS public.rentals (
  id text PRIMARY KEY, -- 'LG-1042'
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE RESTRICT,
  slot_id uuid REFERENCES public.slots(id) ON DELETE SET NULL,
  bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL,
  bank_type_id text NOT NULL REFERENCES public.bank_types(id) ON DELETE RESTRICT,
  duration_hours numeric(3, 1) NOT NULL CHECK (
    duration_hours >= 0.5 
    AND duration_hours <= 6.0 
    AND (duration_hours * 2) = floor(duration_hours * 2)
  ),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'completed', 'overdue', 'cancelled')),
  pin_hash text,
  pin_expires_at timestamptz,
  pin_attempts integer NOT NULL DEFAULT 0 CHECK (pin_attempts >= 0),
  is_pin_locked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  started_at timestamptz,
  returned_at timestamptz,
  return_station_id text REFERENCES public.stations(id) ON DELETE SET NULL,
  return_slot_id uuid REFERENCES public.slots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique partial index: exactly one open rental permitted per user at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_rental_per_user 
ON public.rentals (user_id) 
WHERE (status IN ('pending', 'paid', 'active', 'overdue'));

CREATE INDEX IF NOT EXISTS idx_rentals_user ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_created ON public.rentals(created_at DESC);

-- 10. PAYMENTS (Transactions linked to rentals, in integer paise)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id text NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text DEFAULT 'upi',
  provider text NOT NULL DEFAULT 'mock', -- 'mock', 'razorpay', 'upi'
  provider_payment_id text,
  provider_order_id text,
  provider_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_rental ON public.payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);

-- 11. STATION TELEMETRY (ESP32 IoT sensor telemetry time-series)
CREATE TABLE IF NOT EXISTS public.station_telemetry (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  solar_watts numeric(6, 2) NOT NULL CHECK (solar_watts >= 0),
  panel_temp_c numeric(5, 2) NOT NULL,
  battery_reserve_pct numeric(5, 2) NOT NULL CHECK (battery_reserve_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_station_telemetry_station_time ON public.station_telemetry(station_id, created_at DESC);

-- 12. SECURITY EVENTS (Tamper detection, vibration, PIN lockouts)
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text REFERENCES public.stations(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.slots(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'vibration', 'return_failed', 'pin_brute_force', 'unauthorized_removal'
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_station_time ON public.security_events(station_id, created_at DESC);

-- 13. COMPLAINTS (Student issue reporting)
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rental_id text REFERENCES public.rentals(id) ON DELETE SET NULL,
  station_id text REFERENCES public.stations(id) ON DELETE SET NULL,
  issue_type text NOT NULL, -- 'Paid but no PIN', 'Lock stuck', 'Bank not charging', 'Wrong amount', 'Other'
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);


-- ==========================================
-- supabase/migrations/20261108000002_auth_hooks_and_roles.sql
-- ==========================================
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


-- ==========================================
-- supabase/migrations/20261108000003_enable_rls.sql
-- ==========================================
-- supabase/migrations/20261108000003_enable_rls.sql
-- Row Level Security (RLS) Policies, Column Privileges, and Default Privilege Hardening
-- Zero write access for anon. Clients cannot directly INSERT/UPDATE rentals or payments.

-- 1. HARDEN DEFAULT PRIVILEGES FOR FUTURE OBJECTS
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 2. REVOKE ALL EXISTING BROAD PRIVILEGES
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Ensure get_current_role is accessible to check policies
GRANT EXECUTE ON FUNCTION public.get_current_role() TO anon, authenticated;

-- 3. ENABLE RLS ON EVERY TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- 1. PROFILES POLICIES & GRANTS
---------------------------------------------------------
-- Students read only their own profile; Super Admins read all; Technicians cannot read profiles
GRANT SELECT ON public.profiles TO authenticated;
-- Students can only update full_name and phone; role and email are protected
GRANT UPDATE (full_name, phone, updated_at) ON public.profiles TO authenticated;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.get_current_role() = 'super_admin'
  );

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.get_current_role() = 'super_admin'
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR public.get_current_role() = 'super_admin'
  );

---------------------------------------------------------
-- 2. STAFF ALLOWLIST POLICIES & GRANTS
---------------------------------------------------------
-- Accessible exclusively to Super Admins (service role has full bypass)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_allowlist TO authenticated;

CREATE POLICY "staff_allowlist_super_admin_only" ON public.staff_allowlist
  FOR ALL
  TO authenticated
  USING (public.get_current_role() = 'super_admin')
  WITH CHECK (public.get_current_role() = 'super_admin');

---------------------------------------------------------
-- 3. STATIONS POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT ON public.stations TO anon, authenticated;
GRANT UPDATE (is_online, updated_at) ON public.stations TO authenticated;
GRANT INSERT, DELETE ON public.stations TO authenticated;

CREATE POLICY "stations_select_all" ON public.stations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "stations_update_staff" ON public.stations
  FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'))
  WITH CHECK (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "stations_insert_admin" ON public.stations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() = 'super_admin');

CREATE POLICY "stations_delete_admin" ON public.stations
  FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'super_admin');

---------------------------------------------------------
-- 4. STATION SECRETS (Isolated Hardware Secrets)
---------------------------------------------------------
-- Zero grants to anon or authenticated. Only service_role and SECURITY DEFINER functions access this.

---------------------------------------------------------
-- 5. BANK TYPES POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT ON public.bank_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bank_types TO authenticated;

CREATE POLICY "bank_types_select_all" ON public.bank_types
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "bank_types_write_admin" ON public.bank_types
  FOR ALL
  TO authenticated
  USING (public.get_current_role() = 'super_admin')
  WITH CHECK (public.get_current_role() = 'super_admin');

---------------------------------------------------------
-- 6. BANKS POLICIES, VIEW & GRANTS
---------------------------------------------------------
-- Base table: Staff only can read RFID tags and inventory directly. Anon has ZERO access to table.
GRANT SELECT ON public.banks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banks TO authenticated;

CREATE POLICY "banks_select_staff" ON public.banks
  FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "banks_update_staff" ON public.banks
  FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'))
  WITH CHECK (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "banks_write_admin" ON public.banks
  FOR ALL
  TO authenticated
  USING (public.get_current_role() = 'super_admin')
  WITH CHECK (public.get_current_role() = 'super_admin');

-- Public Sanitized View (No RFID tags exposed)
CREATE OR REPLACE VIEW public.v_banks_public AS
  SELECT id, bank_type_id, battery_charge, health_status
  FROM public.banks;

GRANT SELECT ON public.v_banks_public TO anon, authenticated;

---------------------------------------------------------
-- 7. SLOTS POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT ON public.slots TO anon, authenticated;
GRANT UPDATE (status, updated_at) ON public.slots TO authenticated;
GRANT INSERT, DELETE ON public.slots TO authenticated;

CREATE POLICY "slots_select_all" ON public.slots
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "slots_update_staff" ON public.slots
  FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'))
  WITH CHECK (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "slots_write_admin" ON public.slots
  FOR ALL
  TO authenticated
  USING (public.get_current_role() = 'super_admin')
  WITH CHECK (public.get_current_role() = 'super_admin');

---------------------------------------------------------
-- 8. PRICING RULES POLICIES & GRANTS (Super Admin Exclusivity)
---------------------------------------------------------
GRANT SELECT ON public.pricing_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;

CREATE POLICY "pricing_rules_select_active_or_admin" ON public.pricing_rules
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.get_current_role() = 'super_admin');

CREATE POLICY "pricing_rules_insert_admin" ON public.pricing_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() = 'super_admin');

CREATE POLICY "pricing_rules_update_admin" ON public.pricing_rules
  FOR UPDATE
  TO authenticated
  USING (public.get_current_role() = 'super_admin')
  WITH CHECK (public.get_current_role() = 'super_admin');

CREATE POLICY "pricing_rules_delete_admin" ON public.pricing_rules
  FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'super_admin');

---------------------------------------------------------
-- 9. RENTALS POLICIES & GRANTS
---------------------------------------------------------
-- Direct client INSERT, UPDATE, and DELETE are strictly REVOKED.
-- Rentals are created via book_slot_atomic and updated via kiosk/payment webhooks.
REVOKE INSERT, UPDATE, DELETE ON public.rentals FROM authenticated, anon;

-- Students read only non-sensitive columns: pin_hash and pin_attempts are NEVER exposed
GRANT SELECT (
  id,
  user_id,
  station_id,
  slot_id,
  bank_id,
  bank_type_id,
  duration_hours,
  amount_paise,
  status,
  pin_expires_at,
  is_pin_locked,
  unlocked_at,
  started_at,
  returned_at,
  return_station_id,
  return_slot_id,
  created_at,
  updated_at
) ON public.rentals TO authenticated;

-- Technicians cannot read rentals. Students read own; Super Admin reads all.
CREATE POLICY "rentals_select_own_or_admin" ON public.rentals
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.get_current_role() = 'super_admin'
  );

---------------------------------------------------------
-- 10. PAYMENTS POLICIES & GRANTS
---------------------------------------------------------
-- Direct client INSERT, UPDATE, DELETE are strictly REVOKED.
-- Payments are recorded exclusively by the backend payment webhook (service role).
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated, anon;
GRANT SELECT ON public.payments TO authenticated;

CREATE POLICY "payments_select_own_or_admin" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.get_current_role() = 'super_admin'
  );

---------------------------------------------------------
-- 11. STATION TELEMETRY POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT ON public.station_telemetry TO authenticated;
GRANT INSERT ON public.station_telemetry TO authenticated;

CREATE POLICY "telemetry_select_staff" ON public.station_telemetry
  FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "telemetry_insert_admin" ON public.station_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() = 'super_admin');

-- Safe public live solar view
CREATE OR REPLACE VIEW public.v_station_solar_live AS
  SELECT DISTINCT ON (station_id)
    station_id,
    solar_watts,
    created_at
  FROM public.station_telemetry
  ORDER BY station_id, created_at DESC;

GRANT SELECT ON public.v_station_solar_live TO anon, authenticated;

---------------------------------------------------------
-- 12. SECURITY EVENTS POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT, INSERT ON public.security_events TO authenticated;

CREATE POLICY "security_events_select_staff" ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'));

CREATE POLICY "security_events_insert_staff" ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('super_admin', 'technician'));

---------------------------------------------------------
-- 13. COMPLAINTS POLICIES & GRANTS
---------------------------------------------------------
GRANT SELECT, INSERT ON public.complaints TO authenticated;
GRANT UPDATE (status, resolution_notes, resolved_by, resolved_at, updated_at) ON public.complaints TO authenticated;

CREATE POLICY "complaints_select_own_or_staff" ON public.complaints
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.get_current_role() IN ('super_admin', 'technician')
  );

CREATE POLICY "complaints_insert_student" ON public.complaints
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "complaints_update_staff" ON public.complaints
  FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('super_admin', 'technician'))
  WITH CHECK (public.get_current_role() IN ('super_admin', 'technician'));


-- ==========================================
-- supabase/migrations/20261108000004_atomic_rental_functions.sql
-- ==========================================
-- supabase/migrations/20261108000004_atomic_rental_functions.sql
-- State transitions, race-safe slot reservations, PIN verification, and slot cleanup

-- 1. RENTAL STATUS TRANSITION VALIDATION TRIGGER
-- Guarantees rentals start strictly in 'pending' status and follow the finite state machine
CREATE OR REPLACE FUNCTION public.validate_rental_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict initial status enforcement: initial status must ALWAYS be 'pending'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Invalid initial rental status: Rental must be initiated in pending status (received %).', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Verify valid state transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
  ELSIF OLD.status = 'paid' AND NEW.status NOT IN ('paid', 'active', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from paid to %', NEW.status;
  ELSIF OLD.status = 'active' AND NEW.status NOT IN ('active', 'completed', 'overdue') THEN
    RAISE EXCEPTION 'Invalid transition from active to %', NEW.status;
  ELSIF OLD.status = 'overdue' AND NEW.status NOT IN ('overdue', 'completed') THEN
    RAISE EXCEPTION 'Invalid transition from overdue to %', NEW.status;
  ELSIF OLD.status IN ('completed', 'cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Terminal state % cannot be transitioned to %', OLD.status, NEW.status;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_rental_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tr_validate_rental_status ON public.rentals;
CREATE TRIGGER tr_validate_rental_status
  BEFORE INSERT OR UPDATE OF status ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rental_status_transition();

-- 2. RACE-SAFE SLOT BOOKING FUNCTION (FOR UPDATE SKIP LOCKED)
-- Atomically selects and reserves an available slot and power bank for a station
CREATE OR REPLACE FUNCTION public.book_slot_atomic(
  p_station_id text,
  p_bank_type_id text,
  p_duration_hours numeric
)
RETURNS TABLE (
  rental_id text,
  slot_id uuid,
  slot_number integer,
  amount_paise integer,
  hourly_rate_paise integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_slot record;
  v_pricing record;
  v_total_amount integer;
  v_rental_id text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in to book a bank.';
  END IF;

  -- Enforce duration restrictions: 0.5 to 6.0 hours in 0.5 hour increments
  IF p_duration_hours < 0.5 OR p_duration_hours > 6.0 OR (p_duration_hours * 2) <> floor(p_duration_hours * 2) THEN
    RAISE EXCEPTION 'Duration must be between 0.5 and 6.0 hours in increments of 30 minutes.';
  END IF;

  -- Enforce single active/pending rental limit per user
  IF EXISTS (
    SELECT 1 FROM public.rentals
    WHERE user_id = v_caller_id
      AND status IN ('pending', 'paid', 'active', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Active rental limit reached: You already have an open rental in progress.';
  END IF;

  -- 1. Fetch active pricing rule (server authoritative)
  SELECT * INTO v_pricing
  FROM public.pricing_rules
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pricing rules found. Contact administrator.';
  END IF;

  -- Calculate amount in integer paise
  v_total_amount := ROUND(v_pricing.hourly_rate_paise * p_duration_hours);

  -- 2. Concurrency-safe atomic slot selection with row-level lock
  SELECT s.id, s.slot_number, s.bank_id INTO v_slot
  FROM public.slots s
  JOIN public.banks b ON s.bank_id = b.id
  WHERE s.station_id = p_station_id
    AND s.status = 'ready'
    AND b.bank_type_id = p_bank_type_id
    AND b.battery_charge >= 70
    AND b.health_status = 'good'
  ORDER BY s.slot_number ASC
  FOR UPDATE OF s SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No available banks for this category at the selected station.';
  END IF;

  -- 3. Mark slot as temporarily reserved
  UPDATE public.slots
  SET status = 'reserved',
      updated_at = now()
  WHERE id = v_slot.id;

  -- 4. Generate next rental ID from dedicated sequence
  v_rental_id := 'LG-' || nextval('public.rental_id_seq');

  -- 5. Insert pending rental record
  INSERT INTO public.rentals (
    id,
    user_id,
    station_id,
    slot_id,
    bank_id,
    bank_type_id,
    duration_hours,
    amount_paise,
    status
  )
  VALUES (
    v_rental_id,
    v_caller_id,
    p_station_id,
    v_slot.id,
    v_slot.bank_id,
    p_bank_type_id,
    p_duration_hours,
    v_total_amount,
    'pending'
  );

  RETURN QUERY SELECT
    v_rental_id,
    v_slot.id,
    v_slot.slot_number,
    v_total_amount,
    v_pricing.hourly_rate_paise;
END;
$$;

REVOKE ALL ON FUNCTION public.book_slot_atomic(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_slot_atomic(text, text, numeric) TO authenticated;

-- 3. CANCEL PENDING RENTAL AND RELEASE RESERVED SLOT
CREATE OR REPLACE FUNCTION public.cancel_pending_rental(
  p_rental_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_rental record;
BEGIN
  SELECT * INTO v_rental
  FROM public.rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental not found.';
  END IF;

  -- Permitted only if caller is the rental owner or super_admin
  IF v_rental.user_id <> v_caller_id AND public.get_current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: You can only cancel your own pending rentals.';
  END IF;

  IF v_rental.status <> 'pending' THEN
    RAISE EXCEPTION 'Only rentals in pending status can be cancelled.';
  END IF;

  -- Release the reserved slot back to ready
  IF v_rental.slot_id IS NOT NULL THEN
    UPDATE public.slots
    SET status = 'ready',
        updated_at = now()
    WHERE id = v_rental.slot_id AND status = 'reserved';
  END IF;

  -- Mark rental as cancelled
  UPDATE public.rentals
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_rental_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_rental(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pending_rental(text) TO authenticated;

-- 4. CLEANUP EXPIRED PENDING RENTALS (10-minute validity expiry)
-- Can be called periodically via pg_cron or lazily before booking
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_rentals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired record;
  v_count integer := 0;
BEGIN
  FOR v_expired IN
    SELECT id, slot_id
    FROM public.rentals
    WHERE status = 'pending'
      AND created_at < (now() - interval '10 minutes')
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Release slot
    IF v_expired.slot_id IS NOT NULL THEN
      UPDATE public.slots
      SET status = 'ready',
          updated_at = now()
      WHERE id = v_expired.slot_id AND status = 'reserved';
    END IF;

    -- Update rental to cancelled
    UPDATE public.rentals
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = v_expired.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_pending_rentals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_rentals() TO authenticated;

-- 5. KIOSK PIN VERIFICATION & UNLOCK (SERVICE ROLE ONLY)
-- Enforces:
-- 1. Valid station credentials verified against station_secrets
-- 2. Rental must belong to the calling station
-- 3. 30-minute validity after payment
-- 4. 3-attempt lockout per rental
-- 5. Cryptographic hash comparison (crypt / HMAC)
CREATE OR REPLACE FUNCTION public.verify_kiosk_pin(
  p_station_id text,
  p_rental_id text,
  p_entered_pin text,
  p_station_key text
)
RETURNS TABLE (
  success boolean,
  slot_number integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key_hash text;
  v_rental record;
  v_slot record;
  v_pin_match boolean := false;
BEGIN
  -- 1. Verify Station Pre-Shared Key from private station_secrets
  SELECT api_key_hash INTO v_key_hash
  FROM public.station_secrets
  WHERE station_id = p_station_id;

  IF v_key_hash IS NULL OR crypt(p_station_key, v_key_hash) <> v_key_hash THEN
    RETURN QUERY SELECT false, 0, 'Station authentication failed: Invalid hardware credentials.'::text;
    RETURN;
  END IF;

  -- 2. Fetch rental record
  SELECT * INTO v_rental
  FROM public.rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Rental not found.'::text;
    RETURN;
  END IF;

  -- 3. Verify rental belongs to the calling station
  IF v_rental.station_id <> p_station_id THEN
    RETURN QUERY SELECT false, 0, 'Station mismatch: This PIN was issued for a different station.'::text;
    RETURN;
  END IF;

  -- 4. Verify rental is in paid status
  IF v_rental.status <> 'paid' THEN
    RETURN QUERY SELECT false, 0, ('Rental is not in paid status (current: ' || v_rental.status || ').')::text;
    RETURN;
  END IF;

  -- 5. Check 3-attempt lockout
  IF v_rental.is_pin_locked OR v_rental.pin_attempts >= 3 THEN
    INSERT INTO public.security_events (station_id, slot_id, event_type, severity, details)
    VALUES (
      v_rental.station_id,
      v_rental.slot_id,
      'pin_brute_force',
      'warning',
      jsonb_build_object('rental_id', p_rental_id, 'attempts', v_rental.pin_attempts)
    );
    RETURN QUERY SELECT false, 0, 'PIN locked due to 3 failed attempts. Please contact management.'::text;
    RETURN;
  END IF;

  -- 6. Check 30-minute validity window
  IF v_rental.pin_expires_at IS NOT NULL AND v_rental.pin_expires_at < now() THEN
    RETURN QUERY SELECT false, 0, 'PIN has expired (30-minute validity exceeded). Please file a complaint.'::text;
    RETURN;
  END IF;

  -- 7. Cryptographic PIN verification
  IF v_rental.pin_hash = crypt(p_entered_pin, v_rental.pin_hash) THEN
    v_pin_match := true;
  END IF;

  IF NOT v_pin_match THEN
    -- Increment wrong attempts
    UPDATE public.rentals
    SET pin_attempts = pin_attempts + 1,
        is_pin_locked = (pin_attempts + 1 >= 3),
        updated_at = now()
    WHERE id = p_rental_id;

    IF v_rental.pin_attempts + 1 >= 3 THEN
      INSERT INTO public.security_events (station_id, slot_id, event_type, severity, details)
      VALUES (
        v_rental.station_id,
        v_rental.slot_id,
        'pin_brute_force',
        'warning',
        jsonb_build_object('rental_id', p_rental_id, 'message', '3 failed PIN attempts - rental locked')
      );
      RETURN QUERY SELECT false, 0, 'Wrong PIN. Account locked for this rental (3 failed attempts).'::text;
    ELSE
      RETURN QUERY SELECT false, 0, ('Wrong PIN. ' || (3 - (v_rental.pin_attempts + 1)) || ' attempt(s) remaining.')::text;
    END IF;
    RETURN;
  END IF;

  -- 8. Success: Unlock slot and transition rental to active
  SELECT s.slot_number INTO v_slot
  FROM public.slots s
  WHERE s.id = v_rental.slot_id;

  UPDATE public.rentals
  SET status = 'active',
      started_at = now(),
      unlocked_at = now(),
      updated_at = now()
  WHERE id = p_rental_id;

  UPDATE public.slots
  SET status = 'out',
      updated_at = now()
  WHERE id = v_rental.slot_id;

  RETURN QUERY SELECT true, COALESCE(v_slot.slot_number, 1), 'Slot unlocked. Take your power bank.'::text;
END;
$$;

-- REVOKE EXECUTE FROM anon AND authenticated: Callable ONLY by service_role (Edge Function)
REVOKE ALL ON FUNCTION public.verify_kiosk_pin(text, text, text, text) FROM PUBLIC, anon, authenticated;


-- ==========================================
-- supabase/seed.sql
-- ==========================================
-- supabase/seed.sql
-- Initial Seed Data: Stations, Station Secrets, Bank Types, Banks, Slots, Telemetry, Security Events
-- Note: NO PRICING RULES ARE SEEDED (pricing_rules is left empty for administrator configuration)
-- Note: NO DEMO USERS OR PASSWORDS ARE SEEDED

-- 1. SEED STATIONS
INSERT INTO public.stations (id, name, x, y, latitude, longitude, total_slots, is_online)
VALUES
  ('library', 'Library', 425, 384, NULL, NULL, 8, true),
  ('mm', 'M.M Foods', 560, 377, NULL, NULL, 8, true),
  ('mingoes', 'Big Mingoes', 175, 471, NULL, NULL, 8, true),
  ('cauvery', 'Cauvery Hostel', 780, 387, NULL, NULL, 8, true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    total_slots = EXCLUDED.total_slots,
    is_online = EXCLUDED.is_online;

-- 2. SEED STATION SECRETS (Hardware Pre-Shared Key Hashes)
INSERT INTO public.station_secrets (station_id, api_key_hash)
VALUES
  ('library', crypt('station_sec_lib_2026', gen_salt('bf'))),
  ('mm', crypt('station_sec_mm_2026', gen_salt('bf'))),
  ('mingoes', crypt('station_sec_mingoes_2026', gen_salt('bf'))),
  ('cauvery', crypt('station_sec_cauvery_2026', gen_salt('bf')))
ON CONFLICT (station_id) DO UPDATE
SET api_key_hash = EXCLUDED.api_key_hash;

-- 3. SEED BANK TYPES
INSERT INTO public.bank_types (id, name, power_rating, description, discharge_rate, icon_path)
VALUES
  ('std', 'Grove Phone', '5V / 10W', 'Mobile charging', 0.05, 'M7 3h10v18H7z'),
  ('lap', 'Grove Laptop', '65W', 'USB-C laptop charging', 0.12, 'M4 5h16v11H4zM2 19h20'),
  ('fast', 'Grove Fast', '100W dual', 'Laptop and phone at once', 0.20, 'M13 2 4 14h7l-1 8 9-12h-7z'),
  ('wl', 'Grove Wireless', '15W magnetic', 'Magnetic wireless pad', 0.08, 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    power_rating = EXCLUDED.power_rating,
    description = EXCLUDED.description,
    discharge_rate = EXCLUDED.discharge_rate,
    icon_path = EXCLUDED.icon_path;

-- 4. SEED PHYSICAL BANKS & SLOTS (8 Slots per Station = 32 Slots Total)
DO $$
DECLARE
  st_id text;
  slot_idx integer;
  bank_uid uuid;
  assigned_type text;
  s_status text;
  b_charge integer;
  rfid_val text;
BEGIN
  FOR st_id IN SELECT id FROM public.stations LOOP
    FOR slot_idx IN 1..8 LOOP
      -- Assign bank categories evenly across stations
      IF slot_idx IN (1, 2, 3) THEN
        assigned_type := 'std';
      ELSIF slot_idx IN (4, 5) THEN
        assigned_type := 'lap';
      ELSIF slot_idx = 6 THEN
        assigned_type := 'fast';
      ELSE
        assigned_type := 'wl';
      END IF;

      -- Slot statuses matching campus prototype availability
      IF (slot_idx % 7 = 3) THEN
        s_status := 'out';
        b_charge := 25;
      ELSIF (slot_idx % 2 = 1) THEN
        s_status := 'ready';
        b_charge := 95 + (slot_idx % 5);
      ELSE
        s_status := 'charging';
        b_charge := 65 + (slot_idx * 4);
      END IF;

      rfid_val := 'RFID-' || UPPER(st_id) || '-' || LPAD(slot_idx::text, 2, '0');

      -- Insert bank asset (with unique RFID tag restricted to staff)
      INSERT INTO public.banks (id, bank_type_id, rfid_tag, battery_charge, health_status)
      VALUES (gen_random_uuid(), assigned_type, rfid_val, b_charge, 'good')
      ON CONFLICT (rfid_tag) DO UPDATE
      SET battery_charge = EXCLUDED.battery_charge
      RETURNING id INTO bank_uid;

      -- Insert station slot
      INSERT INTO public.slots (station_id, slot_number, bank_id, status)
      VALUES (st_id, slot_idx, CASE WHEN s_status = 'out' THEN NULL ELSE bank_uid END, s_status)
      ON CONFLICT (station_id, slot_number) DO UPDATE
      SET bank_id = EXCLUDED.bank_id,
          status = EXCLUDED.status;
    END LOOP;
  END LOOP;
END $$;

-- 5. SEED INITIAL STATION TELEMETRY
INSERT INTO public.station_telemetry (station_id, solar_watts, panel_temp_c, battery_reserve_pct)
VALUES
  ('library', 200.0, 34.0, 70.0),
  ('mm', 240.0, 34.0, 75.0),
  ('mingoes', 280.0, 34.0, 80.0),
  ('cauvery', 320.0, 34.0, 85.0);

-- 6. SEED INITIAL SECURITY EVENTS
INSERT INTO public.security_events (station_id, event_type, severity, details)
VALUES
  ('mingoes', 'vibration', 'warning', '{"slot": 4, "message": "Vibration sensor tripped at Big Mingoes slot 4"}'::jsonb),
  ('library', 'return_failed', 'warning', '{"slot": 2, "message": "Return check failed, Library slot 2"}'::jsonb);


