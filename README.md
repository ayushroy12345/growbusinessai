# Grow Business AI — Multi-Tenant Customer Loyalty & Engagement SaaS

A production-quality, multi-tenant customer loyalty and engagement platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, and **Supabase**.

---

## 🌟 Key Architecture & Product Concepts

### 1. Universal Customer Identity
- A customer maintains **ONE universal account** across all participating businesses.
- Sign in with Google OAuth once. On first sign-in, the customer provides their name and phone number to complete their permanent profile.
- Entering any business via QR scan or URL automatically associates the customer with that business (`business_customers` tenant relationship) without creating duplicate accounts or logins.

### 2. Strict Multi-Tenant Isolation
- A **Business Owner** can own and operate multiple businesses (e.g., *Artisan Coffee Roasters*, *Roy Haute Fashion*).
- An active **Business Switcher** is present in the dashboard navigation.
- Every database query and server mutation strictly scopes data to the currently active business ID.
- **PostgreSQL Row Level Security (RLS)** policies prevent Business A from ever accessing or reading Business B's customers, visits, claims, or feedback.
- Cross-tenant voucher redemption is strictly rejected at the database level.

### 3. Configurable Loyalty & Anti-Abuse Cooldown
- Visit-based loyalty is configuration-driven (e.g., 5 visits = Free Coffee, 10 visits = 20% discount).
- Configurable **duplicate visit cooldown** (default: 2 hours) prevents bad actors from scanning the QR code repeatedly in quick succession.
- Reward statuses:
  - `LOCKED`: Customer has not yet reached required visits.
  - `AVAILABLE`: Milestone reached, ready to claim.
  - `CLAIMED`: Customer activated pass, unique alphanumeric claim code (e.g., `RW-94K2B8`) generated.
  - `REDEEMED`: Staff has verified and redeemed the reward at the counter. Duplicate redemption is strictly prevented.
  - `EXPIRED`: Claim expired past configured expiry window.

### 4. Reputation & Social Acceleration
- **Neutral "Review us on Google"**: Opens the configured Google review URL in a new tab without gating rewards or falsely claiming review completion. Outbound click events are tracked.
- **Private Feedback**: 1–5 star ratings with direct comments and contact details delivered straight to the business owner.
- **Social Channels**: Tracked outbound clicks to Instagram, Facebook, WhatsApp, WhatsApp Channel, YouTube, and Website.

### 5. Super Admin Governance & Audit Logging
- Protected platform administration area (`/admin`) for authorized users (`SUPER_ADMIN`).
- View all tenants, global customer counts, platform-wide analytics events, and audit logs.
- Moderate businesses by activating or suspending access in real time.

---

## 🗄️ Database Architecture & Schema

The complete PostgreSQL migration script is located at:
`supabase/migrations/20250101_init.sql`

### Tables Created:
1. `users` (id, email, full_name, phone, role, avatar_url, timestamps)
2. `customer_profiles` (id, user_id, full_name, phone, timestamps)
3. `businesses` (id, owner_id, slug, name, category, description, logo_url, phone, email, address, city, state, country, website_url, google_review_url, social URLs, is_active, timestamps)
4. `business_staff` (id, business_id, user_id, role, created_at)
5. `business_customers` (id, business_id, customer_id, first_visit_at, last_visit_at, total_visits, total_spend, current_points_balance, status, timestamps)
6. `loyalty_programs` (id, business_id, program_name, program_type, is_active, timestamps)
7. `loyalty_rules` (id, loyalty_program_id, min_interval_hours, points_per_visit, timestamps)
8. `rewards` (id, business_id, loyalty_program_id, title, description, reward_type, reward_value, required_visits, expiry_days, is_active, timestamps)
9. `reward_claims` (id, claim_code, business_id, customer_id, reward_id, status, claimed_at, expires_at, redeemed_at, redeemed_by_staff_id, timestamps)
10. `visits` (id, business_id, customer_id, source, purchase_amount, verification_status, metadata, created_at)
11. `purchases` (id, business_id, customer_id, visit_id, amount, currency, notes, created_at)
12. `feedback` (id, business_id, customer_id, rating, comment, customer_name, customer_contact, is_read, created_at)
13. `social_links` (id, business_id, platform, url, display_label, is_active, created_at)
14. `social_clicks` (id, business_id, customer_id, platform, clicked_at)
15. `qr_codes` (id, business_id, code_identifier, target_url, qr_type, scans_count, last_scanned_at, created_at)
16. `analytics_events` (id, event_type, business_id, customer_id, metadata, created_at)
17. `audit_logs` (id, user_id, business_id, action, entity_type, entity_id, old_data, new_data, created_at)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm

