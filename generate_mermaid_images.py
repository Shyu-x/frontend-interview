#!/usr/bin/env python3
"""
Extract Mermaid diagrams from markdown files, generate PNG images,
and replace the code blocks with image references.
"""

import os
import re
import json
import base64
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Tuple
import time

# Mermaid diagrams by file (simplified for API compatibility)
MERMAID_BLOCKS = {
    "docs/js/hyper-frequencies.md": [
        {
            "name": "data-types",
            "code": '''graph TB
    root["数据类型"]
    root --> primitive["原始类型（7种）"]
    root --> reference["引用类型（1种）"]

    primitive --> num["number"]
    primitive --> str["string"]
    primitive --> bool["boolean"]
    primitive --> und["undefined"]
    primitive --> nil["null"]
    primitive --> sym["symbol"]
    primitive --> bi["bigint"]

    reference --> obj["object"]
    obj --> po["plain object"]
    obj --> arr["array"]
    obj --> fn["function"]
    obj --> date["date"]
    obj --> reg["regexp"]'''
        },
        {
            "name": "typeof-results",
            "code": '''flowchart LR
    subgraph table["typeof 判断结果"]
        direction TB
        A1["typeof 123"] --> B1["number"]
        A2["typeof str"] --> B2["string"]
        A3["typeof true"] --> B3["boolean"]
        A4["typeof undefined"] --> B4["undefined"]
        A5["typeof null"] --> B5["object"]
        A6["typeof Symbol()"] --> B6["symbol"]
        A7["typeof BigInt(1)"] --> B7["bigint"]
        A8["typeof {}"] --> B8["object"]
        A9["typeof []"] --> B9["object"]
        A10["typeof function"] --> B10["function"]
    end'''
        },
        {
            "name": "stack-heap",
            "code": '''flowchart TB
    subgraph stack["栈"]
        a["a: 1"]
        obj1["obj1"]
        obj2["obj2"]
    end

    subgraph heap["堆"]
        objRef["name: 李四"]
    end

    obj1 & obj2 --> objRef'''
        },
        {
            "name": "coercion-rules",
            "code": '''flowchart LR
    subgraph conversion["== 隐式转换规则"]
        direction TB
        null["null"] --> und["undefined"]
        und2["undefined"] --> null2["null"]
        str["string"] --> num["number"]
        bool["boolean"] --> num2["数字"]
        obj["object"] --> result["再比较"]
    end'''
        },
        {
            "name": "closure-scope",
            "code": '''flowchart TB
    subgraph outer["outer() 执行上下文"]
        direction TB
        x["x = 10"]
        inner["inner 函数定义"]
    end

    outer --> fn_call["返回 inner"]

    subgraph inner_exec["fn() 执行"]
        direction TB
        fn["fn = outer() 返回的 inner"]
        fn --> x_val["访问 outer.x = 10"]
    end'''
        },
        {
            "name": "scope-chain",
            "code": '''flowchart TB
    subgraph global["Global Scope"]
        a["a = 1"]
        f1["f1 = function"]
    end

    global --> f1_scope

    subgraph f1_scope["f1() Scope"]
        b["b = 2"]
        f2["f2 = function"]
    end

    f1_scope --> f2_scope

    subgraph f2_scope["f2() Scope"]
        c["c = 3"]
        lookup["查找：本地 → f1 → global"]
    end'''
        },
        {
            "name": "arrow-vs-normal",
            "code": '''flowchart LR
    subgraph arrow["箭头函数"]
        A1["this"] --> A2["词法绑定"]
        A3["arguments"] --> A4["无"]
        A5["constructor"] --> A6["无"]
    end

    subgraph normal["普通函数"]
        N1["this"] --> N2["动态绑定"]
        N3["arguments"] --> N4["有"]
        N5["constructor"] --> N6["有"]
    end'''
        },
        {
            "name": "prototype-chain",
            "code": '''flowchart LR
    subgraph prototype["Person.prototype"]
        constructor["constructor → Person"]
        sayHi["sayHi → function"]
    end

    prototype --> instance

    subgraph instance["p（实例）"]
        name["name = 张三"]
        proto2["__proto__ → Person.prototype"]
    end'''
        },
        {
            "name": "prototype-inheritance",
            "code": '''flowchart LR
    c["c 实例"]
    c --> child_proto["Child.prototype"]
    child_proto --> parent_proto["Parent.prototype"]
    parent_proto --> obj_proto["Object.prototype"]
    obj_proto --> null["null"]'''
        },
        {
            "name": "promise-state",
            "code": '''stateDiagram-v2
    [*] --> pending
    pending --> fulfilled : resolve
    pending --> rejected : reject
    fulfilled --> [*]
    rejected --> [*]'''
        },
        {
            "name": "then-return",
            "code": '''flowchart LR
    subgraph then_return["then 返回值规则"]
        val1["普通值"] --> next1["下一个 Promise"]
        val2["Promise"] --> next2["下一个 Promise"]
        val3["throw 错误"] --> next3["下一个 Promise"]
        val4["thenable"] --> next4["下一个 Promise"]
    end'''
        },
        {
            "name": "event-loop",
            "code": '''flowchart TB
    A["1. 执行同步代码"] --> B["2. 清空微任务队列"]
    B --> B1["Promise.then, queueMicrotask, MutationObserver"]
    B --> C["3. 执行一个宏任务"]
    C --> C1["setTimeout, setInterval, I/O callback, UI render"]
    C --> D["4. 重复2-3"]
    D --> B'''
        },
        {
            "name": "node-event-loop",
            "code": '''flowchart TB
    subgraph node_loop["Node.js Event Loop"]
        direction TB
        timers["timers"]
        pending["pending callbacks"]
        poll["poll"]
        check["check"]
        close["close callbacks"]
    end

    timers --> pending --> poll --> check --> close --> timers'''
        },
        {
            "name": "map-vs-object",
            "code": '''flowchart LR
    subgraph comparison["Map vs Object"]
        direction TB
        M1["键类型：任意"]
        M2["有序性：按插入顺序"]
        M3["大小：size属性"]
        M4["迭代：可直接迭代"]
    end

    subgraph comparison2["Object"]
        O1["键类型：只能是string/symbol"]
        O2["有序性：基本有序"]
        O3["大小：Object.keys().length"]
        O4["迭代：需要Object.keys()"]
    end'''
        },
        {
            "name": "set-features",
            "code": '''flowchart LR
    subgraph set_features["Set 特性"]
        S1["唯一性：自动去重"]
        S2["查找性能：O(1)"]
        S3["添加/删除：O(1)"]
        S4["天然适合去重"]
    end'''
        },
        {
            "name": "esm-vs-cjs",
            "code": '''flowchart LR
    subgraph esm["ESM"]
        E1["编译时加载：静态分析"]
        E2["import：必须顶层"]
        E3["导出值：绑定"]
        E4["循环引用：暂时性死区"]
        E5["this：undefined"]
        E6["Tree Shaking：支持"]
    end

    subgraph cjs["CJS"]
        C1["运行时解析"]
        C2["require可动态"]
        C3["值拷贝"]
        C4["靠缓存"]
        C5["当前模块对象"]
        C6["Tree Shaking：不支持"]
    end'''
        },
        {
            "name": "v8-gc-architecture",
            "code": '''flowchart LR
    subgraph v8_gc["V8 GC 架构"]
        direction TB
        subgraph new_space["新生代 New Space 1-8MB"]
            S1["Scavenge算法 复制-替换"]
            S2["存活短的对象"]
        end

        subgraph old_space["老生代 Old Space"]
            O1["Mark-Sweep + Mark-Compact"]
            O2["存活长的对象"]
        end
    end'''
        }
    ],
    "docs/js/section-19-25.md": [
        {
            "name": "proxy-traps",
            "code": '''flowchart TB
    subgraph Proxy["Proxy 代理对象"]
        A["proxy.name, proxy.age = 18, delete proxy.name, name in proxy, Object.keys(proxy)"]
    end
    A --> B["Reflect.get()"]
    A --> C["Reflect.set()"]
    A --> D["Reflect.deleteProperty"]
    A --> E["Reflect.has()"]
    A --> F["Reflect.ownKeys"]
    A --> G["Reflect.apply()"]
    A --> H["construct trap"]'''
        },
        {
            "name": "esm-vs-cjs-comparison",
            "code": '''table
| 特性 | ESM | CJS |
| 语法 | import / export | require / module.exports |
| 加载时机 | 编译时 | 运行时 |
| 导出值 | 绑定只读 | 值拷贝 |
| 循环引用 | TDZ | 缓存机制 |
| Tree Shaking | 支持 | 不支持 |'''
        },
        {
            "name": "tree-shaking-process",
            "code": '''flowchart LR
    subgraph 源代码["源代码 ESM"]
        A1["utils.js: export function used, export function unused"]
        A2["main.js: import { used } from utils.js"]
    end
    subgraph 分析["静态分析"]
        B["打包工具：used保留, unused删除"]
    end
    subgraph 结果["最终打包"]
        C["只包含 used 函数"]
    end
    A1 --> B
    A2 --> B
    B --> C'''
        },
        {
            "name": "v8-memory-architecture",
            "code": '''flowchart TB
    subgraph Heap["V8 堆内存 Heap"]
        subgraph NewSpace["新生代 New Space 1-8MB"]
            A["from-space"]
            B["to-space"]
        end
        subgraph OldSpace["老生代 Old Space"]
            C["Old Pointer Space"]
            D["Old Data Space"]
            E["Large Object Space"]
        end
    end
    A --> B["Scavenge Minor GC"]
    C & D & E --> garbage["垃圾回收 Mark-Sweep"]'''
        },
        {
            "name": "mark-sweep",
            "code": '''flowchart LR
    R[Root] --> A[A]
    R --> E[E]
    A --> B[B]
    B --> C[C]
    B --> D[D]
    E --> F[F]'''
        },
        {
            "name": "debounce-vs-throttle",
            "code": '''flowchart LR
    subgraph Debounce["防抖 Debounce"]
        A1["用户输入 a b c d"] --> A2["等待500ms"]
        A2 --> A3["执行"]
    end
    subgraph Throttle["节流 Throttle"]
        B1["用户输入 a b c d"] --> B2["固定200ms间隔"]
        B2 --> B3["a"]
        B2 --> B4["b"] --> B5["c"]
    end'''
        }
    ],
    "docs/css/hyper-frequencies.md": [
        {
            "name": "data-types",
            "code": '''graph TB
    root["数据类型"]
    root --> primitive["原始类型 7种"]
    root --> reference["引用类型 1种"]

    primitive --> num["number"]
    primitive --> str["string"]
    primitive --> bool["boolean"]
    primitive --> und["undefined"]
    primitive --> nil["null"]
    primitive --> sym["symbol"]
    primitive --> bi["bigint"]

    reference --> obj["object"]
    obj --> po["plain object"]
    obj --> arr["array"]
    obj --> fn["function"]
    obj --> date["date"]
    obj --> reg["regexp"]'''
        }
    ],
    "docs/typescript/index.md": [
        {
            "name": "ts-compile-flow",
            "code": '''flowchart TD
    A[.ts 文件] --> B[解析 Parse]
    B --> C[AST 抽象语法树]
    C --> D[类型检查 Type Check]
    D --> E[类型错误报告]
    E --> F[发射 Emit]
    F --> G[.js 文件 + .d.ts]'''
        },
        {
            "name": "any-unknown-never",
            "code": '''table
| 类型 | 可赋值给 | 可访问属性 |
| any | 任意类型 | 任意属性 |
| unknown | 任意类型 | 不可需缩小 |
| never | 无不可赋值 | 不可 |'''
        },
        {
            "name": "interface-vs-type",
            "code": '''table
| 特性 | interface | type |
| 对象结构 | 支持 | 支持 |
| 合并扩展 | 声明合并 | 不支持 |
| 联合类型 | 不支持 | 支持 |
| 交叉类型 | 不支持 | 支持 |
| 映射类型 | 有限支持 | 完全支持 |
| 元组 | 不支持 | 支持 |'''
        }
    ],
    "docs/network/section-13-20.md": [
        {
            "name": "http-https-comparison",
            "code": '''table
| 特性 | HTTP | HTTPS |
| 安全性 | 明文传输 | 加密传输 |
| 端口 | 80 | 443 |
| 证书 | 不需要 | 需要 SSL/TLS |
| 性能 | 稍快 | 稍慢 |
| SEO | - | 更友好 |'''
        }
    ],
    "docs/agent/agent-evaluation.md": [
        {
            "name": "agentbench-env",
            "code": '''flowchart LR
    subgraph AgentBench评测环境
        A[OS操作系统] --> B[DB数据库]
        B --> C[KG知识图谱]
        C --> D[DCG数字卡牌游戏]
        D --> E[LTP横向思维]
        E --> F[HH家务管理]
        F --> G[WS网络购物]
        G --> H[WB网页浏览]
    end'''
        },
        {
            "name": "webarena-categories",
            "code": '''flowchart TD
    subgraph WebArena评测分类
        A[社交论坛] --> E[WebArena]
        B[业务管理系统] --> E
        C[游戏开发平台] --> E
        D[信息检索] --> E
        F[技术文档] --> E
    end'''
        },
        {
            "name": "benchmark-categories",
            "code": '''mindmap
  root((基准测试分类))
    软件工程
      SWE-bench
      HumanEval
      MBPP
    网页交互
      WebArena
      WebShop
      MiniWob++
    通用推理
      AgentBench
      tau-bench
      MINT
    安全与对齐
      HarmBench
      红队测试'''
        }
    ],
    "docs/agent/agent-frameworks.md": [
        {
            "name": "agent-workflow",
            "code": '''flowchart LR
    A[开始] --> B[LLM节点]
    B --> C[工具调用]
    C --> D{条件分支}
    D --> E[节点 A]
    D --> F[节点 B]
    D --> G[节点 C]'''
        },
        {
            "name": "framework-selection",
            "code": '''flowchart TD
    A{您的技术背景？}
    A --> B{是否需要快速原型？}
    A --> C{是否需要复杂多Agent协作？}
    B --> D[Coze]
    B --> E[Dify]
    C --> F[AutoGen]
    C --> G[LangGraph]'''
        },
        {
            "name": "learning-curve",
            "code": '''flowchart LR
    subgraph legend["学习难度"]
        H[高]
        M[中]
        L[低]
    end

    subgraph complexity["框架"]
        LC[LangChain]
        LG[LangGraph]
        LI[LlamaIndex]
        AU[AutoGen]
        CR[CrewAI]
        DF[Dify]
        CZ[Coze]
    end

    H -.-> LC
    H -.-> LG
    H -.-> LI
    M -.-> AU
    M -.-> CR
    L -.-> DF
    L -.-> CZ'''
        },
        {
            "name": "combo-schemes",
            "code": '''flowchart TB
    subgraph combo["组合方案示例"]
        C1["Dify 工作流 + LangChain 工具 + LlamaIndex RAG"]
        C2["Coze 快速 Bot + 自定义 Agent"]
        C3["LangGraph 状态机 + AutoGen 多Agent对话"]
    end'''
        }
    ],
    "docs/agent/memory-system.md": [
        {
            "name": "no-memory-vs-with-memory",
            "code": '''flowchart TB
    subgraph no_memory["无记忆的 Agent"]
        N1[用户：帮我重构用户模块]
        N2[Agent：请问用户模块在哪里？]
        N3[用户：就是上个对话里提到的]
        N4[Agent：抱歉，我没有上一个对话的上下文]
    end

    subgraph with_memory["有记忆的 Agent"]
        W1[用户：帮我重构用户模块]
        W2[Agent：从记忆中提取]
        W3[用户项目：/src/users/*]
        W4[上次讨论：计划使用 Repository 模式]
        W5[约束：需要保持向后兼容]
        W6[Agent：好的，我找到上次讨论的内容]'''
        }
    ]
}


