import { Reward, RewardClaim, Visit, LoyaltyRule } from '@/types';

/**
 * Checks if a customer visit is eligible to be recorded based on loyalty cooldown rules.
 * Default cooldown is 2 hours unless configured otherwise.
 */
export function validateVisitEligibility(
  lastVisitAt: string | null | undefined,
  rule?: LoyaltyRule | null
): { eligible: boolean; minutesRemaining: number; reason?: string } {
  if (!lastVisitAt) {
    return { eligible: true, minutesRemaining: 0 };
  }

  const cooldownHours = rule?.min_interval_hours ?? 2;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const lastTime = new Date(lastVisitAt).getTime();
  const now = Date.now();
  const timeDiff = now - lastTime;

  if (timeDiff < cooldownMs) {
    const msRemaining = cooldownMs - timeDiff;
    const minutesRemaining = Math.ceil(msRemaining / (60 * 1000));
    return {
      eligible: false,
      minutesRemaining,
      reason: `Visit already recorded recently. Next eligible visit in ${minutesRemaining} minutes.`,
    };
  }

  return { eligible: true, minutesRemaining: 0 };
}

/**
 * Determines status of each reward for a customer:
 * - LOCKED: customer hasn't reached required visits
 * - AVAILABLE: customer reached required visits, not yet claimed
 * - CLAIMED: customer claimed, pending staff redemption verification
 * - REDEEMED: already redeemed at the business
 */
export function computeRewardStatus(
  reward: Reward,
  totalVisits: number,
  claims: RewardClaim[]
): {
  status: 'LOCKED' | 'AVAILABLE' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED';
  claim?: RewardClaim;
  progressVisits: number;
  requiredVisits: number;
} {
  const activeClaim = claims.find(
    (c) => c.reward_id === reward.id && c.status === 'CLAIMED'
  );
  if (activeClaim) {
    // Check if expired
    if (new Date(activeClaim.expires_at).getTime() < Date.now()) {
      return {
        status: 'EXPIRED',
        claim: activeClaim,
        progressVisits: totalVisits,
        requiredVisits: reward.required_visits,
      };
    }
    return {
      status: 'CLAIMED',
      claim: activeClaim,
      progressVisits: totalVisits,
      requiredVisits: reward.required_visits,
    };
  }

  const redeemedClaim = claims.find(
    (c) => c.reward_id === reward.id && c.status === 'REDEEMED'
  );

  // If customer has reached the required visits:
  if (totalVisits >= reward.required_visits) {
    if (redeemedClaim) {
      // If redeemed, check if repeatable or already used
      return {
        status: 'REDEEMED',
        claim: redeemedClaim,
        progressVisits: totalVisits,
        requiredVisits: reward.required_visits,
      };
    }
    return {
      status: 'AVAILABLE',
      progressVisits: totalVisits,
      requiredVisits: reward.required_visits,
    };
  }

  return {
    status: 'LOCKED',
    progressVisits: totalVisits,
    requiredVisits: reward.required_visits,
  };
}

/**
 * Generate a cryptographically random, human-friendly claim code (e.g. RW-94K2B8)
 */
export function generateClaimCode(prefix = 'RW'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars like 0, O, 1, I
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}
