"""SEO 与 GEO（生成式引擎优化）构建钩子。

在构建期完成：
1. 为缺少 description 的页面从正文自动提取摘要；
2. 计算每页的发布时间与最后修改时间（取自 git 历史，缺失时回退到文件时间）；
3. 生成 TechArticle / BreadcrumbList / FAQPage / WebSite 结构化数据（JSON-LD）；
4. 重写 sitemap.xml（带 lastmod），生成 llms.txt、llms-full.txt、分区 llms-*.txt、
   每页 Markdown 原文副本（md/ 目录）以及 Atom 订阅源 feed.xml。
"""
import datetime
import html
import json
import os
import re
import subprocess
from collections import OrderedDict
from xml.sax.saxutils import escape

SITE = {"pages": [], "order": {}}
SECTION_SLUG = {}


def _git_dates(root):
    """一次 git log 取得所有文件的最后修改与首次提交时间。"""
    last, first = {}, {}
    try:
        out = subprocess.run(
            ["git", "log", "--format=@@%cI", "--name-only", "--no-renames", "--", "docs"],
            cwd=root, capture_output=True, text=True, timeout=120,
        ).stdout
    except Exception:
        return last, first
    cur = None
    for line in out.splitlines():
        if line.startswith("@@"):
            cur = line[2:]
        elif line.strip() and cur:
            last.setdefault(line.strip(), cur)
            first[line.strip()] = cur
    return last, first


def _plain(md):
    """把一段 Markdown 变成纯文本。"""
    md = re.sub(r"`{3}.*?`{3}", " ", md, flags=re.S)
    md = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", md)
    md = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", md)
    md = re.sub(r"[`*_>#]", "", md)
    md = re.sub(r"<[^>]+>", " ", md)
    md = re.sub(r"\s+", " ", md)
    return html.unescape(md).strip()


def _auto_description(markdown, title):
    body = re.sub(r"(?s)^---.*?---\n", "", markdown)
    body = re.sub(r"(?s)```.*?```", "", body)
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    for p in paras:
        if re.match(r"^(#|\||!!!|\?\?\?|>|-|\*|\d+\.|:::|<)", p):
            continue
        t = _plain(p)
        if len(t) >= 30:
            return _clip(t, 150)
    m = re.search(r'!!! abstract[^\n]*\n((?:\s+.*\n?)+)', body)
    if m:
        t = _plain(m.group(1))
        if len(t) >= 20:
            return _clip(title + "：" + t, 150)
    return _clip(title + " - 前端面试全家桶中的教程与手写实现。", 150)


def _clip(t, n):
    if len(t) <= n:
        return t
    cut = t[:n]
    for sep in "。；！？，,;. ":
        i = cut.rfind(sep)
        if i > n * 0.6:
            return cut[: i + 1].rstrip("，,;； ")
    return cut.rstrip() + "…"


def _faq(markdown):
    items = []
    for m in re.finditer(r'(?m)^\?\?\?\+? question "([^"]+)"\n((?:(?:    .*)?\n)+)', markdown):
        q = _plain(m.group(1))
        a = _plain("\n".join(l[4:] if l.startswith("    ") else l for l in m.group(2).splitlines()))
        if q and a:
            items.append((q, _clip(a, 500)))
    return items[:12]


def _iso(s):
    return s if s else datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def on_config(config):
    SITE["pages"].clear()
    SITE["order"].clear()
    SITE["root"] = os.path.dirname(os.path.abspath(config["config_file_path"]))
    SITE["last"], SITE["first"] = _git_dates(SITE["root"])
    SITE["base"] = config["site_url"].rstrip("/") + "/"
    return config


def on_nav(nav, config, files):
    def walk(items, trail):
        for it in items:
            if it.is_section:
                walk(it.children, trail + [it.title])
            elif it.is_page:
                SITE["order"][it.file.src_uri] = (len(SITE["order"]), trail)

    def tree(items):
        out = []
        for it in items:
            if it.is_section:
                out.append({"type": "section", "title": it.title, "children": tree(it.children)})
            elif it.is_page:
                out.append({"type": "page", "title": it.title, "src": it.file.src_uri, "url": it.file.dest_uri})
        return out

    walk(nav.items, [])
    SITE["tree"] = tree(nav.items)
    return nav


