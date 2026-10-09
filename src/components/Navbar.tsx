import Link from 'next/link';
import { getCurrentUser, getActiveBusinessId } from '@/lib/session';
import { getBusinessesByOwner } from '@/lib/db';
import { BusinessSwitcher } from './BusinessSwitcher';
import { signOutAction } from '@/actions/auth';
import { Logo } from './Logo';
import { AnonymousNav } from './AnonymousNav';
import { Gift, LogOut, ShieldAlert } from 'lucide-react';

function formatRole(role: string) {
  return role.toLowerCase().replaceAll('_', ' ');
}

const navLink =
  'px-3 py-1.5 text-[13px] font-medium text-ink/70 hover:text-ink hover:bg-white rounded-full transition';

export async function Navbar() {
  const user = await getCurrentUser();
  const activeBusinessId = await getActiveBusinessId();
  const businesses = user ? await getBusinessesByOwner(user.id) : [];
  const isOwner = Boolean(user && (user.role === 'BUSINESS_OWNER' || businesses.length > 0));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sand/80 bg-[#f7f4ee]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          {isOwner && (
            <div className="hidden md:block">
              <BusinessSwitcher businesses={businesses} activeBusinessId={activeBusinessId} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <nav className="hidden lg:flex items-center gap-0.5 mr-1">
                {isOwner && (
                  <>
                    <Link href="/dashboard" className={navLink}>
                      Dashboard
                    </Link>
                    <Link href="/dashboard/customers" className={navLink}>
                      Customers
                    </Link>
                    <Link href="/dashboard/loyalty" className={navLink}>
                      Rewards
                    </Link>
                    <Link href="/dashboard/rewards/redeem" className={navLink}>
                      Redeem
                    </Link>
                    <Link href="/dashboard/qr" className={navLink}>
                      QR
                    </Link>
                    <Link href="/dashboard/menu" className={navLink}>
                      Menu
                    </Link>
                    <Link href="/dashboard/scratch" className={navLink}>
                      Scratch
                    </Link>
                    <Link href="/dashboard/settings" className={navLink}>
                      Settings
                    </Link>
                  </>
                )}

                <Link
                  href="/customer/dashboard"
                  className="px-3 py-1.5 text-[13px] font-semibold text-leaf bg-white border border-sand rounded-full transition hover:border-leaf/40 flex items-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" />
                  My rewards
                </Link>

                {user.role === 'SUPER_ADMIN' && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 text-[13px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-full transition hover:bg-amber-100 flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}
              </nav>

              <div className="flex items-center gap-2 pl-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-ink leading-tight">
                    {user.full_name || user.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink/40">
                    {formatRole(user.role)}
                  </span>
                </div>

                <form action={signOutAction}>
                  <button
                    type="submit"
                    title="Sign out"
                    className="p-2 text-ink/50 hover:text-rose-700 hover:bg-white rounded-full transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <AnonymousNav />
          )}
        </div>
      </div>
    </header>
  );
}
