'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getActiveBusinessId } from '@/lib/session';
import { getBusinessById, verifyAndRedeemReward, recordAuditLog } from '@/lib/db';

export async function redeemRewardAction(formData: FormData) {
  const user = await requireAuth();
  const claimCode = (formData.get('claim_code') as string)?.trim().toUpperCase();
  const businessId = (formData.get('business_id') as string) || (await getActiveBusinessId());

  if (!claimCode) {
    return { success: false, message: 'Please enter a claim code.' };
  }

  if (!businessId) {
    return { success: false, message: 'No active business selected.' };
  }

  // Authorization check: User must be business owner, staff, or super admin
  const business = await getBusinessById(businessId);
  if (!business || (business.owner_id !== user.id && user.role !== 'SUPER_ADMIN')) {
    return { success: false, message: 'UNAUTHORIZED: You do not have permission to redeem rewards for this business.' };
  }

  const result = await verifyAndRedeemReward(businessId, claimCode, user.id);

  if (result.success && result.claim) {
    await recordAuditLog(
      user.id,
      businessId,
      'REDEEM_REWARD',
      'reward_claim',
      result.claim.id,
      undefined,
      { claim_code: claimCode, status: 'REDEEMED' }
    );
  }

  revalidatePath('/dashboard/rewards/redeem');
  revalidatePath('/dashboard');
  return result;
}
