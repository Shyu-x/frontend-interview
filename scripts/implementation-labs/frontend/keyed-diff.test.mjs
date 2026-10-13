import test from 'node:test'; import assert from 'node:assert/strict'; import { diffKeys } from './keyed-diff.mjs';
test('unchanged order needs no operations', () => assert.deepEqual(diffKeys(['a','b'], ['a','b']).move, []));
test('insertion and deletion are explicit', () => { const d = diffKeys(['a','b'], ['b','c']); assert.deepEqual(d.remove, ['a']); assert.deepEqual(d.insert, ['c']); });
test('one permutation move can preserve a longest subsequence', () => { const d = diffKeys(['a','b','c'], ['b','c','a']); assert.equal(d.move.length, 1); assert.equal(d.stable.length, 2); });
test('duplicate keys fail before a plan is returned', () => assert.throws(() => diffKeys(['a','a'], ['a']), /unique/));
