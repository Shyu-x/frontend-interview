#!/usr/bin/env python3
"""Gate new/modified pages; legacy metadata debt must be fixed when editing a page."""
import argparse
from pathlib import Path
import re
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--base", help="Compare with this Git revision; checks worktree too")
parser.add_argument("--all", action="store_true", help="Audit all pages, including legacy debt")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
if args.all:
    files = sorted(root.joinpath("docs").rglob("*.md"))
elif args.base:
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", "--diff-filter=ACMRT", args.base, "--", "docs"], cwd=root, text=True
    ).splitlines()
    untracked = subprocess.check_output(
        ["git", "ls-files", "--others", "--exclude-standard", "docs"], cwd=root, text=True
    ).splitlines()
    files = [root / name for name in sorted(set(changed + untracked)) if name.endswith(".md") and (root / name).is_file()]
else:
    parser.error("Choose --base or --all explicitly")

errors = []
for file in files:
    content = file.read_text(encoding="utf-8")
    match = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)", content, re.S)
    if not match:
        errors.append(f"{file.relative_to(root)}: missing frontmatter")
        continue
    metadata = match.group(1)
    for field in ("title", "description", "tags", "date"):
        if not re.search(rf"^{field}:\s*\S", metadata, re.M) and not (
            field == "tags" and re.search(r"^tags:\s*\n\s+-\s+\S", metadata, re.M)
        ):
            errors.append(f"{file.relative_to(root)}: missing/empty {field}")
    if not re.search(r"^date:\s*\d{4}-\d{2}-\d{2}\s*$", metadata, re.M):
        errors.append(f"{file.relative_to(root)}: date must be YYYY-MM-DD")

for error in errors:
    print(error, file=sys.stderr)
print(f"Frontmatter: {len(files)} pages checked, {len(errors)} errors")
sys.exit(bool(errors))
