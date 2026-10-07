export function stampRequestDecision(input: {
  hasPending: boolean;
  lastRequestAt: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  minIntervalHours: number;
  now?: number;
}): { ok: true } | { ok: false; message: string } {
  if (input.hasPending) {
    return { ok: false, message: 'You already have a stamp request waiting for approval.' };
  }

  const now = input.now ?? Date.now();
  const windowMs = input.minIntervalHours * 60 * 60 * 1000;
  const lastVisit = input.totalVisits > 0 && input.lastVisitAt ? new Date(input.lastVisitAt).getTime() : null;
  const lastRequest = input.lastRequestAt ? new Date(input.lastRequestAt).getTime() : null;
  const latest = Math.max(lastVisit ?? 0, lastRequest ?? 0);

  if (latest && now - latest < windowMs) {
    const minutes = Math.ceil((windowMs - (now - latest)) / 60000);
    return { ok: false, message: `Please wait ${minutes} minutes before requesting another stamp.` };
  }

  return { ok: true };
}

export function rewardJustUnlocked(previousVisits: number, nextVisits: number, requiredVisits: number): boolean {
  return previousVisits < requiredVisits && nextVisits >= requiredVisits;
}
