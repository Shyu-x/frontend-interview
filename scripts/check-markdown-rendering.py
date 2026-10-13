"""Exercise the real MkDocs Markdown configuration, not a second parser."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

import markdown
from mkdocs.config import load_config


class Prose(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"pre", "code", "script", "style"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"pre", "code", "script", "style"}:
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def main():
    config = load_config()
    renderer = markdown.Markdown(extensions=config["markdown_extensions"],
                                 extension_configs=config["mdx_configs"])
    failures = []
    fixtures = [
        ("**30 秒回答：**分布式恢复", "<strong>30 秒回答：</strong>"),
        ("**2 分钟回答：**消息 worker", "<strong>2 分钟回答：</strong>"),
        ("1. **现象：**手算用例", "<strong>现象：</strong>"),
        ("- **难度/限时：**中。**实现路径：**代码", "<strong>实现路径：</strong>"),
        ("**强调**中文，**HTTP：**请求", "<strong>HTTP：</strong>"),
        ("snake_case_identifier", "snake_case_identifier"),
        ('!!! tip "先写失败用例"\n    请求超时后，不再更新已卸载的视图。', 'class="admonition tip"'),
        ('`!!! tip` 是提示块标记，代码示例不应被误报。', '<code>!!! tip</code>'),
    ]
    for source, expected in fixtures:
        html = renderer.reset().convert(source)
        if expected not in html:
            failures.append(f"fixture {source!r}: expected {expected}, got {html}")
    # Ignore literal code examples. A label leaking ** in prose is a regression.
    pattern = re.compile(r"\*\*[^*\n]{1,70}\*\*")
    pages = list(Path(config["docs_dir"]).rglob("*.md"))
    for page in pages:
        source = page.read_text(encoding="utf-8")
        source = re.sub(r"\A---\n.*?\n---\n", "", source, count=1, flags=re.S)
        html = renderer.reset().convert(source)
        prose = Prose()
        prose.feed(html)
        leaked = pattern.findall("".join(prose.parts))
        if leaked:
            failures.append(f"{page}: unparsed labels {leaked[:5]}")
        # Inline !!! labels are not admonitions. Exclude code examples above,
        # then catch malformed markers that actually reach the reader.
        markers = re.findall(r"!!!\s+(?:tip|note|warning|danger|abstract|example|question)\b",
                             "".join(prose.parts))
        if markers:
            failures.append(f"{page}: unparsed admonitions {markers[:5]}")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print(f"PASS Markdown rendering: {len(fixtures)} regressions; {len(pages)} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
