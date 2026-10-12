import test from 'node:test';
import assert from 'node:assert/strict';
import { lengthPrefixedDecoder, createVersionedStore, createHandlePool } from './models.mjs';

function encode(...frames) {
  const result = new Uint8Array(frames.reduce((sum, frame) => sum + 4 + frame.length, 0));
  const view = new DataView(result.buffer);
  let offset = 0;
  for (const frame of frames) {
    view.setUint32(offset, frame.length, false);
    result.set(frame, offset + 4);
    offset += 4 + frame.length;
  }
  return result;
}
function decodeChunks(bytes, cuts) {
  const decoder = lengthPrefixedDecoder(100);
  const output = [];
  let previous = 0;
  for (const cut of [...cuts, bytes.length]) {
    output.push(...decoder.feed(bytes.subarray(previous, cut)));
    previous = cut;
  }
  decoder.end();
  return output.map(frame => [...frame]);
}

test('framing: complete, coalesced and empty frames preserve order', () => {
  assert.deepEqual(decodeChunks(encode([1, 2], [], [3]), []), [[1, 2], [], [3]]);
});
test('framing: every possible two-chunk split returns the same frames', () => {
  const bytes = encode([10, 20, 30], [], [40, 50]);
  for (let cut = 0; cut <= bytes.length; cut++) assert.deepEqual(decodeChunks(bytes, [cut]), [[10, 20, 30], [], [40, 50]]);
});
test('framing: byte-at-a-time and UTF-8 bytes do not require character alignment', () => {
  const content = new TextEncoder().encode('你🙂');
  const bytes = encode(content);
  assert.deepEqual(decodeChunks(bytes, Array.from({ length: bytes.length }, (_, i) => i)), [[...content]]);
});
test('framing: all cut combinations of a short stream agree with the independent input frames', () => {
  const bytes = encode([7], []);
  for (let mask = 0; mask < 1 << (bytes.length - 1); mask++) {
    const cuts = [];
    for (let bit = 0; bit < bytes.length - 1; bit++) if (mask & (1 << bit)) cuts.push(bit + 1);
    assert.deepEqual(decodeChunks(bytes, cuts), [[7], []]);
  }
});
test('framing: rejected lengths fail before payload allocation and poison the stream', () => {
  const decoder = lengthPrefixedDecoder(2);
  assert.throws(() => decoder.feed(Uint8Array.of(0, 0, 0, 3)), RangeError);
  assert.deepEqual(decoder.snapshot(), { state: 'failed', bufferedBytes: 0, allocatedBytes: 0 });
  assert.throws(() => decoder.feed(Uint8Array.of()), /failed/);
});
test('framing: unsigned big-endian high bit is not a negative length', () => {
  const decoder = lengthPrefixedDecoder(10);
  assert.throws(() => decoder.feed(Uint8Array.of(128, 0, 0, 0)), RangeError);
});
test('framing: partial header and body each fail at EOF', () => {
  for (const bytes of [Uint8Array.of(0, 0), Uint8Array.of(0, 0, 0, 2, 1)]) {
    const decoder = lengthPrefixedDecoder(2);
    decoder.feed(bytes);
    assert.throws(() => decoder.end(), SyntaxError);
    assert.equal(decoder.snapshot().allocatedBytes, 0);
  }
});
test('framing: empty stream and repeated end are valid; feed after end fails', () => {
  const decoder = lengthPrefixedDecoder(0);
  assert.deepEqual(decoder.feed(new Uint8Array()), []);
  decoder.end();
  decoder.end();
  assert.throws(() => decoder.feed(new Uint8Array()), /ended/);
});
test('framing: output owns its bytes and later chunks do not mutate prior payload', () => {
  const decoder = lengthPrefixedDecoder(10);
  const bytes = encode([1]);
  const [frame] = decoder.feed(bytes);
  bytes.fill(99);
  decoder.feed(encode([2]));
  assert.deepEqual([...frame], [1]);
});
test('framing: invalid maximum and chunk type are rejected', () => {
  for (const value of [-1, 1.5, NaN, Infinity, 16 * 1024 * 1024 + 1]) assert.throws(() => lengthPrefixedDecoder(value), RangeError);
  assert.throws(() => lengthPrefixedDecoder(1).feed([0]), TypeError);
});

