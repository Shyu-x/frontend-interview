#!/usr/bin/env python3
"""
Replace Mermaid code blocks in markdown files with image references.
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

# Image mapping: (filename) -> image path
IMAGE_MAP = {
    # docs/js/hyper-frequencies.md
    "data-types": "assets/images/mermaid/data-types.png",
    "typeof-results": "assets/images/mermaid/typeof-results.png",
    "stack-heap": None,  # Failed to generate
    "coercion-rules": None,  # Failed to generate
    "closure-scope": "assets/images/mermaid/closure-scope.png",
    "scope-chain": "assets/images/mermaid/scope-chain.png",
    "arrow-vs-normal": "assets/images/mermaid/arrow-vs-normal.png",
    "prototype-chain": None,  # Failed to generate
    "prototype-inheritance": "assets/images/mermaid/prototype-inheritance.png",
    "promise-state": "assets/images/mermaid/promise-state.png",
    "then-return": "assets/images/mermaid/then-return.png",
    "event-loop": "assets/images/mermaid/event-loop.png",
    "node-event-loop": "assets/images/mermaid/node-event-loop.png",
    "map-vs-object": "assets/images/mermaid/map-vs-object.png",
    "set-features": "assets/images/mermaid/set-features.png",
    "esm-vs-cjs": "assets/images/mermaid/esm-vs-cjs.png",
    "v8-gc-architecture": "assets/images/mermaid/v8-gc-architecture.png",

    # docs/js/section-19-25.md
    "proxy-traps": "assets/images/mermaid/proxy-traps.png",
    "esm-vs-cjs-comparison": None,  # Failed to generate
    "tree-shaking-process": "assets/images/mermaid/tree-shaking-process.png",
    "v8-memory-architecture": "assets/images/mermaid/v8-memory-architecture.png",
    "mark-sweep": "assets/images/mermaid/mark-sweep.png",
    "debounce-vs-throttle": "assets/images/mermaid/debounce-vs-throttle.png",

    # docs/typescript/index.md
    "ts-compile-flow": "assets/images/mermaid/ts-compile-flow.png",
    "any-unknown-never": None,  # Failed to generate
    "interface-vs-type": None,  # Failed to generate

    # docs/network/section-13-20.md
    "http-https-comparison": None,  # Failed to generate

    # docs/agent/
    "agentbench-env": "assets/images/mermaid/agentbench-env.png",
    "webarena-categories": "assets/images/mermaid/webarena-categories.png",
    "benchmark-categories": "assets/images/mermaid/benchmark-categories.png",
    "agent-workflow": "assets/images/mermaid/agent-workflow.png",
    "framework-selection": "assets/images/mermaid/framework-selection.png",
    "learning-curve": "assets/images/mermaid/learning-curve.png",
    "combo-schemes": "assets/images/mermaid/combo-schemes.png",
    "no-memory-vs-with-memory": None,  # Failed to generate
}


def extract_mermaid_blocks(content: str) -> List[Tuple[str, str, int, int]]:
    """
    Extract all mermaid code blocks from markdown content.
    Returns list of (diagram_name, code, start_line, end_line)
    """
    blocks = []
    lines = content.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('```mermaid'):
            start = i
            # Extract the code (skip the ```mermaid line)
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            end = i  # The closing ``` line

            code = '\n'.join(code_lines)

            # Try to detect diagram type from content
            if 'flowchart' in code:
                if 'table' in code:
                    diagram_type = 'table'
                else:
                    diagram_type = 'flowchart'
            elif 'graph' in code:
                diagram_type = 'graph'
            elif 'stateDiagram' in code:
                diagram_type = 'state'
            elif 'mindmap' in code:
                diagram_type = 'mindmap'
            else:
                diagram_type = 'other'

            blocks.append((diagram_type, code, start, end))
        i += 1

    return blocks


def generate_diagram_name(code: str, index: int) -> str:
    """Generate a meaningful name for the diagram based on its content."""
    code_lower = code.lower()

    # Specific patterns
    if '数据类型' in code or 'data type' in code_lower:
        return 'data-types'
    if 'typeof' in code_lower:
        return 'typeof-results'
    if '栈' in code and '堆' in code:
        return 'stack-heap'
    if '隐式转换' in code or 'coercion' in code_lower:
        return 'coercion-rules'
    if '闭包' in code or 'closure' in code_lower:
        return 'closure-scope'
    if '作用域链' in code or 'scope chain' in code_lower:
        return 'scope-chain'
    if '箭头函数' in code or 'arrow function' in code_lower:
        return 'arrow-vs-normal'
    if '原型链' in code or 'prototype chain' in code_lower:
        return 'prototype-chain'
    if '原型' in code and '继承' in code:
        return 'prototype-inheritance'
    if 'promise' in code_lower or '状态' in code:
        return 'promise-state'
    if 'then' in code_lower and '返回值' in code:
        return 'then-return'
    if '事件循环' in code or 'event loop' in code_lower:
        return 'event-loop'
    if 'node' in code_lower and 'event' in code_lower:
        return 'node-event-loop'
    if 'map' in code_lower and 'object' in code_lower:
        return 'map-vs-object'
    if 'set' in code_lower and '特性' in code:
        return 'set-features'
    if 'esm' in code_lower and 'cjs' in code_lower:
        return 'esm-vs-cjs'
    if 'v8' in code_lower and 'gc' in code_lower:
        return 'v8-gc-architecture'
    if 'proxy' in code_lower:
        return 'proxy-traps'
    if 'tree shaking' in code_lower:
        return 'tree-shaking-process'
    if '内存' in code or 'heap' in code_lower:
        return 'v8-memory-architecture'
    if 'mark' in code_lower and 'sweep' in code_lower:
        return 'mark-sweep'
    if '防抖' in code or 'debounce' in code_lower:
        return 'debounce-vs-throttle'
    if 'typescript' in code_lower or '编译流程' in code:
        return 'ts-compile-flow'
    if 'any' in code_lower and 'unknown' in code_lower:
        return 'any-unknown-never'
    if 'interface' in code_lower and 'type' in code_lower:
        return 'interface-vs-type'
    if 'http' in code_lower and 'https' in code_lower:
        return 'http-https-comparison'
    if 'agentbench' in code_lower:
        return 'agentbench-env'
    if 'webarena' in code_lower:
        return 'webarena-categories'
    if '基准测试' in code or 'benchmark' in code_lower:
        return 'benchmark-categories'
    if 'workflow' in code_lower or '工作流' in code:
        return 'agent-workflow'
    if '框架' in code or 'framework' in code_lower:
        return 'framework-selection'
    if '学习难度' in code or 'learning curve' in code_lower:
        return 'learning-curve'
    if '组合' in code or 'combo' in code_lower:
        return 'combo-schemes'
    if '记忆' in code or 'memory' in code_lower:
        return 'no-memory-vs-with-memory'

    return f'diagram-{index}'


def replace_mermaid_blocks(content: str, filename: str) -> Tuple[str, int, List[str]]:
    """
    Replace mermaid code blocks with image references.
    Returns (new_content, replaced_count, replaced_names)
    """
    lines = content.split('\n')
    new_lines = []
    i = 0
    replaced_count = 0
    replaced_names = []

    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('```mermaid'):
            # Extract the code block
            start = i
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            end = i  # Include the closing ``` line

            code = '\n'.join(code_lines)
            diagram_name = generate_diagram_name(code, start)

            # Check if we have an image for this diagram
            if diagram_name in IMAGE_MAP and IMAGE_MAP[diagram_name]:
                image_path = IMAGE_MAP[diagram_name]

                # Determine description based on diagram name
                descriptions = {
                    "data-types": "数据类型分类图",
                    "typeof-results": "typeof 判断结果对照表",
                    "closure-scope": "闭包作用域示意图",
                    "scope-chain": "作用域链示意图",
                    "arrow-vs-normal": "箭头函数与普通函数对比",
                    "prototype-inheritance": "原型链继承",
                    "promise-state": "Promise 状态转换图",
                    "then-return": "then 返回值规则",
                    "event-loop": "浏览器事件循环流程",
                    "node-event-loop": "Node.js 事件循环",
                    "map-vs-object": "Map 与 Object 对比",
                    "set-features": "Set 特性说明",
                    "esm-vs-cjs": "ESM 与 CJS 对比",
                    "v8-gc-architecture": "V8 GC 架构",
                    "proxy-traps": "Proxy 拦截方法",
                    "tree-shaking-process": "Tree Shaking 原理",
                    "v8-memory-architecture": "V8 内存架构",
                    "mark-sweep": "标记-清除算法",
                    "debounce-vs-throttle": "防抖与节流对比",
                    "ts-compile-flow": "TypeScript 编译流程",
                    "agentbench-env": "AgentBench 评测环境",
                    "webarena-categories": "WebArena 评测分类",
                    "benchmark-categories": "基准测试分类",
                    "agent-workflow": "Agent 工作流程",
                    "framework-selection": "框架选型决策树",
                    "learning-curve": "框架学习曲线",
                    "combo-schemes": "框架组合方案",
                }

                desc = descriptions.get(diagram_name, f"{diagram_name} 图")

                # Add image reference instead of code block
                new_lines.append(f'![{desc}]({image_path})')
                new_lines.append('')  # Empty line after

                replaced_count += 1
                replaced_names.append(diagram_name)
            else:
                # Keep the original mermaid block (for failed ones)
                new_lines.append(line)  # ```mermaid
                new_lines.extend(code_lines)
                if i < len(lines):
                    new_lines.append(lines[i])  # closing ```
        else:
            new_lines.append(line)
        i += 1

    return '\n'.join(new_lines), replaced_count, replaced_names


def main():
    base_path = Path("C:/Users/Xu/Desktop/someText/docs")

    # Files to process
    files_to_process = [
        "js/hyper-frequencies.md",
        "js/section-19-25.md",
        "typescript/index.md",
        "network/section-13-20.md",
        "agent/agent-evaluation.md",
        "agent/agent-frameworks.md",
        "agent/memory-system.md",
    ]

    total_replaced = 0
    file_stats = []

    for rel_path in files_to_process:
        file_path = base_path / rel_path

        if not file_path.exists():
            print(f"File not found: {file_path}")
            continue

        content = file_path.read_text(encoding='utf-8')
        new_content, count, names = replace_mermaid_blocks(content, rel_path)

        if count > 0:
            file_path.write_text(new_content, encoding='utf-8')
            total_replaced += count
            file_stats.append({
                'file': rel_path,
                'replaced': count,
                'diagrams': names
            })
            print(f"Updated: {rel_path} ({count} blocks replaced)")
        else:
            print(f"No changes: {rel_path}")

    print("\n" + "=" * 60)
    print("REPLACEMENT SUMMARY")
    print("=" * 60)
    print(f"Total blocks replaced: {total_replaced}")
    print("\nFiles modified:")
    for stat in file_stats:
        print(f"  - {stat['file']}: {stat['replaced']} diagrams")
        for name in stat['diagrams']:
            print(f"      - {name}")


if __name__ == "__main__":
    main()