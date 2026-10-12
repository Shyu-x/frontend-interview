import assert from 'node:assert/strict';

// 教学模型：单线程批处理队列 + scope disposer，不对应任一框架的真实实现。
const queue = new Set();
let flushing = false;
function schedule(job) {
  queue.add(job); // 同一轮重复通知只保留一次。
}
function flush() {
  flushing = true;
  try {
    while (queue.size) {
      const jobs = [...queue];
      queue.clear();
      for (const job of jobs) job();
    }
  } finally {
    flushing = false;
  }
}

function createScope() {
  const cleanups = [];
  let disposed = false;
  return {
    own(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    },
  };
}

const scope = createScope();
const values = new Map([['price', 10], ['count', 1]]);
const events = [];
let runs = 0;
const render = () => { runs++; events.push(values.get('price') * values.get('count')); };
scope.own(() => events.push('disposed'));

// 两次写入调度同一个 job，Set 去重让本次同步 flush 只重跑一次。
values.set('price', 12);
schedule(render);
values.set('count', 2);
schedule(render);
flush(); // 教学事务边界；生产调度器会选择 microtask、宏任务或优先级队列。
assert.equal(runs, 1); // 本玩具模型同步 flush；实际框架时机各异。
assert.deepEqual(events, [24]);

// 作用域析构是幂等的；析构后注册资源会立即释放，避免幽灵订阅。
scope.dispose();
scope.dispose();
let lateCleanup = 0;
scope.own(() => lateCleanup++);
assert.equal(lateCleanup, 1);
assert.deepEqual(events, [24, 'disposed']);
console.log('scheduler-ownership: 1 batched run; cleanup exactly once');
