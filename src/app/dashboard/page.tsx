import Link from 'next/link';
import { requireAuth, getActiveBusinessId, setActiveBusinessId } from '@/lib/session';
import {
  getBusinessesByOwner,
  getBusinessById,
  getBusinessAnalytics,
  getBusinessCustomersList,
  getBusinessFeedback,
} from '@/lib/db';
import {
  Users,
  TrendingUp,
  Gift,
  QrCode,
  Star,
  MessageSquare,
  Share2,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';

import { redirect } from 'next/navigation';

export default async function BusinessDashboardPage() {
  const user = await requireAuth('/dashboard');
  if (user.role === 'CUSTOMER') {
    redirect('/customer/dashboard');
  }
  const businesses = await getBusinessesByOwner(user.id);

  if (businesses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Welcome to Your Loyalty Hub</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You haven&apos;t created any businesses yet. Create your first business to launch your customer QR loyalty program!
        </p>
        <Link
          href="/dashboard/business/new"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create First Business
        </Link>
      </div>
    );
  }

  let activeBusinessId = await getActiveBusinessId();
  let activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  if (!activeBusiness) {
    activeBusiness = businesses[0];
    await setActiveBusinessId(activeBusiness.id);
  }

  // Calculate actual analytics for this isolated business scope
  const analytics = await getBusinessAnalytics(activeBusiness.id);
  const recentCustomers = await getBusinessCustomersList(activeBusiness.id);
  const recentFeedback = await getBusinessFeedback(activeBusiness.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeBusiness.name}
            </h1>
            <BusinessSwitcher businesses={businesses} activeBusinessId={activeBusiness.id} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Operating in isolated tenant scope: <span className="font-mono">{activeBusiness.slug}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/b/${activeBusiness.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            Live Customer Page
          </Link>

          <Link
            href="/dashboard/qr"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            Download Counter QR
          </Link>

          <Link
            href="/dashboard/rewards/redeem"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Verify & Redeem Pass
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.totalCustomers}</div>
          <div className="text-[11px] text-slate-400">Unique visitors enrolled</div>
        </div>

        {/* Total Visits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Visits
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.totalVisits}</div>
          <div className="text-[11px] text-slate-400">Verified QR check-ins</div>
        </div>

        {/* Repeat Customer Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Repeat Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.repeatRate}%</div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            {analytics.repeatCustomers} repeat customers (&gt;1 visit)
          </div>
        </div>

        {/* Rewards Redeemed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rewards Redeemed
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {analytics.rewardsRedeemed} / {analytics.rewardsUnlocked}
          </div>
          <div className="text-[11px] text-slate-400">Claimed vs Redeemed passes</div>
        </div>
      </div>

      {/* Engagement Channels Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Google Review Clicks</div>
            <div className="text-2xl font-black text-slate-900">{analytics.googleReviewClicks}</div>
            <div className="text-[11px] text-slate-400">Outbound review intents</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Social Clicks</div>
            <div className="text-2xl font-black text-slate-900">{analytics.socialClicks}</div>
            <div className="text-[11px] text-slate-400">Instagram, WhatsApp & socials</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Private Feedback</div>
            <div className="text-2xl font-black text-slate-900">{analytics.feedbackCount}</div>
            <div className="text-[11px] text-slate-400">Customer feedback reviews</div>
          </div>
        </div>
      </div>

      {/* Recent Customers & Private Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Customers Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Recent Customers in this Business
            </h2>
            <Link
              href="/dashboard/customers"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All ({recentCustomers.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No customers have scanned the QR code yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCustomers.slice(0, 5).map((bc) => (
                <div key={bc.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {bc.customer_profile?.full_name || 'Member'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {bc.customer_profile?.phone || 'No phone'} • Last visited{' '}
                      {new Date(bc.last_visit_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                      {bc.total_visits} visits
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Private Feedback */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Latest Private Feedback
            </h2>
          </div>

          {recentFeedback.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No feedback submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentFeedback.slice(0, 4).map((f) => (
                <div key={f.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="font-bold text-slate-700 ml-1">{f.customer_name || 'Anonymous'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">&ldquo;{f.comment}&rdquo;</p>
                  {f.customer_contact && (
                    <div className="text-[11px] text-slate-400">Contact: {f.customer_contact}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
