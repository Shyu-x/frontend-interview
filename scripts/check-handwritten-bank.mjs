import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const labels = ['题目契约', '约束与不变量', '用例 A', '用例 B', '实现提示', '进阶追问', '难度 / 建议时长', '依据与状态'];
const expectedPages = ['ui-components', 'async-orchestration', 'framework-state', 'compilers-tooling',
  'node-http', 'databases-transactions', 'auth-security', 'distributed-sync',
  'algorithms-structures', 'parsers-protocols', 'graphics-media', 'runtime-memory'];
const manifestPath = resolve(root, 'docs/assets/research/handwritten-bank-360.json');

export function parseQuestions(text, file, legacy = false) {
  const pattern = legacy ? /^### (\d+)\. (.+)$/gm : /^### H(\d{3})\. (.+)$/gm;
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => {
    const nextHeading = text.indexOf('\n## ', match.index + match[0].length);
    const until = Math.min(matches[index + 1]?.index ?? text.length, nextHeading < 0 ? text.length : nextHeading);
    const body = text.slice(match.index + match[0].length, until).trim();
    const fields = {};
    const duplicateFields = [];
    for (const field of body.matchAll(/^- \*\*(.+?)：\*\*(.+)$/gm)) {
      if (Object.hasOwn(fields, field[1])) duplicateFields.push(field[1]);
      fields[field[1]] = field[2].trim();
    }
    const refs = [...(fields['依据与状态'] ?? '').matchAll(/handwritten-practice-sources\.md#(s\d{2})\)/g)].map(item => item[1]);
    return { id: `H${match[1].padStart(3, '0')}`, title: match[2].trim(), file, legacy, body, fields, duplicateFields, refs: [...new Set(refs)] };
  });
}

export function validateQuestions(questions, sourceIds, minimum = 360) {
  const errors = [];
  const ids = new Set();
  const titles = new Set();
  const contracts = new Set();
  for (const question of questions) {
    const { id, title, legacy, body, fields, refs } = question;
    for (const field of question.duplicateFields ?? []) errors.push(`${id}: duplicate field ${field}`);
    if (ids.has(id)) errors.push(`${id}: duplicate ID`);
    ids.add(id);
    const normalized = title.split('｜')[0].replace(/[\s`，。\-]/g, '').toLowerCase();
    if (titles.has(normalized)) errors.push(`${id}: duplicate normalized title`);
    titles.add(normalized);
    if (legacy) {
      for (const label of ['约束与输入输出', '核心不变量', '易错测试', '难度/限时']) {
        if (!fields[label]) errors.push(`${id}: missing legacy field ${label}`);
      }
      continue;
    }
    for (const label of labels) {
      if (!fields[label] || [...fields[label]].length < (label === '难度 / 建议时长' ? 4 : 16)) errors.push(`${id}: missing/short ${label}`);
    }
    if ([...body].length < 240) errors.push(`${id}: contract too short`);
    if (fields['用例 A'] === fields['用例 B']) errors.push(`${id}: repeated test case`);
    const contract = fields['题目契约']?.replace(/\s+/g, '');
    if (contract && contracts.has(contract)) errors.push(`${id}: repeated contract`);
    contracts.add(contract);
    if (!refs.length) errors.push(`${id}: no mechanism source`);
    for (const ref of refs) if (!sourceIds.has(ref)) errors.push(`${id}: unknown source ${ref}`);
    if (!/作者|自主/.test(fields['依据与状态'] ?? '')) errors.push(`${id}: missing original-design evidence type`);
    if (!/未实现|未实跑|实跑/.test(fields['依据与状态'] ?? '')) errors.push(`${id}: missing implementation boundary`);
    if (/TODO|待补充|后续补齐|(?:这里|此处)略过|略过(?:实现|代码|剩余)|其余同上/.test(body)) errors.push(`${id}: placeholder`);
  }
  if (questions.length < minimum) errors.push(`expected at least ${minimum}, found ${questions.length}`);
  for (let number = 1; number <= minimum; number++) {
    if (!ids.has(`H${String(number).padStart(3, '0')}`)) errors.push(`missing H${String(number).padStart(3, '0')}`);
  }
  return errors;
}

export function loadBank() {
  const folder = resolve(root, 'docs/coding');
  const legacyFile = 'docs/coding/handwritten-question-catalog.md';
  const questions = parseQuestions(readFileSync(resolve(root, legacyFile), 'utf8'), legacyFile, true);
  const errors = [];
  if (questions.length !== 48) errors.push(`legacy catalog: expected 48, found ${questions.length}`);
  const nav = readFileSync(resolve(root, 'mkdocs.yml'), 'utf8');
  for (const [pageIndex, suffix] of expectedPages.entries()) {
    const filename = `practice-${suffix}.md`;
    const path = resolve(folder, filename);
    if (!existsSync(path)) { errors.push(`missing page ${filename}`); continue; }
    const text = readFileSync(path, 'utf8');
    const parsed = parseQuestions(text, relative(root, path));
    if (parsed.length !== 26) errors.push(`${filename}: expected 26, found ${parsed.length}`);
    for (let offset = 0; offset < 26; offset++) {
      const expectedId = `H${String(49 + pageIndex * 26 + offset).padStart(3, '0')}`;
      if (parsed[offset]?.id !== expectedId) errors.push(`${filename}: expected position ${offset + 1} to be ${expectedId}`);
    }
    if (!nav.includes(`coding/${filename}`)) errors.push(`${filename}: absent from nav`);
    for (const field of ['title', 'description', 'tags', 'date', 'level', 'prerequisites', 'runnable', 'verified_at', 'source_commit']) {
      if (!new RegExp(`^${field}:`, 'm').test(text.split('---')[1] ?? '')) errors.push(`${filename}: missing metadata ${field}`);
    }
    const description = text.match(/^description: (.+)$/m)?.[1]?.replace(/^"|"$/g, '');
    if (!description || [...description].length < 60 || [...description].length > 160) errors.push(`${filename}: description outside 60–160 characters`);
    questions.push(...parsed);
  }
  const sourceText = readFileSync(resolve(folder, 'handwritten-practice-sources.md'), 'utf8');
  const sourceIds = new Set([...sourceText.matchAll(/\{#(s\d{2})\}/g)].map(match => match[1]));
  errors.push(...validateQuestions(questions, sourceIds));
  questions.sort((a, b) => a.id.localeCompare(b.id));
  return { questions, sourceIds, errors };
}

export function makeManifest(questions) {
  return {
    schema_version: 1, verified_at: '2026-10-12', total: questions.length,
    legacy: questions.filter(q => q.legacy).length, added: questions.filter(q => !q.legacy).length,
    boundary: 'Question contracts, not 360 implemented or executed solutions. Contract hashes detect stale generated indices, not semantic correctness.',
    questions: questions.map(({ id, title, file, legacy, body, refs, fields }) => ({
      id, title, file, legacy, mechanism_sources: refs,
      evidence: legacy ? 'See individual legacy entry and interview provenance' : 'author_designed',
      implementation_status: legacy ? 'consult_linked_entry' : /已实现并实跑/.test(fields['依据与状态'] ?? '') ? 'implemented_model' : 'contract_only',
      contract_sha256: createHash('sha256').update(body).digest('hex'),
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { questions, sourceIds, errors } = loadBank();
  const manifest = makeManifest(questions);
  if (process.argv.includes('--json')) {
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(JSON.stringify(manifest, null, 2));
  } else {
    if (process.argv.includes('--check')) {
      if (!existsSync(manifestPath)) errors.push('missing generated manifest');
      else if (JSON.stringify(JSON.parse(readFileSync(manifestPath, 'utf8'))) !== JSON.stringify(manifest)) errors.push('stale manifest: regenerate after contract edits');
    }
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`PASS handwritten bank: ${questions.length} questions; 48 legacy + 312 added; ${sourceIds.size} source anchors; 12 topic pages`);
  }
}
