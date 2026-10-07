import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { withCallLog } from './call-log';

function isSupabaseLive(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  );
}

// Reads `expires_at` out of the sb-*-auth-token cookie so we can skip the
// Supabase Auth round trip (~300-400ms) unless the token is about to expire.
function sbSessionExpiresAt(request: NextRequest): number | null {
  const cookie = request.cookies
    .getAll()
    .find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  if (!cookie) return null;

  try {
    const raw = decodeURIComponent(cookie.value);
    const payload = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded =
      typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return typeof parsed.expires_at === 'number' ? parsed.expires_at : null;
  } catch {
    return null;
  }
}

const SESSION_REFRESH_WINDOW_SECONDS = 120;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Check if session user cookie is set (Persona / Demo / Local Auth)
  const sessionUserCookie = request.cookies.get('loyalty_session_user')?.value;
  let hasValidSession = false;
  if (sessionUserCookie) {
    try {
      const parsed = JSON.parse(sessionUserCookie);
      if (parsed?.id) {
        hasValidSession = true;
      }
    } catch {
      // Ignore
    }
  }

  // Refresh the Supabase Auth session whenever the access token is missing or
  // close to expiring, so RPCs and table reads always run with a valid
  // auth.uid(). A fresh token is trusted as-is and costs no network call.
  if (isSupabaseLive()) {
    const expiresAt = sbSessionExpiresAt(request);
    const tokenIsFresh =
      expiresAt !== null && expiresAt - Math.floor(Date.now() / 1000) > SESSION_REFRESH_WINDOW_SECONDS;

    if (tokenIsFresh) {
      if (!hasValidSession) hasValidSession = true;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      try {
        const supabase = withCallLog(createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              supabaseResponse = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }), 'middleware');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          hasValidSession = true;
        }
      } catch {
        // Ignore
      }
    }
  }

  const url = request.nextUrl.clone();

  // Protected paths check
  if (request.nextUrl.pathname.startsWith('/dashboard') && !hasValidSession) {
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith('/admin') && !hasValidSession) {
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith('/customer/dashboard') && !hasValidSession) {
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
