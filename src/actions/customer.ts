'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUser } from '@/lib/session';
import {
  getCustomerProfileByUserId,
  getBusinessBySlug,
  getBusinessById,
  recordCustomerVisit,
  claimReward,
  submitPrivateFeedback,
  trackSocialClick,
  getRewardsByBusiness,
  getOrCreateBusinessCustomer,
} from '@/lib/db';

export async function checkInCustomerVisitAction(businessId: string) {
  const user = await requireAuth();
  const profile = await getCustomerProfileByUserId(user.id);

  if (!profile) {
    throw new Error('Customer profile not completed yet.');
  }

  const result = await recordCustomerVisit(businessId, profile.id, 'QR_SCAN');
  revalidatePath(`/b/[businessSlug]`, 'page');
  revalidatePath('/customer/dashboard');
  return result;
}

export async function claimCustomerRewardAction(businessId: string, rewardId: string) {
  const user = await requireAuth();
  const profile = await getCustomerProfileByUserId(user.id);

  if (!profile) {
    throw new Error('Customer profile required.');
  }

  const claim = await claimReward(profile.id, businessId, rewardId);
  revalidatePath(`/b/[businessSlug]`, 'page');
  revalidatePath('/customer/dashboard');
  return claim;
}

export async function submitFeedbackAction(
  businessId: string,
  rating: number,
  comment: string,
  customerName?: string,
  customerContact?: string
) {
  const user = await getCurrentUser();
  let customerId: string | null = null;

  if (user) {
    const profile = await getCustomerProfileByUserId(user.id);
    if (profile) customerId = profile.id;
  }

  const feedback = await submitPrivateFeedback(
    businessId,
    customerId,
    rating,
    comment,
    customerName,
    customerContact
  );

  revalidatePath(`/b/[businessSlug]`, 'page');
  return feedback;
}

export async function recordSocialClickAction(businessId: string, platform: string) {
  const user = await getCurrentUser();
  let customerId: string | null = null;
  if (user) {
    const profile = await getCustomerProfileByUserId(user.id);
    if (profile) customerId = profile.id;
  }

  await trackSocialClick(businessId, customerId, platform);
}
