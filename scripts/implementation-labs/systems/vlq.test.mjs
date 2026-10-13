import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeVlq, encodeVlq } from './vlq.mjs';

test('round trips positive, negative, zero, and continuation values', () => {
  for (const n of [0, 1, -1, 16, -16, 123456, 2 ** 31 - 1, -(2 ** 31)]) assert.deepEqual(decodeVlq(encodeVlq(n)), [n]);
});
test('ECMA-426 sign-only B represents the minimum signed 32-bit value', () => {
  assert.deepEqual(decodeVlq('B'), [-(2 ** 31)]);
  assert.equal(encodeVlq(-(2 ** 31)), 'B');
});
test('rejects values outside the current Source Map integer domain', () => {
  assert.throws(() => encodeVlq(2 ** 31), RangeError);
  assert.throws(() => encodeVlq(Number.MAX_SAFE_INTEGER), RangeError);
  assert.throws(() => decodeVlq('ggggggE'), RangeError);
});
test('decodes multiple concatenated values', () => {
  assert.deepEqual(decodeVlq(encodeVlq(4) + encodeVlq(-7) + encodeVlq(0)), [4, -7, 0]);
});
test('rejects invalid alphabet, truncated continuation, and unsafe input', () => {
  assert.throws(() => decodeVlq('!'), TypeError);
  assert.throws(() => decodeVlq('g'), /truncated/);
  assert.throws(() => encodeVlq(Number.MAX_SAFE_INTEGER + 1), TypeError);
});
