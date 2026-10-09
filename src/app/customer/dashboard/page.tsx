import Link from 'next/link';
import { requireAuth } from '@/lib/session';
import { getCustomerDashboardData } from '@/lib/page-data';
import { updatePasswordAction } from '@/actions/auth';
import {
  Sparkles,
  Gift,
  Store,
  Clock,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  ExternalLink,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { computeRewardStatus } from '@/lib/loyalty';
import { QrScanner } from '@/components/QrScanner';
import { Camera } from 'lucide-react';

interface CustomerDashboardProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function CustomerDashboardPage({ searchParams }: CustomerDashboardProps) {
  const user = await requireAuth('/customer/dashboard');
  const { profile, participating, claims, rewardsByBusiness } =
    await getCustomerDashboardData(user.id);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <h2 className="text-xl font-bold">Profile Setup Required</h2>
        <p className="text-xs text-slate-500">
          Please complete your member profile to view your loyalty status.
        </p>
        <Link
          href="/customer/onboarding"
          className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
        >
          Complete Profile
        </Link>
      </div>
    );
  }

  const stores = participating.map((item) => {
    const rewards = rewardsByBusiness.get(item.business.id) || [];
    return {
      item,
      nextReward:
        rewards.find((r) => r.required_visits > item.totalVisits) ||
        rewards[rewards.length - 1],
    };
  });

  // Active claims pending redemption
  const activeClaims = claims.filter((c) => c.status === 'CLAIMED');
  // Past redeemed claims
  const redeemedClaims = claims.filter((c) => c.status === 'REDEEMED');

  const params = await searchParams;
  const pwError = params.error || null;
  const pwSaved = params.saved === '1';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Customer Universal Identity Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center font-bold text-2xl shadow-inner">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                Universal Member Account
              </div>
              <h1 className="text-2xl font-black">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  {profile.phone}
                </span>
                <span>•</span>
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-center sm:text-right">
            <div className="text-[11px] text-indigo-200 uppercase font-bold tracking-wider">
              Participating Businesses
            </div>
            <div className="text-2xl font-black text-white">{participating.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-white text-indigo-700 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Check in at a new store</div>
            <div className="text-[11px] text-indigo-200">
              Scan the shop&apos;s QR code with your camera to jump to it and collect your visit.
            </div>
          </div>
          <QrScanner label="Scan QR" className="bg-white text-indigo-800 hover:bg-indigo-50 shrink-0" />
        </div>
      </div>

      {/* Active Unredeemed Claimed Rewards */}
      {activeClaims.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-indigo-600" />
            Your Ready-to-Use Reward Passes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white rounded-2xl p-5 border-2 border-indigo-200 shadow-md space-y-3 relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">
                      {claim.business?.name || 'Partner Business'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      {claim.reward?.title || 'Reward'}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    CLAIMED
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Show Code at Counter
                  </div>
                  <div className="font-mono text-xl font-black tracking-widest text-indigo-900">
                    {claim.claim_code}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Valid until {new Date(claim.expires_at).toLocaleDateString()}
                  </div>
                </div>

                {claim.business?.slug && (
                  <Link
                    href={`/b/${claim.business.slug}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
                  >
                    Open Store Portal <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participating Businesses & Loyalty Progress */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-600" />
          Your Stores & Loyalty Progress
        </h2>

        {participating.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700">No stores visited yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan the QR code at your favorite local store or cafe to start collecting loyalty visits and unlocking rewards.
            </p>
            <div className="pt-2 flex justify-center">
              <QrScanner label="Scan the QR at the store" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {stores.map(({ item, nextReward }) => {
              return (
                <div
                  key={item.business.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {item.business.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{item.business.name}</h3>
                        <p className="text-xs text-slate-500">
                          {item.business.category || 'Retail'} • Last visit:{' '}
                          {new Date(item.lastVisitAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase">Visits</div>
                        <div className="text-2xl font-black text-indigo-600">{item.totalVisits}</div>
                      </div>

                      <Link
                        href={`/b/${item.business.slug}`}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
                      >
                        Visit Store
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {nextReward && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-semibold text-slate-700">
                          Next Goal: {nextReward.title} ({nextReward.required_visits} visits)
                        </span>
                        <span className="font-bold text-indigo-600">
                          {item.totalVisits >= nextReward.required_visits
                            ? 'Milestone Reached! 🎉'
                            : `${nextReward.required_visits - item.totalVisits} visits left`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((item.totalVisits / nextReward.required_visits) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeemed Reward History */}
      {redeemedClaims.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Redeemed Reward History
          </h2>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm divide-y divide-slate-100">
            {redeemedClaims.map((claim) => (
              <div key={claim.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    {claim.reward?.title || 'Reward'}{' '}
                    <span className="font-normal text-slate-500">
                      at {claim.business?.name || 'Store'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Code: {claim.claim_code}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    REDEEMED
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {claim.redeemed_at ? new Date(claim.redeemed_at).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    {/* Account Security */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Account password
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Password sign-in works alongside Google and email links. Leave the current password blank if you signed
          up with Google or a link and don't have a password yet.
        </p>

        {pwSaved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
            ✓ Password updated.
          </div>
        )}
        {pwError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {pwError}
          </div>
        )}

        <form action={updatePasswordAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="hidden" name="redirect_to" value="/customer/dashboard" />
          <input
            type="password"
            name="current_password"
            autoComplete="current-password"
            placeholder="Current password (optional)"
            className="w-full text-xs px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            name="new_password"
            required
            autoComplete="new-password"
            placeholder="New password (8+ chars)"
            className="w-full text-xs px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            name="confirm_password"
            required
            autoComplete="new-password"
            placeholder="Repeat new password"
            className="w-full text-xs px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="sm:col-span-3 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
