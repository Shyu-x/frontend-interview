// 分册规则：一个领域一册；体量超过预算的领域按其二级分组拆成"上、中、下"；体量过小的领域合并。
// 预算以"正文字数"计（比页数估算稳定）：单册上限约 60 万字，下限约 20 万字。
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const MAX_CHARS = 520_000;
export const MIN_CHARS = 180_000;

const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, " ");
export function weightOf(site, url) {
  const f = join(site, url);
  if (!existsSync(f)) return 0;
  const m = readFileSync(f, "utf8").match(/<article class="md-content__inner md-typeset">([\s\S]*?)<\/article>/);
  return m ? strip(m[1]).length : 0;
}
export const pagesOf = (n, out = []) => (n.type === "page" ? out.push(n) : n.children.forEach((c) => pagesOf(c, out)), out);
const weigh = (site, n) => pagesOf(n).reduce((s, p) => s + weightOf(site, p.url), 0);

// 把一个领域按预算切成若干段：递归展开超预算的分组，顺序不变，按"目标均值"贪心装箱
const flatten = (site, n, cap) => (n.type === "section" && weigh(site, n) > cap ? n.children.flatMap((c) => flatten(site, c, cap)) : [n]);
function splitDomain(site, domain) {
  const total = weigh(site, domain);
  if (total <= MAX_CHARS) return [{ nodes: [domain], chars: total }];
  const parts = Math.ceil(total / (MAX_CHARS * 0.85));
  const target = total / parts;
  const units = domain.children.flatMap((k) => flatten(site, k, target * 1.1)).map((node) => ({ node, w: weigh(site, node) }));
  const out = []; let cur = [], curChars = 0;
  for (const u of units) {
    // 加入后离目标更远就先封册
    if (cur.length && Math.abs(curChars + u.w - target) > Math.abs(curChars - target) && curChars >= target * 0.7) { out.push({ nodes: cur, chars: curChars }); cur = []; curChars = 0; }
    cur.push(u.node); curChars += u.w;
  }
  if (cur.length) out.push({ nodes: cur, chars: curChars });
  // 尾册过小则并入前一册（允许略超预算）
  if (out.length > 1 && out.at(-1).chars < MIN_CHARS * 0.5 && out.at(-2).chars + out.at(-1).chars <= MAX_CHARS * 1.15) { const l = out.pop(); out.at(-1).nodes.push(...l.nodes); out.at(-1).chars += l.chars; }
  return out.map((p) => ({ nodes: [{ type: "section", title: domain.title, children: p.nodes }], chars: p.chars }));
}

/** 生成册清单：[{no, slug, title, subtitle, nodes, chars}] */
export function planVolumes(manifest, site) {
  const tops = manifest.tree.filter((n) => n.type === "section");
  const vols = [];
  for (const top of tops) {
    // 教学资源：每页一个链接清单，合并成一册
    const domains = top.children.every((c) => c.type === "page") ? [{ type: "section", title: top.title, children: top.children }] : top.children.map((c) => (c.type === "section" ? c : { type: "section", title: c.title, children: [c] }));
    // 先把每个领域按预算切段
    let segs = domains.flatMap((d) => splitDomain(site, d).map((s, i, a) => ({ domain: d.title, part: a.length > 1 ? i + 1 : 0, of: a.length, top: top.title, ...s })));
    // 过小的相邻段合并（只合并同一分区内、且合并后不超预算）
    const merged = [];
    for (const s of segs) {
      const last = merged[merged.length - 1];
      if (last && last.chars < MIN_CHARS && last.chars + s.chars <= MAX_CHARS && last.of === 1 && s.of === 1) {
        last.nodes.push(...s.nodes); last.chars += s.chars; last.domains.push(s.domain);
      } else merged.push({ ...s, domains: [s.domain] });
    }
    // 末尾那段若仍过小，并入前一段（不超预算时）
    if (merged.length > 1 && merged.at(-1).chars < MIN_CHARS && merged.at(-2).of === 1 && merged.at(-2).chars + merged.at(-1).chars <= MAX_CHARS) {
      const l = merged.pop(); merged.at(-1).nodes.push(...l.nodes); merged.at(-1).chars += l.chars; merged.at(-1).domains.push(...l.domains);
    }
    for (const m of merged) {
      const name = m.domains.length > 1 ? m.domains.join("与") : m.domain;
      vols.push({ top: top.title, title: m.part ? `${name}（第${["一","二","三","四","五","六","七","八","九","十"][m.part - 1]}册）` : name, subtitle: top.title, nodes: m.nodes, chars: m.chars });
    }
  }
  return vols.map((v, i) => ({ ...v, no: i + 1, slug: `vol${String(i + 1).padStart(2, "0")}` }));
}
