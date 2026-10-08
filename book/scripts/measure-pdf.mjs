// 量 PDF 里文字的实际位置（mm），用来发现"整页被缩放"这类肉眼难察觉的问题。
// 用法：node scripts/measure-pdf.mjs dist/vol01.pdf [页码...]
import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
const [file, ...rest] = process.argv.slice(2);
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
const pages = rest.length ? rest.map(Number) : [1, 4, 11, 12];
const MM = 25.4 / 72;
for (const n of pages) {
  if (n > doc.numPages) continue;
  const p = await doc.getPage(n), vp = p.getViewport({ scale: 1 }), tc = await p.getTextContent();
  const items = tc.items.filter((i) => i.str.trim());
  if (!items.length) { console.log(`第 ${n} 页：无文字，页面 ${(vp.width * MM).toFixed(1)}×${(vp.height * MM).toFixed(1)}mm`); continue; }
  const x0 = Math.min(...items.map((i) => i.transform[4])), x1 = Math.max(...items.map((i) => i.transform[4] + i.width));
  const y = items.map((i) => vp.height - i.transform[5]), top = Math.min(...y), bot = Math.max(...y);
  const fs = items.map((i) => Math.hypot(i.transform[0], i.transform[1])).sort((a, b) => a - b)[Math.floor(items.length / 2)];
  console.log(`第 ${n} 页：${(vp.width * MM).toFixed(1)}×${(vp.height * MM).toFixed(1)}mm  文字左 ${(x0 * MM).toFixed(1)}  右 ${(x1 * MM).toFixed(1)}  上 ${(top * MM).toFixed(1)}  下 ${(bot * MM).toFixed(1)}  字号中位数 ${fs.toFixed(2)}pt`);
}
