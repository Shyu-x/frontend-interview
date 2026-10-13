import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRetry } from './retry-budget.mjs';

test('uses capped exponential jitter and stays within deadline', () => {
  assert.deepEqual(nextRetry({ attempt: 3, startedAt: 0, now: 20, deadlineAt: 1000, random: () => 0.5 }), { retry: true, delayMs: 200 });
  assert.deepEqual(nextRetry({ attempt: 9, startedAt: 0, now: 20, deadlineAt: 1000, baseDelayMs: 20, maxDelayMs: 50, random: () => 1 }), { retry: true, delayMs: 50 });
});
test('refuses a retry that would cross the request deadline', () => {
  assert.deepEqual(nextRetry({ attempt: 1, startedAt: 0, now: 90, deadlineAt: 100, baseDelayMs: 20, random: () => 1 }), { retry: false, delayMs: null });
});
test('rejects invalid attempt and negative jitter source', () => {
  assert.throws(() => nextRetry({ attempt: 0, startedAt: 0, now: 0, deadlineAt: 2 }), RangeError);
  assert.throws(() => nextRetry({ attempt: Number.MAX_SAFE_INTEGER + 1, startedAt: 0, now: 0, deadlineAt: 2 }), RangeError);
  assert.throws(() => nextRetry({ attempt: 1, startedAt: 0, now: 0, deadlineAt: 2, random: () => -1 }), RangeError);
});
test('rejects random sources outside their documented interval', () => {
  assert.throws(() => nextRetry({ attempt: 1, startedAt: 0, now: 0, deadlineAt: 2, random: () => 1.1 }), /random/);
});
