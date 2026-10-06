import fs from 'fs';
import path from 'path';
import { createClient as createSupabaseServerClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import {
  User,
  CustomerProfile,
  Business,
  BusinessStaff,
  BusinessCustomer,
  LoyaltyProgram,
  LoyaltyRule,
  Reward,
  RewardClaim,
  Visit,
  Feedback,
  SocialLink,
  QRCodeData,
  AnalyticsEvent,
  AuditLog,
  UserRole,
} from '@/types';
import { validateVisitEligibility, generateClaimCode, computeRewardStatus } from './loyalty';
import { isSuperAdminEmail, isSupabaseConfigured as envSupabaseConfigured, getAppOrigin } from './env';

// Persistent Local Database file fallback for zero-downtime offline dev & automated tests
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDatabase {
  users: User[];
  customer_profiles: CustomerProfile[];
  businesses: Business[];
  business_staff: BusinessStaff[];
  business_customers: BusinessCustomer[];
  loyalty_programs: LoyaltyProgram[];
  loyalty_rules: LoyaltyRule[];
  rewards: Reward[];
  reward_claims: RewardClaim[];
  visits: Visit[];
  feedback: Feedback[];
  social_links: SocialLink[];
  qr_codes: QRCodeData[];
  analytics_events: AnalyticsEvent[];
  audit_logs: AuditLog[];
}

function initLocalDb(): LocalDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      // If corrupted, fallback
    }
  }

  const initialDb: LocalDatabase = {
    users: [],
    customer_profiles: [],
    businesses: [],
    business_staff: [],
    business_customers: [],
    loyalty_programs: [],
    loyalty_rules: [],
    rewards: [],
    reward_claims: [],
    visits: [],
    feedback: [],
    social_links: [],
    qr_codes: [],
    analytics_events: [],
    audit_logs: [],
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

function readDb(): LocalDatabase {
  return initLocalDb();
}

function writeDb(data: LocalDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isSupabaseConfigured(): boolean {
  return envSupabaseConfigured();
}

// ==========================================
// USERS & AUTH
// ==========================================

export async function getUserById(id: string): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as User;
  }

  const db = readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
    return (data as User) || null;
  }

  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function resolveUpsertRole(
  email: string,
  requestedRole: UserRole | undefined,
  existingRole: UserRole | undefined
): UserRole {
  if (isSuperAdminEmail(email)) return 'SUPER_ADMIN';

  // Never accept SUPER_ADMIN from callers — only the allow-list can grant it.
  const requested = requestedRole === 'SUPER_ADMIN' ? undefined : requestedRole;

  if (!existingRole) {
    return requested || 'CUSTOMER';
  }

  const rank: Record<UserRole, number> = {
    CUSTOMER: 1,
    BUSINESS_STAFF: 2,
    BUSINESS_OWNER: 3,
    SUPER_ADMIN: 4,
  };

  // Allow promotion (customer → owner) but never silently demote an existing role.
  if (requested && rank[requested] > rank[existingRole]) {
    return requested;
  }

  return existingRole;
}

export async function upsertUser(
  user: {
    id?: string;
    email: string;
    full_name?: string | null;
    phone?: string | null;
    role?: UserRole;
    avatar_url?: string | null;
  }
): Promise<User> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: existingById } = user.id
      ? await admin.from('users').select('*').eq('id', user.id).maybeSingle()
      : { data: null };
    const { data: existingByEmail } = await admin
      .from('users')
      .select('*')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    const existing = (existingById || existingByEmail) as User | null;
    const role = resolveUpsertRole(user.email, user.role, existing?.role);

    const payload = {
      id: user.id || existing?.id || crypto.randomUUID(),
      email: user.email.toLowerCase(),
      full_name: user.full_name !== undefined ? user.full_name : existing?.full_name || null,
      phone: user.phone !== undefined ? user.phone : existing?.phone || null,
      role,
      avatar_url: user.avatar_url !== undefined ? user.avatar_url : existing?.avatar_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin.from('users').upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as User;
  }

  const db = readDb();
  const existingIndex = db.users.findIndex(
    (u) => (user.id && u.id === user.id) || u.email.toLowerCase() === user.email.toLowerCase()
  );

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    const existing = db.users[existingIndex];
    const updated: User = {
      ...existing,
      full_name: user.full_name !== undefined ? user.full_name : existing.full_name,
      phone: user.phone !== undefined ? user.phone : existing.phone,
      role: resolveUpsertRole(user.email, user.role, existing.role),
      avatar_url: user.avatar_url !== undefined ? user.avatar_url : existing.avatar_url,
      updated_at: now,
    };
    db.users[existingIndex] = updated;
    writeDb(db);
    return updated;
  }

  const newUser: User = {
    id: user.id || crypto.randomUUID(),
    email: user.email.toLowerCase(),
    full_name: user.full_name || null,
    phone: user.phone || null,
    role: resolveUpsertRole(user.email, user.role, undefined),
    avatar_url: user.avatar_url || null,
    created_at: now,
    updated_at: now,
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

// ==========================================
// CUSTOMER PROFILES (Universal Global Identity)
// ==========================================

export async function getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return (data as CustomerProfile) || null;
  }

  const db = readDb();
  return db.customer_profiles.find((p) => p.user_id === userId) || null;
}

