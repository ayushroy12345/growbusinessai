import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppOrigin, isSupabaseConfigured } from '@/lib/env';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get('next') || '/customer/dashboard';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/auth/login?error=supabase_not_configured', requestUrl.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getAppOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_start_failed', requestUrl.origin));
  }

  return NextResponse.redirect(data.url);
}
