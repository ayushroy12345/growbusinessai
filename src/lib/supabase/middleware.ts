import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // If Supabase is configured with live keys, check Supabase Auth as well
  if (isSupabaseLive()) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        hasValidSession = true;
      }
    } catch {
      // Ignore
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