def on_page_markdown(markdown, page, config, files):
    uri = page.file.src_uri
    title = page.meta.get("title") or page.title or ""
    desc = (page.meta.get("description") or "").strip()
    if len(desc) < 50:
        auto = _auto_description(markdown, title)
        if desc and not auto.startswith(desc[:12]):
            desc = _clip(desc.rstrip("。.；;，, ") + "。" + auto, 150)
        else:
            desc = auto
    page.meta["description"] = desc
    src = os.path.join(config["docs_dir"], uri)
    rel = os.path.relpath(src, SITE["root"])
    last = SITE["last"].get(rel)
    first = SITE["first"].get(rel)
    if not last and os.path.exists(src):
        last = datetime.datetime.fromtimestamp(os.path.getmtime(src), datetime.timezone.utc).isoformat(timespec="seconds")
    page.meta["_updated"] = _iso(last)
    page.meta["_published"] = _iso(first or last)
    page.meta["_faq"] = _faq(markdown)
    words = len(re.findall(r"[一-鿿]", _plain(markdown))) + len(re.findall(r"[A-Za-z0-9_]+", _plain(markdown)))
    SITE["pages"].append({
        "uri": uri, "title": title, "desc": page.meta["description"], "updated": page.meta["_updated"],
        "md": markdown, "words": words,
    })
    return markdown


