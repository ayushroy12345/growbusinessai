function isRealSecret(value: string | undefined): boolean {
  return Boolean(value && !value.includes('placeholder') && !value.includes('your-'));
}

export function isSupabaseConfigured(): boolean {
  return (
    isRealSecret(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isRealSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    isRealSecret(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || 'admin@loyalty.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string): boolean {
  return getSuperAdminEmails().includes(email.trim().toLowerCase());
}

export function getAppOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://growbusinessai-jade.vercel.app').replace(/\/$/, '');
}

/**
 * The local JSON database (data/db.json) is a development-only backend. Serverless
 * runtimes mount a read-only filesystem, so attempting to fall back to it in
 * production fails with EROFS. Abort with an actionable message instead.
 */
export function assertLocalStorageAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Local JSON storage is unavailable in production. Configure NEXT_PUBLIC_SUPABASE_URL, ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY on this deployment to use the database.'
    );
  }
}
