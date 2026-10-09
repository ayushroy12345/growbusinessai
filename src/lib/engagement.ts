import fs from 'fs';
import path from 'path';
import { createAdminClient } from './supabase/admin';
import { isSupabaseConfigured, assertLocalStorageAllowed } from './env';
import {
  getLoyaltyRules,
  getOrCreateBusinessCustomer,
  getRewardsByBusiness,
  recordCustomerVisit,
  trackAnalyticsEvent,
} from './db';
import { pickWeightedPrize } from './scratch';
import { rewardJustUnlocked, stampRequestDecision } from './stamps';
import {
  MenuCategory,
  MenuItem,
  ScratchCampaign,
  ScratchPlay,
  ScratchPrize,
  StampRequest,
} from '@/types';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

type Store = {
  stamp_requests: StampRequest[];
  stamp_events: { id: string; business_id: string; customer_id: string; stamp_request_id: string | null; created_at: string }[];
  scratch_campaigns: ScratchCampaign[];
  scratch_prizes: ScratchPrize[];
  scratch_plays: ScratchPlay[];
  menu_categories: MenuCategory[];
  menu_items: MenuItem[];
  customer_profiles: { id: string; full_name: string; phone: string; user_id: string }[];
  [key: string]: unknown;
};

function readStore(): Store {
  assertLocalStorageAllowed();
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as Store;
  raw.stamp_requests ||= [];
  raw.stamp_events ||= [];
  raw.scratch_campaigns ||= [];
  raw.scratch_prizes ||= [];
  raw.scratch_plays ||= [];
  raw.menu_categories ||= [];
  raw.menu_items ||= [];
  raw.customer_profiles ||= [];
  return raw;
}

function writeStore(store: Store) {
  assertLocalStorageAllowed();
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}

function attachProfile(store: Store, request: StampRequest): StampRequest {
  const profile = store.customer_profiles.find((profile) => profile.id === request.customer_id);
  return profile ? { ...request, customer_profile: { ...profile, created_at: '', updated_at: '' } } : request;
}

export async function requestStamp(businessId: string, customerId: string) {
  const rules = await getLoyaltyRules(businessId);
  const relationship = await getOrCreateBusinessCustomer(businessId, customerId);
  const approvalRequired = rules?.approval_required !== false;

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('request_stamp', {
      p_business_id: businessId,
      p_customer_id: customerId,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean; message: string; status?: string };
  }

  const store = readStore();
  const mine = store.stamp_requests
    .filter((request) => request.business_id === businessId && request.customer_id === customerId)
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
  const decision = stampRequestDecision({
    hasPending: mine.some((request) => request.status === 'PENDING'),
    lastRequestAt: mine[0]?.requested_at ?? null,
    lastVisitAt: relationship.last_visit_at,
    totalVisits: relationship.total_visits,
    minIntervalHours: rules?.min_interval_hours ?? 2,
  });
  if (!decision.ok) return { success: false, message: decision.message };

  const now = new Date().toISOString();
  const request: StampRequest = {
    id: crypto.randomUUID(),
    business_id: businessId,
    customer_id: customerId,
    status: 'PENDING',
    requested_at: now,
    decided_at: null,
    decided_by: null,
    decline_reason: null,
  };
  store.stamp_requests.push(request);
  writeStore(store);
  await trackAnalyticsEvent('stamp_requested', businessId, customerId, { request_id: request.id });

  if (!approvalRequired) {
    return decideStamp(request.id, 'APPROVED', null);
  }

  return { success: true, status: 'PENDING', message: 'Stamp request sent. The business will approve it.' };
}

