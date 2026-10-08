// 把站点构建产物（site/）排版为 PDF 书籍。
//
// 流程：读 site/book-manifest.json（导航树）→ 取每页 <article> 正文 → 清洗并改写链接
//       → 按"册"拼成一个 HTML → 在 Chromium 里渲染 Mermaid → 用 Paged.js 分页 → 导出 PDF
//
// 用法：
//   node build.mjs                 构建所有分册与全集
//   node build.mjs --volume 3      只构建第 3 册
//   node build.mjs --sample        样张：每册只取前 3 页，用于调版式
//   node build.mjs --html-only     只生成 HTML，不出 PDF（调试用）
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SITE = join(ROOT, "site");
import { planVolumes } from "./volumes.mjs";
const DIST = join(HERE, "dist");
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);

const manifest = JSON.parse(readFileSync(join(SITE, "book-manifest.json"), "utf8"));
const BASE = manifest.base;

// ---------- 分册：按主题拆分，规则见 volumes.mjs ----------
const TOP = manifest.tree.filter((n) => n.type === "section");
const VOLUMES = planVolumes(manifest, SITE);
const FULL = { no: 0, slug: "full", title: "全集", nodes: TOP };

// ---------- 工具 ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function pagesOf(node, out = []) {
  if (node.type === "page") out.push(node);
  else node.children.forEach((c) => pagesOf(c, out));
  return out;
}
const pageId = (url) => "p-" + url.replace(/\/index\.html$/, "").replace(/[^\w一-鿿]+/g, "-").replace(/^-|-$/g, "");

function extractArticle(html) {
  const m = html.match(/<article class="md-content__inner md-typeset">([\s\S]*?)<\/article>/);
  return m ? m[1] : "";
}

// 清洗：去掉锚点、复制按钮、自带的行内脚本；展开折叠块；改写图片与站内链接
function cleanup(html, url, idOf) {
  let h = html
    .replace(/<a class="headerlink"[^>]*>.*?<\/a>/g, "")
    .replace(/<button class="md-clipboard[\s\S]*?<\/button>/g, "")
    .replace(/<nav class="md-code__nav">[\s\S]*?<\/nav>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<details class="([^"]*)"/g, '<details open class="$1"')
    .replace(/<details>/g, "<details open>");
  // 站内链接 → 书内锚点（带 # 的保留片段，页面不存在的退回为纯文本）
  h = h.replace(/<a href="([^"#][^"]*?)(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (all, href, frag, rest, inner) => {
    if (/^(https?:|mailto:|tel:)/.test(href)) return all;
    let target;
    try { target = new URL(href, BASE + url).pathname; } catch { return inner; }
    const rel = target.replace(new URL(BASE).pathname, "").replace(/^\//, "");
    const key = rel.endsWith("/") || rel === "" ? rel + "index.html" : rel;
    const id = idOf.get(key) || idOf.get(key.replace(/\.html$/, "/index.html"));
    if (!id) return inner;
    return `<a href="#${id}"${rest}>${inner}</a>`;
  });
  // 图片：相对路径 → 绝对 file 路径
  h = h.replace(/<img([^>]*?)src="([^"]+)"/g, (all, pre, src) => {
    if (/^(https?:|data:)/.test(src)) return all;
    const abs = join(SITE, dirname(url), src);
    return `<img${pre}src="${pathToFileURL(abs).href}"`;
  });
  return h;
}

function renderNode(node, depth, idOf, ctx, trail = []) {
  if (node.type === "page") {
    const file = join(SITE, node.url);
    if (!existsSync(file)) return "";
    const body = cleanup(extractArticle(readFileSync(file, "utf8")), node.url, idOf);
    ctx.count++;
    const key = trail.join(" / ");
    let kicker = "";
    if (key && !ctx.shown.has(key)) {
      ctx.shown.add(key);
      kicker = `<div class="kicker">${esc(trail.join("  ·  "))}</div>`;
    }
    return `<section class="chapter" id="${idOf.get(node.url)}" data-title="${esc(node.title)}">${kicker}${body}</section>`;
  }
  const next = depth === 0 ? trail : [...trail, node.title];
  const kids = node.children.map((c) => renderNode(c, depth + 1, idOf, ctx, next)).join("\n");
  if (!kids.trim()) return "";
  if (depth === 0) return `<div class="part-wrap"><h1 class="part-title">${esc(node.title)}</h1>\n${kids}</div>`;
  return kids;
}

