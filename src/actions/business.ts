'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  requireAuth,
  requireRole,
  getActiveBusinessId,
  setActiveBusinessId,
} from '@/lib/session';
import {
  createBusiness,
  updateBusiness,
  getBusinessesByOwner,
  getBusinessById,
  createReward,
  deleteReward,
  updateLoyaltyCooldown,
  recordAuditLog,
} from '@/lib/db';
import { RewardType } from '@/types';

export async function createBusinessAction(formData: FormData) {
  const user = await requireAuth();

  const name = (formData.get('name') as string)?.trim();
  const slug = (formData.get('slug') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const logo_url = (formData.get('logo_url') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const city = (formData.get('city') as string)?.trim();
  const state = (formData.get('state') as string)?.trim();
  const country = (formData.get('country') as string)?.trim();
  const website_url = (formData.get('website_url') as string)?.trim();
  const google_review_url = (formData.get('google_review_url') as string)?.trim();
  const instagram_url = (formData.get('instagram_url') as string)?.trim();
  const facebook_url = (formData.get('facebook_url') as string)?.trim();
  const whatsapp_number = (formData.get('whatsapp_number') as string)?.trim();
  const whatsapp_channel_url = (formData.get('whatsapp_channel_url') as string)?.trim();
  const youtube_url = (formData.get('youtube_url') as string)?.trim();

  if (!name || !slug) {
    throw new Error('Business name and URL slug are required.');
  }

  const business = await createBusiness(user.id, {
    name,
    slug,
    category,
    description,
    logo_url,
    phone,
    email,
    address,
    city,
    state,
    country,
    website_url,
    google_review_url,
    instagram_url,
    facebook_url,
    whatsapp_number,
    whatsapp_channel_url,
    youtube_url,
  });

  await setActiveBusinessId(business.id);

  await recordAuditLog(
    user.id,
    business.id,
    'CREATE_BUSINESS',
    'business',
    business.id,
    undefined,
    { name, slug }
  );

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function updateBusinessAction(formData: FormData) {
  const user = await requireAuth();
  const businessId =
    (formData.get('business_id') as string) || (await getActiveBusinessId()) || '';

  if (!businessId) {
    throw new Error('No active business selected.');
  }

  const business = await getBusinessById(businessId);
  if (!business || (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN')) {
    throw new Error('UNAUTHORIZED: You cannot edit this business.');
  }

  const name = (formData.get('name') as string)?.trim();
  const slug = (formData.get('slug') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const logo_url = (formData.get('logo_url') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const city = (formData.get('city') as string)?.trim();
  const state = (formData.get('state') as string)?.trim();
  const country = (formData.get('country') as string)?.trim();
  const website_url = (formData.get('website_url') as string)?.trim();
  const google_review_url = (formData.get('google_review_url') as string)?.trim();
  const instagram_url = (formData.get('instagram_url') as string)?.trim();
  const facebook_url = (formData.get('facebook_url') as string)?.trim();
  const whatsapp_number = (formData.get('whatsapp_number') as string)?.trim();
  const whatsapp_channel_url = (formData.get('whatsapp_channel_url') as string)?.trim();
  const youtube_url = (formData.get('youtube_url') as string)?.trim();

  if (!name || !slug) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent('Business name and URL slug are required.')}`
    );
  }

  const updated = await updateBusiness(businessId, {
    name,
    slug,
    category,
    description,
    logo_url,
    phone,
    email,
    address,
    city,
    state,
    country,
    website_url,
    google_review_url,
    instagram_url,
    facebook_url,
    whatsapp_number,
    whatsapp_channel_url,
    youtube_url,
  }).catch((err: unknown) => {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'Could not save your business details.'
      )}`
    );
  });

  await recordAuditLog(
    user.id,
    businessId,
    'UPDATE_BUSINESS',
    'business',
    businessId,
    { name: business.name, slug: business.slug },
    { name: updated.name, slug: updated.slug }
  );

  revalidatePath('/', 'layout');
  redirect('/dashboard/settings?saved=1');
}

export async function switchBusinessAction(businessId: string) {
  const user = await requireAuth();
  const business = await getBusinessById(businessId);

  if (!business) {
    throw new Error('Business not found');
  }

  // Authorization check: Verify ownership or staff access or super admin
  if (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN') {
    throw new Error('UNAUTHORIZED: You do not have access to this business.');
  }

  await setActiveBusinessId(businessId);
  revalidatePath('/', 'layout');
}

export async function addRewardAction(formData: FormData) {
  const user = await requireAuth();
  const businessId = (formData.get('business_id') as string) || (await getActiveBusinessId());

  if (!businessId) {
    throw new Error('No active business selected.');
  }

  const business = await getBusinessById(businessId);
  if (!business || (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN')) {
    throw new Error('UNAUTHORIZED: You cannot manage rewards for this business.');
  }

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const reward_type = (formData.get('reward_type') as RewardType) || 'FREE_ITEM';
  const reward_value = (formData.get('reward_value') as string)?.trim() || title;
  const required_visits = parseInt(formData.get('required_visits') as string, 10) || 5;
  const expiry_days = parseInt(formData.get('expiry_days') as string, 10) || 30;

  if (!title) {
    throw new Error('Reward title is required');
  }

  const reward = await createReward(businessId, {
    title,
    description,
    reward_type,
    reward_value,
    required_visits,
    expiry_days,
  });

  await recordAuditLog(
    user.id,
    businessId,
    'CREATE_REWARD',
    'reward',
    reward.id,
    undefined,
    { title, required_visits }
  );

  revalidatePath('/dashboard/loyalty');
  return { success: true };
}

export async function deleteRewardAction(rewardId: string, businessId: string) {
  const user = await requireAuth();
  const business = await getBusinessById(businessId);
  if (!business || (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN')) {
    throw new Error('UNAUTHORIZED: You cannot delete this reward.');
  }

  await deleteReward(rewardId, businessId);
  await recordAuditLog(
    user.id,
    businessId,
    'DELETE_REWARD',
    'reward',
    rewardId
  );

  revalidatePath('/dashboard/loyalty');
  return { success: true };
}

export async function updateCooldownAction(businessId: string, hours: number) {
  const user = await requireAuth();
  const business = await getBusinessById(businessId);
  if (!business || (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN')) {
    throw new Error('UNAUTHORIZED: You cannot modify settings for this business.');
  }

  await updateLoyaltyCooldown(businessId, Math.max(0, hours));
  await recordAuditLog(
    user.id,
    businessId,
    'UPDATE_COOLDOWN',
    'loyalty_rule',
    undefined,
    undefined,
    { min_interval_hours: hours }
  );

  revalidatePath('/dashboard/loyalty');
  return { success: true };
}
