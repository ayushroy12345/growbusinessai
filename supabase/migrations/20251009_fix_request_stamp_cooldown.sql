-- Fix: function make_interval(hours => double precision) does not exist
--
-- request_stamp() declared its cooldown as NUMERIC (v_hours) and passed it
-- straight to make_interval(hours => ...), which only accepts integer.
-- Every check-in failed with:
--   function make_interval(hours => double precision) does not exist
--
-- Run in the Supabase SQL Editor (or `supabase db push`) after the RLS fix.

CREATE OR REPLACE FUNCTION public.request_stamp(p_business_id UUID, p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours NUMERIC;
  v_approval BOOLEAN;
  v_program_id UUID;
  v_bc public.business_customers%ROWTYPE;
  v_last_request TIMESTAMPTZ;
  v_request_id UUID;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = p_customer_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
  END IF;

  SELECT id INTO v_program_id
  FROM public.loyalty_programs
  WHERE business_id = p_business_id AND is_active = true
  LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'No active loyalty program';
  END IF;

  SELECT COALESCE(min_interval_hours, 2), COALESCE(approval_required, true)
  INTO v_hours, v_approval
  FROM public.loyalty_rules
  WHERE loyalty_program_id = v_program_id
  LIMIT 1;

  SELECT * INTO v_bc
  FROM public.business_customers
  WHERE business_id = p_business_id AND customer_id = p_customer_id;

  IF NOT FOUND THEN
    INSERT INTO public.business_customers (
      business_id, customer_id, first_visit_at, last_visit_at, first_seen_at, last_seen_at,
      total_visits, total_spend, current_points_balance, status
    ) VALUES (
      p_business_id, p_customer_id, v_now, v_now, v_now, v_now, 0, 0, 0, 'ACTIVE'
    )
    RETURNING * INTO v_bc;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stamp_requests
    WHERE business_id = p_business_id AND customer_id = p_customer_id AND status = 'PENDING'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a stamp request waiting for approval.');
  END IF;

  SELECT requested_at INTO v_last_request
  FROM public.stamp_requests
  WHERE business_id = p_business_id AND customer_id = p_customer_id
  ORDER BY requested_at DESC
  LIMIT 1;

  IF (v_bc.total_visits > 0 AND v_bc.last_visit_at > v_now - make_interval(hours => v_hours::integer))
     OR (v_last_request IS NOT NULL AND v_last_request > v_now - make_interval(hours => v_hours::integer)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please wait before requesting another stamp.');
  END IF;

  INSERT INTO public.stamp_requests (business_id, customer_id, status, requested_at)
  VALUES (p_business_id, p_customer_id, 'PENDING', v_now)
  RETURNING id INTO v_request_id;

  INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
  VALUES ('stamp_requested', p_business_id, p_customer_id, jsonb_build_object('request_id', v_request_id));

  IF v_approval IS FALSE THEN
    PERFORM public.award_pending_stamp(v_request_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', CASE WHEN v_approval THEN 'PENDING' ELSE 'APPROVED' END,
    'message', CASE WHEN v_approval
      THEN 'Stamp request sent. The business will approve it.'
      ELSE 'Stamp added.' END,
    'request_id', v_request_id
  );
END;
$$;
