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
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
