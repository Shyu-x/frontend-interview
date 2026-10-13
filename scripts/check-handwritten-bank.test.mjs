import test from 'node:test';
import assert from 'node:assert/strict';
import { labels, parseQuestions, validateQuestions, makeManifest } from './check-handwritten-bank.mjs';

function fixture() {
  const fields = Object.fromEntries(labels.map(label => [label, `${label}的可观察合同和明确边界均在这个具体测试记录中声明。`]));
  fields['用例 A'] = '输入数组[1,2]，输出必须保持顺序为[1,2]。';
  fields['用例 B'] = '输入空数组[]，输出空数组并且没有调度任何任务。';
  fields['依据与状态'] = '作者自主设计练习，未实现/未实跑，机制参考有独立记录。';
  return { id: 'H001', title: '可验证的题目', legacy: false, file: 'fixture.md',
    body: labels.map(label => `- **${label}：**${fields[label]}`).join('\n'), fields, refs: ['s01'] };
}
const sources = new Set(['s01']);

test('accepts a complete contract and rejects a missing or short field', () => {
  assert.deepEqual(validateQuestions([fixture()], sources, 1), []);
  const broken = fixture();
  delete broken.fields['用例 B'];
  assert.match(validateQuestions([broken], sources, 1).join('\n'), /missing\/short 用例 B/);
});
test('rejects duplicate IDs, normalized titles and verbatim contracts', () => {
  assert.match(validateQuestions([fixture(), fixture()], sources, 1).join('\n'), /duplicate ID/);
  const second = { ...fixture(), id: 'H002', title: '可 验证的题目' };
  assert.match(validateQuestions([fixture(), second], sources, 2).join('\n'), /duplicate normalized title/);
  assert.match(validateQuestions([fixture(), second], sources, 2).join('\n'), /repeated contract/);
});
test('rejects repeated cases, unknown source and missing implementation boundary', () => {
  const broken = fixture();
  broken.fields['用例 B'] = broken.fields['用例 A'];
  broken.fields['依据与状态'] = '此处未标明来源性质，且未声明实现的边界和实际验证范围。';
  broken.refs = ['s99'];
  const errors = validateQuestions([broken], sources, 1).join('\n');
  assert.match(errors, /repeated test case/);
  assert.match(errors, /unknown source/);
  assert.match(errors, /missing original-design/);
  assert.match(errors, /missing implementation boundary/);
});
test('counts contiguous IDs rather than headings or repeated variants', () => {
  const broken = { ...fixture(), id: 'H002' };
  assert.match(validateQuestions([broken], sources, 2).join('\n'), /missing H001/);
  assert.match(validateQuestions([broken], sources, 2).join('\n'), /found 1/);
});
test('parses complete field bodies without consuming the next section', () => {
  const text = '### H049. 边界\n\n- **用例 A：**输入1，输出2。\n\n## 其他\n\n不是题目';
  const [question] = parseQuestions(text, 'page.md');
  assert.equal(question.id, 'H049');
  assert.equal(question.fields['用例 A'], '输入1，输出2。');
  assert.equal(question.body.includes('不是题目'), false);
});
test('supports the original 48-question format without inventing new fields', () => {
  const text = '### 1. 旧题｜派生练习\n\n- **约束与输入输出：**输入1输出2\n- **核心不变量：**顺序\n- **易错测试：**空输入\n- **难度/限时：**中25分钟';
  const records = parseQuestions(text, 'legacy.md', true);
  assert.deepEqual(validateQuestions(records, sources, 1), []);
});
test('manifest changes after an actual contract edit and rejects placeholders', () => {
  const question = fixture();
  const before = makeManifest([question]).questions[0].contract_sha256;
  question.body += '\n新约束';
  assert.notEqual(makeManifest([question]).questions[0].contract_sha256, before);
  question.body += '\n通过代次检查忽略过期结果，这是完整失败语义而不是省略。';
  assert.deepEqual(validateQuestions([question], sources, 1), []);
  question.body += '\nTODO';
  assert.match(validateQuestions([question], sources, 1).join('\n'), /placeholder/);
});
test('source anchors require an exact ID and must occur in the evidence field', () => {
  const wrong = parseQuestions('### H001. 来源边界\n\n- **依据与状态：**[错误](handwritten-practice-sources.md#s010)\n- **实现提示：**[外部](handwritten-practice-sources.md#s01)', 'fixture.md');
  assert.deepEqual(wrong[0].refs, []);
  const right = parseQuestions('### H001. 来源边界\n\n- **依据与状态：**[正确](handwritten-practice-sources.md#s01)', 'fixture.md');
  assert.deepEqual(right[0].refs, ['s01']);
});
test('duplicate fields are rejected instead of silently accepting the last value', () => {
  const original = fixture();
  const parsed = parseQuestions(`### H001. 重复字段\n\n${original.body}\n- **用例 A：**重复的正常输入不会消除前一字段的问题。`, 'fixture.md');
  assert.match(validateQuestions(parsed, sources, 1).join('\n'), /duplicate field 用例 A/);
});
test('implemented but unexecuted does not become an executed model', () => {
  const question = fixture();
  question.fields['依据与状态'] = '作者已实现，但未实跑，不能视为通过验收。';
  assert.equal(makeManifest([question]).questions[0].implementation_status, 'contract_only');
  question.fields['依据与状态'] = '作者已实现并实跑，具体范围见测试说明。';
  assert.equal(makeManifest([question]).questions[0].implementation_status, 'implemented_model');
});

test('reader prose and hidden index records preserve complete question fields', () => {
  const original = fixture();
  original.fields['依据与状态'] += ' [参考](handwritten-practice-sources.md#s01)';
  const metadata = labels.map(label => `- **${label}：**${original.fields[label]}`).join('\n');
  const [question] = parseQuestions(`### H001. 可验证的题目\n\n先写出完整实现。\n\n<!-- Question record\n${metadata}\n-->`, 'page.md');
  assert.deepEqual(validateQuestions([question], sources, 1), []);
  assert.equal(question.fields['用例 A'], original.fields['用例 A']);
  assert.deepEqual(question.refs, ['s01']);
});
