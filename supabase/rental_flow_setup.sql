-- ============================================================
-- LumenGrove: Complete Rental Flow Setup for ESP32 & MQTT
-- ============================================================

-- 1. Ensure 'station_01' exists in stations table
INSERT INTO public.stations (id, name, x, y, latitude, longitude, total_slots, is_online)
VALUES ('station_01', 'Solar Station 01 (Hardware Kiosk)', 425, 384, 12.9238, 77.4988, 8, true)
ON CONFLICT (id) DO UPDATE SET is_online = true;

-- 2. Add 'is_rented' column to banks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'banks' AND column_name = 'is_rented'
    ) THEN
        ALTER TABLE public.banks ADD COLUMN is_rented boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- 3. Create or replace view public.power_banks
CREATE OR REPLACE VIEW public.power_banks AS
SELECT 
    id,
    bank_type_id,
    rfid_tag,
    battery_charge,
    health_status,
    cycle_count,
    is_rented,
    created_at,
    updated_at
FROM public.banks;

-- 4. Adjust validate_rental_status_transition trigger function to allow initial status 'active' or 'paid'
CREATE OR REPLACE FUNCTION public.validate_rental_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Initial status allowed on INSERT: 'pending', 'paid', or 'active' (for hardware rent commands)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'paid', 'active') THEN
      RAISE EXCEPTION 'Invalid initial rental status: %', NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  -- Allow transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'paid', 'active', 'cancelled') THEN
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

-- 5. Enable RLS and permissive policies for anon on banks & rentals for the prototype
DROP POLICY IF EXISTS "banks_anon_select" ON public.banks;
CREATE POLICY "banks_anon_select" ON public.banks FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "banks_anon_update" ON public.banks;
CREATE POLICY "banks_anon_update" ON public.banks FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rentals_anon_select" ON public.rentals;
CREATE POLICY "rentals_anon_select" ON public.rentals FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "rentals_anon_insert" ON public.rentals;
CREATE POLICY "rentals_anon_insert" ON public.rentals FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "rentals_anon_update" ON public.rentals;
CREATE POLICY "rentals_anon_update" ON public.rentals FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rentals_auth_all" ON public.rentals;
CREATE POLICY "rentals_auth_all" ON public.rentals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Grant select and update permissions on public.banks and public.power_banks to anon and authenticated
GRANT SELECT, UPDATE ON public.banks TO anon, authenticated;
GRANT SELECT ON public.power_banks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rentals TO anon, authenticated;

-- 7. Ensure Realtime is enabled for public.rentals and public.banks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rentals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'banks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.banks;
    END IF;
END $$;
