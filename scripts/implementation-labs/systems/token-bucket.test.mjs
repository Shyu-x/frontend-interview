import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucket } from './token-bucket.mjs';

test('allows bounded bursts and denies once tokens are exhausted', () => {
  let now = 0; const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 1, now: () => now });
  assert.equal(bucket.take().allowed, true); assert.equal(bucket.take().allowed, true);
  assert.deepEqual(bucket.take(), { allowed: false, retryAfterMs: 1000 });
});
test('refills fractionally and computes retry delay', () => {
  let now = 0; const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 2, now: () => now });
  bucket.take(); now = 250;
  assert.deepEqual(bucket.take(), { allowed: false, retryAfterMs: 250 });
  now = 500; assert.equal(bucket.take().allowed, true);
});
test('rejects clock rollback and invalid costs', () => {
  let now = 4; const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 1, now: () => now });
  assert.throws(() => bucket.take(2), RangeError); now = 3; assert.throws(() => bucket.take(), /monotonic/);
});
