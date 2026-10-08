#!/usr/bin/env python3
"""检查 docs/ 里的 Markdown 表格是否会被正确渲染。用法：python3 scripts/check-tables.py [--fix]

会被渲染成普通段落的三种坏表格：
1. 表头后面缺分隔行（|---|---|）
2. 分隔行写在表头前面
3. 表格前一行是正文，中间没有空行
前两种可用 --fix 自动修复；第三种只报告。有未修复的问题时退出码为 1。
"""
import glob
import re
import sys

SEP = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")
FIX = "--fix" in sys.argv


def is_row(line):
    s = line.strip()
    return s.startswith("|") and s.endswith("|") and s.count("|") >= 3


def ncells(line):
    return len(line.strip().strip("|").split("|"))


problems = []
for path in sorted(glob.glob("docs/**/*.md", recursive=True)):
    lines = open(path, encoding="utf-8").read().split("\n")
    out, i, fence, changed = [], 0, False, False
    while i < len(lines):
        line = lines[i]
        if re.match(r"^\s*(```|~~~)", line):
            fence = not fence
            out.append(line)
            i += 1
            continue
        if fence or not is_row(line):
            out.append(line)
            i += 1
            continue
        j = i
        while j < len(lines) and is_row(lines[j]):
            j += 1
        block = lines[i:j]
        if len(block) >= 2:
            if SEP.match(block[0]) and not SEP.match(block[1]) and (len(block) < 3 or SEP.match(block[2])):
                problems.append((path, i + 1, "分隔行在表头前面"))
                block = block[1:]
                changed = True
            elif SEP.match(block[0]) and not SEP.match(block[1]) and not any(SEP.match(x) for x in block[1:]):
                problems.append((path, i + 1, "分隔行在表头前面"))
                block = [block[1], block[0]] + block[2:]
                changed = True
            elif not SEP.match(block[0]) and not SEP.match(block[1]):
                problems.append((path, i + 1, "缺分隔行"))
                indent = re.match(r"^\s*", block[0]).group(0)
                block = [block[0], indent + "|" + "|".join(["---"] * ncells(block[0])) + "|"] + block[1:]
                changed = True
        if i > 0 and lines[i - 1].strip() and not is_row(lines[i - 1]) and not lines[i - 1].lstrip().startswith((">", "-", "*", "+", "!!!", "???", "<", "#")) and not re.match(r"^\s*\d+\.", lines[i - 1]) and not lines[i - 1].startswith((" ", "\t")):
            problems.append((path, i + 1, "表格前缺空行（需手动处理）"))
        out.extend(block)
        i = j
    if FIX and changed:
        open(path, "w", encoding="utf-8").write("\n".join(out))

unfixable = [p for p in problems if "手动" in p[2]]
for path, ln, why in problems:
    print(f"{path}:{ln}  {why}")
print(f"{len(problems)} 处问题" + ("（已自动修复可修复的部分）" if FIX else ""))
sys.exit(1 if (unfixable or (problems and not FIX)) else 0)