export async function createOrUpdateCustomerProfile(
  userId: string,
  fullName: string,
  phone: string
): Promise<CustomerProfile> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('customer_profiles')
      .upsert({
        user_id: userId,
        full_name: fullName,
        phone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CustomerProfile;
  }

  const db = readDb();
  const existingIdx = db.customer_profiles.findIndex((p) => p.user_id === userId);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const updated: CustomerProfile = {
      ...db.customer_profiles[existingIdx],
      full_name: fullName,
      phone,
      updated_at: now,
    };
    db.customer_profiles[existingIdx] = updated;
    writeDb(db);
    return updated;
  }

  const newProfile: CustomerProfile = {
    id: crypto.randomUUID(),
    user_id: userId,
    full_name: fullName,
    phone,
    created_at: now,
    updated_at: now,
  };
  db.customer_profiles.push(newProfile);
  writeDb(db);
  return newProfile;
}

// ==========================================
// BUSINESSES
// ==========================================

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Business[]) || [];
  }

  const db = readDb();
  return db.businesses.filter((b) => b.owner_id === ownerId);
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const cleanSlug = slug.toLowerCase().trim();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();
    return (data as Business) || null;
  }

  const db = readDb();
  return db.businesses.find((b) => b.slug === cleanSlug) || null;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('businesses').select('*').eq('id', id).maybeSingle();
    return (data as Business) || null;
  }

  const db = readDb();
  return db.businesses.find((b) => b.id === id) || null;
}

