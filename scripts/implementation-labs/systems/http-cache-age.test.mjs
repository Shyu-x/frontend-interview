import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAgeMs, freshness } from './http-cache-age.mjs';

test('current age uses apparent age and adds resident time', () => {
  assert.equal(currentAgeMs({ dateMs: 900, ageSeconds: 0, requestMs: 990, responseMs: 1000, nowMs: 1500 }), 600);
});
test('corrected age incorporates Age plus response delay', () => {
  assert.equal(currentAgeMs({ dateMs: 990, ageSeconds: 4, requestMs: 100, responseMs: 200, nowMs: 200 }), 4100);
});
test('shared cache chooses s-maxage and freshness is strict at expiry', () => {
  assert.deepEqual(freshness({ ageMs: 5000, maxAgeSeconds: 80, sMaxageSeconds: 5, shared: true }), { fresh: false, remainingMs: 0 });
  assert.equal(freshness({ ageMs: 4999, maxAgeSeconds: 80, sMaxageSeconds: 5, shared: true }).fresh, true);
});
test('rejects negative or non-finite timing values', () => {
  assert.throws(() => currentAgeMs({ dateMs: 0, ageSeconds: -1, requestMs: 0, responseMs: 0, nowMs: 0 }), RangeError);
});
