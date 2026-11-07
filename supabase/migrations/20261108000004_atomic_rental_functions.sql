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