export async function createBusiness(
  ownerId: string,
  businessData: {
    name: string;
    slug: string;
    category?: string;
    description?: string;
    logo_url?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    website_url?: string;
    google_review_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    whatsapp_number?: string;
    whatsapp_channel_url?: string;
    youtube_url?: string;
  }
): Promise<Business> {
  const owner = await getUserById(ownerId);
  if (owner) {
    await upsertUser({
      id: owner.id,
      email: owner.email,
      role: 'BUSINESS_OWNER',
    });
  }

  const cleanSlug = businessData.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');

  // Verify slug uniqueness
  const existing = await getBusinessBySlug(cleanSlug);
  if (existing) {
    throw new Error(`The business slug "${cleanSlug}" is already taken. Please choose another.`);
  }

  const businessId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newBusiness: Business = {
    id: businessId,
    owner_id: ownerId,
    slug: cleanSlug,
    name: businessData.name,
    category: businessData.category || null,
    description: businessData.description || null,
    logo_url: businessData.logo_url || null,
    phone: businessData.phone || null,
    email: businessData.email || null,
    address: businessData.address || null,
    city: businessData.city || null,
    state: businessData.state || null,
    country: businessData.country || null,
    website_url: businessData.website_url || null,
    google_review_url: businessData.google_review_url || null,
    instagram_url: businessData.instagram_url || null,
    facebook_url: businessData.facebook_url || null,
    whatsapp_number: businessData.whatsapp_number || null,
    whatsapp_channel_url: businessData.whatsapp_channel_url || null,
    youtube_url: businessData.youtube_url || null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('businesses')
      .insert(newBusiness)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create default loyalty program & default milestone reward
    const programId = crypto.randomUUID();
    await admin.from('loyalty_programs').insert({
      id: programId,
      business_id: businessId,
      program_name: `${businessData.name} Rewards`,
      program_type: 'VISIT_BASED',
      is_active: true,
    });

    await admin.from('loyalty_rules').insert({
      loyalty_program_id: programId,
      min_interval_hours: 2,
      points_per_visit: 1,
    });

    await admin.from('rewards').insert({
      business_id: businessId,
      loyalty_program_id: programId,
      title: 'Free Coffee or Welcome Treat',
      description: 'Collect 5 visits and enjoy a complimentary reward on us!',
      reward_type: 'FREE_ITEM',
      reward_value: 'Free Treat',
      required_visits: 5,
      expiry_days: 30,
      is_active: true,
    });

    await admin.from('qr_codes').insert({
      business_id: businessId,
      code_identifier: cleanSlug,
      target_url: `${getAppOrigin()}/b/${cleanSlug}`,
      qr_type: 'CHECKIN',
    });

    await trackAnalyticsEvent('business_created', businessId, null, { name: businessData.name });
    return data as Business;
  }

  const db = readDb();
  db.businesses.push(newBusiness);

  // Initialize default loyalty program & rule
  const programId = crypto.randomUUID();
  const loyaltyProgram: LoyaltyProgram = {
    id: programId,
    business_id: businessId,
    program_name: `${businessData.name} Rewards`,
    program_type: 'VISIT_BASED',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  db.loyalty_programs.push(loyaltyProgram);

  const loyaltyRule: LoyaltyRule = {
    id: crypto.randomUUID(),
    loyalty_program_id: programId,
    min_interval_hours: 2,
    points_per_visit: 1,
    created_at: now,
    updated_at: now,
  };
  db.loyalty_rules.push(loyaltyRule);

  // Default Reward: 5 visits -> Free Item
  const defaultReward: Reward = {
    id: crypto.randomUUID(),
    business_id: businessId,
    loyalty_program_id: programId,
    title: 'Free Coffee or Welcome Treat',
    description: 'Collect 5 visits and enjoy a complimentary reward on us!',
    reward_type: 'FREE_ITEM',
    reward_value: 'Free Coffee',
    required_visits: 5,
    expiry_days: 30,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  db.rewards.push(defaultReward);

  // QR Code
  const qr: QRCodeData = {
    id: crypto.randomUUID(),
    business_id: businessId,
    code_identifier: cleanSlug,
    target_url: `${getAppOrigin()}/b/${cleanSlug}`,
    qr_type: 'CHECKIN',
    scans_count: 0,
    last_scanned_at: null,
    created_at: now,
  };
  db.qr_codes.push(qr);

  writeDb(db);

  await trackAnalyticsEvent('business_created', businessId, null, { name: businessData.name });
  return newBusiness;
}

// ==========================================
// BUSINESS-CUSTOMER RELATIONSHIP & VISITS
// ==========================================

export async function getBusinessCustomer(
  businessId: string,
  customerId: string
): Promise<BusinessCustomer | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .maybeSingle();
    return (data as BusinessCustomer) || null;
  }

  const db = readDb();
  return db.business_customers.find(
    (b) => b.business_id === businessId && b.customer_id === customerId
  ) || null;
}

export async function getOrCreateBusinessCustomer(
  businessId: string,
  customerId: string
): Promise<BusinessCustomer> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existing) return existing as BusinessCustomer;

    const { data: created, error } = await admin
      .from('business_customers')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        total_visits: 0,
        current_points_balance: 0,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as BusinessCustomer;
  }

  const db = readDb();
  let bc = db.business_customers.find(
    (b) => b.business_id === businessId && b.customer_id === customerId
  );

  if (!bc) {
    bc = {
      id: crypto.randomUUID(),
      business_id: businessId,
      customer_id: customerId,
      first_visit_at: now,
      last_visit_at: now,
      total_visits: 0,
      total_spend: 0,
      current_points_balance: 0,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };
    db.business_customers.push(bc);
    writeDb(db);
  }

  return bc;
}

