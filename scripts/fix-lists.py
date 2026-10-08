#!/usr/bin/env python3
"""修复"列表紧跟在正文段落后、中间没有空行"的写法：Markdown 会把它们合成一个段落。
用法：python3 scripts/fix-lists.py [--fix]    （无 --fix 只统计；发现问题时退出码为 1）
只处理顶层段落后的列表，不碰代码块、表格、提示块、HTML 与已缩进的内容。
"""
import glob
import re
import sys


INDENTED = re.compile(r"^( {4,})([-*+]|\d{1,3}[.)])\s+\S")


def fix_after_fence(lines):
    """顶层代码围栏闭合后紧跟非空行：补空行，否则后面的列表会被吞进同一个段落。"""
    out, fence, n = [], None, 0
    for i, line in enumerate(lines):
        m = re.match(r"^(`{3,}|~{3,})", line)
        out.append(line)
        if not m:
            continue
        tok = m.group(1)[0] * 3
        if fence is None:
            fence = tok
        elif line.strip().startswith(fence):
            fence = None
            if i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith(("```", "~~~")):
                out.append("")
                n += 1
    return out, n


def fix_indented(lines):
    """提示块 / 折叠块（!!! ???）里缩进 4 格的列表：上一行是同缩进的普通文字时补一个空行。"""
    out, fence, n = [], None, 0
    for line in lines:
        m = re.match(r"^\s*(`{3,}|~{3,})", line)
        if m:
            tok = m.group(1)[0] * 3
            if fence is None:
                fence = tok
            elif line.strip().startswith(fence):
                fence = None
            out.append(line)
            continue
        im = INDENTED.match(line)
        if fence is None and im and out:
            prev = out[-1]
            pm = re.match(r"^( {4,})(\S.*)$", prev)
            if pm and len(pm.group(1)) == len(im.group(1)) and not INDENTED.match(prev) and not pm.group(2).startswith(("`", "|", "<", "#", "!!!", "???", ">")):
                out.append("")
                n += 1
        out.append(line)
    return out, n

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
    lines2, n2 = fix_indented(out)
    lines3, n3 = fix_after_fence(lines2)
    out, n = lines3, n + n2 + n3
    if n:
        total += n
        files += 1
        if FIX:
            open(path, "w", encoding="utf-8").write("\n".join(out))
print(f"列表前缺空行：{total} 处，{files} 个文件" + ("（已修复）" if FIX else ""))
sys.exit(1 if (total and not FIX) else 0)
