export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes('placeholder') &&
      !key.includes('placeholder')
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
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
