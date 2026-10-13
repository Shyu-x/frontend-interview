// W001 — Both public variations share one queue runner. The greeting is a job
// too, so a priority wait can be placed ahead of it before the first microtask.
function createManRunner(greeting, { log = console.log, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), autoStart = true } = {}) {
  const jobs = [() => log(greeting)];
  let runPromise;

  function done() {
    // Cache the first run before yielding; repeated done() calls observe one run.
    if (runPromise) return runPromise;
    runPromise = Promise.resolve().then(async () => {
      // Await each task in order. A rejection exits here and leaves later jobs unrun.
      for (const job of jobs) await job();
    });
    // Auto-start has no caller awaiting it. Mark rejection handled internally,
    // while returning the original promise so an explicit done() can observe it.
    runPromise.catch(() => {});
    return runPromise;
  }

  if (autoStart) queueMicrotask(done);
  return {
    enqueue(job) { jobs.push(job); },
    prioritize(job) { jobs.unshift(job); },
    done,
    log,
    wait,
  };
}

export function lazyMan(name, options = {}) {
  const runner = createManRunner(`Hi, I'm ${name}`, options);
  const api = {
    eat(food) { runner.enqueue(() => runner.log(`Eat ${food}`)); return api; },
    sleep(ms) { runner.enqueue(async () => { await runner.wait(ms); runner.log(`Wake after ${ms}`); }); return api; },
    // It may be called last in the synchronous chain, but it must run first.
    sleepFirst(ms) { runner.prioritize(async () => { await runner.wait(ms); runner.log(`Wake first after ${ms}`); }); return api; },
    done: runner.done,
  };
  return api;
}

// This lesson's QQMan variation uses play/rest/restFirst; it shares the queue
// contract without claiming to reproduce any separately published original.
export function qqMan(name, options = {}) {
  const runner = createManRunner(`Hi, I'm ${name}`, options);
  const api = {
    play(game) { runner.enqueue(() => runner.log(`Play ${game}`)); return api; },
    rest(ms) { runner.enqueue(async () => { await runner.wait(ms); runner.log(`Rested ${ms}`); }); return api; },
    restFirst(ms) { runner.prioritize(async () => { await runner.wait(ms); runner.log(`Rested first ${ms}`); }); return api; },
    done: runner.done,
  };
  return api;
}

// W002 — Promise.all teaching polyfill. Index slots preserve input order even
// when requests finish out of order; Promise.resolve assimilates thenables.
export function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    let values;
    try {
      // Promise.all consumes the iterable protocol, not Array.from's array-like
      // fallback. Save the getter result once, then let Array.from consume it.
      const iteratorMethod = iterable?.[Symbol.iterator];
      if (typeof iteratorMethod !== 'function') throw new TypeError('Expected an iterable');
      const iterator = iteratorMethod.call(iterable);
      values = Array.from({ [Symbol.iterator]: () => iterator });
    } catch (error) { reject(error); return; }
    if (values.length === 0) { resolve([]); return; }
    const result = new Array(values.length);
    let remaining = values.length;
    values.forEach((value, index) => Promise.resolve(value).then(
      item => { result[index] = item; if (--remaining === 0) resolve(result); }, reject,
    ));
  });
}

// W003 — Clone a supported data graph. WeakMap records identity before walking
// children, which both breaks cycles and preserves shared references.
export function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  // DOM nodes are host objects with browser-owned state; keep their identity.
  if (typeof Node !== 'undefined' && value instanceof Node) return value;
  if (value instanceof Date) { const copy = new Date(value.getTime()); seen.set(value, copy); return copy; }
  if (value instanceof RegExp) { const copy = new RegExp(value.source, value.flags); copy.lastIndex = value.lastIndex; seen.set(value, copy); return copy; }
  if (value instanceof Map) { const copy = new Map(); seen.set(value, copy); for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen)); return copy; }
  if (value instanceof Set) { const copy = new Set(); seen.set(value, copy); for (const v of value) copy.add(deepClone(v, seen)); return copy; }
  if (ArrayBuffer.isView(value)) {
    const buffer = deepClone(value.buffer, seen);
    const copy = value instanceof DataView
      ? new DataView(buffer, value.byteOffset, value.byteLength)
      : new value.constructor(buffer, value.byteOffset, value.length);
    seen.set(value, copy);
    return copy;
  }
  if (value instanceof ArrayBuffer) { const copy = value.slice(0); seen.set(value, copy); return copy; }
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if ('value' in descriptor) descriptor.value = deepClone(descriptor.value, seen);
    Object.defineProperty(copy, key, descriptor);
  }
  return copy;
}

// W004 — Curry accumulates arguments until the declared arity is met; extra
// arguments are forwarded, matching ordinary JavaScript function calls.
export function curry(fn, arity = fn.length) {
  const collect = args => (...next) => { const all = [...args, ...next]; return all.length >= arity ? fn(...all) : collect(all); };
  return collect([]);
}

// W005 — at-most-once means mark before calling: recursive entry and throws
// cannot accidentally execute the side effect twice.
export function once(fn) {
  let called = false; let result;
  return function (...args) { if (called) return result; called = true; result = fn.apply(this, args); return result; };
}

// W006 — Nested Maps key each argument by identity and avoid lossy string keys.
export function memoize(fn) {
  const root = { children: new Map(), hasValue: false, value: undefined };
  return function (...args) {
    let node = root;
    for (const arg of args) { if (!node.children.has(arg)) node.children.set(arg, { children: new Map(), hasValue: false, value: undefined }); node = node.children.get(arg); }
    if (node.hasValue) return node.value;
    node.value = fn.apply(this, args); node.hasValue = true; return node.value;
  };
}

// W007 — Snapshot listeners before dispatch so subscribe/unsubscribe during an
// emit changes the next emission, not the current one.
export class EventBus {
  #events = new Map();
  on(type, listener) { const set = this.#events.get(type) ?? new Set(); set.add(listener); this.#events.set(type, set); return () => this.off(type, listener); }
  off(type, listener) { const set = this.#events.get(type); if (!set) return false; const removed = set.delete(listener); if (!set.size) this.#events.delete(type); return removed; }
  emit(type, payload) { for (const listener of [...(this.#events.get(type) ?? [])]) listener(payload); }
  once(type, listener) { let dispose; dispose = this.on(type, value => { dispose(); listener(value); }); return dispose; }
}

// W008 — Iterative flattening keeps the call stack bounded and preserves order
// by pushing children in reverse order onto an explicit stack.
export function flatten(input, depth = Infinity) {
  const output = []; const stack = [];
  const pushChildren = (array, remaining) => { for (let i = array.length - 1; i >= 0; i--) if (i in array) stack.push({ value: array[i], depth: remaining }); };
  pushChildren(input, depth);
  while (stack.length) { const item = stack.pop(); if (Array.isArray(item.value) && item.depth > 0) pushChildren(item.value, item.depth - 1); else output.push(item.value); }
  return output;
}
