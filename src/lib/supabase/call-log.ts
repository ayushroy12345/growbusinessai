const TRACKED_METHODS = new Set(['from', 'rpc', 'auth']);

/**
 * Opt-in query instrumentation (`SUPABASE_CALL_LOG=1`).
 * Counts the network round trips a page issues against Supabase so we can
 * compare read consolidation work before/after.
 */
export function withCallLog<T>(client: T, tag: string): T {
  if (!process.env.SUPABASE_CALL_LOG) {
    return client;
  }

  return new Proxy(client as object, {
    get(target, prop) {
      const value = (target as Record<string | symbol, unknown>)[prop];
      if (typeof prop === 'string' && TRACKED_METHODS.has(prop)) {
        console.log(`[supabase-call] ${tag} ${prop}`);
      }
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  }) as T;
}
