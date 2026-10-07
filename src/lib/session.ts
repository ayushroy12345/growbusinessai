import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient as createSupabaseServerClient } from './supabase/server';
import { getUserById, getUserByEmail, upsertUser } from './db';
import { isSupabaseConfigured } from './env';
import { User, UserRole } from '@/types';

const DEMO_USER_COOKIE = 'loyalty_session_user';
const ACTIVE_BUSINESS_COOKIE = 'loyalty_active_business_id';

function isSupabaseLive(): boolean {
  return isSupabaseConfigured();
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  // 1. Fast path: local session cookie written at email login. Reading it avoids
  // two ~250-400ms Supabase Auth round trips on every page render.
  const sessionUserCookie = cookieStore.get(DEMO_USER_COOKIE)?.value;
  if (sessionUserCookie) {
    try {
      const parsed = JSON.parse(sessionUserCookie);
      if (parsed?.id) {
        const found = await getUserById(parsed.id);
        if (found) return found;
      }
    } catch {
      // Ignore JSON parse error and fall through to Supabase Auth
    }
  }

  // 2. Supabase Auth session (Google OAuth users have no local cookie)
  if (isSupabaseLive()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        let dbUser = await getUserById(user.id);
        if (!dbUser) {
          dbUser = await upsertUser({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            role: 'CUSTOMER',
          });
        }
        return dbUser;
      }
    } catch {
      // Supabase network unreachable, fallback to session cookie
    }
  }

  return null;
});

export async function setSessionUser(user: User): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_USER_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_USER_COOKIE);
  if (isSupabaseLive()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }
}

export async function getActiveBusinessId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value || null;
}

export async function setActiveBusinessId(businessId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function requireAuth(redirectTo?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const target = redirectTo ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/login';
    redirect(target);
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[], redirectTo?: string): Promise<User> {
  const user = await requireAuth(redirectTo);
  if (!allowedRoles.includes(user.role)) {
    redirect(user.role === 'CUSTOMER' ? '/customer/dashboard' : '/dashboard');
  }
  return user;
}
