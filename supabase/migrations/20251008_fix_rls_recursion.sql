-- Fix: infinite recursion detected in policy for relation "customer_profiles" (42P17)
--
-- The customer_profiles and business_customers SELECT policies referenced each
-- other. Postgres expands policy sub-queries while planning, so any read of
-- customer_profiles, business_customers, visits, reward_claims, stamp_* or
-- scratch_* rows failed outright — even with zero rows in the table.
--
-- Both directions are replaced with SECURITY DEFINER helpers, which run as the
-- function owner and therefore do not re-enter row level security.
--
-- Run this in the Supabase SQL Editor (or `supabase db push`).

-- ==========================================
-- SECURITY DEFINER HELPERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_own_customer_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.customer_profiles
        WHERE id = p_profile_id
          AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.customer_profile_is_visible(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.business_customers bc
        WHERE bc.customer_id = p_profile_id
          AND public.has_business_access(auth.uid(), bc.business_id)
    );
$$;

REVOKE ALL ON FUNCTION public.is_own_customer_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_profile_is_visible(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_own_customer_profile(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_profile_is_visible(UUID) TO anon, authenticated, service_role;

-- ==========================================
-- POLICIES: customer_profiles (cycle side A)
-- ==========================================

DROP POLICY IF EXISTS "Customer can view own profile" ON public.customer_profiles;
CREATE POLICY "Customer can view own profile"
ON public.customer_profiles FOR SELECT
USING (
    auth.uid() = user_id
    OR public.is_super_admin(auth.uid())
    OR public.customer_profile_is_visible(id)
);

-- ==========================================
-- POLICIES: business_customers (cycle side B)
-- ==========================================

DROP POLICY IF EXISTS "Business owners and staff see their customers" ON public.business_customers;
CREATE POLICY "Business owners and staff see their customers"
ON public.business_customers FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR public.is_own_customer_profile(customer_id)
);

-- ==========================================
-- POLICIES: tables that sub-queried customer_profiles
-- ==========================================

DROP POLICY IF EXISTS "Customer can view own claims, business can view their claims" ON public.reward_claims;
CREATE POLICY "Customer can view own claims, business can view their claims"
ON public.reward_claims FOR SELECT
USING (
    public.is_own_customer_profile(customer_id)
    OR public.has_business_access(auth.uid(), business_id)
);

DROP POLICY IF EXISTS "Customer can insert reward claim" ON public.reward_claims;
CREATE POLICY "Customer can insert reward claim"
ON public.reward_claims FOR INSERT
WITH CHECK (public.is_own_customer_profile(customer_id));

DROP POLICY IF EXISTS "Customer or business can view visits" ON public.visits;
CREATE POLICY "Customer or business can view visits"
ON public.visits FOR SELECT
USING (
    public.is_own_customer_profile(customer_id)
    OR public.has_business_access(auth.uid(), business_id)
);

DROP POLICY IF EXISTS "stamp requests visible to customer or business" ON public.stamp_requests;
CREATE POLICY "stamp requests visible to customer or business"
ON public.stamp_requests FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR public.is_own_customer_profile(customer_id)
);

DROP POLICY IF EXISTS "stamp events visible to customer or business" ON public.stamp_events;
CREATE POLICY "stamp events visible to customer or business"
ON public.stamp_events FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR public.is_own_customer_profile(customer_id)
);

DROP POLICY IF EXISTS "scratch plays visible to customer or business" ON public.scratch_plays;
CREATE POLICY "scratch plays visible to customer or business"
ON public.scratch_plays FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR public.is_own_customer_profile(customer_id)
);

DROP POLICY IF EXISTS "scratch rewards visible to customer or business" ON public.scratch_rewards;
CREATE POLICY "scratch rewards visible to customer or business"
ON public.scratch_rewards FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR public.is_own_customer_profile(customer_id)
);
