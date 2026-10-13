import test from 'node:test';
import assert from 'node:assert/strict';
import { runQueues } from './queues.mjs';

test('synchronous body finishes before queued work', () => {
  assert.deepEqual(runQueues(({ log, task, microtask }) => { log('sync'); task(({ log }) => log('task')); microtask(({ log }) => log('micro')); }), ['sync', 'micro', 'task']);
});
test('new microtasks drain before the next task', () => {
  const out = runQueues(({ task, microtask, log }) => { task(({ log, microtask }) => { log('t1'); microtask(({ log }) => log('m2')); }); microtask(({ log, microtask }) => { log('m1'); microtask(({ log }) => log('m1-child')); }); task(({ log }) => log('t2')); });
  assert.deepEqual(out, ['m1', 'm1-child', 't1', 'm2', 't2']);
});
test('tasks are FIFO', () => assert.deepEqual(runQueues(({ task }) => { task(({ log }) => log(1)); task(({ log }) => log(2)); }), [1, 2]));
test('microtasks added by a task drain before later tasks', () => assert.deepEqual(runQueues(({ task }) => task(({ microtask }) => microtask(({ log }) => log('micro')))), ['micro']));
