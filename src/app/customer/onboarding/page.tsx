import { completeCustomerProfileAction } from '@/actions/auth';
import { requireAuth } from '@/lib/session';
import { Sparkles, Phone, User, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
}

export default async function CustomerOnboardingPage({ searchParams }: OnboardingProps) {
  const user = await requireAuth();
  const params = await searchParams;
  const redirectTo = params.redirectTo || '/customer/dashboard';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Complete Your Profile
          </h2>
          <p className="text-sm text-slate-500">
            One universal profile allows you to earn rewards and check in at any participating business.
          </p>
        </div>

        <form action={completeCustomerProfileAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                name="full_name"
                required
                defaultValue={user.full_name || ''}
                placeholder="Jane Doe"
                className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="tel"
                name="phone"
                required
                defaultValue={user.phone || ''}
                placeholder="+1 (555) 000-1234"
                className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Used solely for reward redemption confirmation and store notifications.
            </p>
          </div>

          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-100 transition"
          >
            Save & Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
