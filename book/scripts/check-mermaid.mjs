// 用真实的 Mermaid 解析器逐张检查 docs/ 里的图，输出 文件:行号 与报错首行。
// 用法：node scripts/check-mermaid.mjs [docs目录]    （有失败时退出码 1）
import { readdirSync, readFileSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DOCS = process.argv[2] || join(ROOT, "docs");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : []; });
const blocks = [];
for (const f of walk(DOCS)) {
  if (f.endsWith("MERMAID_BEST_PRACTICES.md")) continue; // 故意收录错误写法作反例
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(`{3,}|~{3,})\s*mermaid\b/);
    if (!m) continue;
    const indent = m[1].length, fence = m[2];
    const body = [];
    let j = i + 1;
    while (j < lines.length && !lines[j].trim().startsWith(fence)) body.push(lines[j].slice(indent)), j++;
    blocks.push({ file: relative(ROOT, f), line: i + 1, src: body.join("\n") });
    i = j;
  }
}

const profile = mkdtempSync(join(tmpdir(), "check-mermaid-"));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 0, userDataDir: profile, args: ["--no-sandbox"] });
let bad = [];
try {
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ path: join(HERE, "..", "node_modules/mermaid/dist/mermaid.min.js") });
  bad = await page.evaluate(async (blocks) => {
    window.mermaid.initialize({ startOnLoad: false });
    const out = [];
    for (const b of blocks) {
      try { await window.mermaid.parse(b.src); }
      catch (e) { { const msg = String(e.message || e); const n = +(msg.match(/line (\d+)/) || [])[1]; out.push({ file: b.file, line: b.line, err: msg.split("\n")[0], at: n ? b.src.split("\n")[n - 1] : "" }); } }
    }
    return out;
  }, blocks);
} finally {
  await browser.close().catch(() => {});
  rmSync(profile, { recursive: true, force: true });
}
for (const b of bad) console.log(`${b.file}:${b.line}  ${b.err}  ⟶ ${(b.at || "").trim()}`);
console.log(`${blocks.length} 张图，${bad.length} 张解析失败`);
process.exit(bad.length ? 1 : 0);
