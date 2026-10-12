import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueWindowSummary } from './unique-window.mjs';

// 独立穷举所有起点和终点，作为滑动窗口的朴素 oracle。
function bruteForce(items) {
  let maxLength = 0, start = 0, total = 0n;
  for (let left = 0; left < items.length; left++) {
    const seen = new Set();
    for (let right = left; right < items.length; right++) {
      if (seen.has(items[right])) break;
      seen.add(items[right]); total++;
      if (right - left + 1 > maxLength) { maxLength = right - left + 1; start = left; }
    }
  }
  return { maxLength, start, end: start + maxLength, total };
}
test('empty, duplicates, backtracking trap and earliest tie', () => {
  for (const input of [[], [1], [1, 1, 1], [1, 2, 3], [1, 2, 2, 1], [1, 2, 3, 1, 2], [NaN, 0, NaN]]) {
    assert.deepEqual(uniqueWindowSummary(input), bruteForce(input));
  }
});
test('exhaustive differential test across 1093 arrays of length 0 through 6', () => {
  let checked = 0;
  for (let length = 0; length <= 6; length++) {
    for (let encoded = 0; encoded < 3 ** length; encoded++) {
      let remainder = encoded;
      const items = Array.from({ length }, () => { const value = remainder % 3; remainder = Math.floor(remainder / 3); return value; });
      assert.deepEqual(uniqueWindowSummary(items), bruteForce(items)); checked++;
    }
  }
  assert.equal(checked, 1093);
});
test('identity uses SameValueZero, not string conversion or deep equality', () => {
  const object = {};
  for (const input of [ [object, {}, object], [1, '1', 1], [0, -0, NaN], [undefined, undefined] ]) {
    assert.deepEqual(uniqueWindowSummary(input), bruteForce(input));
  }
  assert.throws(() => uniqueWindowSummary('abc'), /array/);
});
