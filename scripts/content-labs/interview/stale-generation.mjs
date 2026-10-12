import assert from 'node:assert/strict';

/**
 * Run overlapping reads safely: only the most recently launched generation may
 * publish a value or error. Abort is a request to stop work, not rollback.
 */
export function createLatestGeneration({ commit, reportError = () => {} }) {
  let generation = 0;
  let current = null;
  let disposed = false;

  async function launch(work) {
    if (disposed) return { status: 'disposed' };

    const id = ++generation;
    current?.controller.abort('superseded');
    const controller = new AbortController();
    current = { id, controller };

    try {
      const value = await work({ signal: controller.signal, generation: id });
      if (disposed || id !== generation) return { status: 'stale' };
      commit(value);
      return { status: 'committed', value };
    } catch (error) {
      if (disposed || id !== generation) return { status: 'stale' };
      reportError(error);
      return { status: 'error', error };
    } finally {
      // An old finally block must never clear a newer request's active marker.
      if (current?.id === id) current = null;
    }
  }

  function cancel(reason = 'cancelled') {
    generation += 1;
    current?.controller.abort(reason);
    current = null;
  }

  function dispose() {
    if (disposed) return;
    cancel('disposed');
    disposed = true;
  }

  return {
    launch,
    cancel,
    dispose,
    get snapshot() {
      return { generation, active: current !== null, disposed };
    },
  };
}

/** Start promise-returning tasks as soon as a slot is available. */
export async function runWithConcurrency(tasks, limit) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createChecks() {
  let count = 0;
  return {
    equal(actual, expected, message) {
      assert.equal(actual, expected, message);
      count += 1;
    },
    deepEqual(actual, expected, message) {
      assert.deepEqual(actual, expected, message);
      count += 1;
    },
    ok(value, message) {
      assert.ok(value, message);
      count += 1;
    },
    async rejects(promise, errorType, message) {
      await assert.rejects(promise, errorType, message);
      count += 1;
    },
    get count() { return count; },
  };
}

async function testLatestResolveWins(check) {
  const first = deferred();
  const second = deferred();
  const visible = [];
  const runner = createLatestGeneration({ commit: value => visible.push(value) });
  let oldSignal;
  const oldRun = runner.launch(({ signal }) => {
    oldSignal = signal;
    return first.promise;
  });
  await Promise.resolve();
  const newRun = runner.launch(() => second.promise);
  await Promise.resolve();

  check.equal(oldSignal.aborted, true, 'superseding run notifies old task');
  check.equal(runner.snapshot.active, true, 'the latest pending run is active');
  second.resolve('new');
  check.deepEqual(await newRun, { status: 'committed', value: 'new' }, 'new run commits');
  first.resolve('old');
  check.deepEqual(await oldRun, { status: 'stale' }, 'late old run is suppressed');
  check.deepEqual(visible, ['new'], 'old result never reaches visible state');
  check.equal(runner.snapshot.active, false, 'current run cleanup clears active state');
}

async function testOldSettlementDoesNotClearPendingNewRun(check, settleOld) {
  const old = deferred();
  const fresh = deferred();
  const visible = [];
  const errors = [];
  const runner = createLatestGeneration({
    commit: value => visible.push(value),
    reportError: error => errors.push(error.message),
  });
  const oldRun = runner.launch(() => old.promise);
  await Promise.resolve();
  const freshRun = runner.launch(() => fresh.promise);
  await Promise.resolve();

  settleOld(old);
  check.equal((await oldRun).status, 'stale', 'older run settles as stale before current run');
  check.equal(runner.snapshot.active, true, 'older finally does not clear the pending current run');
  check.deepEqual(errors, [], 'older rejection is suppressed while current run is pending');

  fresh.resolve('current');
  check.deepEqual(await freshRun, { status: 'committed', value: 'current' }, 'current run commits after stale settlement');
  check.deepEqual(visible, ['current'], 'only current value is published');
  check.equal(runner.snapshot.active, false, 'current finally clears its own active marker');
}

async function testOldRejectAfterNewCommit(check) {
  const old = deferred();
  const fresh = deferred();
  const visible = [];
  const errors = [];
  const runner = createLatestGeneration({
    commit: value => visible.push(value),
    reportError: error => errors.push(error.message),
  });
  const oldRun = runner.launch(() => old.promise);
  await Promise.resolve();
  const newRun = runner.launch(() => fresh.promise);
  await Promise.resolve();
  fresh.resolve('fresh');
  await newRun;
  old.reject(new Error('old network error'));

  check.deepEqual(await oldRun, { status: 'stale' }, 'late old rejection is classified stale');
  check.deepEqual(visible, ['fresh'], 'late old rejection cannot replace current data');
  check.deepEqual(errors, [], 'late old rejection is not shown as the current error');
  check.equal(runner.snapshot.active, false, 'stale finally leaves no active request');
}

