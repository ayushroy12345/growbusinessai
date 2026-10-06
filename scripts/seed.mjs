import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const now = new Date();
const isoNow = now.toISOString();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

// 1. Users
const ownerUser = {
  id: '00000000-0000-4000-a000-000000000001',
  email: 'owner@cafeempire.com',
  full_name: 'Marcus Vance',
  phone: '+1 (555) 234-5678',
  role: 'BUSINESS_OWNER',
  avatar_url: null,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const customerUser = {
  id: '00000000-0000-4000-a000-000000000002',
  email: 'alex.customer@example.com',
  full_name: 'Alex Smith',
  phone: '+1 (555) 888-9999',
  role: 'CUSTOMER',
  avatar_url: null,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const adminUser = {
  id: '00000000-0000-4000-a000-000000000003',
  email: 'admin@loyalty.com',
  full_name: 'Platform Super Admin',
  phone: '+1 (555) 000-0000',
  role: 'SUPER_ADMIN',
  avatar_url: null,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

// 2. Customer Profiles
const customerProfile = {
  id: '10000000-0000-4000-a000-000000000001',
  user_id: customerUser.id,
  full_name: 'Alex Smith',
  phone: '+1 (555) 888-9999',
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

// 3. Businesses
const businessA = {
  id: '20000000-0000-4000-a000-000000000001',
  owner_id: ownerUser.id,
  slug: 'artisan-coffee',
  name: 'Artisan Coffee Roasters',
  category: 'Specialty Cafe & Bakery',
  description: 'Fresh artisanal roasts, handcrafted espresso, and freshly baked pastries daily.',
  logo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop&crop=faces',
  phone: '+1 (555) 123-4567',
  email: 'hello@artisancoffee.com',
  address: '450 Hayes Street',
  city: 'San Francisco',
  state: 'CA',
  country: 'United States',
  website_url: 'https://artisancoffeeroasters.com',
  google_review_url: 'https://g.page/r/artisan-coffee-sf/review',
  instagram_url: 'https://instagram.com/artisancoffee',
  facebook_url: 'https://facebook.com/artisancoffee',
  whatsapp_number: '+15551234567',
  whatsapp_channel_url: 'https://whatsapp.com/channel/artisancoffee',
  youtube_url: 'https://youtube.com/@artisancoffee',
  is_active: true,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const businessB = {
  id: '20000000-0000-4000-a000-000000000002',
  owner_id: ownerUser.id,
  slug: 'roy-fashion',
  name: 'Roy Haute Fashion',
  category: 'Designer Apparel & Boutique',
  description: 'Curated luxury apparel, premium streetwear, and bespoke tailoring.',
  logo_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop&crop=faces',
  phone: '+1 (555) 987-6543',
  email: 'concierge@royfashion.com',
  address: '720 5th Avenue',
  city: 'New York',
  state: 'NY',
  country: 'United States',
  website_url: 'https://royhautefashion.com',
  google_review_url: 'https://g.page/r/roy-fashion-ny/review',
  instagram_url: 'https://instagram.com/royhautefashion',
  facebook_url: null,
  whatsapp_number: '+15559876543',
  whatsapp_channel_url: null,
  youtube_url: null,
  is_active: true,
  created_at: yesterday,
  updated_at: isoNow,
};

// 4. Loyalty Programs & Rules
const loyaltyProgramA = {
  id: '30000000-0000-4000-a000-000000000001',
  business_id: businessA.id,
  program_name: 'Artisan Perks Club',
  program_type: 'VISIT_BASED',
  is_active: true,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const loyaltyRuleA = {
  id: '40000000-0000-4000-a000-000000000001',
  loyalty_program_id: loyaltyProgramA.id,
  min_interval_hours: 2,
  points_per_visit: 1,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const loyaltyProgramB = {
  id: '30000000-0000-4000-a000-000000000002',
  business_id: businessB.id,
  program_name: 'Roy VIP Rewards',
  program_type: 'VISIT_BASED',
  is_active: true,
  created_at: yesterday,
  updated_at: isoNow,
};

const loyaltyRuleB = {
  id: '40000000-0000-4000-a000-000000000002',
  loyalty_program_id: loyaltyProgramB.id,
  min_interval_hours: 4,
  points_per_visit: 1,
  created_at: yesterday,
  updated_at: isoNow,
};

// 5. Rewards
const rewardA1 = {
  id: '50000000-0000-4000-a000-000000000001',
  business_id: businessA.id,
  loyalty_program_id: loyaltyProgramA.id,
  title: 'Free Coffee or Welcome Treat',
  description: 'Collect 5 visits and enjoy a complimentary hot or iced coffee of your choice.',
  reward_type: 'FREE_ITEM',
  reward_value: 'Free Coffee',
  required_visits: 5,
  expiry_days: 30,
  is_active: true,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const rewardA2 = {
  id: '50000000-0000-4000-a000-000000000002',
  business_id: businessA.id,
  loyalty_program_id: loyaltyProgramA.id,
  title: '20% Off Entire Order',
  description: 'Reach 10 visits to unlock a 20% discount on food, beans, and drinks.',
  reward_type: 'DISCOUNT',
  reward_value: '20% Off',
  required_visits: 10,
  expiry_days: 30,
  is_active: true,
  created_at: threeDaysAgo,
  updated_at: isoNow,
};

const rewardB1 = {
  id: '50000000-0000-4000-a000-000000000003',
  business_id: businessB.id,
  loyalty_program_id: loyaltyProgramB.id,
  title: 'Complimentary Canvas Tote Bag',
  description: 'Visit 3 times to receive an exclusive limited-edition designer canvas tote bag.',
  reward_type: 'GIFT',
  reward_value: 'Canvas Tote',
  required_visits: 3,
  expiry_days: 45,
  is_active: true,
  created_at: yesterday,
  updated_at: isoNow,
};

// 6. Business-Customer Relationship & Visits
const businessCustomerA = {
  id: '60000000-0000-4000-a000-000000000001',
  business_id: businessA.id,
  customer_id: customerProfile.id,
  first_visit_at: threeDaysAgo,
  last_visit_at: yesterday,
  total_visits: 5,
  total_spend: 32.5,
  current_points_balance: 5,
  status: 'ACTIVE',
  created_at: threeDaysAgo,
  updated_at: yesterday,
};

const visits = [
  {
    id: '70000000-0000-4000-a000-000000000001',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    source: 'QR_SCAN',
    purchase_amount: 5.5,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: threeDaysAgo,
  },
  {
    id: '70000000-0000-4000-a000-000000000002',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    source: 'QR_SCAN',
    purchase_amount: 6.25,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '70000000-0000-4000-a000-000000000003',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    source: 'QR_SCAN',
    purchase_amount: 7.0,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '70000000-0000-4000-a000-000000000004',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    source: 'QR_SCAN',
    purchase_amount: 5.75,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '70000000-0000-4000-a000-000000000005',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    source: 'QR_SCAN',
    purchase_amount: 8.0,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: yesterday,
  },
];

// 7. Active Claim ready for Counter Redemption
const rewardClaim = {
  id: '80000000-0000-4000-a000-000000000001',
  claim_code: 'RW-7K8A2P',
  business_id: businessA.id,
  customer_id: customerProfile.id,
  reward_id: rewardA1.id,
  status: 'CLAIMED',
  claimed_at: yesterday,
  expires_at: expiryDate,
  redeemed_at: null,
  redeemed_by_staff_id: null,
  created_at: yesterday,
  updated_at: yesterday,
};

// 8. Sample Feedback
const feedback = [
  {
    id: '90000000-0000-4000-a000-000000000001',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    rating: 5,
    comment: 'Best flat white in the neighborhood! The loyalty QR is so fast and convenient.',
    customer_name: 'Alex Smith',
    customer_contact: '+1 (555) 888-9999',
    is_read: true,
    created_at: yesterday,
  },
];

// 9. Analytics Events
const analytics_events = [
  {
    id: crypto.randomUUID(),
    event_type: 'business_created',
    business_id: businessA.id,
    customer_id: null,
    metadata: { name: businessA.name },
    created_at: threeDaysAgo,
  },
  {
    id: crypto.randomUUID(),
    event_type: 'google_review_clicked',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    metadata: {},
    created_at: yesterday,
  },
  {
    id: crypto.randomUUID(),
    event_type: 'social_clicked',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    metadata: { platform: 'instagram' },
    created_at: yesterday,
  },
  {
    id: crypto.randomUUID(),
    event_type: 'reward_claimed',
    business_id: businessA.id,
    customer_id: customerProfile.id,
    metadata: { claim_code: 'RW-7K8A2P', reward_id: rewardA1.id },
    created_at: yesterday,
  },
];

// 10. Audit Logs
const audit_logs = [
  {
    id: crypto.randomUUID(),
    user_id: ownerUser.id,
    business_id: businessA.id,
    action: 'CREATE_BUSINESS',
    entity_type: 'business',
    entity_id: businessA.id,
    old_data: null,
    new_data: { name: businessA.name, slug: businessA.slug },
    ip_address: null,
    user_agent: null,
    created_at: threeDaysAgo,
  },
  {
    id: crypto.randomUUID(),
    user_id: ownerUser.id,
    business_id: businessB.id,
    action: 'CREATE_BUSINESS',
    entity_type: 'business',
    entity_id: businessB.id,
    old_data: null,
    new_data: { name: businessB.name, slug: businessB.slug },
    ip_address: null,
    user_agent: null,
    created_at: yesterday,
  },
];

const database = {
  users: [ownerUser, customerUser, adminUser],
  customer_profiles: [customerProfile],
  businesses: [businessA, businessB],
  business_staff: [],
  business_customers: [businessCustomerA],
  loyalty_programs: [loyaltyProgramA, loyaltyProgramB],
  loyalty_rules: [loyaltyRuleA, loyaltyRuleB],
  rewards: [rewardA1, rewardA2, rewardB1],
  reward_claims: [rewardClaim],
  visits: visits,
  feedback: feedback,
  social_links: [],
  qr_codes: [
    {
      id: crypto.randomUUID(),
      business_id: businessA.id,
      code_identifier: businessA.slug,
      target_url: `/b/${businessA.slug}`,
      qr_type: 'CHECKIN',
      scans_count: 5,
      last_scanned_at: yesterday,
      created_at: threeDaysAgo,
    },
    {
      id: crypto.randomUUID(),
      business_id: businessB.id,
      code_identifier: businessB.slug,
      target_url: `/b/${businessB.slug}`,
      qr_type: 'CHECKIN',
      scans_count: 0,
      last_scanned_at: null,
      created_at: yesterday,
    },
  ],
  analytics_events: analytics_events,
  audit_logs: audit_logs,
};

fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
console.log('✓ Successfully seeded demo database at:', DB_FILE);
console.log('  - Businesses: Artisan Coffee Roasters (/b/artisan-coffee), Roy Haute Fashion (/b/roy-fashion)');
console.log('  - Active Owner: Marcus Vance (owner@cafeempire.com)');
console.log('  - Active Customer: Alex Smith (alex.customer@example.com)');
console.log('  - Active Claim Pass: RW-7K8A2P ready for counter redemption at /dashboard/rewards/redeem');
console.log('  - Super Admin: Platform Super Admin (admin@loyalty.com)');
