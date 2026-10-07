import assert from 'node:assert/strict';
import test from 'node:test';
import { pickWeightedPrize, scratchAttemptsRemaining } from './scratch.ts';

const prizes = [
  { id: 'a', probability: 65, is_active: true, max_redemptions: null, awarded_count: 0 },
  { id: 'b', probability: 20, is_active: true, max_redemptions: null, awarded_count: 0 },
  { id: 'c', probability: 10, is_active: true, max_redemptions: 1, awarded_count: 1 },
  { id: 'd', probability: 5, is_active: false, max_redemptions: null, awarded_count: 0 },
];

test('weighted draw stays inside the active pool', () => {
  assert.equal(pickWeightedPrize(prizes, 0)?.id, 'a');
  assert.equal(pickWeightedPrize(prizes, 0.8)?.id, 'b');
  assert.equal(pickWeightedPrize(prizes, 0.99)?.id, 'b');
});

test('sold-out and inactive prizes are excluded', () => {
  const onlySoldOut = [
    { id: 'c', probability: 10, is_active: true, max_redemptions: 1, awarded_count: 1 },
  ];
  assert.equal(pickWeightedPrize(onlySoldOut, 0.2), null);
});

test('attempt counter cannot go negative', () => {
  assert.equal(scratchAttemptsRemaining(1, 0), 1);
  assert.equal(scratchAttemptsRemaining(1, 1), 0);
  assert.equal(scratchAttemptsRemaining(1, 4), 0);
});
