#!/usr/bin/env python3
"""Split frontend-interview-master.md into chapter files"""

import re

def split_chapters(input_file, output_dir):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all ## level 2 headings (main chapters)
    # Pattern: ## 章节名\n\n (followed by description)
    chapters = [
        ('一、HTML 超高频八股', 'html/hyper-frequencies.md', 11, 6854),
        ('二、CSS 超高频八股', 'css/hyper-frequencies.md', 6855, 15406),
        ('三、JavaScript 超高频八股', 'js/hyper-frequencies.md', 15407, 17636),
        ('四、TypeScript 超大题库', 'typescript/index.md', 17637, 18666),
        ('十一、性能优化终极题库', 'performance/index.md', 18667, 19836),
        ('十二、手写代码终极题库', 'coding/index.md', 19837, 21949),
    ]

    # For simplicity, let's split by ## 一、 ## 二、 etc patterns
    # Actually let's use a different approach - split by line numbers

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Split points
    splits = [
        (0, 10, 'index.md'),  # Front matter
        (11, 6854, f'{output_dir}/html/hyper-frequencies.md'),
        (6855, 15406, f'{output_dir}/css/hyper-frequencies.md'),
        (15407, 17636, f'{output_dir}/js/hyper-frequencies.md'),
        (17637, 18666, f'{output_dir}/typescript/index.md'),
        (18667, 19836, f'{output_dir}/performance/index.md'),
        (19837, len(lines), f'{output_dir}/coding/index.md'),
    ]

    for start, end, output_path in splits:
        chapter_content = ''.join(lines[start:end])
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(chapter_content)
        print(f"Created: {output_path} ({end - start} lines)")

if __name__ == '__main__':
    split_chapters('frontend-interview-master.md', 'docs')