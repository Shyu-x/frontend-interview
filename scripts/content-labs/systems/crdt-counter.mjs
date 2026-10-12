import assert from 'node:assert/strict';

// 状态型 G-Counter 的最小模型；不是序列 CRDT 或任何库的实现。
const merge = (a, b) => Object.fromEntries(
  [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    .map(replica => [replica, Math.max(a[replica] ?? 0, b[replica] ?? 0)]),
);
const value = state => Object.values(state).reduce((sum, n) => sum + n, 0);
const a = { alice: 3 }, b = { bob: 2 }, c = { carol: 4 };
assert.deepEqual(merge(a, b), merge(b, a));
assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
assert.deepEqual(merge(a, a), a);
assert.equal(value(merge(a, b)), 5);
assert.equal(value(merge(merge(a, b), a)), 5);
assert.equal(value(merge({ alice: 3 }, { alice: 5 })), 5);
assert.equal(value(merge(a, { bob: 2, alice: 1 })), 5);
console.log('G-Counter: convergence, duplicate delivery, stale state: PASS');
