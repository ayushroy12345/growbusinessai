'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Store, User, LogIn, PlusCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface LoginPageClientProps {
  redirectTo: string;
  errorMessage?: string;
  intent: 'business' | 'customer';
}

type Role = 'customer' | 'business';
type AuthMode = 'signin' | 'signup';

export function LoginPageClient({ redirectTo, errorMessage, intent }: LoginPageClientProps) {
  const [role, setRole] = useState<Role>(intent === 'customer' ? 'customer' : 'business');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  const isBusiness = role === 'business';
  const googleNext = isBusiness ? '/dashboard/business/new' : redirectTo || '/customer/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (authMode === 'signup' && !fullName.trim()) {
      setError('Enter your name to create an account.');
      return;
    }
    if (mode === 'password' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          password: mode === 'password' ? password : '',
          mode,
          authMode,
          role: isBusiness ? 'BUSINESS_OWNER' : 'CUSTOMER',
          redirectTo: isBusiness ? '' : redirectTo,
        }),
      });

      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setError(data.error || 'Could not continue');
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
      setLoading(false);
    }
  }

  const submitLabel = authMode === 'signin' ? 'Sign in' : isBusiness ? 'Create my shop' : 'Create my card';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-[0.9fr_1.1fr] overflow-hidden rounded-[32px] border border-sand bg-white shadow-card">
        <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-10">
          <Logo light />
          <div>
            <p className="font-display text-4xl leading-[1.05]">
              {isBusiness ? 'Your counter gets a card customers actually keep.' : 'Your stamps live with the shop you visit.'}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              {isBusiness
                ? 'Name the business, set the reward, and print one QR. You approve every stamp before it counts.'
                : 'Use the email you gave the shop. Your card, menu, and rewards stay with that business.'}
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-lime">
            {isBusiness ? 'Built for the owner' : 'Customer card'}
          </p>
        </div>

        <div className="p-7 sm:p-10 space-y-6">
          <div className="space-y-2">
            <div className="lg:hidden mb-4">
              <Logo />
            </div>

            {/* Account: sign in vs create */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-sand/60 border border-sand">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  authMode === 'signin' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  authMode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create account
              </button>
            </div>

            {/* Role: customer vs shop keeper */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition ${
                  role === 'customer'
                    ? 'border-leaf bg-lime/50 ring-2 ring-leaf/40'
                    : 'border-sand bg-white hover:border-ink/20'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-ink">I&apos;m a customer</span>
                  <span className="block text-[10px] text-ink/45">Collect stamps &amp; rewards</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('business')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition ${
                  role === 'business'
                    ? 'border-leaf bg-lime/50 ring-2 ring-leaf/40'
                    : 'border-sand bg-white hover:border-ink/20'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-ink">I&apos;m a shop keeper</span>
                  <span className="block text-[10px] text-ink/45">Run a loyalty program</span>
                </span>
              </button>
            </div>

            <h2 className="font-display text-3xl text-ink tracking-tight pt-2">
              {authMode === 'signin' ? 'Welcome back' : isBusiness ? 'Start your shop' : 'Open your card'}
            </h2>
            <p className="text-sm text-ink/55">
              {authMode === 'signin'
                ? 'Continue with Google or sign in with your email and password.'
                : isBusiness
                  ? 'Use your work email. You will set the shop name on the next screen.'
                  : 'Sign up with the email on your stamp card.'}
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = `/api/auth/google?next=${encodeURIComponent(googleNext)}`;
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-sand rounded-full font-semibold text-ink bg-white hover:border-ink/30 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-sand" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-[0.16em] text-ink/40 font-semibold">
              or email
            </span>
            <div className="flex-grow border-t border-sand" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {authMode === 'signup' && (
              <label className="block">
                <span className="text-xs font-semibold text-ink/70">Your name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isBusiness ? 'Asha Mehta' : 'Alex Rivera'}
                  className="mt-1 w-full text-sm px-3.5 py-3 border border-sand rounded-2xl focus:outline-none focus:ring-2 focus:ring-leaf"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-ink/70">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isBusiness ? 'you@yourshop.com' : 'you@email.com'}
                className="mt-1 w-full text-sm px-3.5 py-3 border border-sand rounded-2xl focus:outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            {mode === 'password' ? (
              <label className="block">
                <span className="text-xs font-semibold text-ink/70">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full text-sm px-3.5 py-3 border border-sand rounded-2xl focus:outline-none focus:ring-2 focus:ring-leaf"
                />
                <span className="mt-1 block text-[11px] text-ink/45">
                  {authMode === 'signup'
                    ? 'This password is for your account. Keep it somewhere safe.'
                    : 'Use the password you set for this account.'}
                </span>
              </label>
            ) : (
              <p className="text-[11px] text-ink/45 rounded-2xl bg-white border border-sand px-3.5 py-3">
                You&apos;ll continue instantly with just your email — no password needed.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || (authMode === 'signup' && !fullName.trim())}
              className="w-full py-3.5 bg-ink hover:bg-leaf text-white text-sm font-semibold rounded-full transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'link' : 'password')}
              className="w-full text-xs font-semibold text-leaf hover:underline"
            >
              {mode === 'password'
                ? authMode === 'signin'
                  ? 'Forgot your password? Use a sign-in link instead'
                  : 'Or continue with just your email (no password)'
                : 'Use a password instead'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}