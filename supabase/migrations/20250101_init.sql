-- Multi-Tenant Customer Loyalty and Engagement SaaS Platform Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES
-- Roles: 'CUSTOMER', 'BUSINESS_OWNER', 'BUSINESS_STAFF', 'SUPER_ADMIN'
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'BUSINESS_OWNER', 'BUSINESS_STAFF', 'SUPER_ADMIN')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CUSTOMER PROFILES (Universal Global Identity)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BUSINESSES (Multi-Tenant isolation root)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    website_url TEXT,
    google_review_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    whatsapp_number TEXT,
    whatsapp_channel_url TEXT,
    youtube_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 4. BUSINESS STAFF
CREATE TABLE IF NOT EXISTS public.business_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('STAFF', 'MANAGER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_staff_business ON public.business_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_business_staff_user ON public.business_staff(user_id);

-- 5. BUSINESS CUSTOMERS (Tenant relationship)
CREATE TABLE IF NOT EXISTS public.business_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    first_visit_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_visit_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    total_visits INTEGER NOT NULL DEFAULT 0,
    total_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_points_balance INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(business_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_business_customers_business ON public.business_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_customers_customer ON public.business_customers(customer_id);

-- 6. LOYALTY PROGRAMS
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    program_name TEXT NOT NULL DEFAULT 'Visit Loyalty',
    program_type TEXT NOT NULL DEFAULT 'VISIT_BASED' CHECK (program_type IN ('VISIT_BASED', 'POINTS_BASED')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. LOYALTY RULES
CREATE TABLE IF NOT EXISTS public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loyalty_program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    min_interval_hours INTEGER NOT NULL DEFAULT 2, -- duplicate protection cooldown
    points_per_visit INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. REWARDS
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    loyalty_program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL DEFAULT 'DISCOUNT' CHECK (reward_type IN ('FREE_ITEM', 'DISCOUNT', 'GIFT', 'EXPERIENCE')),
    reward_value TEXT NOT NULL,
    required_visits INTEGER NOT NULL DEFAULT 5,
    expiry_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rewards_business ON public.rewards(business_id);

-- 9. REWARD CLAIMS
CREATE TABLE IF NOT EXISTS public.reward_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_code TEXT NOT NULL UNIQUE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'CLAIMED' CHECK (status IN ('CLAIMED', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by_staff_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_claim_code ON public.reward_claims(claim_code);
CREATE INDEX IF NOT EXISTS idx_reward_claims_business ON public.reward_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_customer ON public.reward_claims(customer_id);

-- 10. VISITS
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'QR_SCAN' CHECK (source IN ('QR_SCAN', 'URL', 'MANUAL_STAFF')),
    purchase_amount NUMERIC(12,2) DEFAULT NULL,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('VERIFIED', 'PENDING', 'REJECTED')),
    qr_code_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_visits_business ON public.visits(business_id);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON public.visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at);

-- 11. PURCHASES
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_purchases_business ON public.purchases(business_id);

-- 12. FEEDBACK
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    customer_name TEXT,
    customer_contact TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedback_business ON public.feedback(business_id);

-- 13. SOCIAL LINKS
CREATE TABLE IF NOT EXISTS public.social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'whatsapp', 'whatsapp_channel', 'youtube', 'website', 'google_review')),
    url TEXT NOT NULL,
    display_label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_business ON public.social_links(business_id);

-- 14. SOCIAL CLICKS
CREATE TABLE IF NOT EXISTS public.social_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_social_clicks_business ON public.social_clicks(business_id);

-- 15. QR CODES
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code_identifier TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    qr_type TEXT NOT NULL DEFAULT 'CHECKIN' CHECK (qr_type IN ('CHECKIN', 'REWARD')),
    scans_count INTEGER NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_business ON public.qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_identifier ON public.qr_codes(code_identifier);

-- 16. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_business ON public.analytics_events(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

-- RLS POLICIES & SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'SUPER_ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_business_access(uid UUID, b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (SELECT 1 FROM public.businesses WHERE id = b_id AND owner_id = uid)
        OR EXISTS (SELECT 1 FROM public.business_staff WHERE business_id = b_id AND user_id = uid)
        OR public.is_super_admin(uid)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users RLS
CREATE POLICY "Users can read own profile or admins read all"
ON public.users FOR SELECT
USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Customer Profiles RLS
CREATE POLICY "Customer can view own profile"
ON public.customer_profiles FOR SELECT
USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.business_customers bc
    JOIN public.businesses b ON b.id = bc.business_id
    WHERE bc.customer_id = customer_profiles.id AND public.has_business_access(auth.uid(), b.id)
));

CREATE POLICY "Customer can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Customer can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Businesses RLS
CREATE POLICY "Anyone can view active business public profile"
ON public.businesses FOR SELECT
USING (is_active = true OR public.has_business_access(auth.uid(), id));

CREATE POLICY "Business owners can create businesses"
ON public.businesses FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can update their business"
ON public.businesses FOR UPDATE
USING (public.has_business_access(auth.uid(), id));

CREATE POLICY "Super admins can delete businesses"
ON public.businesses FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Business Staff RLS
CREATE POLICY "Business staff visible to business owner/managers"
ON public.business_staff FOR SELECT
USING (public.has_business_access(auth.uid(), business_id));

-- Business Customers RLS
CREATE POLICY "Business owners and staff see their customers"
ON public.business_customers FOR SELECT
USING (
    public.has_business_access(auth.uid(), business_id)
    OR customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

-- Rewards RLS
CREATE POLICY "Public rewards visibility for active business"
ON public.rewards FOR SELECT
USING (is_active = true OR public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business owners can manage rewards"
ON public.rewards FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

-- Reward Claims RLS
CREATE POLICY "Customer can view own claims, business can view their claims"
ON public.reward_claims FOR SELECT
USING (
    customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
    OR public.has_business_access(auth.uid(), business_id)
);

CREATE POLICY "Customer can insert reward claim"
ON public.reward_claims FOR INSERT
WITH CHECK (
    customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Business staff or owner can update/redeem reward claim"
ON public.reward_claims FOR UPDATE
USING (public.has_business_access(auth.uid(), business_id));

-- Visits RLS
CREATE POLICY "Customer or business can view visits"
ON public.visits FOR SELECT
USING (
    customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
    OR public.has_business_access(auth.uid(), business_id)
);

-- Feedback RLS
CREATE POLICY "Customer can submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can view feedback"
ON public.feedback FOR SELECT
USING (public.has_business_access(auth.uid(), business_id));

-- Social Links RLS
CREATE POLICY "Anyone can view social links"
ON public.social_links FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage social links"
ON public.social_links FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

-- QR Codes RLS
CREATE POLICY "Anyone can view qr codes"
ON public.qr_codes FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage qr codes"
ON public.qr_codes FOR ALL
USING (public.has_business_access(auth.uid(), business_id));

-- Analytics Events RLS
CREATE POLICY "Business owners see their analytics"
ON public.analytics_events FOR SELECT
USING (public.has_business_access(auth.uid(), business_id));

-- Trigger: Automatically handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_business_customers_updated_at
BEFORE UPDATE ON public.business_customers
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
