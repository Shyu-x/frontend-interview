import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const groups = ['agent', 'frontend', 'systems'];
const ledgerPath = 'docs/assets/research/implementation-coverage-20261013.json';
const read = path => readFileSync(resolve(root, path), 'utf8');

export function validateResearch(report, today = new Date().toISOString().slice(0, 10)) {
  assert.match(report.verified_at, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(report.verified_at <= today, 'verification date cannot be in the future');
  assert.ok(typeof report.scope === 'string' && report.scope.length >= 10,
    'describe the scope; a source link does not verify every sentence');
  assert.ok(Array.isArray(report.pages) && report.pages.length >= 30);
  const seen = new Set();
  for (const page of report.pages) {
    assert.match(page.path, /^docs\/.+\.md$/);
    assert.ok(!seen.has(page.path), `duplicate research page ${page.path}`);
    seen.add(page.path);
    assert.match(page.sectionAnchor, /^[a-z][a-z0-9-]+$/);
    assert.ok(Array.isArray(page.sources) && page.sources.length > 0, `${page.path}: no primary evidence`);
    for (const source of page.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(typeof source.claim === 'string' && source.claim.length >= 12,
        `${page.path}: name the claim actually checked`);
      assert.ok(typeof source.version === 'string' && source.version.length > 2,
        `${page.path}: identify the version or dated living standard`);
    }
    assert.ok(Array.isArray(page.implementationIds), `${page.path}: identify relevant examples`);
  }
}

export function validateCatalog(catalog, prefix) {
  assert.ok(Array.isArray(catalog) && catalog.length >= 12);
  const scenarios = new Set();
  const ids = new Set();
  for (const entry of catalog) {
    assert.match(entry.id, new RegExp(`^${prefix}\\d{3}$`));
    assert.ok(!ids.has(entry.id), `duplicate implementation ${entry.id}`);
    ids.add(entry.id);
    for (const field of ['title', 'source', 'doc', 'scenario', 'test']) {
      assert.ok(typeof entry[field] === 'string' && entry[field].length > 5,
        `${entry.id}: missing ${field}`);
    }
    assert.match(entry.source, /^scripts\/implementation-labs\/.+\.mjs(?:#.*)?$/);
    assert.match(entry.test, /^scripts\/implementation-labs\/.+\.test\.mjs(?:#.*)?$/);
    assert.match(entry.doc, /^docs\/.+\.md#[a-z][a-z0-9-]+$/);
    scenarios.add(entry.scenario);
  }
  assert.equal(scenarios.size, catalog.length, 'each example must solve a distinct concrete task');
}

function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(folder, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith('.md') ? [path] : [];
  }).sort();
}

export function classifyPage(path, content) {
  const isReference = /(?:^docs\/(?:design|resources)\/|\/index\.md$|^docs\/index\.md$|MERMAID_BEST_PRACTICES|\/references\.md$|learning-paths|question-index|handwritten-practice-sources|company-question-playbook|workshop-node-sources)/.test(path);
  const languages = [...content.matchAll(/^\s*```([\w+-]+)\s*$/gm)].map(match => match[1]);
  const codeLinks = [...content.matchAll(/\]\(([^)\s]+\.(?:mjs|js|ts|go|rs|py|html)(?:#[^)\s]*)?)\)/g)]
    .map(match => match[1]);
  const executableExamples = languages.filter(language => /^(?:js|javascript|ts|typescript|tsx|jsx|python|py|go|rust|rs|html|css|c|cpp|wasm|wat|sql)$/.test(language));
  const hasPseudocode = languages.some(language => /^(?:pseudo|pseudocode)$/.test(language));
  return {
    path,
    category: isReference ? 'reference-or-navigation' : 'technical',
    teaching: executableExamples.length ? 'inline-code-not-independently-verified'
      : codeLinks.length ? 'linked-implementation'
      : hasPseudocode ? 'explicit-pseudocode' : languages.length ? 'configuration-or-command-example' : 'needs-implementation-guidance',
    languages: [...new Set(languages)], codeLinks,
    // A fenced snippet is evidence of an example, never evidence of successful execution.
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

export function teachingSection(content, anchor) {
  const lines = content.split('\n');
  const start = lines.findIndex(line => /^#{2,4}\s/.test(line) && line.includes(`{#${anchor}}`));
  assert.ok(start >= 0, `missing teaching section ${anchor}`);
  const level = lines[start].match(/^#+/)[0].length;
  let end = start + 1;
  let inFence = false;
  for (; end < lines.length; end++) {
    if (/^\s*```/.test(lines[end])) inFence = !inFence;
    const heading = !inFence && lines[end].match(/^(#{1,6})\s/);
    if (heading && heading[1].length <= level) break;
  }
  return lines.slice(start + 1, end).join('\n');
}

export function buildLedger() {
  const records = new Map();
  const examples = [];
  const reports = groups.map(group => {
    const report = JSON.parse(read(`docs/assets/research/implementation-${group}-20261013.json`));
    validateResearch(report);
    const catalog = JSON.parse(read(`scripts/implementation-labs/${group}/catalog.json`));
    validateCatalog(catalog, { agent: 'A', frontend: 'F', systems: 'S' }[group]);
    examples.push(...catalog);
    for (const page of report.pages) {
      assert.ok(!records.has(page.path), `overlapping ownership ${page.path}`);
      const text = read(page.path);
      assert.ok(text.includes(`{#${page.sectionAnchor}}`), `${page.path}: missing teaching anchor`);
      assert.equal(classifyPage(page.path, text).category, 'technical',
        `${page.path}: navigation/reference pages do not count as substantive technical revisions`);
      const section = teachingSection(text, page.sectionAnchor);
      assert.match(section, /```(?:js|javascript|ts|typescript|tsx|jsx|python|go|rust|html|css|sql|wat|pseudocode)\b/,
        `${page.path}: show key implementation code or explicitly labeled pseudocode, not only a source link`);
      const explanation = section.replace(/```[\s\S]*?```/g, '').replace(/\]\([^)]*\)/g, ']').trim();
      assert.ok([...explanation].length >= 350,
        `${page.path}: explain the chosen state, implementation steps and a failure case`);
      assert.match(text, /^tags:/m, `${page.path}: missing tags`);
      assert.match(text, /^date: \d{4}-\d{2}-\d{2}$/m, `${page.path}: missing date`);
      const description = text.match(/^description:\s*(.+)$/m)?.[1].replace(/^['"]|['"]$/g, '');
      assert.ok(description && [...description].length >= 60 && [...description].length <= 160,
        `${page.path}: description must be 60–160 characters`);
      assert.match(text, /^level: (entry|intermediate|advanced|reference)$/m);
      assert.match(text, /^prerequisites:/m);
      assert.match(text, /^runnable: (true|false)$/m);
      if (/^verified_at:/m.test(text)) assert.match(text, /^verified_at: \d{4}-\d{2}-\d{2}$/m);
      if (/^runnable: true$/m.test(text)) {
        assert.match(text, /^tested_with:/m);
      }
      records.set(page.path, { ...page, checkedAt: report.verified_at });
    }
    return { group, verified_at: report.verified_at, scope: report.scope, pages: report.pages.length };
  });
  assert.ok(records.size >= 90, 'expected at least 90 substantive page revisions');
  const topics = [...new Set([...records.keys()].map(path => path.split('/')[1]))].sort();
  assert.ok(topics.length >= 20, 'expected at least 20 topic directories');
  const ids = new Set(examples.map(entry => entry.id));
  assert.equal(ids.size, examples.length, 'implementation IDs must be globally unique');
  for (const entry of examples) {
    const [docPath, anchor] = entry.doc.split('#');
    assert.ok(read(docPath).includes(`{#${anchor}}`), `${entry.id}: missing anchor`);
    assert.ok(records.has(docPath), `${entry.id}: no dated evidence record for its teaching page`);
    for (const field of ['source', 'test']) {
      const [file, symbol] = entry[field].split('#');
      assert.ok(existsSync(resolve(root, file)), `${entry.id}: missing ${field} file ${file}`);
      if (symbol) assert.ok(read(file).includes(symbol), `${entry.id}: missing symbol/test ${symbol}`);
    }
  }
  for (const record of records.values()) {
    for (const id of record.implementationIds) assert.ok(ids.has(id), `${record.path}: unknown implementation ${id}`);
  }
  const pages = walk(resolve(root, 'docs')).map(file => {
    const path = relative(root, file).replaceAll('\\', '/');
    const entry = classifyPage(path, read(path));
    const reviewed = records.get(path);
    return reviewed ? { ...entry, revisedSection: reviewed.sectionAnchor,
      evidenceCheckedAt: reviewed.checkedAt, implementationIds: reviewed.implementationIds } : entry;
  });
  assert.ok(pages.length >= 539, 'baseline pages must not disappear');
  return {
    baseline_commit: '433629bec6e4c2accbbcf85750a0e387ffdb1afb',
    method: 'Structural inventory for every page; dated primary evidence only for named revised sections. Neither snippet presence nor source links prove full-page factual accuracy.',
    revisedPages: records.size, topics, implementations: examples.length, reports, pages,
  };
}

function main() {
  const ledger = buildLedger();
  const output = JSON.stringify(ledger, null, 2) + '\n';
  if (process.argv.includes('--write')) writeFileSync(resolve(root, ledgerPath), output);
  else assert.equal(read(ledgerPath), output, 'coverage ledger is stale; regenerate with --write');
  const gaps = ledger.pages.filter(page => page.category === 'technical' && page.teaching === 'needs-implementation-guidance');
  assert.equal(gaps.length, 0, `technical pages without any guidance: ${gaps.map(page => page.path).join(', ')}`);
  for (const report of ledger.reports) {
    const age = (Date.now() - Date.parse(report.verified_at)) / 86400000;
    if (age > 90) console.warn(`RECHECK ${report.group}: ${report.verified_at} evidence is ${Math.floor(age)} days old. Do not describe it as latest without a new official-source check.`);
  }
  console.log(`PASS implementation teaching: ${ledger.pages.length} inventoried pages; ${ledger.revisedPages} revised pages; ${ledger.topics.length} topics; ${ledger.implementations} runnable entries`);
  console.log('Run the behavior suites separately. The inventory deliberately does not claim every old snippet was tested.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
