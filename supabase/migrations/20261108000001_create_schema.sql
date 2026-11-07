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