export async function decideStamp(
  requestId: string,
  decision: 'APPROVED' | 'DECLINED',
  actorUserId: string | null
) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('decide_stamp', {
      p_request_id: requestId,
      p_decision: decision,
      p_actor_user_id: actorUserId,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean; message: string };
  }

  const store = readStore();
  const index = store.stamp_requests.findIndex((request) => request.id === requestId);
  if (index < 0) throw new Error('Stamp request not found');
  const request = store.stamp_requests[index];
  if (request.status !== 'PENDING') {
    return { success: false, message: 'This request was already decided.' };
  }

  const now = new Date().toISOString();
  if (decision === 'DECLINED') {
    store.stamp_requests[index] = { ...request, status: 'DECLINED', decided_at: now, decided_by: actorUserId };
    writeStore(store);
    await trackAnalyticsEvent('stamp_declined', request.business_id, request.customer_id, { request_id: requestId });
    return { success: true, message: 'Stamp request declined.' };
  }

  const before = await getOrCreateBusinessCustomer(request.business_id, request.customer_id);
  const visit = await recordCustomerVisit(request.business_id, request.customer_id, 'QR_SCAN');
  if (!visit.success) {
    return { success: false, message: visit.message };
  }

  const nextStore = readStore();
  const nextIndex = nextStore.stamp_requests.findIndex((item) => item.id === requestId);
  nextStore.stamp_requests[nextIndex] = {
    ...nextStore.stamp_requests[nextIndex],
    status: 'APPROVED',
    decided_at: now,
    decided_by: actorUserId,
  };
  nextStore.stamp_events.push({
    id: crypto.randomUUID(),
    business_id: request.business_id,
    customer_id: request.customer_id,
    stamp_request_id: requestId,
    created_at: now,
  });
  writeStore(nextStore);
  await trackAnalyticsEvent('stamp_approved', request.business_id, request.customer_id, { request_id: requestId });
  await trackAnalyticsEvent('stamp_awarded', request.business_id, request.customer_id, {
    visits: visit.businessCustomer.total_visits,
  });

  const rewards = await getRewardsByBusiness(request.business_id);
  const required = rewards[0]?.required_visits;
  if (required && rewardJustUnlocked(before.total_visits, visit.businessCustomer.total_visits, required)) {
    await trackAnalyticsEvent('reward_unlocked', request.business_id, request.customer_id, { required_visits: required });
  }

  return { success: true, message: 'Stamp approved.' };
}

export async function listPendingStampRequests(businessId: string): Promise<StampRequest[]> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('stamp_requests')
      .select('*, customer_profile:customer_profiles(*)')
      .eq('business_id', businessId)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as StampRequest[];
  }

  const store = readStore();
  return store.stamp_requests
    .filter((request) => request.business_id === businessId && request.status === 'PENDING')
    .map((request) => attachProfile(store, request))
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
}

export async function getCustomerStampState(businessId: string, customerId: string) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('stamp_requests')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as StampRequest) || null;
  }
  const store = readStore();
  return (
    store.stamp_requests
      .filter((request) => request.business_id === businessId && request.customer_id === customerId)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at))[0] || null
  );
}

export async function listMenu(businessId: string, includeUnavailable = false) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const [{ data: categories, error: categoryError }, { data: items, error: itemError }] = await Promise.all([
      admin.from('menu_categories').select('*').eq('business_id', businessId).order('sort_order'),
      admin.from('menu_items').select('*').eq('business_id', businessId).order('sort_order'),
    ]);
    if (categoryError) throw new Error(categoryError.message);
    if (itemError) throw new Error(itemError.message);
    return {
      categories: (categories || []) as MenuCategory[],
      items: ((items || []) as MenuItem[]).filter((item) => includeUnavailable || item.is_available),
    };
  }

  const store = readStore();
  return {
    categories: store.menu_categories
      .filter((category) => category.business_id === businessId)
      .sort((a, b) => a.sort_order - b.sort_order),
    items: store.menu_items
      .filter((item) => item.business_id === businessId && (includeUnavailable || item.is_available))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function saveMenuCategory(businessId: string, name: string) {
  const category: MenuCategory = {
    id: crypto.randomUUID(),
    business_id: businessId,
    name: name.trim(),
    sort_order: Date.now(),
    created_at: new Date().toISOString(),
  };
  if (!category.name) throw new Error('Category name is required');

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin.from('menu_categories').insert(category);
    if (error) throw new Error(error.message);
    return category;
  }

  const store = readStore();
  store.menu_categories.push(category);
  writeStore(store);
  return category;
}

export async function saveMenuItem(input: {
  businessId: string;
  categoryId: string | null;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string;
}) {
  if (!input.name.trim()) throw new Error('Item name is required');
  const now = new Date().toISOString();
  const item: MenuItem = {
    id: crypto.randomUUID(),
    business_id: input.businessId,
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price_cents: Math.max(0, Math.round(input.priceCents)),
    image_url: input.imageUrl?.trim() || null,
    is_available: true,
    is_featured: false,
    sort_order: Date.now(),
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin.from('menu_items').insert(item);
    if (error) throw new Error(error.message);
    return item;
  }

  const store = readStore();
  store.menu_items.push(item);
  writeStore(store);
  return item;
}

export async function setMenuItemAvailable(businessId: string, itemId: string, isAvailable: boolean) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('menu_items')
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('business_id', businessId);
    if (error) throw new Error(error.message);
    return;
  }

  const store = readStore();
  const item = store.menu_items.find((entry) => entry.id === itemId && entry.business_id === businessId);
  if (!item) throw new Error('Menu item not found');
  item.is_available = isAvailable;
  item.updated_at = new Date().toISOString();
  writeStore(store);
}

