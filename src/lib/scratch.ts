export interface WeightedPrize {
  id: string;
  probability: number;
  is_active: boolean;
  max_redemptions: number | null;
  awarded_count: number;
}

/** Server-side weighted draw. `roll` is in [0, 1). */
export function pickWeightedPrize<T extends WeightedPrize>(prizes: T[], roll: number): T | null {
  const pool = prizes.filter(
    (prize) =>
      prize.is_active &&
      prize.probability > 0 &&
      (prize.max_redemptions == null || prize.awarded_count < prize.max_redemptions)
  );
  const total = pool.reduce((sum, prize) => sum + prize.probability, 0);
  if (!pool.length || total <= 0) return null;

  const bounded = Math.min(Math.max(roll, 0), 0.999999);
  let cursor = bounded * total;
  for (const prize of pool) {
    cursor -= prize.probability;
    if (cursor <= 0) return prize;
  }
  return pool[pool.length - 1];
}

export function scratchAttemptsRemaining(attemptsAllowed: number, playsSoFar: number): number {
  return Math.max(0, attemptsAllowed - playsSoFar);
}
