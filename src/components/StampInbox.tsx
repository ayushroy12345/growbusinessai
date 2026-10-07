'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StampRequest } from '@/types';
import { decideStampAction } from '@/actions/engagement';

export function StampInbox({ requests }: { requests: StampRequest[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function decide(request: StampRequest, decision: 'APPROVED' | 'DECLINED') {
    startTransition(async () => {
      await decideStampAction(request.id, request.business_id, decision);
      router.refresh();
    });
  }

  if (!requests.length) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-slate-900">Stamp requests</h2>
      <div className="divide-y divide-slate-100">
        {requests.map((request) => (
          <div key={request.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">
                {request.customer_profile?.full_name || 'Customer'}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(request.requested_at).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => decide(request, 'APPROVED')}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => decide(request, 'DECLINED')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
