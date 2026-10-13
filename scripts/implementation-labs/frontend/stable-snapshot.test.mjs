import test from 'node:test'; import assert from 'node:assert/strict'; import { createStore } from './stable-snapshot.mjs';
test('repeated reads return identical snapshot references', () => { const s = createStore({ n: 1 }); assert.strictEqual(s.getSnapshot(), s.getSnapshot()); });
test('write changes snapshot identity', () => { const s = createStore({ n: 1 }); const before = s.getSnapshot(); s.setState({ n: 2 }); assert.notStrictEqual(s.getSnapshot(), before); });
test('same reference is a no-op', () => { const value = {}; const s = createStore(value); let calls = 0; s.subscribe(() => calls++); s.setState(value); assert.equal(calls, 0); });
test('unsubscribe prevents future notification', () => { const s = createStore(0); let calls = 0; const off = s.subscribe(() => calls++); off(); s.setState(1); assert.equal(calls, 0); });