export async function getScratchOffer(businessId: string, customerId: string | null) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: campaign } = await admin
      .from('scratch_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!campaign) return null;
    const { data: prizes } = await admin.from('scratch_prizes').select('*').eq('campaign_id', campaign.id);
    let plays: ScratchPlay[] = [];
    if (customerId) {
      const { data } = await admin
        .from('scratch_plays')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('customer_id', customerId);
      plays = (data || []) as ScratchPlay[];
    }
    return { campaign: campaign as ScratchCampaign, prizes: (prizes || []) as ScratchPrize[], plays };
  }

  const store = readStore();
  const campaign = store.scratch_campaigns
    .filter((entry) => entry.business_id === businessId && entry.is_active)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!campaign) return null;
  return {
    campaign,
    prizes: store.scratch_prizes.filter((prize) => prize.campaign_id === campaign.id),
    plays: customerId
      ? store.scratch_plays.filter((play) => play.campaign_id === campaign.id && play.customer_id === customerId)
      : [],
  };
}

export async function playScratch(campaignId: string, customerId: string) {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('play_scratch', {
      p_campaign_id: campaignId,
      p_customer_id: customerId,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean; title: string; description: string | null; reward_value: string | null };
  }

  const store = readStore();
  const campaign = store.scratch_campaigns.find((entry) => entry.id === campaignId && entry.is_active);
  if (!campaign) throw new Error('Scratch campaign is not available');
  const now = Date.now();
  if (campaign.starts_at && Date.parse(campaign.starts_at) > now) throw new Error('Scratch campaign has not started');
  if (campaign.ends_at && Date.parse(campaign.ends_at) < now) throw new Error('Scratch campaign has ended');

  const plays = store.scratch_plays.filter((play) => play.campaign_id === campaignId && play.customer_id === customerId);
  if (plays.length >= campaign.attempts_per_customer) throw new Error('Scratch card already used');

  const prize = pickWeightedPrize(
    store.scratch_prizes.filter((entry) => entry.campaign_id === campaignId),
    Math.random()
  );
  if (!prize) throw new Error('No prizes are available');

  prize.awarded_count += 1;
  const play: ScratchPlay = {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    business_id: campaign.business_id,
    customer_id: customerId,
    prize_id: prize.id,
    outcome_title: prize.title,
    created_at: new Date().toISOString(),
  };
  store.scratch_plays.push(play);
  writeStore(store);
  await trackAnalyticsEvent('scratch_started', campaign.business_id, customerId, { campaign_id: campaignId });
  await trackAnalyticsEvent('scratch_completed', campaign.business_id, customerId, { play_id: play.id, prize: prize.title });
  return { success: true, title: prize.title, description: prize.description, reward_value: prize.reward_value };
}

export async function createScratchCampaign(input: {
  businessId: string;
  name: string;
  attemptsPerCustomer: number;
  prizes: { title: string; probability: number; rewardValue?: string }[];
}) {
  if (!input.name.trim()) throw new Error('Campaign name is required');
  const probability = input.prizes.reduce((sum, prize) => sum + prize.probability, 0);
  if (probability <= 0) throw new Error('Add at least one prize with odds');

  const now = new Date().toISOString();
  const campaign: ScratchCampaign = {
    id: crypto.randomUUID(),
    business_id: input.businessId,
    name: input.name.trim(),
    is_active: true,
    starts_at: now,
    ends_at: null,
    attempts_per_customer: Math.max(1, input.attemptsPerCustomer),
    created_at: now,
    updated_at: now,
  };
  const prizes: ScratchPrize[] = input.prizes
    .filter((prize) => prize.title.trim() && prize.probability > 0)
    .map((prize) => ({
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      business_id: input.businessId,
      title: prize.title.trim(),
      description: null,
      reward_type: prize.rewardValue ? 'REWARD' : 'NONE',
      reward_value: prize.rewardValue || null,
      probability: prize.probability,
      max_redemptions: null,
      awarded_count: 0,
      is_active: true,
      created_at: now,
    }));

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin.from('scratch_campaigns').insert(campaign);
    if (error) throw new Error(error.message);
    const { error: prizeError } = await admin.from('scratch_prizes').insert(prizes);
    if (prizeError) throw new Error(prizeError.message);
    return campaign;
  }

  const store = readStore();
  store.scratch_campaigns.push(campaign);
  store.scratch_prizes.push(...prizes);
  writeStore(store);
  return campaign;
}
