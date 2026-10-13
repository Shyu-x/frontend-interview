import test from 'node:test'; import assert from 'node:assert/strict'; import { effect, reactive, stop } from './effect.mjs';
test('tracks a property read', () => { const s = reactive({ n: 0 }); let seen; effect(() => { seen = s.n; }); s.n = 2; assert.equal(seen, 2); });
test('cleans up dependencies from an inactive branch', () => { const s = reactive({ on: true, a: 1, b: 2 }); let seen; effect(() => { seen = s.on ? s.a : s.b; }); s.on = false; s.a = 3; assert.equal(seen, 2); s.b = 4; assert.equal(seen, 4); });
test('does not rerun for Object.is-equal values', () => { const s = reactive({ n: 1 }); let runs = 0; effect(() => { s.n; runs++; }); s.n = 1; assert.equal(runs, 1); });
test('stop detaches effect', () => { const s = reactive({ n: 0 }); let runs = 0; const runner = effect(() => { s.n; runs++; }); stop(runner); s.n++; assert.equal(runs, 1); });
test('nested effect restores the outer active runner', () => { const s = reactive({ outer: 0, inner: 0 }); let seen; const inner = effect(() => s.inner); effect(() => { inner(); seen = s.outer; }); s.outer = 3; assert.equal(seen, 3); });
test('self-write does not recursively invoke the active runner', () => { const s = reactive({ n: 0 }); let runs = 0; effect(() => { runs++; if (s.n < 1) s.n += 1; }); assert.equal(s.n, 1); assert.equal(runs, 1); });
test('runner stopped during trigger is skipped from the snapshot', () => { const s = reactive({ n: 0 }); let secondRuns = 0; let second; effect(() => { if (s.n) stop(second); }); second = effect(() => { s.n; secondRuns++; }); s.n = 1; assert.equal(secondRuns, 1); });
test('repeated reads only register one cleanup edge', () => { const s = reactive({ n: 1 }); let runner; runner = effect(() => { s.n; s.n; }); assert.equal(runner.deps.length, 1); });
