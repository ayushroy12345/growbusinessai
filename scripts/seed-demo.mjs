/**
 * Development-only seed. Do not run this against production.
 * Adds "Demo Cafe" when that slug is not already present in data/db.json.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
db.menu_categories ||= [];
db.menu_items ||= [];
db.scratch_campaigns ||= [];
db.scratch_prizes ||= [];
db.loyalty_programs ||= [];
db.loyalty_rules ||= [];
db.rewards ||= [];
db.businesses ||= [];

if (db.businesses.some((business) => business.slug === 'demo-cafe')) {
  console.log('Demo Cafe already exists. Nothing changed.');
  process.exit(0);
}

const now = new Date().toISOString();
const owner = db.users.find((user) => user.role === 'BUSINESS_OWNER');
if (!owner) {
  console.error('No business owner in the local database. Sign in as an owner first.');
  process.exit(1);
}

const businessId = crypto.randomUUID();
const programId = crypto.randomUUID();
const campaignId = crypto.randomUUID();
db.businesses.push({
  id: businessId,
  owner_id: owner.id,
  slug: 'demo-cafe',
  name: 'Demo Cafe',
  category: 'Cafe',
  description: 'Development demo business. Not production data.',
  logo_url: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  state: null,
  country: null,
  website_url: null,
  google_review_url: 'https://g.page/r/demo-cafe/review',
  instagram_url: 'https://instagram.com/demo-cafe',
  facebook_url: null,
  whatsapp_number: null,
  whatsapp_channel_url: null,
  youtube_url: null,
  is_active: true,
  is_demo: true,
  created_at: now,
  updated_at: now,
});
db.loyalty_programs.push({
  id: programId,
  business_id: businessId,
  program_name: 'Demo Cafe Stamps',
  program_type: 'VISIT_BASED',
  is_active: true,
  created_at: now,
  updated_at: now,
});
db.loyalty_rules.push({
  id: crypto.randomUUID(),
  loyalty_program_id: programId,
  min_interval_hours: 2,
  points_per_visit: 1,
  approval_required: true,
  created_at: now,
  updated_at: now,
});
db.rewards.push({
  id: crypto.randomUUID(),
  business_id: businessId,
  loyalty_program_id: programId,
  title: 'Free Coffee',
  description: '5 stamps for a free coffee.',
  reward_type: 'FREE_ITEM',
  reward_value: 'Free Coffee',
  required_visits: 5,
  expiry_days: 30,
  is_active: true,
  created_at: now,
  updated_at: now,
});

const categories = ['Coffee', 'Snacks', 'Desserts'].map((name, index) => ({
  id: crypto.randomUUID(),
  business_id: businessId,
  name,
  sort_order: index,
  created_at: now,
}));
db.menu_categories.push(...categories);
const [coffee, snacks, desserts] = categories;
const items = [
  ['Cappuccino', coffee.id, 18000],
  ['Latte', coffee.id, 19000],
  ['Burger', snacks.id, 25000],
  ['Chocolate Cake', desserts.id, 22000],
];
for (const [name, categoryId, price] of items) {
  db.menu_items.push({
    id: crypto.randomUUID(),
    business_id: businessId,
    category_id: categoryId,
    name,
    description: 'Development demo item.',
    price_cents: price,
    image_url: null,
    is_available: true,
    is_featured: false,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  });
}

db.scratch_campaigns.push({
  id: campaignId,
  business_id: businessId,
  name: 'Demo Cafe Scratch Card',
  is_active: true,
  starts_at: now,
  ends_at: null,
  attempts_per_customer: 1,
  created_at: now,
  updated_at: now,
});
for (const prize of [
  ['Free Coffee', 10, 'Free Coffee'],
  ['10% OFF', 20, '10% OFF'],
  ['₹50 OFF', 5, '₹50 OFF'],
  ['Better Luck Next Time', 65, null],
]) {
  db.scratch_prizes.push({
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    business_id: businessId,
    title: prize[0],
    description: null,
    reward_type: prize[2] ? 'REWARD' : 'NONE',
    reward_value: prize[2],
    probability: prize[1],
    max_redemptions: null,
    awarded_count: 0,
    is_active: true,
    created_at: now,
  });
}

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
console.log('Seeded development business Demo Cafe at /b/demo-cafe');
