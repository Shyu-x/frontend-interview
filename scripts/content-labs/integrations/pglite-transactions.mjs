import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

// 内存实例不写用户文件；这验证 SQL，不验证浏览器持久化或多 Tab 调度。
const db = new PGlite();
try {
  await db.exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, tenant TEXT, total INTEGER CHECK (total >= 0))');
  for (const [id, tenant, total] of [[1, 'a', 10], [2, 'a', 20], [3, 'b', 30]]) {
    await db.query('INSERT INTO orders VALUES ($1, $2, $3)', [id, tenant, total]);
  }
  await assert.rejects(db.transaction(async tx => {
    await tx.query('INSERT INTO orders VALUES ($1, $2, $3)', [4, 'a', 40]);
    await tx.query('INSERT INTO orders VALUES ($1, $2, $3)', [5, 'a', -1]);
  }));
  const { rows } = await db.query('SELECT id FROM orders WHERE tenant=$1 AND id>$2 ORDER BY id LIMIT $3', ['a', 1, 10]);
  assert.deepEqual(rows, [{ id: 2 }]);
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM orders')).rows[0].count, 3);
  const hostile = "a' OR 1=1 --";
  assert.equal((await db.query('SELECT id FROM orders WHERE tenant=$1', [hostile])).rows.length, 0);
  console.log('PGlite 0.5.8: rollback, keyset query, parameterization: PASS');
} finally {
  await db.close();
}
