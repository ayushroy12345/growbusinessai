import {
  getBusinessAnalytics,
  getBusinessBySlug,
  getBusinessCustomersList,
  getBusinessFeedback,
  getBusinessCustomer,
  getCustomerClaims,
  getCustomerParticipatingBusinesses,
  getCustomerProfileByUserId,
  getLoyaltyRules,
  getRewardsByBusiness,
} from './db';
import {
  getCustomerStampState,
  getScratchOffer,
  listMenu,
  listPendingStampRequests,
} from './engagement';
import { tryRpc, warnRpcFallback } from './supabase/rpc';
import type {
  Business,
  BusinessCustomer,
  CustomerProfile,
  Feedback,
  LoyaltyRule,
  MenuCategory,
  MenuItem,
  Reward,
  RewardClaim,
  ScratchCampaign,
  ScratchPlay,
  ScratchPrize,
  StampRequest,
} from '@/types';

export type BusinessAnalytics = Awaited<ReturnType<typeof getBusinessAnalytics>>;

export interface CustomerDashboardData {
  profile: CustomerProfile | null;
  participating: { business: Business; totalVisits: number; lastVisitAt: string }[];
  claims: RewardClaim[];
  rewardsByBusiness: Map<string, Reward[]>;
}

interface CustomerDashboardRpc {
  profile: CustomerProfile | null;
  stores: {
    business: Business;
    totalVisits: number;
    lastVisitAt: string;
    rewards: Reward[];
  }[];
  claims: RewardClaim[];
}

export interface OwnerDashboardData {
  analytics: BusinessAnalytics;
  recentCustomers: BusinessCustomer[];
  recentFeedback: Feedback[];
  stampRequests: StampRequest[];
}

export interface BusinessPageData {
  business: Business;
  rewards: Reward[];
  rules: LoyaltyRule | null;
  menu: { categories: MenuCategory[]; items: MenuItem[] };
  scratch: { campaign: ScratchCampaign; prizes: ScratchPrize[]; plays: ScratchPlay[] } | null;
  customer_profile: CustomerProfile | null;
  business_customer: BusinessCustomer | null;
  claims: RewardClaim[];
  stamp_request: StampRequest | null;
}

export async function getCustomerDashboardData(
  userId: string
): Promise<CustomerDashboardData> {
  const rpc = await tryRpc<CustomerDashboardRpc>('get_customer_dashboard');

  if (rpc.ok) {
    return {
      profile: rpc.data.profile,
      participating: rpc.data.stores.map((store) => ({
        business: store.business,
        totalVisits: store.totalVisits,
        lastVisitAt: store.lastVisitAt,
      })),
      claims: rpc.data.claims,
      rewardsByBusiness: new Map(
        rpc.data.stores.map((store) => [store.business.id, store.rewards])
      ),
    };
  }

  warnRpcFallback('get_customer_dashboard', rpc.reason);

  const profile = await getCustomerProfileByUserId(userId);
  if (!profile) {
    return { profile: null, participating: [], claims: [], rewardsByBusiness: new Map() };
  }

  const [participating, claims] = await Promise.all([
    getCustomerParticipatingBusinesses(profile.id),
    getCustomerClaims(profile.id),
  ]);
  const rewardLists = await Promise.all(
    participating.map((item) => getRewardsByBusiness(item.business.id))
  );

  return {
    profile,
    participating,
    claims,
    rewardsByBusiness: new Map(
      participating.map((item, index) => [item.business.id, rewardLists[index]])
    ),
  };
}

export async function getOwnerDashboardData(
  businessId: string
): Promise<OwnerDashboardData> {
  const rpc = await tryRpc<OwnerDashboardData>('get_owner_dashboard', {
    p_business_id: businessId,
  });

  if (rpc.ok) {
    return rpc.data;
  }

  warnRpcFallback('get_owner_dashboard', rpc.reason);

  const [analytics, recentCustomers, recentFeedback, stampRequests] = await Promise.all([
    getBusinessAnalytics(businessId),
    getBusinessCustomersList(businessId),
    getBusinessFeedback(businessId),
    listPendingStampRequests(businessId),
  ]);

  return { analytics, recentCustomers, recentFeedback, stampRequests };
}

export async function getBusinessPageData(
  businessSlug: string,
  userId: string | null
): Promise<BusinessPageData | null> {
  const rpc = await tryRpc<BusinessPageData>(
    'get_business_page',
    { p_slug: businessSlug },
    { allowNull: true }
  );

  if (rpc.ok) {
    return rpc.data;
  }

  warnRpcFallback('get_business_page', rpc.reason);

  const business = await getBusinessBySlug(businessSlug);
  if (!business || !business.is_active) return null;

  const customerProfile = userId ? await getCustomerProfileByUserId(userId) : null;

  const [rewards, rules, menu, scratch] = await Promise.all([
    getRewardsByBusiness(business.id),
    getLoyaltyRules(business.id),
    listMenu(business.id),
    getScratchOffer(business.id, customerProfile?.id || null),
  ]);

  let business_customer: BusinessCustomer | null = null;
  let claims: RewardClaim[] = [];
  let stamp_request: StampRequest | null = null;

  if (customerProfile) {
    [business_customer, claims, stamp_request] = await Promise.all([
      getBusinessCustomer(business.id, customerProfile.id),
      getCustomerClaims(customerProfile.id, business.id),
      getCustomerStampState(business.id, customerProfile.id),
    ]);
  }

  return {
    business,
    rewards,
    rules,
    menu,
    scratch,
    customer_profile: customerProfile,
    business_customer,
    claims,
    stamp_request,
  };
}
