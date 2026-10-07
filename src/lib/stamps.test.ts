import assert from 'node:assert/strict';
import test from 'node:test';
import { rewardJustUnlocked, stampRequestDecision } from './stamps.ts';

const now = Date.parse('2026-10-07T08:00:00.000Z');

test('pending request blocks another request', () => {
  const result = stampRequestDecision({
    hasPending: true,
    lastRequestAt: null,
    lastVisitAt: null,
    totalVisits: 0,
    minIntervalHours: 2,
    now,
  });
  assert.equal(result.ok, false);
});

test('cooldown uses the latest visit or request', () => {
  const result = stampRequestDecision({
    hasPending: false,
    lastRequestAt: new Date(now - 30 * 60 * 1000).toISOString(),
    lastVisitAt: null,
    totalVisits: 1,
    minIntervalHours: 2,
    now,
  });
  assert.equal(result.ok, false);
});

test('request is allowed after the cooldown', () => {
  const result = stampRequestDecision({
    hasPending: false,
    lastRequestAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    lastVisitAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    totalVisits: 2,
    minIntervalHours: 2,
    now,
  });
  assert.equal(result.ok, true);
});

test('reward unlocks only when the threshold is crossed', () => {
  assert.equal(rewardJustUnlocked(4, 5, 5), true);
  assert.equal(rewardJustUnlocked(5, 6, 5), false);
  assert.equal(rewardJustUnlocked(2, 3, 5), false);
});
