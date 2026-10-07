'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Business,
  CustomerProfile,
  BusinessCustomer,
  Reward,
  RewardClaim,
  Visit,
  MenuCategory,
  MenuItem,
  ScratchCampaign,
  ScratchPlay,
  ScratchPrize,
  StampRequest,
} from '@/types';
import {
  checkInCustomerVisitAction,
  claimCustomerRewardAction,
  submitFeedbackAction,
  recordSocialClickAction,
} from '@/actions/customer';
import { computeRewardStatus } from '@/lib/loyalty';
import {
  Sparkles,
  QrCode,
  Gift,
  Star,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Phone,
  Globe,
  Send,
  Lock,
} from 'lucide-react';
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  WhatsAppIcon,
} from '@/components/SocialIcons';
import Link from 'next/link';
import { ScratchPanel } from '@/components/ScratchPanel';

interface BusinessClientViewProps {
  business: Business;
  customerProfile: CustomerProfile | null;
  businessCustomer: BusinessCustomer | null;
  rewards: Reward[];
  claims: RewardClaim[];
  visits: Visit[];
  minIntervalHours: number;
  stampRequest?: StampRequest | null;
  menu?: { categories: MenuCategory[]; items: MenuItem[] };
  scratch?: { campaign: ScratchCampaign; prizes: ScratchPrize[]; plays: ScratchPlay[] } | null;
}

