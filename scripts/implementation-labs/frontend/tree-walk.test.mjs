import test from 'node:test'; import assert from 'node:assert/strict'; import { walk } from './tree-walk.mjs';
const tree = { id: 'a', children: [{ id: 'b', children: [{ id: 'd' }] }, { id: 'c' }] };
test('visits depth first, left to right', () => assert.deepEqual([...walk(tree)].map(n => n.id), ['a','b','d','c']));
test('consumer can stop by closing generator', () => { const it = walk(tree); assert.equal(it.next().value.id, 'a'); it.return(); assert.equal(it.next().done, true); });
test('abort is checked before the next visit', () => { const controller = new AbortController(); const it = walk(tree, { signal: controller.signal }); assert.equal(it.next().value.id, 'a'); controller.abort(); assert.equal(it.next().done, true); });
test('cycles are visited once', () => { const cycle = { id: 'x', children: [] }; cycle.children.push(cycle); assert.deepEqual([...walk(cycle)].map(n => n.id), ['x']); });
