import { NextResponse } from 'next/server';
import { upsertUser, getCustomerProfileByUserId, getBusinessesByOwner } from '@/lib/db';
import { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const role: UserRole = body.role || 'CUSTOMER';
    const redirectTo = body.redirectTo || '';

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await upsertUser({
      email,
      full_name: fullName || email.split('@')[0],
      role,
    });

    let redirectUrl = redirectTo;
    if (!redirectUrl) {
      if (role === 'BUSINESS_OWNER') {
        redirectUrl = '/dashboard';
      } else if (role === 'SUPER_ADMIN') {
        redirectUrl = '/admin';
      } else {
        redirectUrl = '/customer/dashboard';
      }
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

    // If owner, set their first business as active if they have one
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
