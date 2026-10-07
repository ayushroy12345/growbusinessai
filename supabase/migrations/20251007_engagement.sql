-- Stamp approval, scratch cards, menu, and review settings.
-- Existing visit/reward tables stay in place. These objects are additive.

ALTER TABLE public.loyalty_rules
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.business_customers
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.business_customers
SET first_seen_at = COALESCE(first_seen_at, first_visit_at),
    last_seen_at = COALESCE(last_seen_at, last_visit_at);

CREATE TABLE IF NOT EXISTS public.stamp_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decline_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS stamp_requests_one_pending
  ON public.stamp_requests (business_id, customer_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_stamp_requests_business_status
  ON public.stamp_requests (business_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.stamp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  stamp_request_id UUID REFERENCES public.stamp_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stamp_events_business ON public.stamp_events (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scratch_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  attempts_per_customer INTEGER NOT NULL DEFAULT 1 CHECK (attempts_per_customer > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.scratch_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.scratch_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'NONE',
  reward_value TEXT,
  probability NUMERIC NOT NULL CHECK (probability >= 0),
  max_redemptions INTEGER,
  awarded_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.scratch_plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.scratch_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES public.scratch_prizes(id) ON DELETE SET NULL,
  outcome_title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_scratch_plays_customer
  ON public.scratch_plays (campaign_id, customer_id);

CREATE TABLE IF NOT EXISTS public.scratch_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  play_id UUID NOT NULL UNIQUE REFERENCES public.scratch_plays(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES public.scratch_prizes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_items_business ON public.menu_items (business_id, sort_order);

CREATE TABLE IF NOT EXISTS public.review_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  google_review_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.stamp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp requests visible to customer or business"
ON public.stamp_requests FOR SELECT
USING (
  public.has_business_access(auth.uid(), business_id)
  OR customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "stamp events visible to customer or business"
ON public.stamp_events FOR SELECT
USING (
  public.has_business_access(auth.uid(), business_id)
  OR customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "active scratch campaigns are public"
ON public.scratch_campaigns FOR SELECT
USING (is_active = true OR public.has_business_access(auth.uid(), business_id));

CREATE POLICY "owners manage scratch campaigns"
ON public.scratch_campaigns FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "active scratch prizes are public"
ON public.scratch_prizes FOR SELECT
USING (is_active = true OR public.has_business_access(auth.uid(), business_id));

CREATE POLICY "owners manage scratch prizes"
ON public.scratch_prizes FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "scratch plays visible to customer or business"
ON public.scratch_plays FOR SELECT
USING (
  public.has_business_access(auth.uid(), business_id)
  OR customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "scratch rewards visible to customer or business"
ON public.scratch_rewards FOR SELECT
USING (
  public.has_business_access(auth.uid(), business_id)
  OR customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "menu categories readable"
ON public.menu_categories FOR SELECT
USING (true);

CREATE POLICY "owners manage menu categories"
ON public.menu_categories FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "available menu items are public"
ON public.menu_items FOR SELECT
USING (is_available = true OR public.has_business_access(auth.uid(), business_id));

CREATE POLICY "owners manage menu items"
ON public.menu_items FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "review settings are public"
ON public.review_settings FOR SELECT
USING (true);

CREATE POLICY "owners manage review settings"
ON public.review_settings FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

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

  IF (v_bc.total_visits > 0 AND v_bc.last_visit_at > v_now - make_interval(hours => v_hours))
     OR (v_last_request IS NOT NULL AND v_last_request > v_now - make_interval(hours => v_hours)) THEN
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

CREATE OR REPLACE FUNCTION public.award_pending_stamp(p_request_id UUID, p_actor_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.stamp_requests%ROWTYPE;
  v_bc public.business_customers%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_visits INTEGER;
  v_required INTEGER;
BEGIN
  SELECT * INTO v_req FROM public.stamp_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stamp request not found';
  END IF;
  IF v_req.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This request was already decided.');
  END IF;

  SELECT * INTO v_bc
  FROM public.business_customers
  WHERE business_id = v_req.business_id AND customer_id = v_req.customer_id
  FOR UPDATE;

  v_visits := COALESCE(v_bc.total_visits, 0) + 1;

  UPDATE public.business_customers
  SET total_visits = v_visits,
      last_visit_at = v_now,
      last_seen_at = v_now,
      first_visit_at = COALESCE(first_visit_at, v_now),
      first_seen_at = COALESCE(first_seen_at, v_now),
      updated_at = v_now
  WHERE id = v_bc.id;

  INSERT INTO public.visits (business_id, customer_id, source, verification_status, metadata)
  VALUES (v_req.business_id, v_req.customer_id, 'QR_SCAN', 'VERIFIED', jsonb_build_object('stamp_request_id', p_request_id));

  INSERT INTO public.stamp_events (business_id, customer_id, stamp_request_id)
  VALUES (v_req.business_id, v_req.customer_id, p_request_id);

  UPDATE public.stamp_requests
  SET status = 'APPROVED', decided_at = v_now, decided_by = p_actor_user_id
  WHERE id = p_request_id;

  INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
  VALUES
    ('stamp_approved', v_req.business_id, v_req.customer_id, jsonb_build_object('request_id', p_request_id)),
    ('stamp_awarded', v_req.business_id, v_req.customer_id, jsonb_build_object('visits', v_visits));

  SELECT required_visits INTO v_required
  FROM public.rewards
  WHERE business_id = v_req.business_id AND is_active = true
  ORDER BY required_visits ASC
  LIMIT 1;

  IF v_required IS NOT NULL AND COALESCE(v_bc.total_visits, 0) < v_required AND v_visits >= v_required THEN
    INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
    VALUES ('reward_unlocked', v_req.business_id, v_req.customer_id, jsonb_build_object('required_visits', v_required));
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Stamp approved.', 'visits', v_visits);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_stamp(
  p_request_id UUID,
  p_decision TEXT,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.stamp_requests%ROWTYPE;
  v_bc public.business_customers%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_visits INTEGER;
  v_required INTEGER;
BEGIN
  IF p_decision NOT IN ('APPROVED', 'DECLINED') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;

  SELECT * INTO v_req FROM public.stamp_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stamp request not found';
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    p_actor_user_id := auth.uid();
  END IF;

  IF NOT public.has_business_access(p_actor_user_id, v_req.business_id) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This request was already decided.');
  END IF;

  IF p_decision = 'DECLINED' THEN
    UPDATE public.stamp_requests
    SET status = 'DECLINED', decided_at = v_now, decided_by = p_actor_user_id
    WHERE id = p_request_id;

    INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
    VALUES ('stamp_declined', v_req.business_id, v_req.customer_id, jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true, 'message', 'Stamp request declined.');
  END IF;

  SELECT * INTO v_bc
  FROM public.business_customers
  WHERE business_id = v_req.business_id AND customer_id = v_req.customer_id
  FOR UPDATE;

  v_visits := COALESCE(v_bc.total_visits, 0) + 1;

  UPDATE public.business_customers
  SET total_visits = v_visits,
      last_visit_at = v_now,
      last_seen_at = v_now,
      first_visit_at = COALESCE(first_visit_at, v_now),
      first_seen_at = COALESCE(first_seen_at, v_now),
      updated_at = v_now
  WHERE id = v_bc.id;

  INSERT INTO public.visits (business_id, customer_id, source, verification_status, metadata)
  VALUES (v_req.business_id, v_req.customer_id, 'QR_SCAN', 'VERIFIED', jsonb_build_object('stamp_request_id', p_request_id));

  INSERT INTO public.stamp_events (business_id, customer_id, stamp_request_id)
  VALUES (v_req.business_id, v_req.customer_id, p_request_id);

  UPDATE public.stamp_requests
  SET status = 'APPROVED', decided_at = v_now, decided_by = p_actor_user_id
  WHERE id = p_request_id;

  INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
  VALUES
    ('stamp_approved', v_req.business_id, v_req.customer_id, jsonb_build_object('request_id', p_request_id)),
    ('stamp_awarded', v_req.business_id, v_req.customer_id, jsonb_build_object('visits', v_visits));

  SELECT required_visits INTO v_required
  FROM public.rewards
  WHERE business_id = v_req.business_id AND is_active = true
  ORDER BY required_visits ASC
  LIMIT 1;

  IF v_required IS NOT NULL AND v_bc.total_visits < v_required AND v_visits >= v_required THEN
    INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
    VALUES ('reward_unlocked', v_req.business_id, v_req.customer_id, jsonb_build_object('required_visits', v_required));
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Stamp approved.', 'visits', v_visits);
END;
$$;

CREATE OR REPLACE FUNCTION public.play_scratch(p_campaign_id UUID, p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.scratch_campaigns%ROWTYPE;
  v_prize public.scratch_prizes%ROWTYPE;
  v_play_id UUID;
  v_total NUMERIC;
  v_roll NUMERIC;
  v_cursor NUMERIC;
  v_plays INTEGER;
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

  SELECT * INTO v_campaign FROM public.scratch_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND OR NOT v_campaign.is_active THEN
    RAISE EXCEPTION 'Scratch campaign is not available';
  END IF;

  IF v_campaign.starts_at IS NOT NULL AND v_campaign.starts_at > v_now THEN
    RAISE EXCEPTION 'Scratch campaign has not started';
  END IF;
  IF v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at < v_now THEN
    RAISE EXCEPTION 'Scratch campaign has ended';
  END IF;

  SELECT COUNT(*) INTO v_plays
  FROM public.scratch_plays
  WHERE campaign_id = p_campaign_id AND customer_id = p_customer_id;

  IF v_plays >= v_campaign.attempts_per_customer THEN
    RAISE EXCEPTION 'Scratch card already used';
  END IF;

  SELECT COALESCE(SUM(probability), 0) INTO v_total
  FROM public.scratch_prizes
  WHERE campaign_id = p_campaign_id
    AND is_active = true
    AND probability > 0
    AND (max_redemptions IS NULL OR awarded_count < max_redemptions);

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No prizes are available';
  END IF;

  v_roll := random() * v_total;
  v_cursor := 0;

  FOR v_prize IN
    SELECT * FROM public.scratch_prizes
    WHERE campaign_id = p_campaign_id
      AND is_active = true
      AND probability > 0
      AND (max_redemptions IS NULL OR awarded_count < max_redemptions)
    ORDER BY created_at
  LOOP
    v_cursor := v_cursor + v_prize.probability;
    EXIT WHEN v_cursor >= v_roll;
  END LOOP;

  UPDATE public.scratch_prizes
  SET awarded_count = awarded_count + 1
  WHERE id = v_prize.id;

  INSERT INTO public.scratch_plays (campaign_id, business_id, customer_id, prize_id, outcome_title)
  VALUES (p_campaign_id, v_campaign.business_id, p_customer_id, v_prize.id, v_prize.title)
  RETURNING id INTO v_play_id;

  INSERT INTO public.scratch_rewards (play_id, business_id, customer_id, prize_id, title)
  VALUES (v_play_id, v_campaign.business_id, p_customer_id, v_prize.id, v_prize.title);

  INSERT INTO public.analytics_events (event_type, business_id, customer_id, metadata)
  VALUES
    ('scratch_started', v_campaign.business_id, p_customer_id, jsonb_build_object('campaign_id', p_campaign_id)),
    ('scratch_completed', v_campaign.business_id, p_customer_id, jsonb_build_object('play_id', v_play_id, 'prize', v_prize.title));

  RETURN jsonb_build_object(
    'success', true,
    'play_id', v_play_id,
    'title', v_prize.title,
    'description', v_prize.description,
    'reward_value', v_prize.reward_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_pending_stamp(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_pending_stamp(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.request_stamp(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_stamp(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.play_scratch(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_stamp(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_stamp(UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.play_scratch(UUID, UUID) TO authenticated, service_role;
