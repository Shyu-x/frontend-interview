#!/usr/bin/env python3
"""修复"列表紧跟在正文段落后、中间没有空行"的写法：Markdown 会把它们合成一个段落。
用法：python3 scripts/fix-lists.py [--fix]    （无 --fix 只统计；发现问题时退出码为 1）
只处理顶层段落后的列表，不碰代码块、表格、提示块、HTML 与已缩进的内容。
"""
import glob
import re
import sys

FIX = "--fix" in sys.argv
LIST = re.compile(r"^(\s{0,3})([-*+]|\d{1,3}[.)])\s+\S")
total, files = 0, 0
for path in sorted(glob.glob("docs/**/*.md", recursive=True)):
    lines = open(path, encoding="utf-8").read().split("\n")
    out, fence, n = [], None, 0
    for i, line in enumerate(lines):
        m = re.match(r"^\s*(`{3,}|~{3,})", line)
        if m:
            tok = m.group(1)[0] * 3
            if fence is None:
                fence = tok
            elif line.strip().startswith(fence):
                fence = None
            out.append(line)
            continue
        if fence is None and LIST.match(line) and not line.startswith(" ") and out:
            prev = out[-1]
            p = prev.strip()
            is_para = (
                p
                and not LIST.match(prev)
                and not prev.startswith((" ", "\t", ">", "|", "<", "#", "!!!", "???"))
                and not p.startswith(("```", "~~~", "|", "<", "#", "!", ":", "[^"))
                and not re.match(r"^[-*+]\s", p)
                and not re.match(r"^(-{3,}|\*{3,}|_{3,})$", p)
                and not re.match(r"^\d+[.)]\s", p)
                and not re.match(r"^\[[^\]]+\]:", p)
            )
            # 上一行必须是以文字结束的普通段落行，且再上一行不是缩进（避免列表项的续行）
            if is_para:
                out.append("")
                n += 1
        out.append(line)
    if n:
        total += n
        files += 1
        if FIX:
            open(path, "w", encoding="utf-8").write("\n".join(out))
print(f"列表前缺空行：{total} 处，{files} 个文件" + ("（已修复）" if FIX else ""))
sys.exit(1 if (total and not FIX) else 0)
