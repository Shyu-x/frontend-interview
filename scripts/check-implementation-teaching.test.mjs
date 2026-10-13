import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPage, validateCatalog, validateResearch, teachingSection } from './check-implementation-teaching.mjs';

const catalog = () => Array.from({ length: 12 }, (_, index) => ({
  id: `F${String(index + 1).padStart(3, '0')}`, title: `Independent example ${index}`,
  source: `scripts/implementation-labs/frontend/models.mjs#example${index}`,
  test: `scripts/implementation-labs/frontend/models.test.mjs#example${index}`,
  doc: `docs/js/example-${index}.md#handwrite-example`, scenario: `Distinct scenario ${index}`,
}));
const research = () => ({ verified_at: '2026-10-13', scope: 'Only the named new sections are checked, not the entire old page.',
  pages: Array.from({ length: 30 }, (_, index) => ({ path: `docs/js/page-${index}.md`,
    sectionAnchor: 'handwrite-example', implementationIds: [],
    sources: [{ url: 'https://tc39.es/ecma262/', claim: 'The explicitly stated operation semantics are checked against this clause.', version: 'living standard checked 2026-10-13' }],
  })),
});

test('catalog accepts independent complete pointers', () => validateCatalog(catalog(), 'F'));
test('catalog rejects duplicate IDs even with different scenarios', () => {
  const entries = catalog(); entries[1].id = entries[0].id;
  assert.throws(() => validateCatalog(entries, 'F'), /duplicate/);
});
test('catalog rejects repeated scenarios used to inflate the count', () => {
  const entries = catalog(); entries[1].scenario = entries[0].scenario;
  assert.throws(() => validateCatalog(entries, 'F'), /distinct/);
});
test('catalog rejects document references without stable anchors', () => {
  const entries = catalog(); entries[0].doc = 'docs/js/example.md';
  assert.throws(() => validateCatalog(entries, 'F'));
});
test('research accepts a dated explicitly scoped evidence report', () => validateResearch(research(), '2026-10-13'));
test('research rejects future verification dates', () => {
  const report = research(); report.verified_at = '2026-10-14';
  assert.throws(() => validateResearch(report, '2026-10-13'), /future/);
});
test('research rejects duplicated reviewed pages', () => {
  const report = research(); report.pages[1] = report.pages[0];
  assert.throws(() => validateResearch(report, '2026-10-13'), /duplicate/);
});
test('research rejects a link without a checked claim', () => {
  const report = research(); report.pages[0].sources[0].claim = '';
  assert.throws(() => validateResearch(report, '2026-10-13'), /claim/);
});
test('research rejects evidence that omits its version or date', () => {
  const report = research(); report.pages[0].sources[0].version = '';
  assert.throws(() => validateResearch(report, '2026-10-13'), /version/);
});
test('an old fenced snippet is not labeled as verified execution', () => {
  assert.equal(classifyPage('docs/js/scope.md', '```js\nconsole.log(1);\n```').teaching,
    'inline-code-not-independently-verified');
});
test('explicit pseudocode has its own status', () => {
  assert.equal(classifyPage('docs/network/transport.md', '```pseudocode\nretry with a new ID\n```').teaching,
    'explicit-pseudocode');
});
test('a navigation page is not treated as a missing implementation', () => {
  assert.equal(classifyPage('docs/runtime/index.md', '# Runtime').category, 'reference-or-navigation');
});
test('linked runnable code and prose-only technical pages remain distinct', () => {
  assert.equal(classifyPage('docs/coding/workshop.md', '[Source](https://github.com/x/y/blob/abc/lab.go)').teaching,
    'linked-implementation');
  assert.equal(classifyPage('docs/network/transport.md', '# Transport').teaching,
    'needs-implementation-guidance');
});
test('section extraction keeps nested explanations and stops before the next peer', () => {
  const text = '## First {#handwrite-first}\nWhy\n### Nested\nCode\n## Second\nUnrelated';
  assert.equal(teachingSection(text, 'handwrite-first'), 'Why\n### Nested\nCode');
});
test('section extraction does not mistake code headings for document headings', () => {
  const text = '## First {#handwrite-first}\n```pseudocode\n## inside code\n```\nDone\n## Second';
  assert.match(teachingSection(text, 'handwrite-first'), /Done/);
});
test('missing section cannot borrow unrelated code from an old part of a page', () => {
  assert.throws(() => teachingSection('## Older\n```js\nconsole.log(1)\n```', 'handwrite-missing'), /missing/);
});
