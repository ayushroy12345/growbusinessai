-- Page-level read RPCs.
--
-- Each hot page currently issues 5-10 sequential PostgREST round trips (~200ms
-- network RTT each). These functions collapse one page's related reads into a
-- single round trip while keeping the existing security model:
--
--   * SECURITY INVOKER (the Postgres default) so row level security on the
--     underlying tables still applies for the calling role (anon/authenticated);
--   * owner-scoped functions re-check authorization through the existing
--     has_business_access() helper before reading anything;
--   * customer-scoped rows are always derived from auth.uid(); the browser
--     never supplies a customer id;
--   * search_path is pinned.

CREATE OR REPLACE FUNCTION public.get_customer_dashboard()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) FROM public.customer_profiles p WHERE p.user_id = auth.uid()
    ),
    'stores', (
      SELECT coalesce(jsonb_agg(s.store_row ORDER BY s.ord ASC), '[]'::jsonb)
      FROM (
        SELECT
          bc.created_at AS ord,
          jsonb_build_object(
            'business', to_jsonb(b),
            'totalVisits', bc.total_visits,
            'lastVisitAt', bc.last_visit_at,
            'rewards', (
              SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.required_visits ASC), '[]'::jsonb)
              FROM public.rewards r
              WHERE r.business_id = bc.business_id
            )
          ) AS store_row
        FROM public.business_customers bc
        JOIN public.businesses b ON b.id = bc.business_id
        WHERE bc.customer_id = (
          SELECT p.id FROM public.customer_profiles p WHERE p.user_id = auth.uid()
        )
      ) s
    ),
    'claims', (
      SELECT coalesce(jsonb_agg(c.claim_row ORDER BY (c.claim_row ->> 'claimed_at')::timestamptz DESC), '[]'::jsonb)
      FROM (
        SELECT
          to_jsonb(rc)
          || jsonb_build_object(
            'reward', (SELECT to_jsonb(r) FROM public.rewards r WHERE r.id = rc.reward_id),
            'business', (SELECT to_jsonb(b) FROM public.businesses b WHERE b.id = rc.business_id)
          ) AS claim_row
        FROM public.reward_claims rc
        WHERE rc.customer_id = (
          SELECT p.id FROM public.customer_profiles p WHERE p.user_id = auth.uid()
        )
      ) c
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_business_customers(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF p_business_id IS NULL OR NOT public.has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'business % is not accessible to this session', p_business_id
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(t.customer_row ORDER BY t.last_visit_at DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      to_jsonb(bc)
      || jsonb_build_object(
        'customer_profile', (
          SELECT to_jsonb(cp) FROM public.customer_profiles cp WHERE cp.id = bc.customer_id
        ),
        'reward_status', CASE
          WHEN pr.id IS NULL THEN 'NONE'
          WHEN EXISTS (
            SELECT 1 FROM public.reward_claims rc
            WHERE rc.business_id = p_business_id
              AND rc.customer_id = bc.customer_id
              AND rc.reward_id = pr.id
              AND rc.status = 'CLAIMED'
              AND rc.expires_at > now()
          ) THEN 'CLAIMED'
          WHEN EXISTS (
            SELECT 1 FROM public.reward_claims rc
            WHERE rc.business_id = p_business_id
              AND rc.customer_id = bc.customer_id
              AND rc.reward_id = pr.id
              AND rc.status = 'CLAIMED'
              AND rc.expires_at <= now()
          ) THEN 'EXPIRED'
          WHEN bc.total_visits >= pr.required_visits THEN
            CASE
              WHEN EXISTS (
                SELECT 1 FROM public.reward_claims rc
                WHERE rc.business_id = p_business_id
                  AND rc.customer_id = bc.customer_id
                  AND rc.reward_id = pr.id
                  AND rc.status = 'REDEEMED'
              ) THEN 'REDEEMED'
              ELSE 'AVAILABLE'
            END
          ELSE 'LOCKED'
        END
      ) AS customer_row,
      bc.last_visit_at
    FROM public.business_customers bc
    LEFT JOIN LATERAL (
      SELECT r.id, r.required_visits
      FROM public.rewards r
      WHERE r.business_id = p_business_id
      ORDER BY r.required_visits ASC, r.id ASC
      LIMIT 1
    ) pr ON true
    WHERE bc.business_id = p_business_id
  ) t;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_dashboard(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_business_id IS NULL OR NOT public.has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'business % is not accessible to this session', p_business_id
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'analytics', jsonb_build_object(
      'totalCustomers', c.total_customers,
      'totalVisits', v.total_visits,
      'newCustomers', c.new_customers,
      'repeatCustomers', c.repeat_customers,
      'repeatRate', CASE
        WHEN c.total_customers = 0 THEN 0
        ELSE round(c.repeat_customers::numeric * 100 / c.total_customers)::int
      END,
      'rewardsUnlocked', cl.total_claims,
      'rewardsRedeemed', cl.redeemed_claims,
      'googleReviewClicks', e.google_review_clicks,
      'socialClicks', e.social_clicks,
      'feedbackCount', f.feedback_count,
      'dailyVisits', v.daily_visits,
      'weeklyVisits', v.weekly_visits,
      'monthlyVisits', v.monthly_visits
    ),
    'recentCustomers', public.get_business_customers(p_business_id),
    'recentFeedback', (
      SELECT coalesce(jsonb_agg(to_jsonb(fb) ORDER BY fb.created_at DESC), '[]'::jsonb)
      FROM public.feedback fb
      WHERE fb.business_id = p_business_id
    ),
    'stampRequests', (
      SELECT coalesce(jsonb_agg(
        to_jsonb(sr)
        || jsonb_build_object(
          'customer_profile', (
            SELECT to_jsonb(cp) FROM public.customer_profiles cp WHERE cp.id = sr.customer_id
          )
        )
        ORDER BY sr.requested_at DESC
      ), '[]'::jsonb)
      FROM public.stamp_requests sr
      WHERE sr.business_id = p_business_id AND sr.status = 'PENDING'
    )
  )
  INTO v_result
  FROM (
    SELECT
      count(*)::int AS total_customers,
      count(*) FILTER (WHERE total_visits > 1)::int AS repeat_customers,
      count(*) FILTER (WHERE first_visit_at >= now() - interval '7 days')::int AS new_customers
    FROM public.business_customers
    WHERE business_id = p_business_id
  ) c,
  (
    SELECT
      count(*)::int AS total_visits,
      count(*) FILTER (WHERE created_at >= now() - interval '1 day')::int AS daily_visits,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS weekly_visits,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS monthly_visits
    FROM public.visits
    WHERE business_id = p_business_id
  ) v,
  (
    SELECT
      count(*)::int AS total_claims,
      count(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed_claims
    FROM public.reward_claims
    WHERE business_id = p_business_id
  ) cl,
  (
    SELECT
      count(*) FILTER (WHERE event_type = 'google_review_clicked')::int AS google_review_clicks,
      count(*) FILTER (WHERE event_type = 'social_clicked')::int AS social_clicks
    FROM public.analytics_events
    WHERE business_id = p_business_id
  ) e,
  (
    SELECT count(*)::int AS feedback_count
    FROM public.feedback
    WHERE business_id = p_business_id
  ) f;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_loyalty_panel(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_business_id IS NULL OR NOT public.has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'business % is not accessible to this session', p_business_id
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'rewards', (
      SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.required_visits ASC), '[]'::jsonb)
      FROM public.rewards r
      WHERE r.business_id = p_business_id
    ),
    'rules', (
      SELECT to_jsonb(lr)
      FROM public.loyalty_programs lp
      JOIN public.loyalty_rules lr ON lr.loyalty_program_id = lp.id
      WHERE lp.business_id = p_business_id
      ORDER BY lp.created_at ASC, lr.created_at ASC
      LIMIT 1
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_page(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH b AS (
    SELECT * FROM public.businesses
    WHERE slug = lower(coalesce(trim(p_slug), '')) AND is_active = true
  ),
  prof AS (
    SELECT * FROM public.customer_profiles WHERE user_id = auth.uid()
  )
  SELECT jsonb_build_object(
    'business', (SELECT to_jsonb(b) FROM b),
    'rewards', (
      SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.required_visits ASC), '[]'::jsonb)
      FROM b JOIN public.rewards r ON r.business_id = b.id
    ),
    'rules', (
      SELECT to_jsonb(lr)
      FROM b
      JOIN public.loyalty_programs lp ON lp.business_id = b.id
      JOIN public.loyalty_rules lr ON lr.loyalty_program_id = lp.id
      LIMIT 1
    ),
    'menu', jsonb_build_object(
      'categories', (
        SELECT coalesce(jsonb_agg(to_jsonb(mc) ORDER BY mc.sort_order ASC), '[]'::jsonb)
        FROM b JOIN public.menu_categories mc ON mc.business_id = b.id
      ),
      'items', (
        SELECT coalesce(jsonb_agg(to_jsonb(mi) ORDER BY mi.sort_order ASC), '[]'::jsonb)
        FROM b JOIN public.menu_items mi ON mi.business_id = b.id
        WHERE mi.is_available = true
      )
    ),
    'scratch', (
      SELECT jsonb_build_object(
        'campaign', to_jsonb(sc),
        'prizes', (
          SELECT coalesce(jsonb_agg(to_jsonb(sp)), '[]'::jsonb)
          FROM public.scratch_prizes sp WHERE sp.campaign_id = sc.id
        ),
        'plays', (
          SELECT coalesce(jsonb_agg(to_jsonb(spl)), '[]'::jsonb)
          FROM public.scratch_plays spl
          WHERE spl.campaign_id = sc.id
            AND spl.customer_id = (SELECT pr.id FROM prof pr)
        )
      )
      FROM b
      JOIN public.scratch_campaigns sc ON sc.business_id = b.id AND sc.is_active = true
      ORDER BY sc.created_at DESC
      LIMIT 1
    ),
    'customer_profile', (SELECT to_jsonb(pr) FROM prof pr),
    'business_customer', (
      SELECT to_jsonb(cb)
      FROM b
      JOIN public.business_customers cb ON cb.business_id = b.id
      JOIN prof pr ON pr.id = cb.customer_id
      LIMIT 1
    ),
    'claims', (
      SELECT coalesce(jsonb_agg(c.claim_row ORDER BY (c.claim_row ->> 'claimed_at')::timestamptz DESC), '[]'::jsonb)
      FROM (
        SELECT
          to_jsonb(rc)
          || jsonb_build_object(
            'reward', (SELECT to_jsonb(r) FROM public.rewards r WHERE r.id = rc.reward_id),
            'business', (SELECT to_jsonb(bb) FROM public.businesses bb WHERE bb.id = rc.business_id)
          ) AS claim_row
        FROM public.reward_claims rc, b, prof
        WHERE rc.business_id = b.id AND rc.customer_id = prof.id
      ) c
    ),
    'stamp_request', (
      SELECT to_jsonb(sr)
      FROM b
      JOIN prof ON true
      JOIN public.stamp_requests sr ON sr.business_id = b.id AND sr.customer_id = prof.id
      ORDER BY sr.requested_at DESC
      LIMIT 1
    )
  )
  FROM b;
$$;

REVOKE ALL ON FUNCTION public.get_customer_dashboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_customers(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_dashboard(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_loyalty_panel(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_page(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_customer_dashboard() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_business_customers(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_owner_dashboard(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_loyalty_panel(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_business_page(text) TO anon, authenticated, service_role;
