import test from 'node:test'; import assert from 'node:assert/strict'; import { createList } from './linked-list.mjs';
test('append preserves insertion order', () => { const l = createList(); l.push(1); l.push(2); assert.deepEqual(l.values(), [1,2]); });
test('prepend updates head', () => { const l = createList(); l.push(2); l.unshift(1); assert.deepEqual(l.values(), [1,2]); });
test('removing head or tail keeps links consistent', () => { const l = createList(); const a = l.push('a'); const b = l.push('b'); l.remove(a); l.remove(b); assert.deepEqual(l.values(), []); assert.equal(l.size, 0); });
test('removed node cannot decrement size twice', () => { const l = createList(); const n = l.push('x'); assert.equal(l.remove(n), true); assert.equal(l.remove(n), false); assert.equal(l.size, 0); });