test('CAS: initial state and isolated read snapshots', () => {
  const value = { count: 1 };
  const store = createVersionedStore([{ id: 'a', value }]);
  value.count = 9;
  const read = store.read('a');
  assert.deepEqual(read, { id: 'a', version: 0, value: { count: 1 } });
  read.value.count = 8;
  assert.equal(store.read('a').value.count, 1);
});
test('CAS: two stale readers cannot both update version zero', () => {
  const store = createVersionedStore([{ id: 'a', value: 10 }]);
  const first = store.read('a'), second = store.read('a');
  assert.deepEqual(store.compareAndSwap('a', first.version, 11), { ok: true, version: 1 });
  assert.deepEqual(store.compareAndSwap('a', second.version, 12), { ok: false, currentVersion: 1 });
  assert.equal(store.read('a').value, 11);
});
test('CAS: conflict can be retried with a freshly read value and version', () => {
  const store = createVersionedStore([{ id: 'a', value: 1 }]);
  store.compareAndSwap('a', 0, 2);
  assert.equal(store.compareAndSwap('a', 0, 3).ok, false);
  const fresh = store.read('a');
  assert.equal(store.compareAndSwap('a', fresh.version, fresh.value + 1).ok, true);
  assert.deepEqual(store.read('a'), { id: 'a', value: 3, version: 2 });
});
test('CAS: an uncloneable update fails before mutating version or value', () => {
  const store = createVersionedStore([{ id: 'a', value: 1 }]);
  assert.throws(() => store.compareAndSwap('a', 0, () => 2), { name: 'DataCloneError' });
  assert.deepEqual(store.read('a'), { id: 'a', value: 1, version: 0 });
});
test('CAS: updated objects are isolated from the caller', () => {
  const store = createVersionedStore([{ id: 'a', value: null }]);
  const next = { items: [1] };
  store.compareAndSwap('a', 0, next);
  next.items.push(2);
  assert.deepEqual(store.read('a').value, { items: [1] });
});
test('CAS: missing records, duplicate IDs and invalid expected versions reject', () => {
  const store = createVersionedStore([{ id: 'a', value: 1 }]);
  assert.throws(() => store.read('missing'), RangeError);
  assert.throws(() => store.compareAndSwap('missing', 0, 1), RangeError);
  for (const version of [-1, 0.1, NaN]) assert.throws(() => store.compareAndSwap('a', version, 1), RangeError);
  assert.throws(() => createVersionedStore([{ id: 'a' }, { id: 'a' }]), RangeError);
  assert.throws(() => createVersionedStore([{ id: '' }]), TypeError);
});

test('handles: allocate, get and bounded capacity', () => {
  const pool = createHandlePool(1);
  const handle = pool.allocate('first');
  assert.equal(pool.get(handle), 'first');
  assert.throws(() => pool.allocate('second'), RangeError);
});
test('handles: a reused slot rejects old generation and double release', () => {
  const pool = createHandlePool(1);
  const old = pool.allocate('first');
  pool.release(old);
  const current = pool.allocate('second');
  assert.equal(old.slot, current.slot);
  assert.equal(current.generation, old.generation + 1);
  assert.throws(() => pool.get(old), RangeError);
  assert.throws(() => pool.release(old), RangeError);
  assert.equal(pool.get(current), 'second');
});
test('handles: snapshot exposes metadata only, without retaining released values', () => {
  const pool = createHandlePool(1);
  const handle = pool.allocate({ privateData: 1 });
  pool.release(handle);
  assert.deepEqual(pool.snapshot(), [{ generation: 1, used: false }]);
});
test('handles: immutable handles and independent live slots', () => {
  const pool = createHandlePool(2);
  const a = pool.allocate('a'), b = pool.allocate('b');
  assert.equal(Object.isFrozen(a), true);
  pool.release(a);
  assert.equal(pool.get(b), 'b');
  assert.notEqual(pool.allocate('c').slot, b.slot);
});
test('handles: invalid capacities and malformed handles reject', () => {
  for (const size of [0, -1, 1.5, Infinity, 100_001]) assert.throws(() => createHandlePool(size), RangeError);
  const pool = createHandlePool(1);
  for (const handle of [null, {}, { slot: -1, generation: 0 }, { slot: 0, generation: 0 }]) assert.throws(() => pool.get(handle), RangeError);
});
