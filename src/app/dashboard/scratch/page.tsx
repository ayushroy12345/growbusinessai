import { requireAuth, getActiveBusinessId } from '@/lib/session';
import { getBusinessesByOwner, getBusinessById } from '@/lib/db';
import { createScratchCampaignAction } from '@/actions/engagement';
import Link from 'next/link';

export default async function ScratchDashboardPage() {
  const user = await requireAuth('/dashboard/scratch');
  const businesses = await getBusinessesByOwner(user.id);
  if (!businesses.length) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center">
        <Link href="/dashboard/business/new" className="text-indigo-600 font-semibold text-sm">
          Create a business first
        </Link>
      </div>
    );
  }

  const activeBusinessId = (await getActiveBusinessId()) || businesses[0].id;
  const business = await getBusinessById(activeBusinessId);
  if (!business || business.owner_id !== user.id) {
    throw new Error('UNAUTHORIZED: Access to this business scope is forbidden.');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Scratch card</h1>
        <p className="text-sm text-slate-500">Odds are applied on the server when a customer scratches. They cannot redraw.</p>
      </div>
      <form action={createScratchCampaignAction} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
        <input type="hidden" name="businessId" value={business.id} />
        <input name="name" required placeholder="Campaign name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="attempts" type="number" min="1" defaultValue="1" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid grid-cols-3 gap-2">
            <input name="prizeTitle" placeholder="Prize" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="prizeOdds" type="number" min="0" placeholder="Odds" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="prizeValue" placeholder="Value" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
        ))}
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save campaign</button>
      </form>
    </div>
  );
}