### 1. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration (used for QR codes, share links, and OAuth callbacks)
NEXT_PUBLIC_APP_URL=https://growbusinessai-jade.vercel.app
SUPER_ADMIN_EMAILS=admin@loyalty.com
```

### 2. Apply Database Schema
In the Supabase SQL Editor, run the migrations in order:

1. `supabase/migrations/20250101_init.sql`
2. `supabase/migrations/20251007_engagement.sql`

Or, with the Supabase CLI linked to the project:

```bash
supabase db push
```

`20251007_engagement.sql` adds stamp approval, scratch cards, the menu, review settings, row level security, and transactional database functions. The service role key stays on the server. Google sign-in uses `/api/auth/google` after the Google provider is enabled in Supabase Auth.

Development seed data is optional and is not required in production:

```bash
node scripts/seed-demo.mjs
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Acceptance Test Scenario Walkthrough

The platform has been verified against the full 26-step acceptance test:

1. **Create Business A**:
   - Navigate to `/dashboard/business/new`.
   - Create *Artisan Coffee Roasters* with slug `artisan-coffee`.
2. **Configure Loyalty**:
   - Visit `/dashboard/loyalty`.
   - Set milestone rule: "5 visits = Free Coffee".
3. **Generate Business A QR**:
   - Open `/dashboard/qr`.
   - Download or view printable counter standee pointing to `/b/artisan-coffee`.
4. **Customer Check-In**:
   - Customer opens `/b/artisan-coffee`.
   - Customer signs in with Google (or Customer persona `alex.customer@example.com`).
   - Profile created with name and mobile number.
5. **Visit Milestones**:
   - Click "Record Visit / Check In Now" -> Visit 1 recorded (1/5 progress).
   - Cooldown prevents duplicate rapid scans.
   - Visits progress: 2/5 ... 5/5.
6. **Reward Claim & Counter Redemption**:
   - At 5/5, reward status becomes `AVAILABLE`.
   - Customer clicks "Claim Reward Now" -> generates unique code `RW-XXXXXX`.
   - Staff navigates to `/dashboard/rewards/redeem`.
   - Staff enters the code -> verified and status becomes `REDEEMED`.
   - Duplicate redemption is strictly prevented if staff or customer enters code again.
7. **Reputation & Engagement**:
   - Customer submits private 5-star feedback.
   - Customer clicks "Review us on Google" -> redirected and click event logged.
8. **Owner Analytics**:
   - Business dashboard at `/dashboard` updates immediately with accurate customer count, visits, repeat rate, and review clicks.
9. **Multi-Tenant Isolation (Business B)**:
   - Owner creates Business B (*Roy Haute Fashion*, slug `roy-fashion`).
   - Customer visits `/b/roy-fashion`.
   - Universal account is reused; visit count starts at 0 for Business B.
   - Business B dashboard cannot view Business A's customers or visits.
   - Attempting to redeem a Business A voucher at Business B is rejected.
10. **Super Admin**:
    - Sign in as Admin (`admin@loyalty.com`).
    - Visit `/admin` to inspect all tenants, toggle business status (activate/suspend), and view full system audit logs.
