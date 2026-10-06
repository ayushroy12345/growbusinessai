'use client';

import { useState } from 'react';
import { Shield, UserCheck, Store, LogIn, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface LoginPageClientProps {
  redirectTo: string;
  errorMessage?: string;
}

export function LoginPageClient({ redirectTo, errorMessage }: LoginPageClientProps) {
  const [loadingPersona, setLoadingPersona] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customRole, setCustomRole] = useState<'CUSTOMER' | 'BUSINESS_OWNER' | 'SUPER_ADMIN'>('CUSTOMER');
  const [customLoading, setCustomLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  async function handleLogin(email: string, full_name: string, role: string, personaKey?: string) {
    if (personaKey) setLoadingPersona(personaKey);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          full_name,
          role,
          redirectTo,
        }),
      });

      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || 'Authentication failed');
        setLoadingPersona(null);
        setCustomLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
      setLoadingPersona(null);
      setCustomLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setCustomLoading(true);
    handleLogin(customEmail.trim(), customEmail.split('@')[0], customRole);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-[0.9fr_1.1fr] overflow-hidden rounded-[32px] border border-sand bg-white shadow-card">
        <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-10">
          <Logo light />
          <div>
            <p className="font-display text-4xl leading-[1.05]">
              Walk in as the owner, the regular, or the auditor.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Seeded shops are already live: Artisan Coffee and Roy Haute Fashion. Pick a persona and the visit history comes with you.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-lime">Local demo · no password</p>
        </div>

        <div className="p-7 sm:p-10 space-y-6">
        <div className="space-y-2">
          <div className="lg:hidden mb-4">
            <Logo />
          </div>
          <h2 className="font-display text-4xl text-ink tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-ink/55">
            Choose a persona, or sign in with any email to start a fresh account.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        {/* Primary: Google OAuth Notice */}
        <button
          onClick={() => {
            setError('Live Google OAuth connects via Supabase Auth when configured. For local evaluation, click any of the personas below!');
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-400 font-bold">
            One-Click Testing Personas
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Quick Testing Personas */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Owner */}
          <button
            type="button"
            disabled={Boolean(loadingPersona)}
            onClick={() => handleLogin('owner@cafeempire.com', 'Marcus Vance', 'BUSINESS_OWNER', 'owner')}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50 transition group text-left shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Business Owner (Marcus Vance)
                </div>
                <div className="text-[11px] text-slate-500">
                  Manages Artisan Coffee &amp; Roy Fashion
                </div>
              </div>
            </div>
            {loadingPersona === 'owner' ? (
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition" />
            )}
          </button>

          {/* Customer */}
          <button
            type="button"
            disabled={Boolean(loadingPersona)}
            onClick={() => handleLogin('alex.customer@example.com', 'Alex Smith', 'CUSTOMER', 'customer')}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 hover:border-indigo-500 hover:bg-indigo-50 transition group text-left shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                  Customer Persona (Alex Smith)
                </div>
                <div className="text-[11px] text-slate-500">
                  Universal Member with 5/5 visits &amp; active pass
                </div>
              </div>
            </div>
            {loadingPersona === 'customer' ? (
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition" />
            )}
          </button>

          {/* Admin */}
          <button
            type="button"
            disabled={Boolean(loadingPersona)}
            onClick={() => handleLogin('admin@loyalty.com', 'Platform Super Admin', 'SUPER_ADMIN', 'admin')}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50/30 hover:border-amber-500 hover:bg-amber-50 transition group text-left shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition">
                  Super Admin (Platform Auditor)
                </div>
                <div className="text-[11px] text-slate-500">
                  Global moderation &amp; audit trails
                </div>
              </div>
            </div>
            {loadingPersona === 'admin' ? (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition" />
            )}
          </button>
        </div>

        {/* Custom Email Login */}
        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-slate-100 space-y-3">
          <div className="text-xs font-semibold text-slate-700">Or sign in with any custom email:</div>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="you@domain.com"
              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value as any)}
              className="text-xs px-2 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="BUSINESS_OWNER">Owner</option>
              <option value="SUPER_ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={customLoading || !customEmail.trim()}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            {customLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Continue with custom account
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