async function testCurrentRejectAndCancelSideEffect(check) {
  const pending = deferred();
  const visible = [];
  const errors = [];
  let irreversibleWrites = 0;
  const runner = createLatestGeneration({
    commit: value => visible.push(value),
    reportError: error => errors.push(error.message),
  });
  const cancelledRun = runner.launch(async ({ signal }) => {
    irreversibleWrites += 1;
    check.equal(signal.aborted, false, 'signal begins live');
    return pending.promise;
  });
  await Promise.resolve();
  runner.cancel('user changed filter');
  check.equal(irreversibleWrites, 1, 'already-run external side effect remains');
  pending.resolve('cancelled result');
  check.deepEqual(await cancelledRun, { status: 'stale' }, 'cancel prevents a late commit');
  check.deepEqual(visible, [], 'cancel leaves UI state untouched');
  check.equal(runner.snapshot.active, false, 'cancel clears active marker');

  const currentFailure = runner.launch(() => Promise.reject(new Error('current failed')));
  check.equal((await currentFailure).status, 'error', 'current rejection is reported');
  check.deepEqual(errors, ['current failed'], 'only current failure reaches error state');
  check.equal(runner.snapshot.active, false, 'failure cleanup clears active marker');
}

async function testDispose(check) {
  const pending = deferred();
  const visible = [];
  const runner = createLatestGeneration({ commit: value => visible.push(value) });
  const run = runner.launch(() => pending.promise);
  await Promise.resolve();
  runner.dispose();
  check.equal(runner.snapshot.disposed, true, 'dispose is recorded');
  check.equal(runner.snapshot.active, false, 'dispose clears active work');
  check.deepEqual(await runner.launch(async () => 'never'), { status: 'disposed' }, 'disposed runner rejects new work');
  pending.resolve('late');
  check.deepEqual(await run, { status: 'stale' }, 'disposed runner suppresses pending result');
  check.deepEqual(visible, [], 'dispose prevents state writes');
  runner.dispose();
  check.equal(runner.snapshot.disposed, true, 'dispose is idempotent');
}

async function testConcurrencyLimit(check) {
  let active = 0;
  let peak = 0;
  const gates = Array.from({ length: 5 }, () => deferred());
  const starts = [];
  const tasks = gates.map((gate, index) => async () => {
    active += 1;
    peak = Math.max(peak, active);
    starts.push(index);
    const value = await gate.promise;
    active -= 1;
    return `${index}:${value}`;
  });
  const all = runWithConcurrency(tasks, 2);
  await Promise.resolve();
  check.deepEqual(starts, [0, 1], 'only two tasks start in first wave');
  check.equal(peak, 2, 'observed concurrency reaches but does not exceed limit');
  gates[1].resolve('b');
  await Promise.resolve();
  await Promise.resolve();
  check.equal(starts.includes(2), true, 'a free slot starts the next task');
  gates.forEach((gate, index) => gate.resolve(String(index)));
  check.deepEqual(await all, ['0:0', '1:b', '2:2', '3:3', '4:4'], 'results preserve input order');
  check.equal(peak, 2, 'peak active task count remains bounded');
  check.equal(active, 0, 'all worker slots are released');
}

async function testConcurrencyInputAndFailureContract(check) {
  check.deepEqual(await runWithConcurrency([], 2), [], 'empty task list resolves to an empty result');
  await check.rejects(runWithConcurrency([], 0), RangeError, 'zero concurrency limit is rejected');
  await check.rejects(runWithConcurrency([], 1.5), RangeError, 'fractional concurrency limit is rejected');

  const sibling = deferred();
  const siblingStarted = deferred();
  const started = [];
  const pool = runWithConcurrency([
    async () => {
      started.push('rejecting');
      throw new Error('worker failed');
    },
    async () => {
      started.push('sibling');
      siblingStarted.resolve();
      await sibling.promise;
      return 'sibling done';
    },
    async () => {
      started.push('queued');
      return 'queued done';
    },
  ], 2);
  const outcome = pool.then(
    () => ({ status: 'resolved' }),
    error => ({ status: 'rejected', message: error.message }),
  );
  await siblingStarted.promise;
  check.deepEqual(await outcome, { status: 'rejected', message: 'worker failed' }, 'task rejection rejects pool promise');
  check.deepEqual(started, ['rejecting', 'sibling'], 'failure does not synchronously cancel the running sibling');
  sibling.resolve();
  await Promise.resolve();
  await Promise.resolve();
  check.deepEqual(started, ['rejecting', 'sibling', 'queued'], 'remaining worker may continue claiming queued tasks after rejection');
}

async function main() {
  const check = createChecks();
  await testLatestResolveWins(check);
  await testOldSettlementDoesNotClearPendingNewRun(check, old => old.resolve('old'));
  await testOldSettlementDoesNotClearPendingNewRun(check, old => old.reject(new Error('old failed')));
  await testOldRejectAfterNewCommit(check);
  await testCurrentRejectAndCancelSideEffect(check);
  await testDispose(check);
  await testConcurrencyLimit(check);
  await testConcurrencyInputAndFailureContract(check);
  console.log(`stale-generation: ${check.count} assertions passed`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
