import { NextResponse } from 'next/server';
import { upsertUser, getCustomerProfileByUserId, getBusinessesByOwner } from '@/lib/db';
import { establishEmailSession } from '@/lib/supabase/email-session';
import { isSupabaseConfigured } from '@/lib/env';
import { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const requestedRole: UserRole = body.role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'CUSTOMER';
    const role = requestedRole;
    const redirectTo = body.redirectTo || '';

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await upsertUser({
      email,
      full_name: fullName || email.split('@')[0],
      role,
    });

    if (isSupabaseConfigured()) {
      await establishEmailSession(user);
    }

    let redirectUrl = redirectTo;
    if (role === 'BUSINESS_OWNER') {
      const businesses = await getBusinessesByOwner(user.id);
      redirectUrl = businesses.length === 0 ? '/dashboard/business/new' : redirectTo || '/dashboard';
    } else if (!redirectUrl) {
      redirectUrl = '/customer/dashboard';
    }

    // If customer, check if customer profile exists
    if (role === 'CUSTOMER') {
      const profile = await getCustomerProfileByUserId(user.id);
      if (!profile) {
        redirectUrl = `/customer/onboarding?redirectTo=${encodeURIComponent(redirectUrl)}`;
      }
    }

    const response = NextResponse.json({
      success: true,
      user,
      redirectUrl,
    });

    // Set auth cookie
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
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Login failed' }, { status: 500 });
  }
}
