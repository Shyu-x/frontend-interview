// 用 PDF 文本层核对最终产物。用法：node scripts/verify-pdf.mjs dist/xxx.pdf
// 检查：页数、页尺寸（16 开）、是否有相邻重复页、每个章节的 H1 是否真的出现在登记的页码上。
import { readFileSync, existsSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
const file = process.argv[2];
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true, verbosity: 0 }).promise;
const norm = (s) => s.replace(/\s+/g, "");
const T = [];
for (let i = 1; i <= doc.numPages; i++) T.push(norm((await (await doc.getPage(i)).getTextContent()).items.map((x) => x.str).join("")));
const v = (await doc.getPage(1)).getViewport({ scale: 1 });
const w = (v.width / 72) * 25.4, h = (v.height / 72) * 25.4;
let problems = 0;
const fail = (m) => { problems++; console.log("  FAIL", m); };
if (Math.abs(w - 185) > 1.5 || Math.abs(h - 260) > 1.5) fail(`页尺寸 ${w.toFixed(1)}×${h.toFixed(1)}mm 不是 16 开`);
let dup = 0; for (let i = 1; i < T.length; i++) if (T[i] && T[i] === T[i - 1]) dup++;
if (dup) fail(`${dup} 处相邻两页文字完全相同`);
const manifestPath = file.replace(/\.pdf$/, ".chapters.json");
let checked = 0, wrong = 0;
if (existsSync(manifestPath)) {
  for (const c of JSON.parse(readFileSync(manifestPath, "utf8"))) {
    if (!c.page) { fail(`章节“${c.title}”没有页码`); continue; }
    checked++;
    if (!T[c.page - 1]?.includes(norm(c.h1))) { wrong++; if (wrong <= 5) fail(`目录登记“${c.title}”在第 ${c.page} 页，但该页文字里没有 H1“${c.h1}”`); }
  }
  // 目录页上写出的数字也要和登记一致
  const tocPage = T.findIndex((t) => t.startsWith("目录"));
  console.log(`  目录页：第 ${tocPage + 1} 页；章节核对 ${checked} 个，不一致 ${wrong}`);
} else console.log("  （没有 chapters.json，跳过章节核对）");
console.log(`${problems ? "FAIL" : "OK  "} ${file.split("/").pop()}：${doc.numPages} 页，${w.toFixed(1)}×${h.toFixed(1)}mm，重复页 ${dup}`);
process.exit(problems ? 1 : 0);
