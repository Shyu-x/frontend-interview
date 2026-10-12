import assert from 'node:assert/strict';

// 教学模型：显式依赖图的反向失效，不是 TypeScript/Oxc/Rolldown 的缓存算法。
const dependencies = new Map([
  ['app', new Set(['view', 'format'])],
  ['view', new Set(['model'])],
  ['format', new Set(['locale'])],
  ['model', new Set()],
  ['locale', new Set()],
]);
function reverseGraph(graph) {
  const reverse = new Map([...graph.keys()].map((key) => [key, new Set()]));
  for (const [consumer, deps] of graph) {
    for (const dep of deps) reverse.get(dep).add(consumer);
  }
  return reverse;
}
const consumers = reverseGraph(dependencies);
function invalidate(changed, graph) {
  const invalid = new Set();
  const pending = [changed];
  while (pending.length) {
    const current = pending.pop();
    if (invalid.has(current)) continue;
    invalid.add(current);
    for (const consumer of graph.get(current) ?? []) pending.push(consumer);
  }
  return invalid;
}

// 修改 model 应使依赖它的 view 和入口 app 失效，locale 支线应保留。
assert.deepEqual([...invalidate('model', consumers)].sort(), ['app', 'model', 'view']);
assert.deepEqual([...invalidate('locale', consumers)].sort(), ['app', 'format', 'locale']);

// 新增反向边后，改动 format 也影响 app；若漏掉边，缓存会错误复用旧输出。
dependencies.get('view').add('format');
const updatedConsumers = reverseGraph(dependencies);
assert.deepEqual([...invalidate('format', updatedConsumers)].sort(), ['app', 'format', 'view']);
console.log('incremental-invalidation: reverse edges invalidate exactly the reachable consumers');
