import { LoginPageClient } from './LoginPageClient';

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo || '';
  const errorMessage = params.error || '';

  return <LoginPageClient redirectTo={redirectTo} errorMessage={errorMessage} />;
}
