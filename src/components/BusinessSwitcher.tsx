'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Business } from '@/types';
import { switchBusinessAction } from '@/actions/business';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';

interface BusinessSwitcherProps {
  businesses: Business[];
  activeBusinessId: string | null;
}

export function BusinessSwitcher({ businesses, activeBusinessId }: BusinessSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  function handleSelect(id: string) {
    if (id === 'create_new') {
      router.push('/dashboard/business/new');
      return;
    }
    startTransition(async () => {
      await switchBusinessAction(id);
      router.refresh();
    });
  }

  if (!businesses.length) {
    return (
      <Link
        href="/dashboard/business/new"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Business
      </Link>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm hover:border-slate-300 transition">
        <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
          {activeBusiness?.name?.charAt(0).toUpperCase() || 'B'}
        </div>
        <select
          value={activeBusiness?.id || ''}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={isPending}
          className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="create_new">+ Create New Business</option>
        </select>
      </div>
    </div>
  );
}
