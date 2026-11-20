-- Migration: 20261120000002_allow_authenticated_rental_write.sql
-- Description: Allow authenticated students to insert and update their own rental records in public.rentals

-- 1. Grant authenticated role SELECT, INSERT, and UPDATE privileges on public.rentals
GRANT SELECT, INSERT, UPDATE ON public.rentals TO authenticated;

-- 2. Row-Level Security Policies for authenticated users to insert their own rentals
DROP POLICY IF EXISTS "rentals_insert_own" ON public.rentals;
CREATE POLICY "rentals_insert_own" ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) 
    OR user_id IS NULL 
    OR public.get_current_role() = 'super_admin'
  );

-- 3. Row-Level Security Policies for authenticated users to update their own rentals
DROP POLICY IF EXISTS "rentals_update_own" ON public.rentals;
CREATE POLICY "rentals_update_own" ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) 
    OR public.get_current_role() = 'super_admin'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) 
    OR public.get_current_role() = 'super_admin'
  );

-- 4. Update the rental status validation trigger to permit initial insertion in either 'pending' or 'paid' status
CREATE OR REPLACE FUNCTION public.validate_rental_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict initial status enforcement: initial status must be 'pending' or 'paid'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'paid') THEN
      RAISE EXCEPTION 'Invalid initial rental status: Rental must be initiated in pending or paid status (received %).', NEW.status;
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