export function BusinessClientView({
  business,
  customerProfile,
  businessCustomer,
  rewards,
  claims,
  visits,
  minIntervalHours,
  stampRequest = null,
  menu = { categories: [], items: [] },
  scratch = null,
}: BusinessClientViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Feedback form state
  const [rating, setRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const totalVisits = businessCustomer?.total_visits || 0;

  // Handle visit check-in
  function handleCheckIn() {
    setCheckInMessage(null);
    setCheckInError(null);
    startTransition(async () => {
      try {
        const res = await checkInCustomerVisitAction(business.id);
        if (res.success) {
          setCheckInMessage(res.message);
          router.refresh();
        } else {
          setCheckInError(res.message);
        }
      } catch (err: unknown) {
        setCheckInError(err instanceof Error ? err.message : 'Check-in failed');
      }
    });
  }

  // Handle reward claiming
  function handleClaim(rewardId: string) {
    startTransition(async () => {
      try {
        await claimCustomerRewardAction(business.id, rewardId);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Claim failed');
      }
    });
  }

  // Handle social and Google review outbound click
  function handleSocialClick(platform: string, url: string) {
    recordSocialClickAction(business.id, platform);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Handle feedback submit
  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    startTransition(async () => {
      try {
        await submitFeedbackAction(
          business.id,
          rating,
          feedbackComment,
          customerProfile?.full_name,
          customerProfile?.phone
        );
        setFeedbackSubmitted(true);
        setFeedbackComment('');
      } catch {
        alert('Could not submit feedback at this moment.');
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Business Branding Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.name}
            className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover shadow-sm border border-slate-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md shadow-indigo-100">
            {business.name.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{business.name}</h1>
        {business.category && (
          <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {business.category}
          </span>
        )}
        {business.description && (
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">{business.description}</p>
        )}
        {(business.address || business.city) && (
          <p className="mt-2 text-[11px] text-slate-400">
            📍 {[business.address, business.city, business.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Customer Status & Check-in Box */}
      {!customerProfile ? (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 text-center shadow-lg space-y-4">
          <Sparkles className="w-8 h-8 text-indigo-300 mx-auto" />
          <h2 className="text-xl font-bold">Earn Rewards at {business.name}</h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Sign in with Google to record your visit, unlock free items, and track your perks.
          </p>
          <Link
            href={`/auth/login?redirectTo=${encodeURIComponent(`/b/${business.slug}`)}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm shadow hover:bg-slate-100 transition w-full"
          >
            Sign In with Google to Check In
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Member Profile
              </span>
              <h3 className="text-base font-bold text-slate-900">{customerProfile.full_name}</h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Visits
              </span>
              <div className="text-2xl font-black text-indigo-600">{totalVisits}</div>
            </div>
          </div>

          {/* Check-in CTA Button */}
          <button
            onClick={handleCheckIn}
            disabled={isPending || stampRequest?.status === 'PENDING'}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <QrCode className="w-5 h-5" />
            {isPending
              ? 'Sending request...'
              : stampRequest?.status === 'PENDING'
              ? 'Stamp request pending approval'
              : 'Request a stamp'}
          </button>

          {checkInMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{checkInMessage}</span>
            </div>
          )}

          {checkInError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{checkInError}</span>
            </div>
          )}
        </div>
      )}

      {/* Rewards Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-4 h-4 text-indigo-600" />
            Loyalty Rewards
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {rewards.length} milestone{rewards.length === 1 ? '' : 's'} available
          </span>
        </div>

        {rewards.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            No rewards configured yet for this business.
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => {
              const { status, claim } = computeRewardStatus(reward, totalVisits, claims);
              const progressRatio = Math.min(1, totalVisits / reward.required_visits);
              const percentage = Math.round(progressRatio * 100);

              return (
                <div
                  key={reward.id}
                  className={`bg-white rounded-2xl p-5 border transition ${
                    status === 'AVAILABLE'
                      ? 'border-emerald-400 shadow-md ring-2 ring-emerald-100'
                      : status === 'CLAIMED'
                      ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{reward.title}</h4>
                      {reward.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{reward.description}</p>
                      )}
                      <div className="mt-2 text-xs font-bold text-slate-700">
                        Milestone: {reward.required_visits} visits
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {status === 'LOCKED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {status === 'AVAILABLE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                          ✨ Ready to Claim
                        </span>
                      )}
                      {status === 'CLAIMED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                          🎟️ Claimed
                        </span>
                      )}
                      {status === 'REDEEMED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 line-through rounded-md">
                          ✓ Redeemed
                        </span>
                      )}
                      {status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                      <span>Progress: {totalVisits} / {reward.required_visits} visits</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action depending on reward status */}
                  {status === 'AVAILABLE' && (
                    <button
                      onClick={() => handleClaim(reward.id)}
                      disabled={isPending}
                      className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Claim Reward Now
                    </button>
                  )}

                  {status === 'CLAIMED' && claim && (
                    <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center space-y-1">
                      <div className="text-[11px] uppercase font-bold text-indigo-600 tracking-wider">
                        Show Code to Staff to Redeem
                      </div>
                      <div className="text-xl font-black font-mono tracking-widest text-indigo-950">
                        {claim.claim_code}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Expires on {new Date(claim.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Engagement & Google Review Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Support & Connect</h3>

        {/* Neutral Google Review Button */}
        {business.google_review_url && (
          <button
            onClick={() => handleSocialClick('google_review', business.google_review_url!)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                  Review us on Google
                </div>
                <div className="text-[11px] text-slate-500">Share your honest experience</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
          </button>
        )}

        {/* Social Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {business.instagram_url && (
            <button
              onClick={() => handleSocialClick('instagram', business.instagram_url!)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-pink-50 hover:border-pink-200 text-xs font-medium text-slate-700 transition"
            >
              <InstagramIcon className="w-4 h-4 text-pink-600" />
              <span>Instagram</span>
            </button>
          )}

          {business.facebook_url && (
            <button
              onClick={() => handleSocialClick('facebook', business.facebook_url!)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-slate-700 transition"
            >
              <FacebookIcon className="w-4 h-4 text-blue-600" />
              <span>Facebook</span>
            </button>
          )}

          {business.whatsapp_number && (
            <button
              onClick={() =>
                handleSocialClick(
                  'whatsapp',
                  `https://wa.me/${business.whatsapp_number!.replace(/[^0-9]/g, '')}`
                )
              }
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-xs font-medium text-slate-700 transition"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          )}

          {business.website_url && (
            <button
              onClick={() => handleSocialClick('website', business.website_url!)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
            >
              <Globe className="w-4 h-4 text-slate-600" />
              <span>Website</span>
            </button>
          )}

          {business.youtube_url && (
            <button
              onClick={() => handleSocialClick('youtube', business.youtube_url!)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-xs font-medium text-slate-700 transition"
            >
              <YoutubeIcon className="w-4 h-4 text-red-600" />
              <span>YouTube</span>
            </button>
          )}
        </div>
      </div>

      {/* Private Customer Feedback Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Send Private Feedback
          </h3>
          <span className="text-[11px] text-slate-400">Direct to management</span>
        </div>

        {feedbackSubmitted ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-200 text-center">
            ✓ Thank you! Your feedback has been privately shared with the management.
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            {/* Star Rating Picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 text-amber-400 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              required
              rows={3}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Private Feedback
            </button>
          </form>
        )}
      </div>

      {menu.items.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Menu</h2>
          {menu.categories.map((category) => {
            const items = menu.items.filter((item) => item.category_id === category.id);
            if (!items.length) return null;
            return (
              <div key={category.id} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{category.name}</h3>
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                    </div>
                    <div className="font-semibold text-slate-700">₹{(item.price_cents / 100).toFixed(0)}</div>
                  </div>
                ))}
              </div>
            );
          })}
          {menu.items.filter((item) => !item.category_id).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="font-semibold text-slate-900">{item.name}</div>
              <div className="font-semibold text-slate-700">₹{(item.price_cents / 100).toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}

      {scratch && customerProfile && (
        <ScratchPanel
          campaign={scratch.campaign}
          plays={scratch.plays}
        />
      )}

      {/* Customer's Recent Visits at this Business */}
      {customerProfile && visits.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Your Visit History Here
          </h3>
          <div className="divide-y divide-slate-100">
            {visits.slice(0, 5).map((visit) => (
              <div key={visit.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-medium">
                    {new Date(visit.created_at).toLocaleDateString()} at{' '}
                    {new Date(visit.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  {visit.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
