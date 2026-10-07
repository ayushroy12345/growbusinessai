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
