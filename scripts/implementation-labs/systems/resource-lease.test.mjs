import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourcePool } from './resource-lease.mjs';

test('accounts leases and rejects allocations beyond budget', () => {
  const pool = new ResourcePool({ budgetBytes: 10 }); pool.acquire('texture', 8, () => {});
  assert.equal(pool.bytes, 8); assert.throws(() => pool.acquire('buffer', 3, () => {}), /budget/);
});
test('release is idempotent and updates accounting before reuse', () => {
  const pool = new ResourcePool({ budgetBytes: 5 }); let disposed = 0; const release = pool.acquire('buffer', 5, () => disposed++);
  assert.equal(release(), true); assert.equal(release(), false); assert.equal(pool.bytes, 0); assert.equal(disposed, 1);
  assert.doesNotThrow(() => pool.acquire('buffer', 5, () => {}));
});
test('disposeAll releases every resource once', () => {
  const pool = new ResourcePool({ budgetBytes: 5 }); let disposed = 0;
  pool.acquire('a', 2, () => disposed++); pool.acquire('b', 3, () => disposed++); pool.disposeAll(); pool.disposeAll();
  assert.equal(pool.bytes, 0); assert.equal(disposed, 2);
});
test('continues cleanup after a destroy callback throws', () => {
  const pool = new ResourcePool({ budgetBytes: 3 }); let cleaned = 0;
  pool.acquire('bad', 1, () => { throw new Error('device lost'); }); pool.acquire('good', 2, () => cleaned++);
  assert.throws(() => pool.disposeAll(), AggregateError);
  assert.equal(pool.bytes, 0); assert.equal(cleaned, 1);
});
