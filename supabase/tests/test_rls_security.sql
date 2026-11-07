-- supabase/tests/test_rls_security.sql
-- LumenGrove Security & RLS Test Suite
-- Executes end-to-end policy, constraint, and authorization checks against PostgreSQL

CREATE TABLE IF NOT EXISTS public.test_results (
  id serial PRIMARY KEY,
  test_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('PASS', 'FAIL')),
  details text
);

TRUNCATE TABLE public.test_results;

CREATE OR REPLACE FUNCTION public.record_test(
  p_name text,
  p_status text,
  p_details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.test_results (test_name, status, details)
  VALUES (p_name, p_status, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_test(text, text, text) TO anon, authenticated;

DO $$
DECLARE
  v_student1_id uuid := gen_random_uuid();
  v_student2_id uuid := gen_random_uuid();
  v_staff_tech_id uuid := gen_random_uuid();
  v_admin_id uuid := gen_random_uuid();
  v_pricing_id uuid := gen_random_uuid();
  v_test_rental_id text;
  v_test_slot_id uuid;
  v_count integer;
  v_slot_status text;
  v_rental_status text;
  v_threw boolean;
  v_err_msg text;
BEGIN
  ----------------------------------------------------------------------
  -- TEST 1: non-RVCE signup rejected
  ----------------------------------------------------------------------
  v_threw := false;
  BEGIN
    INSERT INTO auth.users (id, email)
    VALUES (gen_random_uuid(), 'intruder@external.com');
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw AND v_err_msg LIKE '%@rvce.edu.in%' THEN
    PERFORM public.record_test('1. non-RVCE signup rejected', 'PASS', 'Correctly rejected with message: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('1. non-RVCE signup rejected', 'FAIL', 'Expected failure for non-RVCE email, but got: ' || COALESCE(v_err_msg, 'SUCCESS'));
  END IF;

  ----------------------------------------------------------------------
  -- TEST 2: allow-listed staff accepted (without @rvce.edu.in)
  ----------------------------------------------------------------------
  v_threw := false;
  BEGIN
    INSERT INTO public.staff_allowlist (email, role, notes)
    VALUES ('tech_contractor@service.in', 'technician', 'Approved field technician');

    INSERT INTO auth.users (id, email)
    VALUES (v_staff_tech_id, 'tech_contractor@service.in');
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_threw THEN
    SELECT role INTO v_rental_status FROM public.profiles WHERE id = v_staff_tech_id;
    IF v_rental_status = 'technician' THEN
      PERFORM public.record_test('2. allow-listed staff accepted', 'PASS', 'Contractor provisioned with technician role.');
    ELSE
      PERFORM public.record_test('2. allow-listed staff accepted', 'FAIL', 'Profile created but wrong role: ' || COALESCE(v_rental_status, 'NULL'));
    END IF;
  ELSE
    PERFORM public.record_test('2. allow-listed staff accepted', 'FAIL', 'Allow-listed staff signup threw error: ' || v_err_msg);
  END IF;

  -- Create legitimate student accounts and admin account
  INSERT INTO public.staff_allowlist (email, role, notes)
  VALUES ('admin@rvce.edu.in', 'super_admin', 'Chief System Administrator')
  ON CONFLICT DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'admin@rvce.edu.in');
  INSERT INTO auth.users (id, email) VALUES (v_student1_id, '1rv21cs001@rvce.edu.in');
  INSERT INTO auth.users (id, email) VALUES (v_student2_id, '1rv21cs002@rvce.edu.in');

  -- Admin sets up an active pricing rule
  INSERT INTO public.pricing_rules (id, hourly_rate_paise, grace_period_mins, is_active)
  VALUES (v_pricing_id, 2000, 10, true);

  ----------------------------------------------------------------------
  -- TEST 3: student cannot insert a paid rental or completed payment directly
  ----------------------------------------------------------------------
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_student1_id::text, true);

  -- 3a. Direct rental insert attempt
  v_threw := false;
  BEGIN
    INSERT INTO public.rentals (id, user_id, station_id, duration_hours, amount_paise, status)
    VALUES ('LG-FAKE-01', v_student1_id, 'library', 1.0, 2000, 'paid');
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('3a. student cannot insert rental directly', 'PASS', 'Direct insert blocked: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('3a. student cannot insert rental directly', 'FAIL', 'Student was unexpectedly able to insert into rentals.');
  END IF;

  -- 3b. Direct payment insert attempt
  v_threw := false;
  BEGIN
    INSERT INTO public.payments (rental_id, user_id, amount_paise, status)
    VALUES ('LG-1042', v_student1_id, 2000, 'completed');
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('3b. student cannot insert payment directly', 'PASS', 'Direct payment insert blocked: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('3b. student cannot insert payment directly', 'FAIL', 'Student was unexpectedly able to insert into payments.');
  END IF;

  ----------------------------------------------------------------------
  -- TEST 4: student cannot call verify_kiosk_pin
  ----------------------------------------------------------------------
  v_threw := false;
  BEGIN
    PERFORM * FROM public.verify_kiosk_pin('library', 'LG-1042', '123456', 'station_sec_lib_2026');
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('4. student cannot call verify_kiosk_pin', 'PASS', 'verify_kiosk_pin execution blocked for authenticated student: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('4. student cannot call verify_kiosk_pin', 'FAIL', 'verify_kiosk_pin was unexpectedly executable by student.');
  END IF;

  ----------------------------------------------------------------------
  -- TEST 5: anon cannot read rfid_tag or api_key_hash
  ----------------------------------------------------------------------
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);

  -- 5a. Direct banks table read (RFID tags)
  v_threw := false;
  BEGIN
    PERFORM rfid_tag FROM public.banks LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('5a. anon cannot read rfid_tag on banks', 'PASS', 'Access to banks table blocked: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('5a. anon cannot read rfid_tag on banks', 'FAIL', 'Anon was unexpectedly able to read banks table.');
  END IF;

  -- 5b. Station secrets read
  v_threw := false;
  BEGIN
    PERFORM * FROM public.station_secrets LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('5b. anon cannot read station_secrets', 'PASS', 'Access to station_secrets blocked: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('5b. anon cannot read station_secrets', 'FAIL', 'Anon was unexpectedly able to read station_secrets.');
  END IF;

  -- 5c. v_banks_public view read (Public sanitized view works)
  v_threw := false;
  BEGIN
    SELECT count(*) INTO v_count FROM public.v_banks_public;
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_threw AND v_count > 0 THEN
    PERFORM public.record_test('5c. anon can read sanitized v_banks_public', 'PASS', 'Read ' || v_count || ' sanitized bank records without RFID exposure.');
  ELSE
    PERFORM public.record_test('5c. anon can read sanitized v_banks_public', 'FAIL', 'Failed to read v_banks_public: ' || COALESCE(v_err_msg, 'No records'));
  END IF;

  ----------------------------------------------------------------------
  -- TEST 6: a second open rental is rejected (book_slot_atomic & unique index)
  ----------------------------------------------------------------------
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_student1_id::text, true);

  -- First booking: succeeds
  SELECT rental_id, slot_id INTO v_test_rental_id, v_test_slot_id
  FROM public.book_slot_atomic('library', 'std', 1.0);

  -- Second booking attempt: must be rejected
  v_threw := false;
  BEGIN
    PERFORM * FROM public.book_slot_atomic('library', 'std', 1.0);
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw AND v_err_msg LIKE '%limit reached%' THEN
    PERFORM public.record_test('6. second open rental rejected', 'PASS', 'Blocked concurrent open rental with: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('6. second open rental rejected', 'FAIL', 'Expected second booking to fail, but got: ' || COALESCE(v_err_msg, 'SUCCESS'));
  END IF;

  ----------------------------------------------------------------------
  -- TEST 7: an expired pending rental releases its slot
  ----------------------------------------------------------------------
  -- Switch to service/superuser to artificially age the rental timestamp past 10 minutes
  RESET ROLE;
  UPDATE public.rentals
  SET created_at = now() - interval '15 minutes'
  WHERE id = v_test_rental_id;

  -- Verify slot was reserved
  SELECT status INTO v_slot_status FROM public.slots WHERE id = v_test_slot_id;

  -- Run cleanup function
  SELECT public.cleanup_expired_pending_rentals() INTO v_count;

  -- Check rental and slot status
  SELECT status INTO v_rental_status FROM public.rentals WHERE id = v_test_rental_id;
  SELECT status INTO v_slot_status FROM public.slots WHERE id = v_test_slot_id;

  IF v_count >= 1 AND v_rental_status = 'cancelled' AND v_slot_status = 'ready' THEN
    PERFORM public.record_test('7. expired pending rental releases slot', 'PASS', 'Cleaned ' || v_count || ' expired rental(s). Slot restored to ready, rental set to cancelled.');
  ELSE
    PERFORM public.record_test('7. expired pending rental releases slot', 'FAIL', 'Rental status=' || v_rental_status || ', slot status=' || v_slot_status);
  END IF;

  ----------------------------------------------------------------------
  -- TEST 8: guests (anon) can read pricing_rules
  ----------------------------------------------------------------------
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);

  v_threw := false;
  BEGIN
    SELECT count(*) INTO v_count FROM public.pricing_rules;
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_threw AND v_count >= 1 THEN
    PERFORM public.record_test('8. guests can read pricing_rules', 'PASS', 'Guest successfully read ' || v_count || ' active pricing rule(s).');
  ELSE
    PERFORM public.record_test('8. guests can read pricing_rules', 'FAIL', 'Guest failed to read pricing_rules: ' || COALESCE(v_err_msg, '0 rows'));
  END IF;

  ----------------------------------------------------------------------
  -- TEST 9: technician cannot read profiles
  ----------------------------------------------------------------------
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_staff_tech_id::text, true);

  -- Technician attempts to query student1 profile
  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE id = v_student1_id;

  IF v_count = 0 THEN
    PERFORM public.record_test('9. technician cannot read student profiles', 'PASS', 'Technician queried student profile and received 0 rows (blocked by RLS).');
  ELSE
    PERFORM public.record_test('9. technician cannot read student profiles', 'FAIL', 'Technician was able to read ' || v_count || ' student profile(s).');
  END IF;

  ----------------------------------------------------------------------
  -- TEST 10: student cannot change their own role
  ----------------------------------------------------------------------
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_student1_id::text, true);

  v_threw := false;
  BEGIN
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE id = v_student1_id;
  EXCEPTION WHEN OTHERS THEN
    v_threw := true;
    v_err_msg := SQLERRM;
  END;

  IF v_threw THEN
    PERFORM public.record_test('10. student cannot change own role', 'PASS', 'Role update blocked by trigger/column grant: ' || v_err_msg);
  ELSE
    PERFORM public.record_test('10. student cannot change own role', 'FAIL', 'Student was unexpectedly able to update role.');
  END IF;

  ----------------------------------------------------------------------
  -- TEST 11: student A cannot read student B rentals
  ----------------------------------------------------------------------
  -- Create a rental for student 1
  RESET ROLE;
  INSERT INTO public.rentals (
    id, user_id, station_id, slot_id, bank_type_id, duration_hours, amount_paise, status
  )
  VALUES (
    'LG-PRIV-01', v_student1_id, 'library', v_test_slot_id, 'std', 1.0, 2000, 'pending'
  );

  -- Student 2 attempts to read Student 1's rental
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_student2_id::text, true);

  SELECT count(*) INTO v_count
  FROM public.rentals
  WHERE user_id = v_student1_id;

  IF v_count = 0 THEN
    PERFORM public.record_test('11. student A cannot read student B rentals', 'PASS', 'Student 2 received 0 rows for Student 1 rentals (isolated by RLS).');
  ELSE
    PERFORM public.record_test('11. student A cannot read student B rentals', 'FAIL', 'Student 2 saw ' || v_count || ' rental(s) belonging to Student 1.');
  END IF;

  RESET ROLE;
END $$;
