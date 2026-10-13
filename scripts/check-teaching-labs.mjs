import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seen = new Set();
const scenarios = new Set();
const totals = {};
for (const [group, prefix, minimum] of [['web', 'W', 40], ['node', 'N', 30], ['go', 'G', 30]]) {
  const folder = resolve(root, 'scripts/teaching-labs', group);
  const catalog = JSON.parse(readFileSync(resolve(folder, 'catalog.json'), 'utf8'));
  assert.ok(catalog.length >= minimum, `${group}: expected at least ${minimum} independent exercises`);
  totals[group] = catalog.length;
  for (let index = 0; index < catalog.length; index++) {
    const item = catalog[index];
    assert.equal(item.id, `${prefix}${String(index + 1).padStart(3, '0')}`);
    assert.ok(!seen.has(item.id), `duplicate exercise ${item.id}`);
    seen.add(item.id);
    for (const field of ['title', 'source', 'doc', 'scenario', 'test']) {
      assert.ok(typeof item[field] === 'string' && item[field].length > 2, `${item.id}: missing ${field}`);
    }
    scenarios.add(item.scenario.toLowerCase().replace(/\s+/g, ' ').trim());
    const docFile = item.doc.split('#')[0];
    const doc = readFileSync(docFile.startsWith('docs/') ? resolve(root, docFile) : resolve(root, 'docs/coding', docFile), 'utf8');
    assert.match(doc, new RegExp(`#{2,4}[^\\n]*${item.id}\\b`), `${item.id}: no teaching section`);
    let previousFile;
    for (const reference of item.source.split(';')) {
      const parts = reference.split('#');
      const file = /\.(mjs|go)$/.test(parts[0]) ? parts[0] : previousFile;
      const symbol = file === parts[0] ? parts[1] : parts[0];
      previousFile = file;
      assert.ok(existsSync(resolve(folder, file)), `${item.id}: missing source ${file}`);
      if (symbol) assert.ok(readFileSync(resolve(folder, file), 'utf8').includes(symbol), `${item.id}: no ${symbol}`);
    }
    const [testFile, testName] = item.test.split('#');
    const testText = readFileSync(resolve(folder, testFile), 'utf8');
    assert.ok(testText.includes(testName ?? item.id), `${item.id}: missing test`);
  }
}
assert.ok(seen.size >= 100, 'expected at least 100 complete exercise entries');
assert.ok(scenarios.size >= 40, 'expected at least 40 concrete scenario entries');
console.log(`PASS teaching coverage: ${seen.size} exercises; web ${totals.web}, node ${totals.node}, go ${totals.go}; ${scenarios.size} named scenarios`);
console.log('Coverage checks locate implementations and tests; run the Node and Go suites to validate behavior.');
