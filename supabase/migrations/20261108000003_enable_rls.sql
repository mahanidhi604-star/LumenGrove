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