export async function getCustomerVisits(businessId: string, customerId: string): Promise<Visit[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Visit[]) || [];
  }

  const db = readDb();
  return db.visits
    .filter((v) => v.business_id === businessId && v.customer_id === customerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function recordCustomerVisit(
  businessId: string,
  customerId: string,
  source: 'QR_SCAN' | 'URL' | 'MANUAL_STAFF' = 'QR_SCAN',
  purchaseAmount?: number
): Promise<{
  success: boolean;
  visit?: Visit;
  businessCustomer: BusinessCustomer;
  isNewVisit: boolean;
  message: string;
}> {
  const businessCustomer = await getOrCreateBusinessCustomer(businessId, customerId);

  // Check cooldown interval rule
  const rules = await getLoyaltyRules(businessId);
  const eligibility = validateVisitEligibility(
    businessCustomer.total_visits > 0 ? businessCustomer.last_visit_at : null,
    rules
  );

  if (!eligibility.eligible) {
    return {
      success: false,
      businessCustomer,
      isNewVisit: false,
      message: eligibility.reason || 'Cooldown active.',
    };
  }

  const now = new Date().toISOString();
  const visitId = crypto.randomUUID();

  const newVisit: Visit = {
    id: visitId,
    business_id: businessId,
    customer_id: customerId,
    source,
    purchase_amount: purchaseAmount || null,
    verification_status: 'VERIFIED',
    qr_code_id: null,
    metadata: {},
    created_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('visits').insert(newVisit);

    const updatedVisits = businessCustomer.total_visits + 1;
    const { data: updatedBc, error } = await admin
      .from('business_customers')
      .update({
        total_visits: updatedVisits,
        current_points_balance: businessCustomer.current_points_balance + (rules?.points_per_visit || 1),
        first_visit_at: businessCustomer.total_visits === 0 ? now : businessCustomer.first_visit_at,
        last_visit_at: now,
        total_spend: businessCustomer.total_spend + (purchaseAmount || 0),
        updated_at: now,
      })
      .eq('id', businessCustomer.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await trackAnalyticsEvent('visit_recorded', businessId, customerId, {
      visits: updatedVisits,
      source,
    });

    return {
      success: true,
      visit: newVisit,
      businessCustomer: updatedBc as BusinessCustomer,
      isNewVisit: true,
      message: `Visit recorded successfully! You now have ${updatedVisits} visits.`,
    };
  }

  const db = readDb();
  db.visits.push(newVisit);

  const bcIdx = db.business_customers.findIndex((b) => b.id === businessCustomer.id);
  const updatedTotalVisits = businessCustomer.total_visits + 1;

  db.business_customers[bcIdx] = {
    ...db.business_customers[bcIdx],
    total_visits: updatedTotalVisits,
    current_points_balance: businessCustomer.current_points_balance + (rules?.points_per_visit || 1),
    first_visit_at: businessCustomer.total_visits === 0 ? now : businessCustomer.first_visit_at,
    last_visit_at: now,
    total_spend: businessCustomer.total_spend + (purchaseAmount || 0),
    updated_at: now,
  };

  writeDb(db);

  await trackAnalyticsEvent('visit_recorded', businessId, customerId, {
    visits: updatedTotalVisits,
    source,
  });

  return {
    success: true,
    visit: newVisit,
    businessCustomer: db.business_customers[bcIdx],
    isNewVisit: true,
    message: `Visit recorded successfully! You now have ${updatedTotalVisits} visits.`,
  };
}

// ==========================================
// LOYALTY RULES & REWARDS
// ==========================================

export async function getLoyaltyRules(businessId: string): Promise<LoyaltyRule | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('id')
      .eq('business_id', businessId)
      .single();

    if (!program) return null;

    const { data: rule } = await supabase
      .from('loyalty_rules')
      .select('*')
      .eq('loyalty_program_id', program.id)
      .single();

    return (rule as LoyaltyRule) || null;
  }

  const db = readDb();
  const program = db.loyalty_programs.find((p) => p.business_id === businessId);
  if (!program) return null;
  return db.loyalty_rules.find((r) => r.loyalty_program_id === program.id) || null;
}

export async function updateLoyaltyCooldown(businessId: string, minIntervalHours: number): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: program } = await admin
      .from('loyalty_programs')
      .select('id')
      .eq('business_id', businessId)
      .single();

    if (program) {
      await admin
        .from('loyalty_rules')
        .update({ min_interval_hours: minIntervalHours })
        .eq('loyalty_program_id', program.id);
    }
    return;
  }

  const db = readDb();
  const program = db.loyalty_programs.find((p) => p.business_id === businessId);
  if (program) {
    const ruleIdx = db.loyalty_rules.findIndex((r) => r.loyalty_program_id === program.id);
    if (ruleIdx >= 0) {
      db.loyalty_rules[ruleIdx].min_interval_hours = minIntervalHours;
      db.loyalty_rules[ruleIdx].updated_at = new Date().toISOString();
      writeDb(db);
    }
  }
}

