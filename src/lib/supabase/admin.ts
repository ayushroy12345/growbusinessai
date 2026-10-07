import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { withCallLog } from './call-log';

// Server-only administrative client with service-role key
// Never import this file into client components
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder') || serviceRoleKey.includes('placeholder')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required on the server and must not be exposed to the browser.');
  }

  return withCallLog(
    createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    'admin'
  );
}