function renderToc(nodes, depth = 0) {
  const items = nodes
    .map((n) => {
      if (n.type === "page") return `<li class="toc-page"><a class="toc-title" href="#${n._id}">${esc(n.title)}</a><span class="toc-dots"></span><a class="toc-num" href="#${n._id}"></a></li>`;
      const inner = renderToc(n.children, depth + 1);
      if (!inner) return "";
      return `<li class="toc-sec toc-d${depth}"><span class="toc-sec-title">${esc(n.title)}</span>${inner}</li>`;
    })
    .join("");
  return items ? `<ul class="toc-list toc-l${depth}">${items}</ul>` : "";
}

function annotateIds(nodes) {
  for (const n of nodes) {
    if (n.type === "page") n._id = pageId(n.url);
    else annotateIds(n.children);
  }
}

function assemble(vol, sample) {
  const nodes = JSON.parse(JSON.stringify(vol.nodes));
  if (sample && !val("--only")) {
    // 样张：每个顶层分区只留前 3 页，便于快速调版式
    // 优先选含 Mermaid 图与代码最多的页，更能暴露排版问题
    const score = (n) => {
      try {
        const h = readFileSync(join(SITE, n.url), "utf8");
        return (h.match(/class="diagram"/g) || []).length * 5 + (h.match(/class="highlight"/g) || []).length + (h.match(/<table/g) || []).length * 2;
      } catch { return 0; }
    };
    const all = [];
    const collect = (arr) => arr.forEach((n) => (n.type === "page" ? all.push(n) : collect(n.children)));
    collect(nodes);
    const keep = new Set(all.sort((a, b) => score(b) - score(a)).slice(0, 4).map((n) => n.url));
    const trim = (arr) => arr.filter((n) => {
      if (n.type === "page") return keep.has(n.url);
      n.children = trim(n.children);
      return n.children.length > 0;
    });
    trim(nodes);
  }
  const onlyPat = val("--only");
  if (onlyPat) {
    const pats = onlyPat.split(",");
    const trim2 = (arr) => arr.filter((n) => {
      if (n.type === "page") return pats.some((q) => n.url.includes(q));
      n.children = trim2(n.children);
      return n.children.length > 0;
    });
    trim2(nodes);
  }
  annotateIds(nodes);
  const idOf = new Map();
  const walk = (arr) => arr.forEach((n) => (n.type === "page" ? idOf.set(n.url, n._id) : walk(n.children)));
  walk(nodes);
  // 站内链接也要能指向不在本册里的页面时退化为文本：idOf 只含本册页面

  const ctx = { count: 0, shown: new Set() };
  const isFull = vol.no === 0;
  const body = nodes.map((n) => renderNode(n, 0, idOf, ctx)).join("\n");
  const updated = manifest.updated.slice(0, 10);
  const volLabel = isFull ? "全集" : `第 ${vol.no} 册`;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(manifest.site)} · ${esc(vol.title)}</title>
<link rel="stylesheet" href="${pathToFileURL(join(HERE, "print.css")).href}">
</head>
<body>
<section class="cover" id="cover">
  <div class="cover-mark"></div>
  <div class="cover-vol">${esc(volLabel)}</div>
  <h1 class="cover-title">${esc(vol.title)}</h1>
  <div class="cover-sub">${esc(manifest.site)}</div>
  <div class="cover-scope">${esc(vol.scope || "")}</div>
  <div class="cover-meta">${ctx.count} 篇 · ${esc(updated)} 版</div>
</section>
<section class="titlepage">
  <h1>${esc(vol.title)}</h1>
  <p class="tp-sub">${esc(manifest.site)}</p>
  <p class="tp-meta">${esc(volLabel)} · ${esc(updated)}</p>
