import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const labs = [
  'frameworks/scheduler-ownership.mjs',
  'frameworks/incremental-invalidation.mjs',
  'engine-runtime/tiering-observe.mjs',
  'engine-runtime/context-ownership.mjs',
  'graphics/scene-hit-test.mjs',
  'graphics/gltf-budget.mjs',
  'systems/crdt-counter.mjs',
  'systems/frame-budget.mjs',
  'systems/transfer-ownership.mjs',
  'systems/focus-state.mjs',
];
if (process.argv.includes('--integrations')) {
  labs.push('integrations/yjs-convergence.mjs', 'integrations/pglite-transactions.mjs');
}
for (const lab of labs) {
  console.log(`\nLAB ${lab}`);
  const result = spawnSync(process.execPath, [join(directory, lab)], {
    stdio: 'inherit', timeout: 30_000,
  });
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${lab}`, result.error?.message ?? `exit=${result.status} signal=${result.signal}`);
    process.exit(1);
  }
}
console.log(`\nPASS ${labs.length} content labs on ${process.version}`);