export async function getRewardsByBusiness(businessId: string): Promise<Reward[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('business_id', businessId)
      .order('required_visits', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as Reward[]) || [];
  }

  const db = readDb();
  return db.rewards
    .filter((r) => r.business_id === businessId)
    .sort((a, b) => a.required_visits - b.required_visits);
}

export async function createReward(
  businessId: string,
  rewardData: {
    title: string;
    description?: string;
    reward_type: 'FREE_ITEM' | 'DISCOUNT' | 'GIFT' | 'EXPERIENCE';
    reward_value: string;
    required_visits: number;
    expiry_days?: number;
  }
): Promise<Reward> {
  const now = new Date().toISOString();
  const reward: Reward = {
    id: crypto.randomUUID(),
    business_id: businessId,
    loyalty_program_id: null,
    title: rewardData.title,
    description: rewardData.description || null,
    reward_type: rewardData.reward_type,
    reward_value: rewardData.reward_value,
    required_visits: rewardData.required_visits,
    expiry_days: rewardData.expiry_days || 30,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.from('rewards').insert(reward).select().single();
    if (error) throw new Error(error.message);
    return data as Reward;
  }

  const db = readDb();
  db.rewards.push(reward);
  writeDb(db);
  return reward;
}

export async function deleteReward(rewardId: string, businessId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('rewards').delete().eq('id', rewardId).eq('business_id', businessId);
    return;
  }

  const db = readDb();
  db.rewards = db.rewards.filter((r) => !(r.id === rewardId && r.business_id === businessId));
  writeDb(db);
}

// ==========================================
// REWARD CLAIMS & VERIFICATION/REDEMPTION
// ==========================================

export async function getCustomerClaims(customerId: string, businessId?: string): Promise<RewardClaim[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('reward_claims')
      .select('*, reward:rewards(*), business:businesses(*)')
      .eq('customer_id', customerId);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query.order('claimed_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as RewardClaim[]) || [];
  }

  const db = readDb();
  let claims = db.reward_claims.filter((c) => c.customer_id === customerId);
  if (businessId) {
    claims = claims.filter((c) => c.business_id === businessId);
  }

  return claims.map((c) => ({
    ...c,
    reward: db.rewards.find((r) => r.id === c.reward_id),
    business: db.businesses.find((b) => b.id === c.business_id),
  }));
}

export async function claimReward(
  customerId: string,
  businessId: string,
  rewardId: string
): Promise<RewardClaim> {
  // Validate customer visit count against required visits
  const businessCustomer = await getOrCreateBusinessCustomer(businessId, customerId);
  const rewards = await getRewardsByBusiness(businessId);
  const reward = rewards.find((r) => r.id === rewardId);

  if (!reward) throw new Error('Reward not found.');

  if (businessCustomer.total_visits < reward.required_visits) {
    throw new Error(`Insufficient visits. You need ${reward.required_visits} visits, you have ${businessCustomer.total_visits}.`);
  }

  const existingClaims = await getCustomerClaims(customerId, businessId);
  const alreadyRedeemed = existingClaims.find(
    (c) => c.reward_id === rewardId && c.status === 'REDEEMED'
  );
  if (alreadyRedeemed) {
    throw new Error('This reward has already been redeemed and cannot be claimed again.');
  }

  const activeClaim = existingClaims.find(
    (c) => c.reward_id === rewardId && c.status === 'CLAIMED'
  );
  if (activeClaim) {
    return activeClaim;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + (reward.expiry_days || 30) * 24 * 60 * 60 * 1000);
  const claimCode = generateClaimCode();

  const newClaim: RewardClaim = {
    id: crypto.randomUUID(),
    claim_code: claimCode,
    business_id: businessId,
    customer_id: customerId,
    reward_id: rewardId,
    status: 'CLAIMED',
    claimed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    redeemed_at: null,
    redeemed_by_staff_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('reward_claims')
      .insert(newClaim)
      .select('*, reward:rewards(*)')
      .single();

    if (error) throw new Error(error.message);

    await trackAnalyticsEvent('reward_claimed', businessId, customerId, {
      reward_id: rewardId,
      claim_code: claimCode,
    });

    return data as RewardClaim;
  }

  const db = readDb();
  db.reward_claims.push(newClaim);
  writeDb(db);

  await trackAnalyticsEvent('reward_claimed', businessId, customerId, {
    reward_id: rewardId,
    claim_code: claimCode,
  });

  return {
    ...newClaim,
    reward,
  };
}

