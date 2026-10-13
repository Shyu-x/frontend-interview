import test from 'node:test'; import assert from 'node:assert/strict';
import { LruCache, TtlCache, createStaleWhileRevalidate, stableCacheKey, tokenize, evaluateExpression, hitTestRect, takeFrameJobs } from './engineering.mjs';

test('W033 LRU read changes recency and evicts least recently used key', () => { const c=new LruCache(2); c.set('a',1);c.set('b',2);assert.equal(c.get('a'),1);c.set('c',3);assert.equal(c.get('b'),undefined);assert.equal(c.get('a'),1); });
test('W033 LRU rejects zero capacity', () => { assert.throws(()=>new LruCache(0),RangeError); });
test('W034 TTL expires at the exact boundary and deletes stale entry', () => { let now=10; const c=new TtlCache(()=>now); c.set('k','v',5);assert.equal(c.get('k'),'v');now=15;assert.equal(c.get('k'),undefined); });
test('W034 TTL rejects negative lifetime', () => { const c=new TtlCache(()=>0);assert.throws(()=>c.set('x',1,-1),RangeError); });
test('W035 stale read returns old value and launches one refresh', async () => { let now=0,calls=0;const read=createStaleWhileRevalidate({now:()=>now});await read('k',async()=>1,5);now=6;let release;const loader=()=>{calls++;return new Promise(r=>release=r);};const a=await read('k',loader,5);const b=await read('k',loader,5);assert.equal(a.value,1);assert.equal(b.stale,true);assert.equal(calls,1);release(2);assert.equal(await a.refresh,2); });
test('W035 cold cache failure rejects rather than inventing stale data', async () => { const read=createStaleWhileRevalidate();await assert.rejects(read('x',async()=>{throw Error('offline');},10),/offline/); });
test('W036 stable cache key sorts nested object keys', () => { assert.equal(stableCacheKey({b:1,a:{z:2,y:3}}),'{"a":{"y":3,"z":2},"b":1}'); });
test('W036 cyclic cache input is rejected', () => { const x={};x.self=x;assert.throws(()=>stableCacheKey(x),/cyclic/); });
test('W037 tokenizer records values and rejects unsupported characters', () => { assert.deepEqual(tokenize('12 + .5').slice(0,3).map(t=>t.value),[12,'+',0.5]);assert.throws(()=>tokenize('2 ^ 3'),SyntaxError); });
test('W037 empty input still has EOF token', () => { assert.equal(tokenize(' ').at(-1).type,'eof'); });
test('W038 Pratt parser honors precedence, grouping, unary minus', () => { assert.equal(evaluateExpression('2 + 3 * (4 - 1)'),11);assert.equal(evaluateExpression('-2*3'),-6); });
test('W038 Pratt parser rejects trailing tokens and incomplete grouping', () => { assert.throws(()=>evaluateExpression('2 3'),SyntaxError);assert.throws(()=>evaluateExpression('(2+3'),SyntaxError); });
test('W039 hit test converts CSS pixels into backing-store coordinates', () => { const canvas={width:400,height:200,getBoundingClientRect:()=>({left:10,top:20,width:200,height:100})};assert.equal(hitTestRect({clientX:35,clientY:45},canvas,{x:50,y:50,width:20,height:20}),true);assert.equal(hitTestRect({clientX:15,clientY:25},canvas,{x:50,y:50,width:20,height:20}),false); });
test('W039 zero-sized canvas bounds cannot claim a hit', () => { const canvas={width:0,height:0,getBoundingClientRect:()=>({left:0,top:0,width:0,height:0})};assert.equal(hitTestRect({clientX:0,clientY:0},canvas,{x:0,y:0,width:1,height:1}),false); });
test('W040 frame budget takes FIFO work without exceeding budget', () => { const jobs=[{id:'a',costMs:2},{id:'b',costMs:2},{id:'c',costMs:1}];const r=takeFrameJobs(jobs,4);assert.deepEqual(r.selected.map(x=>x.id),['a','b']);assert.deepEqual(r.remaining.map(x=>x.id),['c']);assert.equal(r.usedMs,4); });
test('W040 rejects negative frame budget without consuming queue', () => { const jobs=[{costMs:1}];assert.throws(()=>takeFrameJobs(jobs,-1),RangeError);assert.equal(jobs.length,1); });
