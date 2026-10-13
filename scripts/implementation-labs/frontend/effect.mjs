const bucket = new WeakMap();
let active;
const stack = [];
export function effect(fn) {
  const runner = () => {
    cleanup(runner);
    stack.push(runner); active = runner;
    try { return fn(); } finally { stack.pop(); active = stack.at(-1); }
  };
  runner.deps = []; runner.active = true; runner(); return runner;
}
function cleanup(runner) { for (const dep of runner.deps) dep.delete(runner); runner.deps.length = 0; }
export function stop(runner) { if (!runner.active) return; cleanup(runner); runner.active = false; }
export function reactive(target) {
  return new Proxy(target, {
    get(obj, key, receiver) {
      if (active?.active) {
        let keys = bucket.get(obj);
        if (!keys) bucket.set(obj, keys = new Map());
        let dep = keys.get(key);
        if (!dep) keys.set(key, dep = new Set());
        // A runner can read the same property repeatedly; register each dep once for cleanup.
        if (!dep.has(active)) { dep.add(active); active.deps.push(dep); }
      }
      return Reflect.get(obj, key, receiver);
    },
    set(obj, key, value, receiver) {
      const had = Object.hasOwn(obj, key); const old = Reflect.get(obj, key, receiver);
      const ok = Reflect.set(obj, key, value, receiver);
      if (ok && (!had || !Object.is(old, value))) {
        const dep = bucket.get(obj)?.get(key);
        // Snapshot because a runner may clean itself up or stop another subscriber.
        for (const runner of new Set(dep ?? [])) {
          if (!runner.active || runner === active) continue;
          runner();
        }
      }
      return ok;
    },
  });
}
