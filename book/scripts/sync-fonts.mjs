// 把 npm 里的开源字体（SIL OFL 1.1）同步到 docs/assets/fonts/，并生成统一的 fonts.css。
// 网站与 PDF 共用这一套字体文件；woff2 体积大，因此不入库，由 CI 在构建前执行本脚本。
//
// 用法：cd book && npm ci && node scripts/sync-fonts.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const NM = join(HERE, "../node_modules/@fontsource");
const OUT = join(ROOT, "docs/assets/fonts");

// 家族 → 需要的字重与字符集（中文字体按 unicode-range 已切片，浏览器只下载用到的片）
const FAMILIES = [
  { pkg: "noto-serif-sc", weights: [400, 600, 700], subsets: null },
  { pkg: "noto-sans-sc", weights: [400, 500, 700], subsets: null },
  { pkg: "inter", weights: [400, 500, 600, 700], subsets: ["latin", "latin-ext"] },
];

mkdirSync(OUT, { recursive: true });
let css = "/* 自动生成：book/scripts/sync-fonts.mjs。字体均为 SIL OFL 1.1 许可。 */\n";
let copied = 0;
for (const fam of FAMILIES) {
  const dir = join(NM, fam.pkg);
  if (!existsSync(dir)) throw new Error(`缺少 ${fam.pkg}，请先 npm ci`);
  mkdirSync(join(OUT, fam.pkg), { recursive: true });
  for (const w of fam.weights) {
    // 中文字体用 <weight>.css（含全部切片）；拉丁字体按子集取 <subset>-<weight>.css
    const sheets = fam.subsets ? fam.subsets.map((s) => `${s}-${w}.css`) : [`${w}.css`];
    for (const sheet of sheets) {
      const p = join(dir, sheet);
      if (!existsSync(p)) continue;
      let t = readFileSync(p, "utf8");
      t = t.replace(/src:\s*url\(\.\/files\/([^)]+?\.woff2)\)\s*format\('woff2'\)[^;]*;/g, (m, f) => {
        const src = join(dir, "files", f), dst = join(OUT, fam.pkg, f);
        if (existsSync(src) && !existsSync(dst)) { copyFileSync(src, dst); copied++; }
        return `src: url(./${fam.pkg}/${f}) format('woff2');`;
      });
      css += t + "\n";
    }
  }
  const lic = join(dir, "LICENSE");
  if (existsSync(lic)) copyFileSync(lic, join(OUT, fam.pkg, "LICENSE"));
}
writeFileSync(join(OUT, "fonts.css"), css);
console.log(`字体已同步：${copied} 个 woff2 → docs/assets/fonts/，fonts.css ${(css.length / 1024).toFixed(0)}KB`);
