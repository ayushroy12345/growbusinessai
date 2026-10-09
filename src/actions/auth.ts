'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { establishEmailSession } from '@/lib/supabase/email-session';
import { isSupabaseConfigured } from '@/lib/env';
import {
  getCurrentUser,
  setSessionUser,
  clearSession,
  requireAuth,
} from '@/lib/session';
import {
  upsertUser,
  createOrUpdateCustomerProfile,
  getCustomerProfileByUserId,
  trackAnalyticsEvent,
} from '@/lib/db';
import { UserRole } from '@/types';

/**
 * Handle Supabase Google OAuth sign in or redirect
 */
export async function signInWithGoogleAction(redirectTo?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url.includes('placeholder') || !url) {
    redirect(`/auth/login?error=${encodeURIComponent('Google sign-in needs a configured Supabase project.')}`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://growbusinessai-jade.vercel.app';
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirectTo || '/customer/dashboard')}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data?.url) {
      redirect(data.url);
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    redirect(`/auth/login?error=${encodeURIComponent(err?.message || 'Could not connect to Supabase Auth')}`);
  }
}

/** Email sign-in for a business owner or a customer. */
export async function loginWithEmailAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const fullName = (formData.get('full_name') as string)?.trim();
  const role = (formData.get('role') as UserRole) || 'CUSTOMER';
  const redirectTo = (formData.get('redirectTo') as string) || '';

  if (!email) {
    throw new Error('Email is required');
  }

  const user = await upsertUser({
    email,
    full_name: fullName || email.split('@')[0],
    role,
  });

  if (isSupabaseConfigured()) {
    await establishEmailSession(user);
  }

  await setSessionUser(user);

  // If customer, check if customer profile exists
  if (role === 'CUSTOMER') {
    const profile = await getCustomerProfileByUserId(user.id);
    if (!profile) {
      redirect(`/customer/onboarding?redirectTo=${encodeURIComponent(redirectTo || '/customer/dashboard')}`);
    }
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  if (role === 'BUSINESS_OWNER') {
    redirect('/dashboard');
  } else if (role === 'SUPER_ADMIN') {
    redirect('/admin');
  } else {
    redirect('/customer/dashboard');
  }
}

export async function signOutAction() {
  await clearSession();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Set or update the password for the signed-in account (owners and customers). */
export async function updatePasswordAction(formData: FormData) {
  const user = await requireAuth();
  const redirectTo = (formData.get('redirect_to') as string) || '/dashboard/settings';
  const currentPassword = (formData.get('current_password') as string) || '';
  const newPassword = (formData.get('new_password') as string) || '';
  const confirmPassword = (formData.get('confirm_password') as string) || '';

  const errorTo = (message: string) =>
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
  const ok = () => redirect(`${redirectTo}?saved=1`);

  if (newPassword.length < 8) {
    errorTo('Password must be at least 8 characters.');
  }
  if (newPassword !== confirmPassword) {
    errorTo('New passwords do not match.');
  }

  if (!isSupabaseConfigured()) {
    errorTo('Supabase is not configured on this deployment.');
  }

  const supabase = await createSupabaseServerClient();

  if (currentPassword) {
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      errorTo('Current password is incorrect.');
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    errorTo(error.message);
  }

  revalidatePath('/', 'layout');
  ok();
}

export async function completeCustomerProfileAction(formData: FormData) {
  const user = await requireAuth();
  const fullName = (formData.get('full_name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const redirectTo = (formData.get('redirectTo') as string) || '/customer/dashboard';

  if (!fullName || !phone) {
    throw new Error('Full name and mobile phone number are required.');
  }

  await createOrUpdateCustomerProfile(user.id, fullName, phone);
  await upsertUser({
    id: user.id,
    email: user.email,
    full_name: fullName,
    phone,
  });

  await trackAnalyticsEvent('customer_registered', null, null, {
    user_id: user.id,
    full_name: fullName,
  });

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}
