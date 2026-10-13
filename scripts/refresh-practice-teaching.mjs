// Mechanical migration: keep source records available to the bank checker,
// but remove repeated provenance labels from the reader's practice flow.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { parseQuestions, loadBank, makeManifest } from './check-handwritten-bank.mjs';
const folder = new URL('../docs/coding/', import.meta.url);
const routes = {
  'ui-components': '[DOM 与键盘交互](workshop-web-dom.md)',
  'async-orchestration': '[浏览器异步](workshop-web-async.md)和[真线程池](workshop-node-workers-streams.md)',
  'framework-state': '[业务状态](workshop-web-business.md)和[缓存实现](workshop-web-engineering.md)',
  'compilers-tooling': '[表达式解析](workshop-web-engineering.md)和[构建图](workshop-node-build-config.md)',
  'node-http': '[HTTP 实现](workshop-node-http-lifecycle.md)和[流与背压](workshop-node-workers-streams.md)',
  'databases-transactions': '[幂等与共享加载](workshop-node-service-resilience.md)和[CAS 模型](handwritten-challenge-solutions.md)',
  'auth-security': '[请求边界](workshop-go-http.md)和[签名与输入校验](workshop-node-service-resilience.md)',
  'distributed-sync': '[业务状态](workshop-web-business.md)和[场景专题](real-interview-scenarios.md)',
  'algorithms-structures': '[Go 数据结构](workshop-go-structures.md)和[窗口与版本比较](autumn-exam-algorithms.md)',
  'parsers-protocols': '[SSE 与 HTTP](workshop-node-http-lifecycle.md)和[文件解析](workshop-go-streams.md)',
  'graphics-media': '[命中检测与帧调度](workshop-web-engineering.md)和[动画引擎](animation-engine-handwritten.md)',
  'runtime-memory': '[资源转移与线程池](workshop-node-workers-streams.md)和[Go 生命周期](workshop-go-lifecycle.md)',
};
for (const file of readdirSync(folder).filter(name => /^practice-.*\.md$/.test(name))) {
  const path = new URL(file, folder);
  let text = readFileSync(path, 'utf8');
  // Unwrap a previous migration first so running this maintenance step twice
  // cannot nest HTML comments and accidentally expose the source record.
  text = text.replace(/<!-- Reference record \(not teaching text\):\n(- \*\*依据与状态：\*\*[^\n]+)\n-->/g, '$1');
  if (!text.includes('<!-- Question record')) text = text.replace(/^- \*\*依据与状态：\*\*(.*)$/gm,
    '<!-- Reference record (not teaching text):\n- **依据与状态：**$1\n-->');
  text = text.replace(/\n## 五层练(?:习|题)法[^\n]*\n[\s\S]*?(?=\n## )/, '\n');
  text = text.replace(/\n## 面试口述\n[\s\S]*?(?=\n## )/, '\n');
  text = text.replace(/\n\*\*30 秒回答：\*\*[^\n]+\n/g, '\n');
  text = text.replace(/\n\*\*2 分钟回答：\*\*[^\n]+\n/g, '\n');
  text = text.replace(/\n真实验收边界：[^\n]+\n/g, '\n');
  text = text.replace('## 错误对比、口述与验收', '## 常见错误');
  text = text.replace(/题目是作者原创派生练习，不代表公司真题。/g, '');
  text = text.replace(/题目为作者原创的机制练习，不是公司真题，也不提供生产级 HTTP 或安全库。/g, '');
  text = text.replace(/本页为作者原创派生练习，题目未实现、未运行，也不代表任何公司的真实面试题。/g, '');
  text = text.replace(/^- S03\/S04 是机制参考标签；[^\n]+\n/gm, '');
  text = text.replace(/\n## (?:实际验收边界|未实现题面的验收边界|面试作答)\n[\s\S]*?(?=\n## |$)/g, '\n');
  if (!text.includes('<!-- Solution routes -->')) {
    const route = routes[file.slice('practice-'.length, -'.md'.length)];
    text = text.replace(/^(# [^\n]+\n)/m,
      `$1\n<!-- Solution routes -->\n先跟着代码写一遍，可读${route}。下方练习再增加新约束。\n`);
  }
  if (!text.includes('<!-- Question record')) {
    const questions = parseQuestions(text, file);
    for (const question of questions) {
      const f = question.fields;
      const record = Object.entries(f).map(([key, value]) => `- **${key}：**${value}`).join('\n');
      const teaching = [f['题目契约'], f['约束与不变量'],
        `- ${f['用例 A']}\n- ${f['用例 B']}`,
        f['实现提示'], f['进阶追问'], f['难度 / 建议时长']].join('\n\n');
      text = text.replace(question.body, `${teaching}\n\n<!-- Question record (index metadata)\n${record}\n-->`);
    }
  }
  writeFileSync(path, text);
}
const legacy = new URL('handwritten-question-catalog.md', folder);
let text = readFileSync(legacy, 'utf8');
text = text.replace(/^### (\d+)\. (.+)｜(.+)$/gm,
  '### $1. $2\n\n<!-- Original catalog attribution: $3 -->');
text = text.replace(/\n面试现场最常见的失分[\s\S]*?(?=\n建议先看)/,
  '\n每题给出输入输出、关键规则和容易遗漏的测试。先尝试独立实现，再与[代码实战路线](coding-fluency.md)里的完整题解比较。\n');
if (!text.includes('<!-- Legacy question record')) {
  for (const question of parseQuestions(text, 'handwritten-question-catalog.md', true)) {
    const f = question.fields;
    const attribution = question.body.match(/<!-- Original catalog attribution:[^\n]*-->/)?.[0] ?? '';
    const record = Object.entries(f).map(([key, value]) => `- **${key}：**${value}`).join('\n');
    const prose = [f['约束与输入输出'], f['核心不变量'], f['易错测试'],
      f['难度/限时'].replaceAll('**实现路径：**', ' 可继续阅读 ')].join('\n\n');
    text = text.replace(question.body, `${prose}\n\n${attribution}\n<!-- Legacy question record\n${record}\n-->`);
  }
}
writeFileSync(legacy, text);
const sources = new URL('handwritten-practice-sources.md', folder);
text = readFileSync(sources, 'utf8');
text = text.replace(/^title: .+$/m, 'title: 手写练习参考资料');
text = text.replace(/# 手写题来源与证据[^\n]*\n[\s\S]*?(?=## 公开练习入口)/,
  '# 手写练习参考资料\n\n按主题查规范、项目文档和公开练习。企业题型见[企业索引](company-question-playbook.md)，具体面经记录保存在[登记表](../assets/research/interview-provenance-20261012.json)。\n\n');
writeFileSync(sources, text);
const bank = loadBank();
if (bank.errors.length) throw new Error(bank.errors.join('\n'));
writeFileSync(new URL('../docs/assets/research/handwritten-bank-360.json', import.meta.url), `${JSON.stringify(makeManifest(bank.questions), null, 2)}\n`);