</section>
<section class="colophon">
  <h2>版权与说明</h2>
  <p>本书由 <b>${esc(manifest.site)}</b> 在线教程自动排版生成，内容以在线站点为准：<br>${esc(BASE)}</p>
  <p>版式：Paged.js + Chromium。中文正文为思源宋体（Noto Serif SC），标题为思源黑体（Noto Sans SC），
  代码为 Maple Mono，均为 SIL OFL 1.1 许可的开源字体。</p>
  <p>书中引用第三方开源项目的内容均在对应章节标注来源与许可证。</p>
</section>
<nav class="toc" id="toc"><h1 class="toc-heading">目录</h1>${renderToc(nodes)}</nav>
<main id="book">
${body}
</main>
</body>
</html>`;
  return { html, count: ctx.count };
}


// ---------- 字体：解析站点字体样式表，运行时用 FontFace API 注册 ----------
// 原因：fonts.css 有 600 多条 @font-face，Paged.js 的 CSS 解析器会被拖到几乎停滞。
// FontFace API 注册的字体不经过 Paged.js，浏览器仍按 unicodeRange 只加载用到的切片。
function parseFontFaces(cssPath) {
  const dir = dirname(cssPath);
  const out = [];
  const css = readFileSync(cssPath, "utf8");
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1];
    const get = (k) => (body.match(new RegExp(k + "\\s*:\\s*([^;]+);")) || [])[1]?.trim();
    const url = (get("src") || "").match(/url\(([^)]+)\)/)?.[1]?.replace(/^['"]|['"]$/g, "");
    if (!url) continue;
    out.push({
      family: (get("font-family") || "").replace(/['"]/g, ""),
      weight: get("font-weight") || "400",
      style: get("font-style") || "normal",
      range: get("unicode-range") || "U+0-10FFFF",
      url: pathToFileURL(join(dir, url)).href,
    });
  }
  return out;
}
const FONT_DIR = join(ROOT, "docs/assets/fonts");
const MERGED_DIR = join(HERE, "fonts");
// PDF 字体清单：Noto 用"每字重一个合并文件"（book/fonts/，由 scripts/merge-fonts.py 生成），
// Inter 与 Maple Mono CN 用站点已有的少量切片。Paged.js 面对数百个字体面会卡死或重复排版。
function buildFontFaces() {
  const faces = [];
  const merged = [
    ["noto-serif-sc", "Noto Serif SC", [400, 600, 700]],
    ["noto-sans-sc", "Noto Sans SC", [400, 500, 700]],
  ];
  for (const [pkg, family, weights] of merged) {
    for (const w of weights) {
      const f = join(MERGED_DIR, `${pkg}-${w}.woff2`);
      if (!existsSync(f)) throw new Error(`缺少合并字体 ${f}：请先运行 book/scripts/merge-fonts.py`);
      faces.push({ family, weight: String(w), style: "normal", range: "U+0-10FFFF", url: pathToFileURL(f).href });
    }
  }
  for (const css of ["fonts.css", "maple-mono-cn.css"]) {
    const p = join(FONT_DIR, css);
    if (!existsSync(p)) continue;
    faces.push(...parseFontFaces(p).filter((f) => f.family === "Inter" || f.family === "Maple Mono CN"));
  }
  return faces;
}
const FONT_FACES = buildFontFaces();


// ---------- Paged.js 开本补丁 ----------
// Paged.js 的基础样式把页框默认写成 Letter（8.5in × 11in），在 size 解析未触发"尺寸变化"分支时
// 页框会停留在 Letter。这里生成一份把默认页框改成 16 开的 polyfill 副本；
// 任何一处替换没命中就直接报错，不静默。
function patchedPagedJs() {
  const src = readFileSync(join(HERE, "node_modules/pagedjs/dist/paged.polyfill.js"), "utf8");
  const swaps = [
    [/--pagedjs-width: 8\.5in;/, "--pagedjs-width: 185mm;"],
    [/--pagedjs-height: 11in;/, "--pagedjs-height: 260mm;"],
    [/--pagedjs-width-right: 8\.5in;/, "--pagedjs-width-right: 185mm;"],
    [/--pagedjs-height-right: 11in;/, "--pagedjs-height-right: 260mm;"],
    [/--pagedjs-width-left: 8\.5in;/, "--pagedjs-width-left: 185mm;"],
    [/--pagedjs-height-left: 11in;/, "--pagedjs-height-left: 260mm;"],
    [/--pagedjs-pagebox-width: 8\.5in;/, "--pagedjs-pagebox-width: 185mm;"],
    [/--pagedjs-pagebox-height: 11in;/, "--pagedjs-pagebox-height: 260mm;"],
    // 基础样式里的 @page { size: letter }：Chrome 打印时以最后一条 @page 为准，会把版面按 Letter 排再缩进纸里
    [/@page \{\s*size: letter;/, "@page {\n\tsize: 185mm 260mm;"],
  ];
  let out = src;
  for (const [re, to] of swaps) {
    if (!re.test(out)) throw new Error(`Paged.js 补丁失败：未找到 ${re}（pagedjs 版本变了？）`);
    out = out.replace(re, to);
  }
  const p = join(DIST, "paged.patched.js");
  mkdirSync(DIST, { recursive: true });
  writeFileSync(p, out);
  return p;
}

// ---------- 渲染 ----------
const CHROME =
  process.env.CHROME_PATH ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);

async function toPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage();
  // 视口宽度取纸宽：否则 Chrome 按默认 800px（211.7mm）布局，再把整页缩小到纸宽
  await page.setViewport({ width: 700, height: 983 });
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 160)));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 180000 });

  // 0) 页面尺寸：Paged.js 取"第一条含 size 的 @page"，所以把它放在 <head> 最前面
  await page.evaluate(() => {
    const st = document.createElement("style");
    st.textContent = "@page { size: 185mm 260mm; }";
    document.head.prepend(st);
  });

  // 1) 注册字体（FontFace API），并按文档实际用到的字符预加载
  await page.evaluate(async (faces) => {
    for (const f of faces) {
      document.fonts.add(new FontFace(f.family, `url(${f.url})`, { weight: f.weight, style: f.style, unicodeRange: f.range, display: "block" }));
    }
    const text = [...new Set((document.body.innerText || "").replace(/\s+/g, ""))].join("");
    const wants = ['400 1em "Noto Serif SC"', '600 1em "Noto Serif SC"', '700 1em "Noto Serif SC"', '400 1em "Noto Sans SC"', '500 1em "Noto Sans SC"', '700 1em "Noto Sans SC"',
      "400 1em Inter", "500 1em Inter", "600 1em Inter", "700 1em Inter", '400 1em "Maple Mono CN"', 'italic 400 1em "Maple Mono CN"', '600 1em "Maple Mono CN"', '700 1em "Maple Mono CN"'];
    await Promise.all(wants.map((w) => document.fonts.load(w, text).catch(() => [])));
    await document.fonts.ready;
  }, FONT_FACES);
  console.log(`  字体：注册 ${FONT_FACES.length} 条 @font-face（按需加载切片）`);

  // 2) 渲染图表：与网页共用 docs/javascripts/diagrams.js（同一套层级配色，印刷取值）
  await page.addScriptTag({ path: join(HERE, "node_modules/mermaid/dist/mermaid.min.js") });
  await page.evaluate(() => { window.__FI_BOOK__ = true; });
  await page.addScriptTag({ path: join(ROOT, "docs/javascripts/diagrams.js") });
  const mermaidStats = await page.evaluate(() => window.FIDiagrams.renderAll(document, { mode: "print", eager: true, fontSize: "19px" }));
  console.log(`  mermaid: ${mermaidStats.ok} 个渲染成功，${mermaidStats.bad} 个失败`);
  for (const f of mermaidStats.fails) console.log(`    ✗ ${f.at} ${f.err}  «${f.src}»`);

  // 3) 代码块：ASCII 图保持完整；超出版心宽度时按比例缩小字号；标题与紧随的图/短表绑在一起
  await page.evaluate(() => {
    const prevW = document.body.style.width;
    document.body.style.width = "145mm";
    for (const pre of document.querySelectorAll(".highlight pre, pre")) {
      const code = pre.textContent || "";
      const lines = code.split("\n");
      const art = /[│┌┐└┘├┤┬┴┼─╭╮╯╰▶▼▲◀]/.test(code) || /^\s*[+|][-=+ ]{3,}/m.test(code);
      const box = pre.closest(".highlight") || pre;
      if (art && lines.length >= 4 && lines.length <= 55) box.classList.add("keep");
      pre.style.whiteSpace = "pre";
      pre.style.wordBreak = "normal";
      const fs0 = parseFloat(getComputedStyle(pre).fontSize);
      const avail = pre.clientWidth - 2 * parseFloat(getComputedStyle(pre).paddingLeft);
      if (pre.scrollWidth > avail + 1) {
        pre.style.fontSize = fs0 * Math.max(avail / pre.scrollWidth, 0.72) + "px";
        if (pre.scrollWidth > pre.clientWidth + 1) { pre.style.whiteSpace = "pre-wrap"; pre.style.wordBreak = "break-all"; }
      }
    }
    document.body.style.width = prevW;
    for (const h of document.querySelectorAll("h2, h3, h4")) {
      const nx = h.nextElementSibling;
      if (nx && (nx.matches("figure.diagram") || (nx.matches("table") && nx.rows.length <= 12))) {
        const w = document.createElement("div");
        w.className = "keep-together";
        h.parentNode.insertBefore(w, h);
        w.append(h, nx);
      }
    }
  });

  // 4) Paged.js 分页
  await page.addScriptTag({ path: patchedPagedJs() });
  await page.evaluate(() => new Promise((res) => { window.PagedConfig = { auto: false }; window.PagedPolyfill.preview().then(res, res); }));

  // 5) 校验页框：不是 16 开就直接报错，绝不悄悄产出错误开本
  const dims = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector(".pagedjs_page"));
    const mm = (p) => +(parseFloat(p) / 96 * 25.4).toFixed(1);
    return { w: mm(cs.width), h: mm(cs.height) };
  });
  console.log(`  页框：${dims.w} × ${dims.h} mm`);
  if (process.env.BOOK_DEBUG) {
    const where = await page.evaluate(() => {
      const pgs = [...document.querySelectorAll(".pagedjs_page")];
      const at = (sel) => pgs.map((pg, i) => (pg.querySelector(sel) ? i + 1 : 0)).filter(Boolean);
      return { 总页数: pgs.length, cover: at(".cover"), titlepage: at(".titlepage"), colophon: at(".colophon"), toc: at(".toc"), 前6页: pgs.slice(0, 6).map((pg, i) => `${i + 1}:${(pg.querySelector(".pagedjs_page_content")?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 14)}`) };
    });
    console.log("  [debug]", JSON.stringify(where));
  }
  if (process.env.BOOK_PAGERULES) {
    const r = await page.evaluate(() => {
      const out = [];
      for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const ru of rules) if (ru.type === CSSRule.PAGE_RULE || /@page/.test(ru.cssText.slice(0, 8))) out.push(ru.cssText.slice(0, 160)); }
      return out;
    });
    console.log("  [pagerules]", r.length); r.slice(0, 12).forEach((x) => console.log("    ", x));
  }
  if (process.env.BOOK_WIDE) {
    const w = await page.evaluate(() => {
      const mm = (v) => +(v / 96 * 25.4).toFixed(1);
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > 186 / 25.4 * 96 + 2 && !e.closest("svg")).slice(0, 12).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}#${e.id} right=${mm(e.getBoundingClientRect().right)} w=${mm(e.getBoundingClientRect().width)}`);
      return { scrollW: mm(de.scrollWidth), clientW: mm(de.clientWidth), bodyScrollW: mm(document.body.scrollWidth), innerW: mm(innerWidth), pagesW: mm(document.querySelector(".pagedjs_pages")?.getBoundingClientRect().width || 0), wide };
    });
    console.log("  [wide]", JSON.stringify(w, null, 1));
  }
  if (process.env.BOOK_GEOM) {
    const g = await page.evaluate(() => {
      const mm = (v) => +(v / 96 * 25.4).toFixed(1);
      const pgs = [...document.querySelectorAll(".pagedjs_page")];
      const pick = [0, 1, 2, 3, 4, 9, 10];
      return pick.filter((i) => pgs[i]).map((i) => {
        const pg = pgs[i], r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(), p = pg.getBoundingClientRect(); return [mm(b.left - p.left), mm(b.top - p.top), mm(b.width), mm(b.height)]; };
        const cs = getComputedStyle(pg);
        return { page: i + 1, cls: pg.className.replace(/pagedjs_/g, "").slice(0, 60), page_xywh: r(pg), sheet: r(pg.querySelector(".pagedjs_sheet")), pagebox: r(pg.querySelector(".pagedjs_pagebox")), area: r(pg.querySelector(".pagedjs_area")), content: r(pg.querySelector(".pagedjs_page_content")), cover: r(pg.querySelector(".cover")), vars: [cs.getPropertyValue("--pagedjs-margin-left"), cs.getPropertyValue("--pagedjs-margin-right"), cs.getPropertyValue("--pagedjs-pagebox-width"), cs.getPropertyValue("--pagedjs-width")].join("|") };
      });
    });
    for (const x of g) console.log("  [geom]", JSON.stringify(x));
  }
  if (Math.abs(dims.w - 185) > 1 || Math.abs(dims.h - 260) > 1) throw new Error(`页框尺寸不是 16 开（实际 ${dims.w}×${dims.h}mm）`);

  // 6) 回填目录页码：物理页序即印刷页码（封面为第 1 页），与页脚默认计数器一致
  const filled = await page.evaluate(() => {
    const pgs = [...document.querySelectorAll(".pagedjs_page")];
    let n = 0, miss = 0;
    for (const a of document.querySelectorAll(".toc-num")) {
      const id = a.getAttribute("href").slice(1);
      const t = document.querySelector(`[data-id="${id}"]`) || document.getElementById(id);
      const pg = t?.closest(".pagedjs_page");
      if (pg) { a.textContent = String(pgs.indexOf(pg) + 1); n++; } else miss++;
    }
    return { n, miss };
  });
  console.log(`  目录页码回填：${filled.n} 条，缺失 ${filled.miss} 条`);

  // 导出"章节 → 实际页码"清单，供 verify-pdf 对最终 PDF 核对（H1 文字比导航标题更可靠）
  const chapters = await page.evaluate(() => {
    const pgs = [...document.querySelectorAll(".pagedjs_page")];
    const seen = new Map();
    // Paged.js 跨页时会为同一个章节生成多个片段（共享 data-ref / id）。每个章节只取第一次出现的页。
    for (const sec of document.querySelectorAll("section.chapter")) {
      const key = sec.getAttribute("data-ref") || sec.id;
      if (!key || seen.has(key)) continue;
      const h1 = sec.querySelector("h1")?.textContent?.trim();
      if (!h1) continue; // 续页片段没有 H1
      const pg = sec.closest(".pagedjs_page");
      seen.set(key, { id: sec.id, title: sec.dataset.title, h1, page: pg ? pgs.indexOf(pg) + 1 : null });
    }
    return [...seen.values()];
  });
  writeFileSync(pdfPath.replace(/\.pdf$/, ".chapters.json"), JSON.stringify(chapters, null, 1));
  const pages = await page.evaluate(() => document.querySelectorAll(".pagedjs_page").length);
  console.log(`  分页完成：${pages} 页`);
  // 纸张尺寸显式指定为 16 开；并把 Paged.js 打印规则里"height: 100%"固定成 260mm，
  // 避免它依赖 Chrome 对 @page size 的解析（Paged.js 会把 @page 改写，Chrome 可能回退成 Letter）。
  await page.addStyleTag({ content: "@media print { html, body { margin:0 !important; padding:0 !important; width:185mm !important; min-width:0 !important; overflow:visible !important; } .pagedjs_pages { width:185mm !important; min-width:0 !important; } .pagedjs_page, .pagedjs_sheet { width:185mm !important; height:260mm !important; min-height:260mm !important; max-height:260mm !important; overflow:hidden !important; } }" });
  await page.pdf({ path: pdfPath, printBackground: true, width: "185mm", height: "260mm", margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: false, timeout: 0 });
  await page.close();
  return pages;
}

