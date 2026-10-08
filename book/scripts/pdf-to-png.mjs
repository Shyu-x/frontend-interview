// 把 PDF 的指定页渲染成 PNG，供人工目检。用法：node scripts/pdf-to-png.mjs dist/vol01.pdf 输出前缀 1 4 11
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
const HERE = dirname(fileURLToPath(import.meta.url));
const [file, prefix, ...pages] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const lib = join(HERE, "..", "node_modules/pdfjs-dist/build");
const b64 = readFileSync(file).toString("base64");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
const host = join(HERE, "..", "dist", "pdf-viewer.html");
writeFileSync(host, "<!doctype html><meta charset=utf-8><body></body>");
await page.goto("file://" + host);
const worker = join(lib, "pdf.worker.min.mjs");
await page.addScriptTag({ type: "module", content: `import * as pdfjs from "file://${join(lib, "pdf.min.mjs")}"; pdfjs.GlobalWorkerOptions.workerSrc = "file://${worker}"; window.__pdfjs = pdfjs;` });
await page.waitForFunction(() => window.__pdfjs, { timeout: 30000 });
for (const n of pages.map(Number)) {
  const data = await page.evaluate(async (b64, n) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const doc = await window.__pdfjs.getDocument({ data: bin }).promise;
    const p = await doc.getPage(n), vp = p.getViewport({ scale: 1.6 });
    const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
    await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    return c.toDataURL("image/png").split(",")[1];
  }, b64, n);
  writeFileSync(`${prefix}-${n}.png`, Buffer.from(data, "base64"));
  console.log(`${prefix}-${n}.png`);
}
await browser.close();
