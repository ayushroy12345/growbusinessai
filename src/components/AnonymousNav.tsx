'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift } from 'lucide-react';

export function AnonymousNav() {
  const pathname = usePathname();
  const isStorefront = pathname.startsWith('/b/');

  if (isStorefront) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/auth/login?intent=customer&redirectTo=${encodeURIComponent(pathname)}`}
          className="px-4 py-2 text-sm font-semibold text-ink bg-lime hover:bg-[#c8ea55] rounded-full transition flex items-center gap-1.5"
        >
          <Gift className="w-3.5 h-3.5" />
          Sign in to claim rewards
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login?intent=business"
        className="px-4 py-2 text-sm font-medium text-ink/80 hover:text-ink rounded-full transition"
      >
        Sign in
      </Link>
      <Link
        href="/auth/login?intent=business"
        className="px-4 py-2 text-sm font-semibold text-ink bg-lime hover:bg-[#c8ea55] rounded-full transition"
      >
        Start your shop
      </Link>
    </div>
  );
}