import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const tests = ['animation-engine.test.mjs', 'ui-timeline.test.mjs',
  'semver-compare.test.mjs', 'unique-window.test.mjs'];
const commands = [
  ['--test', ...tests.map(file => join(directory, file))],
  [join(directory, 'stale-generation.mjs')],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', timeout: 30_000 });
  if (result.error || result.status !== 0) {
    console.error('FAIL interview suite', result.error?.message ?? `exit=${result.status}`);
    process.exit(1);
  }
}
console.log(`PASS interview suite on ${process.version}`);
