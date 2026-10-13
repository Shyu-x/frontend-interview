import test from 'node:test'; import assert from 'node:assert/strict';
import { lazyMan, qqMan, promiseAll, deepClone, curry, once, memoize, EventBus, flatten } from './core.mjs';

test('W001 LazyMan gives sleepFirst priority and done observes only one run', async () => {
  const out = [];
  const man = lazyMan('Mia', { autoStart: false, log: x => out.push(x), wait: async () => {} });
  man.eat('tea').sleep(2).sleepFirst(1);
  assert.deepEqual(out, []);
  const firstRun = man.done();
  assert.equal(man.done(), firstRun);
  await firstRun;
  assert.deepEqual(out, ['Wake first after 1', "Hi, I'm Mia", 'Eat tea', 'Wake after 2']);
  assert.equal(man.done(), firstRun);
  assert.equal(out.length, 4);
});
test('W001 LazyMan auto-starts after synchronous chain registration', async () => {
  const out = [];
  const man = lazyMan('Mia', { log: x => out.push(x), wait: async () => {} });
  man.eat('tea').sleepFirst(1);
  assert.deepEqual(out, []);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(out, ['Wake first after 1', "Hi, I'm Mia", 'Eat tea']);
  assert.equal(man.done(), man.done());
});
test('W001 LazyMan rejects on a failed wait and does not run later jobs', async () => {
  const out = [];
  const man = lazyMan('x', { autoStart: false, log: x => out.push(x), wait: async () => { throw Error('timer'); } });
  man.sleep(1).eat('later');
  const run = man.done();
  await assert.rejects(run, /timer/);
  assert.equal(man.done(), run);
  assert.deepEqual(out, ["Hi, I'm x"]);
});
test('W001 auto-start rejection remains observable from done without unhandled rejection', async () => {
  const man = lazyMan('x', { wait: async () => { throw Error('auto timer'); } }).sleep(1);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(man.done(), /auto timer/);
});
test('W001 QQMan variation shares priority, ordered jobs, and one done promise', async () => {
  const out = [];
  const man = qqMan('Q', { autoStart: false, log: x => out.push(x), wait: async () => {} });
  man.play('chess').rest(3).restFirst(1);
  const run = man.done();
  assert.equal(man.done(), run);
  await run;
  assert.deepEqual(out, ['Rested first 1', "Hi, I'm Q", 'Play chess', 'Rested 3']);
});
test('W001 synchronous logger reentry observes the already registered run', async () => {
  let man; let observed; let calls = 0;
  man = lazyMan('Mia', { autoStart: false, log() { calls++; observed = man.done(); } });
  const run = man.done();
  await run;
  assert.equal(observed, run);
  assert.equal(calls, 1);
});
test('W002 preserves order, assimilates values, and resolves empty iterable', async () => { assert.deepEqual(await promiseAll([Promise.resolve(2), 1]), [2, 1]); assert.deepEqual(await promiseAll([]), []); });
test('W002 rejects first failed member, invalid iterator, and array-like impostors', async () => {
  await assert.rejects(promiseAll([Promise.reject(Error('offline'))]), /offline/);
  await assert.rejects(promiseAll({ [Symbol.iterator]: 1 }));
  await assert.rejects(promiseAll(3), TypeError);
  await assert.rejects(promiseAll({ 0: 'a', length: 1 }), TypeError);
});
test('W002 reads a custom iterator getter once and rejects a throwing getter', async () => {
  let reads = 0;
  const input = Object.defineProperty({}, Symbol.iterator, { get() { reads += 1; return function* values() { yield 'ok'; }; } });
  assert.deepEqual(await promiseAll(input), ['ok']);
  assert.equal(reads, 1);
  const broken = Object.defineProperty({}, Symbol.iterator, { get() { throw Error('iterator getter'); } });
  await assert.rejects(promiseAll(broken), /iterator getter/);
});
test('W003 preserves cycles, shared references, symbols, Map and Date', () => { const key = Symbol(); const data = new DataView(new Uint8Array([0, 8, 0]).buffer, 1, 1); const obj = { date: new Date(3), map: new Map(), view: data, [key]: { n: 1 } }; obj.self = obj; obj.again = obj[key]; obj.map.set(obj, obj[key]); const copy = deepClone(obj); assert.notEqual(copy, obj); assert.equal(copy.self, copy); assert.equal(copy.again, copy[key]); assert.equal(copy.map.get(copy), copy[key]); assert.equal(copy.date.getTime(), 3); assert.equal(copy.view.getUint8(0),8); assert.notEqual(copy.view.buffer,obj.view.buffer); });
test('W003 returns primitives directly and keeps sparse array length', () => { assert.equal(deepClone(4), 4); const a = []; a.length = 3; a[2] = 'end'; const b = deepClone(a); assert.equal(b.length, 3); assert.equal(0 in b, false); });
test('W003 preserves shared built-in identity and RegExp lastIndex', () => {
  const date = new Date(9);
  const expression = /row/g;
  expression.lastIndex = 2;
  const buffer = new Uint8Array([3, 4, 5, 6]).buffer;
  const left = new Uint8Array(buffer, 0, 2);
  const right = new DataView(buffer, 1, 2);
  const copy = deepClone({ date, dateAgain: date, expression, expressionAgain: expression, left, right, buffer });
  assert.equal(copy.date, copy.dateAgain);
  assert.notEqual(copy.date, date);
  assert.equal(copy.expression, copy.expressionAgain);
  assert.equal(copy.expression.lastIndex, 2);
  assert.equal(copy.left.buffer, copy.right.buffer);
  assert.equal(copy.left.buffer, copy.buffer);
  assert.notEqual(copy.buffer, buffer);
  assert.deepEqual([...copy.left], [3, 4]);
  assert.equal(copy.right.getUint8(0), 4);
});
test('W004 curries until arity and accepts multiple arguments at once', () => { assert.equal(curry((a,b,c) => a+b+c)(1)(2,3), 6); });
test('W004 zero arity and partial call are explicit', () => { assert.equal(curry(() => 'ready', 0)() , 'ready'); assert.equal(typeof curry((a,b) => a+b)(1), 'function'); });
test('W005 preserves this, return value, and does not repeat effect', () => { let calls=0; const f=once(function(x){ calls++; return this.base+x; }); const ctx={base:2}; assert.equal(f.call(ctx,3),5); assert.equal(f.call({base:9},9),5); assert.equal(calls,1); });
test('W005 marks before invocation so a throwing function is still at-most-once', () => { let calls=0; const f=once(()=>{ calls++; throw Error('boom'); }); assert.throws(f,/boom/); assert.equal(f(),undefined); assert.equal(calls,1); });
test('W006 memoize keys object identity and caches undefined', () => { let calls=0; const fn=memoize(x=>{calls++; return x.value;}); const key={value:undefined}; fn(key); fn(key); fn({value:undefined}); assert.equal(calls,2); });
test('W006 handles zero arguments and symbol argument keys', () => { let calls=0; const fn=memoize(()=>++calls); assert.equal(fn(),1); assert.equal(fn(),1); const sym=Symbol(); assert.equal(memoize(x=>String(x))(sym),String(sym)); });
test('W007 once listener removes before re-entry and off reports removal', () => { const bus=new EventBus(); let calls=0; bus.once('x',()=>{calls++; bus.emit('x');}); bus.emit('x'); assert.equal(calls,1); const off=bus.on('y',()=>{}); assert.equal(off(),true); assert.equal(off(),false); });
test('W007 listener snapshot isolates current emit from subscription edits', () => { const bus=new EventBus(); const got=[]; let off; bus.on('x',()=>{got.push('a'); off(); bus.on('x',()=>got.push('c'));}); off=bus.on('x',()=>got.push('b')); bus.emit('x'); assert.deepEqual(got,['a','b']); });
test('W008 iterative flatten preserves order and finite depth', () => { assert.deepEqual(flatten([1,[2,[3]]]),[1,2,3]); assert.deepEqual(flatten([1,[2,[3]]],1),[1,2,[3]]); });
test('W008 empty and scalar entries stay intact', () => { assert.deepEqual(flatten([[], 0, null]),[0,null]); });
test('W008 follows Array.flat sparse-slot behavior', () => { const sparse=[];sparse.length=2;sparse[1]=[3];assert.deepEqual(flatten(sparse),[3]); });