def generate_mermaid_image(mermaid_code: str, output_path: str) -> bool:
    """Generate a PNG image from Mermaid code using mermaid.ink API."""

    # Encode the Mermaid code for URL
    encoded_code = base64.urlsafe_b64encode(mermaid_code.encode('utf-8')).decode('utf-8')

    # Generate the URL
    url = f"https://mermaid.ink/img/{encoded_code}"

    try:
        # Download the image
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as response:
            image_data = response.read()

        # Save the image
        with open(output_path, 'wb') as f:
            f.write(image_data)

        print(f"Generated: {output_path}")
        return True

    except urllib.error.HTTPError as e:
        print(f"HTTP Error for {output_path}: {e.code} - {e.reason}")
        return False
    except urllib.error.URLError as e:
        print(f"URL Error for {output_path}: {e.reason}")
        return False
    except Exception as e:
        print(f"Error for {output_path}: {e}")
        return False


def main():
    # Create output directory
    output_dir = Path("C:/Users/Xu/Desktop/someText/docs/assets/images/mermaid")
    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    fail_count = 0
    generated_files = []

    # Process each file
    for file_path, diagrams in MERMAID_BLOCKS.items():
        for i, diagram in enumerate(diagrams):
            filename = f"{diagram['name']}.png"
            output_path = output_dir / filename

            print(f"\nGenerating: {filename}")

            success = generate_mermaid_image(
                diagram['code'],
                str(output_path)
            )

            if success:
                success_count += 1
                generated_files.append({
                    'name': diagram['name'],
                    'path': f"assets/images/mermaid/{filename}",
                    'source_file': file_path
                })
            else:
                fail_count += 1

            # Rate limiting - be nice to the API
            time.sleep(0.5)

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Successfully generated: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"\nGenerated files:")
    for f in generated_files:
        print(f"  - {f['path']} (from {f['source_file']})")

    # Save manifest
    manifest = {
        'total': success_count,
        'failed': fail_count,
        'files': generated_files
    }

    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\nManifest saved to: {manifest_path}")


if __name__ == "__main__":
    main()