async function main() {
  mkdirSync(DIST, { recursive: true });
  const sample = has("--sample") || has("--only");
  const only = val("--volume");
  if (has("--plan")) { for (const v of VOLUMES) console.log(v.slug, v.title, (v.chars / 1e4).toFixed(0) + "万字"); return; }
  let vols = has("--full") ? [...VOLUMES, FULL] : [...VOLUMES];
  if (only !== null) vols = vols.filter((v) => String(v.no) === only);
  if (sample) vols = vols.filter((v) => v.no !== 0);
  const htmlOnly = has("--html-only");
  const profile = join(tmpdir(), `frontend-interview-book-${process.pid}`);
  const launch = () => puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 0, userDataDir: profile, args: ["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"] });
  // 只结束本次构建自己启动的浏览器进程
  const shut = async (b) => { if (!b) return; await Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]); const proc = b.process(); if (proc && !proc.killed) proc.kill("SIGKILL"); };
  const LIMIT = Number(process.env.BOOK_VOLUME_TIMEOUT_MIN || 12) * 60_000;
  const TRIES = 3;
  const built = [];
  let browser = htmlOnly ? null : await launch();
  try {
    for (const v of vols) {
      const t0 = Date.now();
      const { html, count } = assemble(v, sample);
      const base = join(DIST, `${v.slug}${sample ? "-sample" : ""}`);
      const pdfOut = join(DIST, sample ? `${v.slug}-sample.pdf` : v.file);
      writeFileSync(base + ".html", html);
      console.log(`[${v.slug}] ${v.title}：${count} 篇`);
      if (htmlOnly) continue;
      // 分页偶尔会卡死（本地无法复现、CI 上出现过）：每册设超时，超时后换一个新浏览器重试
      let pages = null;
      for (let attempt = 1; attempt <= TRIES && pages === null; attempt++) {
        let timer;
        const hung = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), LIMIT); });
        try {
          pages = await Promise.race([toPdf(browser, base + ".html", pdfOut), hung]);
        } catch (e) {
          console.log(`  第 ${attempt} 次失败：${String(e.message || e).slice(0, 120)}${attempt < TRIES ? "，换新浏览器重试" : ""}`);
          await shut(browser); browser = await launch();
        } finally { clearTimeout(timer); }
      }
      if (pages === null) throw new Error(`${v.slug} 连续 ${TRIES} 次失败`);
      console.log(`  → ${pdfOut}（${pages} 页，${((Date.now() - t0) / 1000).toFixed(0)}s）`);
    }
    if (built.length && !sample && !has("--volume")) {
      writeFileSync(join(DIST, "volumes.json"), JSON.stringify(built, null, 1));
      const rows = built.map((b) => `| ${String(b.no).padStart(2, "0")} | ${b.title} | ${b.scope || "-"} | ${b.pages} |`).join("\n");
      writeFileSync(join(DIST, "RELEASE_NOTES.md"), `# 前端面试全家桶 · PDF 分册\n\n16 开（185×260mm），共 ${built.length} 册、${built.reduce((a, b) => a + b.pages, 0)} 页。文件名为英文（\`frontend-interview-序号-主题.pdf\`），下载页显示的是中文标签。\n\n| 册 | 主题 | 本册内容 | 页数 |\n|---|---|---|---|\n${rows}\n\n每册附封面、目录、页眉页脚与页码；代码字体 Maple Mono CN，正文 Noto Serif SC。在线版：https://shyu-x.github.io/frontend-interview/\n`);
    }
  } finally {
    // 无论成功、失败还是被中断，都要关掉浏览器并清掉临时 profile，避免遗留孤儿 Chrome
    await shut(browser);
    rmSync(profile, { recursive: true, force: true });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
