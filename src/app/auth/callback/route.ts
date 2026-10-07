import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertUser, getCustomerProfileByUserId, getBusinessesByOwner } from '@/lib/db';
import { setSessionUser } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/customer/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email || '';
      const fullName = data.user.user_metadata?.full_name || email.split('@')[0];
      const avatarUrl = data.user.user_metadata?.avatar_url;

      const forBusiness = next.startsWith('/dashboard');
      const dbUser = await upsertUser({
        id: data.user.id,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: forBusiness ? 'BUSINESS_OWNER' : 'CUSTOMER',
      });

      await setSessionUser(dbUser);

      if (forBusiness) {
        const businesses = await getBusinessesByOwner(dbUser.id);
        const dest = businesses.length === 0 ? '/dashboard/business/new' : '/dashboard';
        return NextResponse.redirect(`${origin}${dest}`);
      }

      const profile = await getCustomerProfileByUserId(dbUser.id);
      if (!profile) {
        return NextResponse.redirect(`${origin}/customer/onboarding?redirectTo=${encodeURIComponent(next)}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_exchange_failed`);
}
