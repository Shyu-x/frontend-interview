import assert from 'node:assert/strict';

const original = new Uint8Array([1, 2, 3, 4]);
const copied = structuredClone(original);
copied[0] = 9;
assert.equal(original[0], 1); // clone 的独立存储。
const moved = structuredClone(original, { transfer: [original.buffer] });
assert.equal(original.byteLength, 0); // 发送者不再拥有 buffer。
assert.deepEqual([...moved], [1, 2, 3, 4]);
assert.throws(() => new Uint8Array(original.buffer), TypeError);
console.log('structured clone vs transfer: independent clone and detached sender: PASS');
