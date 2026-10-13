/** A teaching simulator. It does not model browser rendering or host task sources. */
export function runQueues(runTask) {
  const tasks = [];
  const microtasks = [];
  const trace = [];
  const api = {
    task(fn) { tasks.push(fn); },
    microtask(fn) { microtasks.push(fn); },
    log(value) { trace.push(value); },
  };
  runTask(api);
  while (tasks.length || microtasks.length) {
    while (microtasks.length) microtasks.shift()(api);
    if (tasks.length) tasks.shift()(api);
  }
  return trace;
}
