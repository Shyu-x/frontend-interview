import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const commit = process.argv[2];
assert.match(commit ?? '', /^[a-f0-9]{40}$/, 'provide an immutable source commit');
execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root });
const prefix = `https://github.com/Shyu-x/frontend-interview/blob/${commit}/`;
const pages = new Set(['docs/coding/implementation-paths.md']);
for (const group of ['agent', 'frontend', 'systems']) {
  const research = JSON.parse(readFileSync(resolve(root, `docs/assets/research/implementation-${group}-20261013.json`), 'utf8'));
  for (const item of research.pages) pages.add(item.path);
}
let links = 0;
for (const page of pages) {
  const absolute = resolve(root, page);
  let text = readFileSync(absolute, 'utf8');
  text = text.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    const [path, fragment] = target.split('#');
    if (!path.includes('implementation-labs/')) return whole;
    if (/^https?:\/\//.test(path)) {
      if (!/^https:\/\/github\.com\/Shyu-x\/frontend-interview\/blob\/[a-f0-9]{40}\/scripts\/implementation-labs\//.test(path)) return whole;
    }
    // Resolve actual local source paths, not MkDocs-generated page URLs.
    const marker = path.indexOf('scripts/implementation-labs/');
    // A deep article may have inherited the relative depth of a shallower
    // article. Resolve the explicit repository source path, then validate it.
    const file = resolve(root, path.slice(marker));
    const repositoryPath = relative(root, file).replaceAll('\\', '/');
    assert.ok(repositoryPath.startsWith('scripts/implementation-labs/') && existsSync(file),
      `${page}: invalid local implementation link ${target}`);
    execFileSync('git', ['cat-file', '-e', `${commit}:${repositoryPath}`], { cwd: root });
    links += 1;
    // Function-name fragments are not GitHub line anchors. Preserve real L<n>
    // anchors only; the surrounding label can still name the function.
    return `](${prefix}${repositoryPath}${fragment && /^L\d+(?:-L\d+)?$/.test(fragment) ? '#' + fragment : ''})`;
  });
  if (links && text.includes(prefix)) {
    const header = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(header, `${page}: missing frontmatter`);
    // A page may also discuss an older upstream snapshot. Keep that evidence
    // intact rather than relabeling it as our newly written implementation.
    const ownSource = /^source_commit: (?:d923463eeaf23a985299f12df93ed3013ba069e6|1008fbd6ab973ac09f575a41df80ba3f6b4dca6d)$/m.test(header[1]);
    const metadata = ownSource
      ? header[1].replace(/^source_commit:.*$/m, `source_commit: ${commit}`)
      : /^source_commit:/m.test(header[1])
      ? /^implementation_source_commit:/m.test(header[1])
        ? header[1].replace(/^implementation_source_commit:.*$/m, `implementation_source_commit: ${commit}`)
        : header[1] + `\nimplementation_source_commit: ${commit}`
      : header[1] + `\nsource_commit: ${commit}`;
    text = text.replace(header[0], `---\n${metadata}\n---`);
  }
  writeFileSync(absolute, text);
}
console.log(`Pinned ${links} implementation links in ${pages.size} teaching pages to ${commit}`);
