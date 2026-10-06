'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/session';
import { toggleBusinessStatus, recordAuditLog } from '@/lib/db';

export async function toggleBusinessStatusAction(businessId: string, isActive: boolean) {
  const admin = await requireRole(['SUPER_ADMIN']);
  await toggleBusinessStatus(businessId, isActive);

  await recordAuditLog(
    admin.id,
    businessId,
    isActive ? 'ACTIVATE_BUSINESS' : 'SUSPEND_BUSINESS',
    'business',
    businessId,
    undefined,
    { is_active: isActive }
  );

  revalidatePath('/admin');
  return { success: true };
}
