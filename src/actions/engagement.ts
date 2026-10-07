'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';
import { getBusinessById, getCustomerProfileByUserId } from '@/lib/db';
import { canAccessBusiness } from '@/lib/authz';
import {
  createScratchCampaign,
  decideStamp,
  playScratch,
  requestStamp,
  saveMenuCategory,
  saveMenuItem,
  setMenuItemAvailable,
} from '@/lib/engagement';

async function requireCustomerProfile() {
  const user = await requireAuth();
  const profile = await getCustomerProfileByUserId(user.id);
  if (!profile) throw new Error('Customer profile not completed yet.');
  return { user, profile };
}

async function requireBusinessAccess(businessId: string) {
  const user = await requireAuth();
  const business = await getBusinessById(businessId);
  if (!business || !canAccessBusiness(user, business)) {
    throw new Error('UNAUTHORIZED: You cannot manage this business.');
  }
  return { user, business };
}

export async function requestStampAction(businessId: string) {
  const { profile } = await requireCustomerProfile();
  const result = await requestStamp(businessId, profile.id);
  revalidatePath('/dashboard');
  revalidatePath('/customer/dashboard');
  return result;
}

export async function decideStampAction(requestId: string, businessId: string, decision: 'APPROVED' | 'DECLINED') {
  const { user } = await requireBusinessAccess(businessId);
  const result = await decideStamp(requestId, decision, user.id);
  revalidatePath('/dashboard');
  revalidatePath('/b/[businessSlug]', 'page');
  return result;
}

export async function playScratchAction(campaignId: string) {
  const { profile } = await requireCustomerProfile();
  const result = await playScratch(campaignId, profile.id);
  revalidatePath('/b/[businessSlug]', 'page');
  return result;
}

export async function addMenuCategoryAction(businessId: string, name: string) {
  await requireBusinessAccess(businessId);
  await saveMenuCategory(businessId, name);
  revalidatePath('/dashboard/menu');
  revalidatePath('/b/[businessSlug]', 'page');
}

export async function addMenuItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') || '');
  await requireBusinessAccess(businessId);
  await saveMenuItem({
    businessId,
    categoryId: String(formData.get('categoryId') || '') || null,
    name: String(formData.get('name') || ''),
    description: String(formData.get('description') || ''),
    priceCents: Math.round(Number(formData.get('price') || 0) * 100),
    imageUrl: String(formData.get('imageUrl') || ''),
  });
  revalidatePath('/dashboard/menu');
  revalidatePath('/b/[businessSlug]', 'page');
}

export async function toggleMenuItemAction(businessId: string, itemId: string, isAvailable: boolean) {
  await requireBusinessAccess(businessId);
  await setMenuItemAvailable(businessId, itemId, isAvailable);
  revalidatePath('/dashboard/menu');
  revalidatePath('/b/[businessSlug]', 'page');
}

export async function createScratchCampaignAction(formData: FormData) {
  const businessId = String(formData.get('businessId') || '');
  await requireBusinessAccess(businessId);
  const titles = formData.getAll('prizeTitle').map(String);
  const odds = formData.getAll('prizeOdds').map((value) => Number(value));
  const values = formData.getAll('prizeValue').map(String);
  await createScratchCampaign({
    businessId,
    name: String(formData.get('name') || ''),
    attemptsPerCustomer: Number(formData.get('attempts') || 1),
    prizes: titles.map((title, index) => ({
      title,
      probability: odds[index] || 0,
      rewardValue: values[index],
    })),
  });
  revalidatePath('/dashboard/scratch');
  revalidatePath('/b/[businessSlug]', 'page');
}

