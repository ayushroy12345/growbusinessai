import { LoginPageClient } from './LoginPageClient';

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    intent?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo || '';
  const intent = params.intent === 'customer' ? 'customer' : 'business';
  const errorMessage =
    params.error === 'supabase_not_configured'
      ? 'Google sign-in needs the Supabase project configured.'
      : params.error === 'oauth_start_failed' || params.error === 'oauth_exchange_failed'
        ? 'Google sign-in did not complete. Continue with your email.'
        : params.error || '';

  return <LoginPageClient redirectTo={redirectTo} errorMessage={errorMessage} intent={intent} />;
}
