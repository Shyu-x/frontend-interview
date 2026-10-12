import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// 固定 Git 快照，避免将正在并发写作的文件误算成基线。
const ref = process.argv[2] ?? 'HEAD';
const commit = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, 'docs'], {
  encoding: 'utf8',
}).trim().split('\n').filter(p => p.endsWith('.md')).sort();
const inventory = paths.map(path => {
  const content = execFileSync('git', ['show', commit + ':' + path], { encoding: 'utf8' });
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = frontmatter?.[1] ?? '';
  return {
    path, topic: path.split('/')[1], lines: content.split('\n').length,
    characters: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    title: fields.match(/^title:\s*(.+)$/m)?.[1] ?? null,
    headings: (content.match(/^#{2,3}\s+/gm) ?? []).length,
    httpsReferences: (content.match(/https:\/\//g) ?? []).length,
    codeFences: (content.match(/^\s*```[a-zA-Z]/gm) ?? []).length,
    templateScenes: ['后台管理的万行表格', '低端安卓', '多人协作白板']
      .filter(scene => content.includes(scene)),
    missingFrontmatter: ['title', 'description', 'tags', 'date']
      .filter(field => !new RegExp('^' + field + ':', 'm').test(fields)),
  };
});
const topics = Object.groupBy(inventory, item => item.topic);
const result = {
  method: 'structural inventory; not a factual accuracy score',
  commit, pages: inventory.length,
  topics: Object.fromEntries(Object.entries(topics).map(([topic, items]) => [
    topic, { pages: items.length, characters: items.reduce((sum, item) => sum + item.characters, 0) },
  ])),
  inventory,
};
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv[3]) {
  mkdirSync(dirname(process.argv[3]), { recursive: true });
  writeFileSync(process.argv[3], output);
  console.log(JSON.stringify({ commit, pages: result.pages, topics: result.topics,
    output: process.argv[3], bytes: Buffer.byteLength(output) }, null, 2));
} else console.log(output);
