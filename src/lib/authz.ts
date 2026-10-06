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

  let activeBusinessId = await getActiveBusinessId();
  let activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) ||
    (activeBusinessId ? await getBusinessById(activeBusinessId) : null);

  if (!activeBusiness || !canAccessBusiness(user, activeBusiness)) {
    activeBusiness = businesses[0];
    await setActiveBusinessId(activeBusiness.id);
  } else if (!businesses.some((b) => b.id === activeBusiness.id) && user.role === 'SUPER_ADMIN') {
    // Super admin inspecting a tenant via cookie; keep it.
  } else if (!businesses.some((b) => b.id === activeBusiness.id)) {
    activeBusiness = businesses[0];
    await setActiveBusinessId(activeBusiness.id);
  }

  return { businesses, activeBusiness };
}
