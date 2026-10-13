import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Worker } from 'node:worker_threads';
import { createSlot, publish, consume } from './atomic-slot.mjs';

test('empty slot reports no value', () => assert.equal(consume(createSlot()), null));
test('published payload becomes consumable', () => { const s = createSlot(); assert.equal(publish(s, 42), true); assert.equal(consume(s), 42); });
test('producer cannot overwrite an unread value', () => { const s = createSlot(); publish(s, 7); assert.equal(publish(s, 8), false); assert.equal(consume(s), 7); });
test('released slot accepts the next publication', () => { const s = createSlot(); publish(s, 1); consume(s); assert.equal(publish(s, 2), true); assert.equal(consume(s), 2); });
test('real worker consumes 100 published values in order', async (t) => {
  const slot = createSlot();
  const source = `const { parentPort, workerData } = require('node:worker_threads');
    const sequence = new Int32Array(workerData.sequence); const value = new Int32Array(workerData.value);
    parentPort.postMessage('ready');
    for (let expected = 0; expected < 100; expected += 1) {
      let current = Atomics.load(sequence, 0);
      while (current % 2 === 0) { Atomics.wait(sequence, 0, current); current = Atomics.load(sequence, 0); }
      const received = Atomics.load(value, 0);
      if (received !== expected) throw new Error('out of order publication');
      Atomics.store(sequence, 0, current + 1); Atomics.notify(sequence, 0);
    }
    parentPort.postMessage('done');`;
  const worker = new Worker(source, { eval: true, workerData: { sequence: slot.sequence.buffer, value: slot.value.buffer } });
  t.after(() => worker.terminate());
  assert.equal((await once(worker, 'message'))[0], 'ready');
  for (let expected = 0; expected < 100; expected += 1) {
    assert.equal(publish(slot, expected), true);
    const status = Atomics.wait(slot.sequence, 0, expected * 2 + 1, 1000);
    assert.notEqual(status, 'timed-out', `consumer timed out at item ${expected}`);
  }
  assert.equal((await once(worker, 'message'))[0], 'done');
  await once(worker, 'exit');
});
