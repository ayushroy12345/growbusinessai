import { requireAuth, getActiveBusinessId } from '@/lib/session';
import {
  getBusinessesByOwner,
  getBusinessById,
  getRewardsByBusiness,
  getLoyaltyRules,
} from '@/lib/db';
import { LoyaltyClientView } from './LoyaltyClientView';
import { Gift } from 'lucide-react';
import Link from 'next/link';

export default async function LoyaltyPage() {
  const user = await requireAuth();
  const businesses = await getBusinessesByOwner(user.id);

  if (businesses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">No Business Configured</h2>
        <Link href="/dashboard/business/new" className="text-indigo-600 font-semibold text-xs">
          Create a business first
        </Link>
      </div>
    );
  }

  const activeBusinessId = (await getActiveBusinessId()) || businesses[0].id;
  const activeBusiness = await getBusinessById(activeBusinessId);

  if (!activeBusiness || activeBusiness.owner_id !== user.id) {
    throw new Error('UNAUTHORIZED: Access to this business scope is forbidden.');
  }

  const rewards = await getRewardsByBusiness(activeBusiness.id);
  const rules = await getLoyaltyRules(activeBusiness.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
          <Gift className="w-3.5 h-3.5" />
          <span>{activeBusiness.name} • Loyalty Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Loyalty Rules & Rewards Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Define visit milestones, rewards, and anti-duplicate cooldown protection for {activeBusiness.name}.
        </p>
      </div>

      <LoyaltyClientView
        businessId={activeBusiness.id}
        businessName={activeBusiness.name}
        rewards={rewards}
        rules={rules}
      />
    </div>
  );
}