export async function verifyAndRedeemReward(
  businessId: string,
  claimCode: string,
  staffUserId: string
): Promise<{ success: boolean; message: string; claim?: RewardClaim }> {
  const code = claimCode.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: claim, error } = await admin
      .from('reward_claims')
      .select('*, reward:rewards(*), customer:customer_profiles(*)')
      .eq('claim_code', code)
      .maybeSingle();

    if (error || !claim) {
      return { success: false, message: 'Invalid claim code. No record found.' };
    }

    if (claim.business_id !== businessId) {
      return { success: false, message: 'This reward code belongs to a different business!' };
    }

    if (claim.status === 'REDEEMED') {
      return {
        success: false,
        message: `Reward was already redeemed on ${new Date(claim.redeemed_at).toLocaleString()}. Never allows duplicate redemption.`,
        claim,
      };
    }

    if (new Date(claim.expires_at).getTime() < Date.now()) {
      return { success: false, message: 'Reward has expired.', claim };
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('reward_claims')
      .update({
        status: 'REDEEMED',
        redeemed_at: now,
        redeemed_by_staff_id: staffUserId,
        updated_at: now,
      })
      .eq('id', claim.id)
      .eq('status', 'CLAIMED')
      .select('*, reward:rewards(*)')
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);
    if (!updated) {
      return {
        success: false,
        message: 'Reward was already redeemed. Duplicate redemption is not allowed.',
        claim,
      };
    }

    await trackAnalyticsEvent('reward_redeemed', businessId, claim.customer_id, {
      claim_code: code,
      reward_id: claim.reward_id,
      staff_user_id: staffUserId,
    });

    return {
      success: true,
      message: `Reward "${claim.reward?.title}" successfully verified and redeemed!`,
      claim: updated as RewardClaim,
    };
  }

  const db = readDb();
  const claimIdx = db.reward_claims.findIndex((c) => c.claim_code === code);
  if (claimIdx < 0) {
    return { success: false, message: 'Invalid claim code. No record found.' };
  }

  const claim = db.reward_claims[claimIdx];
  if (claim.business_id !== businessId) {
    return { success: false, message: 'This reward code belongs to a different business!' };
  }

  if (claim.status === 'REDEEMED') {
    return {
      success: false,
      message: `Reward was already redeemed on ${new Date(claim.redeemed_at!).toLocaleString()}. Never allows duplicate redemption.`,
      claim,
    };
  }

  if (new Date(claim.expires_at).getTime() < Date.now()) {
    return { success: false, message: 'Reward has expired.', claim };
  }

  const now = new Date().toISOString();
  db.reward_claims[claimIdx] = {
    ...claim,
    status: 'REDEEMED',
    redeemed_at: now,
    redeemed_by_staff_id: staffUserId,
    updated_at: now,
  };
  writeDb(db);

  await trackAnalyticsEvent('reward_redeemed', businessId, claim.customer_id, {
    claim_code: code,
    reward_id: claim.reward_id,
    staff_user_id: staffUserId,
  });

  const updatedClaim = {
    ...db.reward_claims[claimIdx],
    reward: db.rewards.find((r) => r.id === claim.reward_id),
  };

  return {
    success: true,
    message: `Reward "${updatedClaim.reward?.title || 'Reward'}" successfully verified and redeemed!`,
    claim: updatedClaim,
  };
}

// ==========================================
// FEEDBACK & REVIEWS
// ==========================================

export async function submitPrivateFeedback(
  businessId: string,
  customerId: string | null,
  rating: number,
  comment: string,
  customerName?: string,
  customerContact?: string
): Promise<Feedback> {
  const newFeedback: Feedback = {
    id: crypto.randomUUID(),
    business_id: businessId,
    customer_id: customerId,
    rating,
    comment,
    customer_name: customerName || null,
    customer_contact: customerContact || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.from('feedback').insert(newFeedback).select().single();
    if (error) throw new Error(error.message);

    await trackAnalyticsEvent('feedback_submitted', businessId, customerId, { rating });
    return data as Feedback;
  }

  const db = readDb();
  db.feedback.push(newFeedback);
  writeDb(db);

  await trackAnalyticsEvent('feedback_submitted', businessId, customerId, { rating });
  return newFeedback;
}

