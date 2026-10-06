#!/usr/bin/env python3
"""构建后 SEO / GEO 校验：python3 scripts/seo-check.py [site目录]

错误（退出码 1）：缺少 title/description/canonical/JSON-LD、H1 不是 1 个、JSON-LD 非法、
  sitemap 与页面数不一致、llms.txt 指向的 Markdown 不存在、robots.txt 缺少 Sitemap。
警告：description 过短/过长、正文过薄、标题或描述重复、图片缺少 alt。
"""
import json
import os
import re
import sys
from collections import defaultdict
from html import unescape

SITE = sys.argv[1] if len(sys.argv) > 1 else "site"
errors, warns = [], []
titles, descs = defaultdict(list), defaultdict(list)
pages = []
for root, _, files in os.walk(SITE):
    if root.startswith(os.path.join(SITE, "md")) or root.startswith(os.path.join(SITE, "assets")):
        continue
    for f in files:
        if f == "index.html" or (f.endswith(".html") and root == SITE and f != "404.html"):
            pages.append(os.path.join(root, f))

def meta(h, attr, key):
    m = re.search(r'<meta\s+(?:[^>]*?\s)?%s="%s"\s+content="([^"]*)"' % (attr, re.escape(key)), h) or \
        re.search(r'<meta\s+content="([^"]*)"\s+(?:[^>]*?\s)?%s="%s"' % (attr, re.escape(key)), h)
    return unescape(m.group(1)) if m else None

def cjk_words(text):
    return len(re.findall(r"[一-鿿]", text)) + len(re.findall(r"[A-Za-z0-9_]+", text))

for p in sorted(pages):
    h = open(p, encoding="utf-8").read()
    rel = os.path.relpath(p, SITE)
    if "http-equiv=\"refresh\"" in h:
        continue
    t = re.search(r"<title>(.*?)</title>", h, re.S)
    t = unescape(t.group(1)).strip() if t else None
    d = meta(h, "name", "description")
    can = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    if not t: errors.append(f"{rel}: 缺少 <title>")
    else: titles[t].append(rel)
    if not d: errors.append(f"{rel}: 缺少 meta description")
    else:
        descs[d].append(rel)
        n = len(d)
        if n < 40: warns.append(f"{rel}: description 过短（{n} 字）")
        if n > 200: warns.append(f"{rel}: description 过长（{n} 字）")
    if not can: errors.append(f"{rel}: 缺少 canonical")
    for k in ("og:title", "og:description", "og:image", "og:url"):
        if not meta(h, "property", k): errors.append(f"{rel}: 缺少 {k}")
    if not meta(h, "name", "twitter:card"): errors.append(f"{rel}: 缺少 twitter:card")
    lds = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    if not lds: errors.append(f"{rel}: 缺少 JSON-LD")
    for ld in lds:
        try:
            j = json.loads(ld)
            types = [g.get("@type") for g in j.get("@graph", [])]
            if rel != "index.html" and "TechArticle" not in types:
                errors.append(f"{rel}: JSON-LD 缺少 TechArticle")
        except Exception as e:
            errors.append(f"{rel}: JSON-LD 非法 ({e})")
    art = re.search(r"<article.*?</article>", h, re.S)
    body = art.group(0) if art else h
    h1 = len(re.findall(r"<h1[ >]", body))
    if h1 != 1: errors.append(f"{rel}: H1 数量为 {h1}")
    text = re.sub(r"<script.*?</script>|<style.*?</style>|<[^>]+>", " ", body, flags=re.S)
    w = cjk_words(unescape(text))
    if w < 500 and rel != "index.html" and not rel.endswith("/index.html"):
        warns.append(f"{rel}: 正文偏薄（{w} 字词）")
    for im in re.findall(r"<img\b[^>]*>", body):
        if "alt=" not in im: warns.append(f"{rel}: 图片缺少 alt")

for k, v in titles.items():
    if len(v) > 1: warns.append(f"标题重复 '{k[:40]}': {', '.join(v[:3])}")
for k, v in descs.items():
    if len(v) > 1: warns.append(f"description 重复 '{k[:30]}': {', '.join(v[:3])}")

# 站点级
sm = os.path.join(SITE, "sitemap.xml")
if not os.path.exists(sm): errors.append("缺少 sitemap.xml")
else:
    n = len(re.findall(r"<loc>", open(sm, encoding="utf-8").read()))
    if abs(n - len(pages)) > 2: errors.append(f"sitemap URL 数 {n} 与页面数 {len(pages)} 不一致")
rb = os.path.join(SITE, "robots.txt")
if not os.path.exists(rb) or "Sitemap:" not in open(rb).read(): errors.append("robots.txt 缺失或没有 Sitemap 行")
for f in ("llms.txt", "llms-full.txt", "feed.xml", os.path.join("assets", "og-default.png")):
    if not os.path.exists(os.path.join(SITE, f)): errors.append(f"缺少 {f}")
lt = os.path.join(SITE, "llms.txt")
if os.path.exists(lt):
    miss = 0
    for u in re.findall(r"\]\((https?://[^)]*?/md/[^)]+\.md)\)", open(lt, encoding="utf-8").read()):
        local = os.path.join(SITE, "md", u.split("/md/", 1)[1])
        if not os.path.exists(local): miss += 1
    if miss: errors.append(f"llms.txt 有 {miss} 个 Markdown 链接指向不存在的文件")

print(f"检查页面 {len(pages)} 个：错误 {len(errors)}，警告 {len(warns)}")
for e in errors[:60]: print("ERROR", e)
for w in warns[:80]: print("WARN ", w)
if len(warns) > 80: print(f"... 另有 {len(warns)-80} 条警告")
sys.exit(1 if errors else 0)
