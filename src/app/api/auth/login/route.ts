import { NextResponse } from 'next/server';
import { upsertUser, getUserByEmail, getCustomerProfileByUserId, getBusinessesByOwner } from '@/lib/db';
import { establishEmailSession } from '@/lib/supabase/email-session';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { UserRole, User } from '@/types';

type Mode = 'password' | 'link';

function loginError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function finishLogin(user: User, redirectTo: string): Promise<NextResponse> {
  const role = user.role;
  let redirectUrl = redirectTo;
  if (role === 'BUSINESS_OWNER') {
    const businesses = await getBusinessesByOwner(user.id);
    redirectUrl = businesses.length === 0 ? '/dashboard/business/new' : redirectTo || '/dashboard';
  } else if (!redirectUrl) {
    redirectUrl = '/customer/dashboard';
  }

  // If customer, check if customer profile exists.
  if (role === 'CUSTOMER') {
    const profile = await getCustomerProfileByUserId(user.id);
    if (!profile) {
      redirectUrl = `/customer/onboarding?redirectTo=${encodeURIComponent(redirectUrl)}`;
    }
  }

  const response = NextResponse.json({ success: true, user, redirectUrl });

  response.cookies.set('loyalty_session_user', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  if (role === 'BUSINESS_OWNER') {
    const businesses = await getBusinessesByOwner(user.id);
    if (businesses.length > 0) {
      response.cookies.set('loyalty_active_business_id', businesses[0].id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }
  }

  return response;
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return loginError(
        'Supabase is not configured on this deployment. Add the Supabase environment variables and redeploy.',
        500
      );
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const password = typeof body.password === 'string' ? body.password : '';
    const mode: Mode = body.mode === 'password' ? 'password' : 'link';
    const authMode: 'signin' | 'signup' = body.authMode === 'signup' ? 'signup' : 'signin';
    const requestedRole: UserRole = body.role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'CUSTOMER';
    const role = requestedRole;
    const redirectTo = body.redirectTo || '';

    if (!email) {
      return loginError('Email is required');
    }

    const supabase = await createSupabaseServerClient();

    if (mode === 'password') {
      if (!password || password.length < 8) {
        return loginError('Password must be at least 8 characters.');
      }

      let existing = true;
      let signIn = await supabase.auth.signInWithPassword({ email, password });

      if (signIn.error) {
        existing = Boolean(await getUserByEmail(email));

        if (!existing && authMode === 'signup') {
          // New account: provision a confirmed auth account with this password.
          const admin = createAdminClient();
          const created = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (created.error) {
            return loginError(`Could not create your account (${created.error.message})`);
          }
          signIn = await supabase.auth.signInWithPassword({ email, password });
          if (signIn.error) {
            return loginError('Your account was created but sign-in failed. Please try again.');
          }
        }
      }

      if (signIn.error) {
        if (!existing && authMode === 'signin') {
          return loginError(
            `No account found for ${email}. Create an account to get started.`,
            404
          );
        }
        if (existing && authMode === 'signup') {
          return loginError(
            `An account already exists for ${email}. Sign in instead, or continue with Google.`,
            409
          );
        }
        return loginError(
          'Incorrect email or password. If your account was created without a password, use the sign-in link option, then set a password in your settings.',
          401
        );
      }

      if (authMode === 'signup') {
        const existingForSignup = Boolean(await getUserByEmail(email));
        if (existingForSignup) {
          return loginError(
            `An account already exists for ${email}. Sign in instead, or continue with Google.`,
            409
          );
        }
      }

      const user = await upsertUser({ email, full_name: fullName, role });
      return finishLogin(user, redirectTo);
    }

    // Link mode: passwordless session (magic link verified server-side, no email sent).
    const user = await upsertUser({ email, full_name: fullName, role });
    await establishEmailSession(user);
    return finishLogin(user, redirectTo);
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Login failed' }, { status: 500 });
  }
}