export async function getBusinessFeedback(businessId: string): Promise<Feedback[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Feedback[]) || [];
  }

  const db = readDb();
  return db.feedback
    .filter((f) => f.business_id === businessId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ==========================================
// ANALYTICS & SOCIAL TRACKING
// ==========================================

export async function trackAnalyticsEvent(
  eventType: string,
  businessId: string | null,
  customerId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const event: AnalyticsEvent = {
    id: crypto.randomUUID(),
    event_type: eventType,
    business_id: businessId,
    customer_id: customerId,
    metadata,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('analytics_events').insert(event);
    return;
  }

  const db = readDb();
  db.analytics_events.push(event);
  writeDb(db);
}

export async function trackSocialClick(
  businessId: string,
  customerId: string | null,
  platform: string
): Promise<void> {
  if (platform === 'google_review') {
    await trackAnalyticsEvent('google_review_clicked', businessId, customerId, {});
  } else {
    await trackAnalyticsEvent('social_clicked', businessId, customerId, { platform });
  }

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('social_clicks').insert({
      business_id: businessId,
      customer_id: customerId,
      platform,
    });
  }
}

function countSince(timestamps: string[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => new Date(t).getTime() >= cutoff).length;
}

export async function getBusinessAnalytics(businessId: string) {
  const day = 24 * 60 * 60 * 1000;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();

    const [
      { data: customersList },
      { data: visitsList },
      { data: claimsList },
      { count: feedbackCount },
      { data: events },
    ] = await Promise.all([
      supabase.from('business_customers').select('total_visits, first_visit_at').eq('business_id', businessId),
      supabase.from('visits').select('created_at').eq('business_id', businessId),
      supabase.from('reward_claims').select('status').eq('business_id', businessId),
      supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('analytics_events').select('event_type').eq('business_id', businessId),
    ]);

    const customers = customersList || [];
    const visits = (visitsList || []).map((v) => v.created_at as string);
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.total_visits > 1).length;
    const claims = claimsList || [];
    const eventRows = events || [];

    return {
      totalCustomers,
      totalVisits: visits.length,
      newCustomers: customers.filter((c) => new Date(c.first_visit_at).getTime() >= Date.now() - 7 * day).length,
      repeatCustomers,
      repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
      rewardsUnlocked: claims.length,
      rewardsRedeemed: claims.filter((c) => c.status === 'REDEEMED').length,
      googleReviewClicks: eventRows.filter((e) => e.event_type === 'google_review_clicked').length,
      socialClicks: eventRows.filter((e) => e.event_type === 'social_clicked').length,
      feedbackCount: feedbackCount || 0,
      dailyVisits: countSince(visits, day),
      weeklyVisits: countSince(visits, 7 * day),
      monthlyVisits: countSince(visits, 30 * day),
    };
  }

  const db = readDb();
  const bCustomers = db.business_customers.filter((c) => c.business_id === businessId);
  const totalCustomers = bCustomers.length;
  const repeatCustomers = bCustomers.filter((c) => c.total_visits > 1).length;
  const visits = db.visits.filter((v) => v.business_id === businessId);
  const visitTimes = visits.map((v) => v.created_at);
  const bClaims = db.reward_claims.filter((c) => c.business_id === businessId);
  const bEvents = db.analytics_events.filter((e) => e.business_id === businessId);

  return {
    totalCustomers,
    totalVisits: visits.length,
    newCustomers: bCustomers.filter((c) => new Date(c.first_visit_at).getTime() >= Date.now() - 7 * day).length,
    repeatCustomers,
    repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
    rewardsUnlocked: bClaims.length,
    rewardsRedeemed: bClaims.filter((c) => c.status === 'REDEEMED').length,
    googleReviewClicks: bEvents.filter((e) => e.event_type === 'google_review_clicked').length,
    socialClicks: bEvents.filter((e) => e.event_type === 'social_clicked').length,
    feedbackCount: db.feedback.filter((f) => f.business_id === businessId).length,
    dailyVisits: countSince(visitTimes, day),
    weeklyVisits: countSince(visitTimes, 7 * day),
    monthlyVisits: countSince(visitTimes, 30 * day),
  };
}

// ==========================================
// BUSINESS CUSTOMERS MANAGEMENT LIST
// ==========================================

