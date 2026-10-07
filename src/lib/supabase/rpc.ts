import { isSupabaseConfigured } from '../env';
import { createClient as createSupabaseServerClient } from './server';

export type RpcOutcome<T> = { ok: true; data: T } | { ok: false; reason: string };

interface TryRpcOptions {
  allowNull?: boolean;
}

/**
 * Calls a page-level read RPC with the caller's session (auth.uid() applies).
 * Any failure — including "function does not exist" before the migration is
 * applied — is returned as `ok: false` so callers can fall back to the original
 * table reads and keep the page working.
 */
export async function tryRpc<T>(
  name: string,
  args?: Record<string, unknown>,
  options: TryRpcOptions = {}
): Promise<RpcOutcome<T>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'supabase not configured' };
  }

  try {
    const client = await createSupabaseServerClient();
    const { data, error } = args
      ? await client.rpc(name, args)
      : await client.rpc(name);

    if (error) return { ok: false, reason: error.message };
    if (data === null && !options.allowNull) return { ok: false, reason: 'no rows returned' };
    if (data === undefined) return { ok: false, reason: 'no payload returned' };

    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export function warnRpcFallback(name: string, reason: string): void {
  console.warn(`[rpc] ${name}: ${reason} — falling back to table reads`);
}
