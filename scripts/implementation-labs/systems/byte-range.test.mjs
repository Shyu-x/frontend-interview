import test from 'node:test';
import assert from 'node:assert/strict';
import { parseByteRange } from './byte-range.mjs';

test('parses closed and open-ended ranges and clamps at EOF', () => {
  assert.deepEqual(parseByteRange('bytes=2-4', 10), { start: 2, end: 4 });
  assert.deepEqual(parseByteRange('bytes=8-', 10), { start: 8, end: 9 });
  assert.deepEqual(parseByteRange('bytes=8-99', 10), { start: 8, end: 9 });
});
test('suffix ranges select the last N bytes', () => {
  assert.deepEqual(parseByteRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(parseByteRange('bytes=-30', 10), { start: 0, end: 9 });
});
test('unsatisfiable ranges return null', () => {
  assert.equal(parseByteRange('bytes=10-', 10), null);
  assert.equal(parseByteRange('bytes=-1', 0), null);
  assert.equal(parseByteRange('bytes=5-2', 10), null);
});
test('rejects multiple ranges and malformed syntax', () => {
  assert.throws(() => parseByteRange('bytes=1-2,4-5', 10), TypeError);
  assert.throws(() => parseByteRange('items=1-2', 10), TypeError);
});