function withRewardStatus(
  customers: BusinessCustomer[],
  rewards: Reward[],
  claims: RewardClaim[]
): BusinessCustomer[] {
  return customers.map((bc) => {
    const customerClaims = claims.filter((c) => c.customer_id === bc.customer_id);
    const primary = rewards[0];
    if (!primary) {
      return { ...bc, reward_status: 'NONE' };
    }
    const { status } = computeRewardStatus(primary, bc.total_visits, customerClaims);
    return { ...bc, reward_status: status };
  });
}

export async function getBusinessCustomersList(businessId: string): Promise<BusinessCustomer[]> {
  const rewards = await getRewardsByBusiness(businessId);

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('business_customers')
      .select('*, customer_profile:customer_profiles(*)')
      .eq('business_id', businessId)
      .order('last_visit_at', { ascending: false });

    if (error) throw new Error(error.message);

    const { data: claims } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('business_id', businessId);

    return withRewardStatus((data as BusinessCustomer[]) || [], rewards, (claims as RewardClaim[]) || []);
  }

  const db = readDb();
  const customers = db.business_customers
    .filter((bc) => bc.business_id === businessId)
    .map((bc) => ({
      ...bc,
      customer_profile: db.customer_profiles.find((cp) => cp.id === bc.customer_id),
    }))
    .sort((a, b) => {
      const aTime = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
      const bTime = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
      return bTime - aTime;
    });

  const claims = db.reward_claims.filter((c) => c.business_id === businessId);
  return withRewardStatus(customers, rewards, claims);
}

// ==========================================
// CUSTOMER PARTICIPATING BUSINESSES & REWARDS
// ==========================================

export async function getCustomerParticipatingBusinesses(customerId: string) {
  const db = readDb();

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: bcs } = await supabase
      .from('business_customers')
      .select('*, business:businesses(*)')
      .eq('customer_id', customerId);

    return (bcs || []).map((bc) => ({
      business: bc.business as Business,
      totalVisits: bc.total_visits,
      lastVisitAt: bc.last_visit_at,
    }));
  }

  const bcs = db.business_customers.filter((bc) => bc.customer_id === customerId);
  return bcs.map((bc) => {
    const business = db.businesses.find((b) => b.id === bc.business_id)!;
    return {
      business,
      totalVisits: bc.total_visits,
      lastVisitAt: bc.last_visit_at,
    };
  }).filter((item) => Boolean(item.business));
}

// ==========================================
// SUPER ADMIN QUERIES
// ==========================================

export async function getSuperAdminOverview() {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const [
      { data: businesses },
      { data: customers },
      { data: visits },
      { data: events },
      { data: logs },
    ] = await Promise.all([
      admin.from('businesses').select('*').order('created_at', { ascending: false }),
      admin.from('customer_profiles').select('*').order('created_at', { ascending: false }),
      admin.from('visits').select('*').order('created_at', { ascending: false }).limit(20),
      admin.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(20),
      admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
    ]);

    return {
      businesses: (businesses as Business[]) || [],
      customers: (customers as CustomerProfile[]) || [],
      recentVisits: (visits as Visit[]) || [],
      recentEvents: (events as AnalyticsEvent[]) || [],
      auditLogs: (logs as AuditLog[]) || [],
    };
  }

  const db = readDb();
  return {
    businesses: [...db.businesses].reverse(),
    customers: [...db.customer_profiles].reverse(),
    recentVisits: [...db.visits].reverse().slice(0, 20),
    recentEvents: [...db.analytics_events].reverse().slice(0, 20),
    auditLogs: [...db.audit_logs].reverse().slice(0, 30),
  };
}

export async function toggleBusinessStatus(businessId: string, isActive: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('businesses').update({ is_active: isActive }).eq('id', businessId);
    return;
  }

  const db = readDb();
  const idx = db.businesses.findIndex((b) => b.id === businessId);
  if (idx >= 0) {
    db.businesses[idx].is_active = isActive;
    db.businesses[idx].updated_at = new Date().toISOString();
    writeDb(db);
  }
}

export async function recordAuditLog(
  userId: string | null,
  businessId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): Promise<void> {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_data: oldData || null,
    new_data: newData || null,
    ip_address: null,
    user_agent: null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert(log);
    return;
  }

  const db = readDb();
  db.audit_logs.push(log);
  writeDb(db);
}
