'use client';

import { useState, useTransition } from 'react';
import { ScratchCampaign, ScratchPlay } from '@/types';
import { playScratchAction } from '@/actions/engagement';

export function ScratchPanel({
  campaign,
  plays,
}: {
  campaign: ScratchCampaign;
  plays: ScratchPlay[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(plays[0]?.outcome_title || null);
  const [error, setError] = useState<string | null>(null);
  const used = plays.length >= campaign.attempts_per_customer || Boolean(result);

  function reveal() {
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await playScratchAction(campaign.id);
        setResult(outcome.title);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Scratch card failed');
      }
    });
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-base font-bold text-slate-900">{campaign.name}</h2>
      <p className="text-xs text-slate-500">The result is chosen on the server and saved. It cannot be replayed.</p>
      {result ? (
        <div className="rounded-2xl bg-indigo-50 px-4 py-5 text-center">
          <div className="text-xs uppercase tracking-wider text-indigo-500 font-bold">Your result</div>
          <div className="mt-1 text-xl font-black text-slate-900">{result}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={isPending || used}
          className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
        >
          {isPending ? 'Scratching...' : 'Scratch card'}
        </button>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
