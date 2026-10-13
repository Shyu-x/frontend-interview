import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeVlq, encodeVlq } from './vlq.mjs';

test('round trips positive, negative, zero, and continuation values', () => {
  for (const n of [0, 1, -1, 16, -16, 123456, 2 ** 31, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]) assert.deepEqual(decodeVlq(encodeVlq(n)), [n]);
});
test('decodes multiple concatenated values', () => {
  assert.deepEqual(decodeVlq(encodeVlq(4) + encodeVlq(-7) + encodeVlq(0)), [4, -7, 0]);
});
test('rejects invalid alphabet, truncated continuation, and unsafe input', () => {
  assert.throws(() => decodeVlq('!'), TypeError);
  assert.throws(() => decodeVlq('g'), /truncated/);
  assert.throws(() => encodeVlq(Number.MAX_SAFE_INTEGER + 1), TypeError);
});
