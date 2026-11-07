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
