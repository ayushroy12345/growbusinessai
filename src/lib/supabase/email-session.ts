import { createAdminClient } from './admin';
import { createClient } from './server';

interface EmailIdentity {
  id: string;
  email: string;
  full_name?: string | null;
}

/**
 * Establish a real Supabase Auth session for an email identity created through
 * the passwordless email sign-in form.
 *
 * Row Level Security keys every policy off auth.uid(), so without a session the
 * server-side client can read nothing for that user. The magic link is generated
 * with the service role key and verified immediately — no email is sent.
 */
export async function establishEmailSession(identity: EmailIdentity): Promise<boolean> {
  const email = identity.email.trim().toLowerCase();
  if (!email) return false;

  try {
    const admin = createAdminClient();

    let link = await admin.auth.admin.generateLink({ type: 'magiclink', email });

    if (link.error || !link.data?.properties?.hashed_token) {
      const created = await admin.auth.admin.createUser({
        id: identity.id,
        email,
        email_confirm: true,
        user_metadata: { full_name: identity.full_name ?? null },
      });
      if (created.error) {
        console.error('Could not create the Supabase auth user:', created.error.message);
        return false;
      }
      link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      if (link.error || !link.data?.properties?.hashed_token) {
        console.error('Could not create a sign-in link:', link.error?.message);
        return false;
      }
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: link.data.properties.hashed_token,
      type: 'magiclink',
    });

    if (error) {
      console.error('Could not start the Supabase session:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email session error:', err instanceof Error ? err.message : err);
    return false;
  }
}
