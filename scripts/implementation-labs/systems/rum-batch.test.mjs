import test from 'node:test';
import assert from 'node:assert/strict';
import { RumBatch } from './rum-batch.mjs';

test('batches and clears only after transport accepts the payload', async () => {
  let calls = 0; const batch = new RumBatch({ maxItems: 2, send: async () => ++calls > 1 });
  batch.add({ name: 'LCP', value: 2400 }); batch.add({ name: 'CLS', value: 0.1 });
  assert.equal(await batch.flush(), false); assert.equal(batch.size, 2);
  assert.equal(await batch.flush(), true); assert.equal(batch.size, 0);
});
test('bounds item count and encoded bytes', () => {
  const batch = new RumBatch({ maxItems: 1, maxBytes: 30, send: async () => true });
  assert.equal(batch.add({ x: 1 }), true); assert.equal(batch.add({ y: 2 }), false); assert.equal(batch.add({ text: 'a'.repeat(50) }), false);
});
test('an empty flush does not call transport', async () => {
  let called = false; const batch = new RumBatch({ send: async () => { called = true; return true; } });
  assert.equal(await batch.flush(), true); assert.equal(called, false);
});
test('keeps metrics added during an awaited send and coalesces concurrent flushes', async () => {
  let finish, calls = 0;
  const batch = new RumBatch({ send: () => { calls++; return new Promise((resolve) => { finish = resolve; }); } });
  batch.add({ name: 'LCP', value: 2 });
  const first = batch.flush(), second = batch.flush();
  await Promise.resolve(); batch.add({ name: 'CLS', value: 0.1 });
  assert.equal(calls, 1); finish(true);
  assert.equal(await first, true); assert.equal(await second, true); assert.equal(batch.size, 1);
});
test('snapshots metrics so later caller mutation cannot invalidate byte limits', () => {
  const batch = new RumBatch({ maxBytes: 32, send: async () => true });
  const metric = { name: 'LCP', value: 2 }; assert.equal(batch.add(metric), true);
  metric.value = 'x'.repeat(1000);
  assert.equal(batch.size, 1);
});
test('clears a synchronously throwing transport and permits a later retry', async () => {
  let calls = 0;
  const batch = new RumBatch({ send: async () => { if (++calls === 1) throw new Error('offline'); return true; } });
  batch.add({ name: 'INP', value: 100 });
  assert.equal(await batch.flush(), false); assert.equal(batch.size, 1);
  assert.equal(await batch.flush(), true); assert.equal(batch.size, 0); assert.equal(calls, 2);
});
