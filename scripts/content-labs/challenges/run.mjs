import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, ['--test', fileURLToPath(new URL('models.test.mjs', import.meta.url))], {
  stdio: 'inherit', timeout: 30_000,
});
if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? `test exit ${result.status}`);
  process.exit(1);
}
console.log(`PASS challenge models on ${process.version}`);
