import test from 'node:test';
import assert from 'node:assert/strict';
import { ModuleGraph } from './module-invalidation.mjs';

test('walks importer edges until a self-accepting boundary', () => {
  const graph = new ModuleGraph(); graph.add('/app.js', ['/view.js']); graph.add('/view.js', ['/button.js']); graph.add('/button.js');
  const result = graph.invalidate('/button.js', new Set(['/view.js']));
  assert.equal(result.fullReload, false); assert.deepEqual([...result.boundaries], ['/view.js']);
});
test('falls back to full reload when a changed chain reaches graph root', () => {
  const graph = new ModuleGraph(); graph.add('/app.js', ['/route.js']); graph.add('/route.js');
  assert.equal(graph.invalidate('/route.js').fullReload, true);
});
test('terminates cyclic graphs and handles multiple accepting branches', () => {
  const graph = new ModuleGraph(); graph.add('a', ['b', 'c']); graph.add('b', ['a']); graph.add('c', ['leaf']); graph.add('leaf');
  const result = graph.invalidate('leaf', new Set(['a']));
  assert.equal(result.fullReload, false); assert.equal(result.boundaries.has('a'), true);
});
test('removes old reverse edges when a module changes its dependencies', () => {
  const graph = new ModuleGraph(); graph.add('app', ['old']); graph.add('app', ['new']); graph.add('old');
  assert.equal(graph.invalidate('old').invalidated.has('app'), false);
  assert.equal(graph.invalidate('new').invalidated.has('app'), true);
});
test('closed cycle without an accepting boundary requires full reload', () => {
  const graph = new ModuleGraph(); graph.add('a', ['b']); graph.add('b', ['a']);
  assert.equal(graph.invalidate('a').fullReload, true);
});
test('an accepting sibling does not hide a separate closed importer cycle', () => {
  const graph = new ModuleGraph();
  graph.add('changed');
  graph.add('accepting', ['changed']);
  graph.add('a', ['changed', 'b']);
  graph.add('b', ['a']);
  const result = graph.invalidate('changed', new Set(['accepting']));
  assert.equal(result.fullReload, true);
  assert.deepEqual(result.boundaries, new Set(['accepting']));
});