def on_page_context(context, page, config, nav):
    base = SITE["base"]
    url = page.canonical_url or base
    tab, trail = (None, [])
    order = SITE["order"].get(page.file.src_uri)
    if order:
        trail = order[1]
    title = page.meta.get("title") or page.title or config["site_name"]
    desc = page.meta.get("description", "")
    img = base + "assets/og-default.png"
    author = {"@type": "Person", "name": "Shyu-x", "url": "https://github.com/Shyu-x"}
    graph = []
    if page.is_homepage:
        graph.append({"@type": "WebSite", "@id": base + "#website", "url": base, "name": config["site_name"],
                      "description": config["site_description"], "inLanguage": "zh-CN", "publisher": author})
    else:
        crumbs = [{"@type": "ListItem", "position": 1, "name": config["site_name"], "item": base}]
        for i, t in enumerate(trail):
            crumbs.append({"@type": "ListItem", "position": i + 2, "name": t})
        crumbs.append({"@type": "ListItem", "position": len(crumbs) + 1, "name": title, "item": url})
        graph.append({"@type": "BreadcrumbList", "itemListElement": crumbs})
        graph.append({
            "@type": "TechArticle", "headline": title[:110], "description": desc, "url": url,
            "mainEntityOfPage": url, "inLanguage": "zh-CN", "image": img,
            "datePublished": page.meta["_published"], "dateModified": page.meta["_updated"],
            "author": author, "publisher": author,
            "isPartOf": {"@type": "WebSite", "@id": base + "#website", "name": config["site_name"], "url": base},
            "articleSection": " / ".join(trail) if trail else "前端面试全家桶",
            "learningResourceType": "tutorial",
            "educationalLevel": "intermediate",
        })
        faq = page.meta.get("_faq") or []
        if len(faq) >= 2:
            graph.append({"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace("</", "<\\/")
    context["seo"] = {"ld": ld, "title": title, "description": desc, "url": url, "image": img,
                      "updated": page.meta["_updated"], "published": page.meta["_published"],
                      "home": page.is_homepage, "base": base}
    return context


def _tab_area(uri):
    o = SITE["order"].get(uri)
    trail = o[1] if o else []
    return (trail[0] if trail else "其他"), (trail[1] if len(trail) > 1 else "")


def on_post_build(config):
    site_dir = config["site_dir"]
    base = SITE["base"]
    pages = [p for p in SITE["pages"] if p["uri"] != "404.md"]
    pages.sort(key=lambda p: SITE["order"].get(p["uri"], (9999,))[0])

    def url_of(uri):
        if uri == "index.md":
            return base
        if uri.endswith("/index.md"):
            return base + uri[: -len("index.md")]
        return base + uri[:-3] + "/"

    def md_url(uri):
        return base + "md/" + uri

    # ---------- sitemap.xml ----------
    rows = []
    for p in pages:
        depth = p["uri"].count("/")
        if p["uri"] == "index.md":
            prio, freq = "1.0", "weekly"
        elif p["uri"].endswith("index.md"):
            prio, freq = "0.8", "weekly"
        else:
            prio, freq = ("0.7" if depth <= 1 else "0.6"), "monthly"
        rows.append(
            f"  <url>\n    <loc>{escape(url_of(p['uri']))}</loc>\n    <lastmod>{p['updated']}</lastmod>\n"
            f"    <changefreq>{freq}</changefreq>\n    <priority>{prio}</priority>\n  </url>")
    with open(os.path.join(site_dir, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "\n".join(rows) + "\n</urlset>\n")

    # ---------- Markdown 副本 ----------
    for p in pages:
        dest = os.path.join(site_dir, "md", p["uri"])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        body = re.sub(r"(?s)^---.*?---\n", "", p["md"]).lstrip()
        with open(dest, "w", encoding="utf-8") as f:
            f.write(f"<!-- 页面：{url_of(p['uri'])} | 更新：{p['updated']} -->\n\n{body}\n")

    # ---------- llms.txt ----------
    groups = OrderedDict()
    for p in pages:
        tab, area = _tab_area(p["uri"])
        groups.setdefault(tab, OrderedDict()).setdefault(area, []).append(p)
    lines = [f"# {config['site_name']}", "",
             f"> {config['site_description']}", "",
             "本站是面向前端工程师的中文系统化教程：每页按“问题、心智模型、图解、分步讲解、动手验证、常见坑、自测题”组织，"
             "代码可运行并附验证用例。涵盖 HTML/CSS/JavaScript/TypeScript、浏览器与网络、安全、React/Vue 及框架生态、"
             "构建工具与工程化、性能优化、API 设计（REST/GraphQL/gRPC/tRPC 等）、WebAssembly、JS 运行时、AI Agent 与 Harness 架构。",
             "",
             "使用说明：每个条目链接到该页的 Markdown 原文；完整内容见 llms-full.txt，分区合集见下方“分区合集”。", ""]
    for tab, areas in groups.items():
        lines.append(f"## {tab}")
        for area, ps in areas.items():
            if area:
                lines.append(f"### {area}")
            for p in ps:
                lines.append(f"- [{p['title']}]({md_url(p['uri'])}): {_clip(p['desc'], 120)}")
        lines.append("")
    lines += ["## 分区合集", ""]
    sect = OrderedDict()
    for p in pages:
        key = p["uri"].split("/")[0] if "/" in p["uri"] else "home"
        sect.setdefault(key, []).append(p)
    for key, ps in sect.items():
        lines.append(f"- [{key} 合集]({base}llms-{key}.txt): {len(ps)} 页")
    lines += ["", "## Optional", f"- [完整内容]({base}llms-full.txt): 全站所有页面的 Markdown 合集",
              f"- [站点地图]({base}sitemap.xml): 全部页面与最后更新时间",
              f"- [订阅源]({base}feed.xml): 最近更新的页面", ""]
    with open(os.path.join(site_dir, "llms.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # ---------- llms-full.txt 与分区合集 ----------
    def bundle(ps, name, head):
        out = [head, ""]
        for p in ps:
            body = re.sub(r"(?s)^---.*?---\n", "", p["md"]).lstrip()
            out += [f"\n\n<page url=\"{url_of(p['uri'])}\" updated=\"{p['updated']}\">", body.rstrip(), "</page>"]
        with open(os.path.join(site_dir, name), "w", encoding="utf-8") as f:
            f.write("\n".join(out) + "\n")

    bundle(pages, "llms-full.txt", f"# {config['site_name']}（完整内容）\n\n> {config['site_description']}")
    for key, ps in sect.items():
        bundle(ps, f"llms-{key}.txt", f"# {config['site_name']}：{key}\n\n> {config['site_description']}")

    # ---------- feed.xml ----------
    recent = sorted(pages, key=lambda p: p["updated"], reverse=True)[:50]
    entries = []
    for p in recent:
        entries.append(
            f"  <entry>\n    <title>{escape(p['title'])}</title>\n    <link href=\"{escape(url_of(p['uri']))}\"/>\n"
            f"    <id>{escape(url_of(p['uri']))}</id>\n    <updated>{p['updated']}</updated>\n"
            f"    <summary>{escape(p['desc'])}</summary>\n  </entry>")
    with open(os.path.join(site_dir, "feed.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n'
                f"  <title>{escape(config['site_name'])}</title>\n  <link href=\"{base}feed.xml\" rel=\"self\"/>\n"
                f"  <link href=\"{base}\"/>\n  <id>{base}</id>\n  <updated>{recent[0]['updated'] if recent else ''}</updated>\n"
                + "\n".join(entries) + "\n</feed>\n")

    # ---------- 书籍清单（供 PDF 流水线使用）----------
    manifest = {"site": config["site_name"], "base": base, "tree": SITE.get("tree", []),
                "updated": max((p["updated"] for p in pages), default="")}
    with open(os.path.join(site_dir, "book-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False)
