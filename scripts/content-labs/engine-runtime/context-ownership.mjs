import assert from 'node:assert/strict';
import vm from 'node:vm';

const sandbox = { initial: 4 };
vm.createContext(sandbox);
assert.equal(vm.runInContext('initial + 3', sandbox), 7);
assert.equal(vm.runInContext('globalThis.answer = 42; answer', sandbox), 42);
assert.equal(Object.hasOwn(sandbox, 'answer'), true);
assert.equal(globalThis.answer, undefined);

// Transfer moves ownership of an ArrayBuffer: the sender's view becomes detached.
const sender = new ArrayBuffer(4);
new Uint8Array(sender).set([1, 2, 3, 4]);
const receiver = structuredClone(sender, { transfer: [sender] });
assert.equal(sender.byteLength, 0);
assert.deepEqual([...new Uint8Array(receiver)], [1, 2, 3, 4]);
console.log('context=separate-global transfer=sender-detached receiver=1,2,3,4');
