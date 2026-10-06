import { requireAuth, getActiveBusinessId } from '@/lib/session';
import { getBusinessesByOwner, getBusinessById } from '@/lib/db';
import { RedeemClientView } from './RedeemClientView';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default async function RedeemPage() {
  const user = await requireAuth();
  const businesses = await getBusinessesByOwner(user.id);

  if (businesses.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">No Business Found</h2>
        <Link href="/dashboard/business/new" className="text-xs text-indigo-600 font-semibold">
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{activeBusiness.name} • Staff Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Verify & Redeem Customer Rewards
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Validate customer claim passes before handing out drinks, discounts, or treats.
        </p>
      </div>

      <RedeemClientView businessId={activeBusiness.id} businessName={activeBusiness.name} />
    </div>
  );
}
