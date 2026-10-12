---
title: 秋招笔试算法与协议题：滑动窗口、预发布版本和可反驳测试
description: 以公开 PDD 前端笔试回忆为入口，明确题名与完整题面之间的证据边界，手写不重复子数组的最长区间及计数、严格版本优先级比较，再用独立穷举和边界测试验证算法，讨论范围表达式、字符相等与资源限制。
tags: [interview, handwritten, algorithm, semver, testing]
date: 2026-10-12
level: advanced
prerequisites: [Map 与 Set, BigInt, 正则表达式, 数组索引, 能运行 Node 测试]
runnable: true
tested_with: [node@24.16.0]
verified_at: 2026-10-12
source_commit:
  node_semver: v7.7.3
  repository_baseline: 707ea4929bbb84c67bd637f92360b002a2b23cf7
---

# 秋招笔试算法与协议题：滑动窗口、预发布版本和可反驳测试

“这题就是滑动窗口”“版本号 split 一下”很容易掩盖题意差异：要求最长区间还是所有合法区间数量？`beta.11` 与 `beta.2` 按字符还是数字比较？输入是否包括范围表达式？只有先确定协议，实现才可能正确。

## 1. 来源边界：真实出现的题型，不是复刻完整试卷

公开牛客文章 [《库洛前端+拼多多前端笔试》](https://www.nowcoder.com/feed/main/detail/f184630a893040e4acbf929f8eb0f2c5) 的作者自述时间为 **26/9/13**，PDD 部分提及不重复连续子数组、Promise 并发重启与旧结果作废、带 alpha/beta 标签的版本比较。这是个人笔试回忆，不是公司公开的完整题面。

回忆没有足够信息确定子数组题究竟求长度还是数量，也没有给出版本比较的完整输入语法和隐藏用例。本章因此写 **作者派生练习**：分别明确两个窗口目标，并以 SemVer 2.0.0 定义版本优先级。它们不承诺与原笔试的输入输出协议一致；并发重启另见 [真实场景题](real-interview-scenarios.md)。

| 证据 | 可以说什么 | 不能推断什么 |
| --- | --- | --- |
| 个人文章的题名和日期 | 作者回忆出现这些题型 | 官方题面、公司所有批次同题 |
| 评论提及范围字符串 | 需要进一步澄清输入 | 自行猜测完整 range 语法 |
| SemVer 规范 | 本章练习的明确比较合同 | 原卷一定采用全部规范 |
| 本仓库自动测试 | 自主实现满足声明的合同 | 通过未知公司的隐藏测试 |

## 2. 是什么：把题意变成可测试合同

先走这条链，再写循环：

```mermaid
flowchart LR
  Q[原始题名与来源] --> C[澄清输入输出合同]
  C --> I[写不变量与数据结构]
  I --> S[实现最小正确算法]
  S --> O[独立 oracle 与反例]
  O --> B[解释复杂度与边界]
```

题名只提供研究入口。合同定义合法输入、等价关系、结果及失败方式；不变量说明每一步为什么仍然正确；oracle 是不复用同一算法的验证器。

| 练习 | 明确输入 | 明确输出 | 本章边界 |
| --- | --- | --- | --- |
| 不重复连续窗口 | JavaScript 数组，按 Map 的键相等规则 | 最长长度、最早区间 `[start,end)`、所有合法非空窗口数量 | 不做深相等或 Unicode 归一化 |
| 严格版本比较 | 完整 `major.minor.patch`，可选 prerelease/build | `-1 / 0 / 1` 表示优先级 | 不解析 range、宽松 `v` 前缀或缺省版本 |

## 3. 为什么：窗口的左端必须单调

维护最后出现位置 `lastSeen`。处理 `right` 时，若当前值之前出现在 `previous`，左端只能移动到 `max(left, previous + 1)`。这样 `[left,right]` 里没有重复，且 `left` 是满足条件的最早起点。

| 处理序列 `[1,2,2,1]` | right | left | 当前长度 |
| --- | ---: | ---: | ---: |
| 第一个 1 | 0 | 0 | 1 |
| 第一个 2 | 1 | 0 | 2 |
| 第二个 2 | 2 | 2 | 1 |
| 第二个 1 | 3 | 2 | 2 |

最后一个 1 的旧位置在当前窗口外。如果直接设 `left=previous+1`，左端会退回 1，将两个 2 重新放入窗口。这是检查不变量的反例，不是靠背模板能避免的问题。

已实跑的核心片段，完整代码为仓库 `scripts/content-labs/interview/unique-window.mjs`：

```js
const previous = lastSeen.get(items[right]);
if (previous !== undefined) left = Math.max(left, previous + 1);
lastSeen.set(items[right], right);
const length = right - left + 1;
total += BigInt(length);
if (length > maxLength) { maxLength = length; start = left; }
```

最长区间只需取最大长度；数量题则对每个右端加 `right-left+1`：以该右端结束的合法起点恰好是 `left…right`。这是两个目标共享不变量，不代表它们输出相同。

代码用 `BigInt` 存计数，避免把数量合同绑定到浮点整数上限；最终如果 OJ 要求十进制文本，要显式转字符串。输出对象不能直接交给不支持 BigInt 的 JSON 序列化器。

### 3.1 相等规则也是题意

Map 使用 SameValueZero：`NaN` 和 `NaN` 视为同键，`0` 与 `-0` 同键，`1` 与 `'1'` 不同键，对象按身份。将元素全部转字符串会错误合并；按深相等又会引入另一套时间和资源合同。

字符串题要先说清以 UTF-16 单元、码点还是字素簇计数。把字符串转数组按码点遍历，也不能保证组合字符和家庭 emoji 不被拆开；可结合 [Unicode 与 Intl](../js/string-unicode-intl.md) 和 [文字排版](../browser/text-layout-pretext.md) 继续研究。

### 3.2 复杂度不能漏掉数据结构假设

每个元素只访问一次，但 Map 操作的实际代价由引擎实现决定；面试常用模型中按平均常数访问分析，总时间为 O(n)，辅助空间 O(k)，k 为不同键数量。输出区间只保存下标，不复制每个候选子数组。

若改用 Set 并逐个删除左端元素，虽然有内层循环，左指针全程仍最多前进 n 次。解释摊还分析，比看到双循环就回答 O(n²) 更重要。

## 4. 怎么样：用独立穷举验证窗口

朴素 oracle 对每个起点向右扫描，遇到重复就停止，再独立更新最长区间和数量。它不使用 `lastSeen` 或单调左端公式，因而能发现优化实现的左端回退、漏计和 tie-break 错误。

已验证片段，完整测试为 `scripts/content-labs/interview/unique-window.test.mjs`：

```js
for (let right = left; right < items.length; right++) {
  if (seen.has(items[right])) break;
  seen.add(items[right]); total++;
  if (right - left + 1 > maxLength) {
    maxLength = right - left + 1; start = left;
  }
}
```

自动测试枚举长度 0 到 6、每项来自三个值的 **1093 个数组**，逐项比较完整结果，而不是仅断言某个总数量。另测空数组、全重复、全不同、回退反例、最早同长区间、NaN、对象身份与字符串／数字区分。

这不是对任意输入的形式化证明。它提供系统反例搜索，正确性仍依赖不变量论证；生产环境还要限制输入量和响应时间。

## 5. 更底层：版本比较是语法加优先级

严格版本合同来自 [SemVer 2.0.0](https://semver.org/)，不是任意字符串排序：先按数值比较三段核心版本；相同时，预发布低于正式版；预发布标识逐项比较，数字按数值、非数字按 ASCII、数字低于非数字；build metadata 不影响优先级。

| 对比 | 结果 | 反例指向 |
| --- | --- | --- |
| `1.10.0` 与 `1.9.99` | 前者更高 | 整体字典序错误 |
| `1.0.0-beta.11` 与 `1.0.0-beta.2` | 前者更高 | 数字标识不可按字符比较 |
| `1.0.0-9` 与 `1.0.0-alpha` | 前者更低 | 数字与非数字有类别顺序 |
| `1.0.0-alpha` 与 `1.0.0-alpha.1` | 前者更低 | 公共前缀相同后还要比较长度 |
| `1.0.0+linux` 与 `1.0.0+mac` | 同优先级 | 构建标识不是发布先后 |

不能硬编码 `alpha < beta < rc` 就宣布完成：自定义合法标签同样需要比较。本章使用 BigInt 比较整数段，避免 Number 精度损失；非数字字符限制为 ASCII，因此不使用受区域设置影响的 `localeCompare`。

### 5.1 解析与比较分开

`parseVersion()` 检查三段核心数字、点分隔标识、前导零、空标识和非法字符；返回核心 BigInt 数组、预发布数组和构建数组。比较函数只接收解析后的确定结构，不把 parse failure 变成“两个版本相等”。

已验证片段，完整实现为 `scripts/content-labs/interview/semver-compare.mjs`：

```js
const x = a.prerelease[index], y = b.prerelease[index];
if (x === y) continue;
const nx = numeric(x), ny = numeric(y);
if (nx && ny) return order(BigInt(x), BigInt(y));
if (nx !== ny) return nx ? -1 : 1;
return order(x, y);
```

输入设 512 字符的教学资源上限；这不是规范本身的长度要求。长度上限只约束解析资源，不证明一个库是安全沙箱；还要考虑应用调用频率、来源和失败日志。

### 5.2 为什么不支持范围表达式

`compare('1.2.3','1.3.0')` 比较两个点；`satisfies(version, range)` 判断一个点属于哪个集合；`intersects(rangeA, rangeB)` 又是在操作集合。它们有不同的 parser、逻辑和预发布规则，不能把比较器当依赖解析器。

本章拒绝 `^1.2.3`、`>=1.2 <2`、`1.x` 等范围。如果实际试卷要求 range，要先询问比较运算符、AND／OR、缺省段、预发布、闭开区间和返回格式，再设计语法树及谓词；不可从面经评论猜协议。

## 6. 两个真实工程案例

**npm/node-semver：** 固定 [v7.7.3 的 SemVer 类](https://github.com/npm/node-semver/blob/v7.7.3/classes/semver.js) 可沿 `compareMain`、`comparePre` 读优先级，再沿 [range 实现](https://github.com/npm/node-semver/tree/v7.7.3/ranges) 读范围运算。真实库还有输入范围、宽松模式与选项限制，不能宣称本章几十行代码等价替代它；本次没有运行该库的完整测试。

**Rust Cargo：** [依赖需求官方文档](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html) 将版本需求与具体版本区分，并定义其生态的默认兼容范围与预发布策略。这是跨工具链的反例：相似字符串的默认含义也可能不同，不能把 npm 或自写 parser 的规则套给所有包管理器。

版本优先级是候选选择中的一环，不包含完整依赖约束求解、锁文件、下载完整性或来源安全。进一步读 [依赖与供应链](../engineering/supply-chain-lockfile-security.md)，把排序连接到交付流程。

## 7. 错误实现与追问树

| 错误 | 为什么错 | 必须补的测试 |
| --- | --- | --- |
| 窗口左端直接设旧位置+1 | 旧位置可能在窗口外 | `[1,2,2,1]` |
| 找到最长长度就当数量 | 两个不同输出目标 | `[1,2,3]` 数量与长度对照 |
| 版本全转 Number | 大整数可能相等化 | 超过安全整数的相邻段 |
| 用 localeCompare 排所有标签 | 数字类别与 ASCII 合同不一致 | `beta.2/beta.11`、大写／小写 |
| 非法版本返回0 | 错误被混成相等 | 空段、前导零、末尾换行 |
| 比较器直接接 range | 输入语法不同 | `^`、OR、缺省段和预发布 |

追问时按三个方向继续：

1. **合同变化**：长度改计数、数组改 Unicode 文本、数值标签改范围，原不变量能否保留？
2. **资源变化**：流式输入、无限历史、恶意长版本串，如何限制内存与计算？
3. **验证变化**：没有官方题面时，哪些结论只能写为作者练习？怎样设计独立 oracle？

## 8. 真实验收

仓库根目录，Node `24.16.0`，无第三方依赖。以下命令已执行：

```bash
node --test scripts/content-labs/interview/semver-compare.test.mjs scripts/content-labs/interview/unique-window.test.mjs
```

通过阈值：8 个测试全部通过、0 失败／跳过；其中窗口差分用例内部逐项验证 1093 个数组，版本用例验证所有预发布序列两两关系及非法输入。耗时依机器而变，不把测试运行时间写成算法性能保证。

失败时先看比较的完整输出对象、非法输入字符串或对应版本对；不要修改预期以掩盖错误。程序只用内存，不写文件、不启动 Worker／服务，也不修改标准库原型；退出即可清理。

未验收范围：未知原卷的 range／输入协议、真实 OJ、浏览器 UI、大规模性能与包管理器完整求解。关于动画题和异步状态题，分别读 [动画引擎](animation-engine-handwritten.md) 与 [场景题](real-interview-scenarios.md)。

## 9. 面试回答

**30 秒：** 我先澄清题目输出和相等规则。滑动窗口保持左端单调、窗口无重复，最长值和数量是不同聚合；版本比较先解析合同，再分核心数值、预发布和构建标识，不用整体字符串排序。

**2 分钟：** 窗口题用 `[1,2,2,1]` 验证左端不能回退，再推导以每个右端结束的合法窗口数。写独立穷举器，对 1093 个小数组差分，补空输入、同长 tie 和键相等边界。版本题按严格 SemVer 解析，拒绝不在合同里的 range，用 BigInt 保持整数精度，构建标识不进入优先级。用非法输入和预发布全序反例验证实现；真实公司题面不全时，不宣称自己的协议或测试等于官方答案。

## 10. 自测

<details><summary>为什么两层循环的 Set 滑动窗口不一定是 O(n²)？</summary>

左右指针都单调，每个元素最多被加入和删除一次；在平均常数集合操作模型下，用摊还计数分析。
</details>

<details><summary>为什么用一个优化算法给另一个优化算法算预期，不是独立 oracle？</summary>

两者可能共享同一个错误不变量。朴素枚举使用不同推导路径，更容易暴露优化实现的遗漏。
</details>

<details><summary>两个 build metadata 不同的版本比较结果为0，是否字符串也相等？</summary>

不相等；这里比较的是优先级，不是字节身份。缓存或制品校验仍要保留完整标识。
</details>

<details><summary>公开回忆只写了题名，能否自己补输入限制后称公司真题？</summary>

不能。可以标出真实题型来源，再把补充合同与代码清楚标为作者派生练习。
</details>

## 深入阅读

- [SemVer 2.0.0](https://semver.org/)：读语法和优先级，不把范围语法算入规范本身。
- [node-semver v7.7.3](https://github.com/npm/node-semver/tree/v7.7.3)：比较真实 parser、参数限制、范围与测试组织。
- [真实题目出处账本](../resources/real-interview-question-bank.md)：按公司、日期、岗位与轮次核对证据。
- [手写题全景目录](handwritten-question-catalog.md)：继续学习异步、UI、数据结构与工程题，不只练算法。
