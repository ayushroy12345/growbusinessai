'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemRewardAction } from '@/actions/redeem';
import { CheckCircle2, ShieldCheck, AlertCircle, Sparkles, QrCode } from 'lucide-react';

interface RedeemClientViewProps {
  businessId: string;
  businessName: string;
}

export function RedeemClientView({ businessId, businessName }: RedeemClientViewProps) {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    claim?: any;
  } | null>(null);

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('claim_code', claimCode.trim().toUpperCase());
      formData.set('business_id', businessId);

      const res = await redeemRewardAction(formData);
      setResult(res);
      if (res.success) {
        setClaimCode('');
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Counter Staff Verification</h2>
            <p className="text-xs text-slate-500">
              Enter customer&apos;s unique 6-digit claim code (e.g. RW-94K2B8) to verify and redeem.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Customer Reward Claim Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                placeholder="RW-XXXXXX"
                className="w-full text-center tracking-widest font-mono text-xl font-black py-3 px-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:outline-none uppercase transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 text-center">
              Customer displays this on their mobile screen once unlocked.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || !claimCode.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? 'Verifying with Database...' : 'Verify & Redeem Reward'}
          </button>
        </form>

        {result && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold space-y-2 ${
              result.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-bold">{result.message}</span>
            </div>

            {result.claim && (
              <div className="pt-2 border-t border-current/20 text-[11px] space-y-1">
                <div>
                  Reward: <span className="font-bold">{result.claim.reward?.title}</span>
                </div>
                <div>Code: {result.claim.claim_code}</div>
                <div>
                  Status:{' '}
                  <span className="uppercase font-bold tracking-wider">
                    {result.claim.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Redemption Security Rules
        </h4>
        <ul className="list-disc list-inside space-y-1 text-slate-500">
          <li>Code must belong to this business ({businessName}).</li>
          <li>System strictly rejects duplicate redemption attempts.</li>
          <li>Every redemption records staff user ID and timestamp in audit logs.</li>
        </ul>
      </div>
    </div>
  );
}
