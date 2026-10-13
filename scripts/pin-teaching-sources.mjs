// Pin runnable examples to an immutable source snapshot after tests pass.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const sha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('provide a verified full source commit SHA');
const folder = resolve('docs/coding');
for (const file of readdirSync(folder).filter(name => /^workshop-.*\.md$/.test(name))) {
  const path = resolve(folder, file);
  let text = readFileSync(path, 'utf8');
  text = text.replace(/^source_commit: .+$/m, `source_commit: ${sha}`);
  text = text.replace(/\(\.\.\/\.\.\/(scripts\/teaching-labs\/[^)\s]+)\)/g,
    (_match, target) => `(https://github.com/Shyu-x/frontend-interview/blob/${sha}/${target})`);
  text = text.replace(/https:\/\/github\.com\/Shyu-x\/frontend-interview\/blob\/[a-f0-9]{40}\/(scripts\/teaching-labs\/)/g,
    `https://github.com/Shyu-x/frontend-interview/blob/${sha}/$1`);
  // Short section names read better than a repeated "name: explanation" form.
  text = text.replace(/^(#{1,4} [^\n]+)$/gm, line => line.replaceAll('：', ' ').replaceAll(': ', ' '));
  writeFileSync(path, text);
}
