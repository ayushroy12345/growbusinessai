import { redirect } from 'next/navigation';
import { Business, User } from '@/types';
import { getBusinessById, getBusinessesByOwner } from './db';
import { getActiveBusinessId, setActiveBusinessId } from './session';

export function canAccessBusiness(user: User, business: Business): boolean {
  if (!business) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (business.owner_id === user.id) return true;
  return false;
}

export async function resolveOwnedBusinesses(user: User): Promise<Business[]> {
  return getBusinessesByOwner(user.id);
}

export async function requireActiveBusiness(user: User): Promise<{
  businesses: Business[];
  activeBusiness: Business;
}> {
  const businesses = await resolveOwnedBusinesses(user);

  if (businesses.length === 0) {
    redirect('/dashboard/business/new');
  }

  const activeBusinessId = await getActiveBusinessId();
  const resolved =
    businesses.find((b) => b.id === activeBusinessId) ||
    (activeBusinessId ? await getBusinessById(activeBusinessId) : null);

  const ownsResolved = Boolean(resolved && businesses.some((b) => b.id === resolved.id));
  const superAdminViewingTenant = Boolean(
    resolved && user.role === 'SUPER_ADMIN' && canAccessBusiness(user, resolved)
  );

  if (resolved && (ownsResolved || superAdminViewingTenant) && canAccessBusiness(user, resolved)) {
    return { businesses, activeBusiness: resolved };
  }

  const fallback = businesses[0];
  if (!fallback) {
    redirect('/dashboard/business/new');
  }

  await setActiveBusinessId(fallback.id);
  return { businesses, activeBusiness: fallback };
}
