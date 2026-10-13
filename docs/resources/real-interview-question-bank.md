---
title: 真实前端面试题库：按公司与轮次复盘
description: 基于公开牛客面经整理拼多多、字节、美团、腾讯与阿里前端岗位问题，区分作者回忆与汇总转述，给出机制拆解、边界追问和站内复习路径。
tags: [interview, frontend, question-bank]
date: 2026-10-12
level: reference
prerequisites:
  - JavaScript Promise 与事件循环
  - HTML、CSS、浏览器和至少一种前端框架
runnable: false
verified_at: 2026-10-12
source: docs/assets/research/interview-provenance-20261012.json
source_commit: 707ea4929bbb84c67bd637f92360b002a2b23cf7
---

# 真实前端面试题库：按公司与轮次复盘

这页把公开面经中的题目改写成练习。先读题目，再自己写出机制和边界。它不是公司官方题库。出处链接集中放在文末，字段记录仍保留在[机器可读来源表](../assets/research/interview-provenance-20261012.json)。

## 拼多多：组件、异步调度和笔试手写

### PDD 前端暑期实习一面：Tooltip 与改版 Flet

<!-- S01 · **来源证据：**[拼多多暑期实习前端一面凉经（已老实版）](https://www.nowcoder.com/feed/main/detail/5ee26f5246aa497f944511fcafdd03db?sourceSSR=users)，个人回忆；2025-04-02 发布，作者自述岗位为前端暑期实习，轮次一面；面试具体日期未说明，届别未说明。作者账号职业标签为 Go 开发，岗位信息采用帖子正文，不推断其身份。 -->

题目可以这样理解。用 React 思路手写 Tooltip 组件，并实现一个改版 Flet 布局题。这里把“Flet”视为作者记下的题目名称，不猜测它的完整视觉要求。

先拆开机制和边界。Tooltip 至少要处理触发元素与浮层的关联、进入/离开状态、定位和遮挡；键盘聚焦、触屏无 hover、视口边缘翻转、滚动后重算是常见边界。布局题应先把给定约束问清楚，再选择 Flex/Grid 和尺寸策略，不能只凭题名猜目标。

可以继续追问。鼠标从触发器移到浮层时如何避免闪烁？浮层如何逃离 `overflow: hidden`？重复触发时如何复用节点？

相关练习见[DOM 事件委托](../web-apis/dom-events-delegation.md)、[React 组件模式](../react/r19/component-patterns-best-practices.md)、[CSS 网格与 Flex 相关教程索引](../resources/html-css.md)。

### PDD 2026/9/13 前端笔试：连续子数组、Promise 重启、版本比较

<!-- S02 · **来源证据：**[库洛前端+拼多多前端笔试原帖](https://www.nowcoder.com/feed/main/detail/f184630a893040e4acbf929f8eb0f2c5)，个人回忆；正文明确自述 2026-09-13 参加两家公司的笔试，PDD 部分职位为前端（据帖子上下文），环节为笔试，届别未说明。页面 09-14 编辑。此处题意为改述。 -->

题目可以这样理解。帖子记录了不同连续子数组的判定、Promise 并发任务在重启后让旧结果失效、以及 alpha/beta 风格版本串的比较。

先拆开机制和边界。子数组必须连续，滑动窗口只适用于满足单调性的约束；[笔试算法专题](../coding/autumn-exam-algorithms.md)实现并差分验收了不重复子数组与预发布版本比较。重启任务需要用递增代次或取消令牌隔离旧请求，不能只清空屏幕；参见[异步代次场景](../coding/real-interview-scenarios.md)。

可以继续追问。异步任务已发出但不能取消时，如何阻止旧响应写状态？`1.10` 和 `1.2` 哪个更大？空数组、负数、重复版本段怎么处理？

相关练习见[Promise 与 async/await](../js/promise-async.md)、[Promise 手写实现](../coding/promise-implementations.md)、[数组算法](../algorithm/array.md)。

### PDD 前端笔试题型汇总：倒计时、并发控制、打字机

<!-- S03 · **来源证据：**[PDD 前端应聘者画像，个人总结供参考](https://www.nowcoder.com/discuss/888142118814818304?sourceSSR=enterprise)，汇总转述；页面 2026-05-24 发布，作者归纳 26 届 PDD 前端笔试与面试题型，未给出单次面试日期或轮次。以下题型只标记为汇总材料中的题型，不当作一次亲历。 -->

题目可以这样理解。实现倒计时组件、Promise 并发/串行/限重试、柯里化和对象扁平化；面试部分还提到 React 倒计时与 `useCallback`/`memo`。

先拆开机制和边界。定时器回调可能漂移，应以目标截止时间减当前时间算剩余量；并发池要保证同时运行数不超上限并让结果与输入顺序稳定；重试需区分可重试错误、次数上限和取消；对象扁平化要明确数组、空对象、循环引用和键路径规则。

可以继续追问。切后台再回来倒计时如何校正？某任务失败是否阻断其他任务？退避间隔如何避免同时重试？

相关练习见[防抖与节流](../js/debounce-throttle.md)、[Promise 手写实现](../coding/promise-implementations.md)、[JavaScript 与 TypeScript 资源](../resources/javascript-typescript.md)。

### PDD 前端笔试：翻转倒计时、并发进度与打字机

<!-- S04 · **来源证据：**[PDD 前端笔试真的好难](https://www.nowcoder.com/feed/main/detail/076d4b5635a0416d97ed42e30e50348a?sourceSSR=dynamic)，个人回忆；页面显示 09-22 20:29，但年份未说明；岗位前端笔试，轮次为笔试，年份与届别均未说明。正文短条目列出三个手写题，未给详细签名与限制。 -->

题目可以这样理解。手写翻转倒计时、带进度回调的并发控制、按节奏输出文本的打字机。

先拆开机制和边界。倒计时要以截止时间计算真实剩余时长；并发器须限制运行数量并保证进度单调；打字机在重启、停止或卸载时必须作废旧调度。这里将原帖短题名拆解为练习要点，不把补足的接口规格冒充原题原文。

可以继续追问。后台恢复后如何校准倒计时？失败任务如何计入进度？Unicode emoji 按何种字符单位逐字显示？

相关练习见[手写题目录 41–43](../coding/handwritten-question-catalog.md)、[Promise 手写实现](../coding/promise-implementations.md)。

## 字节：事件、发布订阅与浏览器调度

### 字节剪映前端日常一面：仅首次点击、发布订阅

<!-- S05 · **来源证据：**[字节前端日常面经](https://www.nowcoder.com/feed/main/detail/35e2be6f690b450eb8d02ec0ef434509?sourceSSR=users)，个人回忆；页面提供 4/25 至 4/29 的面试时间线和剪映深圳部门，年份未在正文时间线明示，页面于 2025 年上下文呈现，故面试年份记为未说明；岗位前端实习，轮次一面，届别未说明。 -->

题目可以这样理解。封装一个按钮回调，使其第一次点击执行、后续点击不再执行；手写发布订阅。

先拆开机制和边界。本文按 at-most-once 合同实现包装器：第一次调用前立即消耗调用额度，因此同步重入和首次抛错后都不会再次调用底层函数。若合同要求“只缓存成功结果、失败可重试”，那是另一种语义，必须增加 `executing` 状态来阻止执行期间的重入；不能把两种策略混为一谈。订阅系统要维护事件到监听器集合的映射，精确移除回调并定义发布期间增删监听器的快照语义。

可以继续追问。首次执行抛错后允许重试吗？同一个函数订阅两次如何退订一次？监听器在发布过程中取消自己会怎样？

相关练习见[发布订阅、Proxy 与 Reflect](../coding/pubsub-proxy-reflect.md)、[闭包与 JavaScript 语义](../js/index.md)。

### 字节剪映前端一面：合并有序数组与登录页

<!-- S05 · **来源证据：**同上，个人回忆；同帖一面记载手写合并有序数组及完成一个登录页面，轮次一面，年份/届别均未在原文明确。 -->

题目可以这样理解。合并两个有序数组；根据登录要求实现一个可用页面，原帖称允许使用 AI 工具。

先拆开机制和边界。数组合并可从两端比较，若要求原地写入需从尾部回填避免覆盖未读值；登录页要覆盖字段校验、提交状态、重复提交、服务端错误和可访问标签，不能把前端校验当成鉴权。

可以继续追问。其中一个数组为空或含重复值怎么办？提交期间按钮禁用还是允许取消？密码错误如何向读屏器播报？

相关练习见[数组算法](../algorithm/array.md)、[表单与 React Actions](../react/r19/actions-forms-optimistic.md)、[前端安全](../security/index.md)。

### 字节生活服务前端秋招一面：千分位格式化

<!-- S06 · **来源证据：**[字节生活服务前端秋招一面凉经](https://www.nowcoder.com/feed/main/detail/3d11766a7e5b4087895879499b82e22c)，个人回忆；2025-09-19 发布，标题自述秋招，岗位前端，轮次一面；正文未说明具体面试日与毕业届别。 -->

题目可以这样理解。为可能带小数部分的数字添加千分位分隔符。

先拆开机制和边界。先拆分整数、小数和符号，只对整数部分从右向左每三位分组；要明确输入是否只允许有限数字，是否保留小数尾零，以及大数精度由字符串还是 Number 决定。

可以继续追问。负数、科学计数法、空值、`NaN` 和超过安全整数范围的输入怎么处理？

相关练习见[JavaScript 数组与字符串 API](../js/array-api-es6-to-es2025.md)、[TypeScript 基础](../typescript/basics.md)。

## 美团：算法、异步、组件与布局

### 美团 3/27 前端面试：倒数第 K 个节点与树转换

<!-- S07 · **来源证据：**[美团 3.27 前端面经（4.1 更新）](https://www.nowcoder.com/feed/main/detail/4b583e0e47954541ba7f1b16b9cde180)，个人回忆；2025-04-01 发布，作者写明 3/27 面试和 4/1 更新，前端岗位；正文提及岗位调整后再次被捞，但未精确标轮次，均记未说明；届别未说明。 -->

题目可以这样理解。第一轮记有单链表倒数第 K 个节点；更新轮次手写数组中各字符串在目标串中的位置，以及树形结构转换。

先拆开机制和边界。倒数 K 可用快慢指针保持 K 个节点距离；子串查找要约定返回首个还是全部下标及空串语义；树转换要说明输入是否有父子引用、是否可能成环以及输出节点字段。

可以继续追问。K 超出链表长度返回什么？重复子串和重叠匹配是否都要返回？树深度很大时递归栈如何处理？

相关练习见[链表算法](../algorithm/linked-list.md)、[树与图数据结构](../js/ds-tree-graph-skiplist.md)。

### 美团前端一面：事件循环与二叉树层序遍历

<!-- S08 · **来源证据：**[9.2 美团前端一面](https://www.nowcoder.com/feed/main/detail/abbf87f1b186479b9b6101c64262b11a)，个人回忆；2025-09-04 发布，作者自述 9/2 面试、前端工程师，轮次一面；届别未说明。 -->

题目可以这样理解。分析多段事件循环输出题，并手写二叉树层序遍历。

先拆开机制和边界。先区分当前同步栈、微任务检查点和后续任务，再逐条标记回调排队时机；层序遍历用队列按层推进，空根返回空结果。输出顺序要依据具体宿主环境和代码，不凭“Promise 一定先于定时器”一句口诀推断。

可以继续追问。微任务里再加入微任务会在何时运行？层序遍历如何返回二维数组？树节点为空子节点时如何避免重复入队？

相关练习见[浏览器事件循环](../js/event-loop.md)、[事件循环练习](../js/event-loop-practice.md)、[二叉树](../algorithm/binary-tree.md)。

### 美团前端暑期面经：合并去重与通知组件

<!-- S09 · **来源证据：**[美团前端面经（被捞 n 次版）](https://www.nowcoder.com/feed/main/detail/0b84c76a42b7446a81099f6d3f4e2346?sourceSSR=subject)，个人回忆；2025-04-28 发布，作者自述前端暑期岗位，一面 4/23、二面 4/25；毕业届别未说明。 -->

题目可以这样理解。按顺序合并两数组并去重；以 Vue 写通知窗口组件；将金额按约束分配给多个人。

先拆开机制和边界。合并去重需明确稳定顺序和相等判定；通知组件需管理队列、关闭时机、定时器清理与无障碍播报；金额分配要把上下界与总和约束形式化，随机策略要检查是否会产生越界或无法收敛。

可以继续追问。对象按什么字段去重？组件卸载时如何清计时器？人数为 1、金额不足以满足下界时怎么办？

相关练习见[Vue 组件与组合式 API](../vue/components-composition.md)、[Vue 响应式](../vue/reactivity.md)、[数组算法](../algorithm/array.md)。

### 美团前端一面：flex 布局、Promise 并发

<!-- S10 · **来源证据：**[美团前端一面面经](https://www.nowcoder.com/feed/main/detail/d71973efbc104198ba989d49605cef3c?sourceSSR=subject)，个人回忆；2025-09-15 发布，作者自述前端工程师与秋招面经，具体面试日期、轮次和届别未说明。 -->

题目可以这样理解。解释 `flex: 1` 与居中/等间距布局；说明 JavaScript 异步方式并用 `Promise.all` 发起并发请求。

先拆开机制和边界。Flex 项目最终尺寸由 grow、shrink、basis 与容器可用空间共同决定；`Promise.all` 并发等待并保留输入顺序，遇到首个拒绝会拒绝，但不会自动取消其他请求。它适用于结果必须全部成功的聚合，不等于限流。

可以继续追问。子项数量未知时如何保持间距？一个请求失败后其余请求会怎样？数百个请求怎样限制并发？

相关练习见[Promise 与 async/await](../js/promise-async.md)、[Promise 手写实现](../coding/promise-implementations.md)、[HTML/CSS 资源](../resources/html-css.md)。

### 美团前端暑期一面：Promise 内部逻辑

<!-- S11 · **来源证据：**[4.23 前端实习美团一面](https://www.nowcoder.com/feed/main/detail/1a6ecdf6581c482a841c4a70418494b6)，个人回忆；2025-04-24 发布，标题写 4/23，前端实习岗位，一面；年份 2025，届别未说明。 -->

题目可以这样理解。手写 Promise（原帖作者只完成部分实现），并解释其内部状态与链式调用逻辑。

先拆开机制和边界。Promise 状态只能从 pending 转为 fulfilled 或 rejected 一次；`then` 返回新 Promise，回调返回值决定下游状态；thenable 需要按规则吸收。题目若限时，应优先实现状态锁定、异步回调队列和链式解析，再声明尚未覆盖的规范细节。

可以继续追问。为什么 `then` 必须返回新 Promise？回调抛错怎样传到下游？同一个 thenable 多次 resolve 怎样保证只采纳一次？

相关练习见[Promise 手写实现](../coding/promise-implementations.md)、[Promise 与 async/await](../js/promise-async.md)。

### 美团前端暑期一面：循环引用深拷贝

<!-- S11 · **来源证据：**同上；作者自述 2025-04-23 前端实习一面。原帖把 `target.target = target` 作为测试，并指出需用 WeakMap 避免递归循环。 -->

题目可以这样理解。实现深拷贝，并处理对象直接引用自身的循环结构。

先拆开机制和边界。复制对象前先将源对象映射到目标副本；递归遇到已见源对象时复用映射，保留循环图结构。通用实现还应明确 Map、Set、Date、原型、symbol 属性和函数的策略。

可以继续追问。为何不能等子属性都复制完成后再登记映射？两个不同属性指向同一对象时，怎样保留共享引用？

相关练习见[深拷贝](../js/deep-copy.md)、[WeakMap 与引用语义](../js/index.md)。

## 腾讯：异步加法、大数与查找结构

### 腾讯云前端实习一面：异步加法器

<!-- S12 · **来源证据：**[腾讯云前端实习面经（三面挂）](https://www.nowcoder.com/feed/main/detail/2c141f34992d47f7a2492bfe3648846b?sourceSSR=subject)，个人回忆；2025-03-15 发布，作者自述 3/3 一面，前端实习；页面时间线含 3/5 二面和 3/13 三面；届别未说明。 -->

题目可以这样理解。实现异步加法器，完成后讨论如何优化。原帖没有公开更细的函数签名和并发约束，因此这里不补造要求。

先拆开机制和边界。异步加法的核心是把一次加法封装成 Promise 并明确调度策略；串行累加、并发分组和固定并发池的延迟/资源占用不同。必须先问清单次操作延迟、输入规模、失败行为和顺序要求。

可以继续追问。怎样将多次加法并行化而保留数学结果？中途失败是否取消剩余操作？空输入与只有一个数怎样返回？

相关练习见[Promise 手写实现](../coding/promise-implementations.md)、[事件循环](../js/event-loop.md)。

### 腾讯云前端实习二面：大数加法

<!-- S12 · **来源证据：**同上；作者自述 3/5 二面，岗位前端实习；届别未说明。题目从帖子正文改述。 -->

题目可以这样理解。对可能超过 JavaScript 安全整数精度的非负整数字符串做加法。

先拆开机制和边界。从低位开始双指针相加并携带进位，结果逆序收集后反转；不得先转 Number。题目要确认是否支持负号、小数、前导零及空字符串。

可以继续追问。长度不等怎么处理？最后进位如何追加？若要支持负数，如何复用绝对值加法？

相关练习见[字符串与数组 API](../js/array-api-es6-to-es2025.md)、[算法专题](../algorithm/index.md)。

### 腾讯云前端实习三面：百万单词查询

<!-- S12 · **来源证据：**同上；作者自述 3/13 三面，岗位前端实习；原帖明确要求讨论百万个、最长 30 字符的单词集合内存与查询策略；届别未说明。 -->

题目可以这样理解。估算约 100 万个单词的存储规模，并在预处理成本不计时讨论如何快速判断单词是否存在。

先拆开机制和边界。要先说明字符编码、对象/字符串元数据和索引结构是否计入估算；可比较排序后二分、哈希集合与 Bloom filter。Bloom filter 可能假阳性但不会假阴性（在标准插入/查询流程下），需要精确答案时仍要回查原集合。

可以继续追问。内存预算只有几十 MB 如何取舍？需要删除元素时 Bloom filter 有何限制？哈希冲突如何处理？

相关练习见[JavaScript 数据结构](../js/ds-tree-graph-skiplist.md)、[性能与质量资源](../resources/performance-quality.md)。

## 阿里：前端基础与 Canvas/SVG 选择

### 阿里控股前端暑期：LCP、图形渲染与构建工具

<!-- S13 · **来源证据：**[阿里控股前端暑期面经](https://www.nowcoder.com/feed/main/detail/480807e5eeb449d7a392f5df4fb5f0fc)，个人回忆；2025-05-09 发布，作者自述 4/25 面试 45 分钟，前端暑期岗位；轮次未说明，届别未说明。 -->

题目可以这样理解。解释 LCP 与测量方式，比较 ECharts 中 Canvas 和 SVG；讨论路由懒加载后切换变慢、HTTP/HTTPS、XSS/CSRF、Webpack/Vite 与闭包回收。

先拆开机制和边界。Canvas 适合大量图元的逐帧绘制，但单图元命中和无障碍语义需自行构建；SVG 有 DOM 节点和样式语义，节点数量大时管理成本上升。LCP 优化应以真实用户或实验室测量定位瓶颈，不能把“用了懒加载”直接等同于更快。

可以继续追问。何时选 SVG？路由 chunk 首次加载与重复访问如何分别测？XSS 与 CSRF 的攻击前提分别是什么？

相关练习见[Canvas 与 WebGL 渲染管线](../browser/canvas-webgl-pipeline.md)、[媒体与 Canvas/SVG API](../html/media-canvas-svg.md)、[HTTP 版本](../network/http-versions.md)、[XSS](../security/xss.md)。

### 阿里大文娱前端暑期：深拷贝与灯泡切换

<!-- S14 · **来源证据：**[阿里大文娱前端暑期面经](https://www.nowcoder.com/feed/main/detail/dbf40616a89d41bf82409a6c2864eabe)，个人回忆；2025-05-14 发布，作者自述 5/14 面试 1 小时，前端暑期岗位；轮次与届别未说明。 -->

题目可以这样理解。手写深拷贝；100 盏灯由 100 个人依次翻转其编号倍数灯，求最终亮灯编号。

先拆开机制和边界。通用深拷贝需处理循环引用、数组、Date/Map/Set 等类型，并明确函数、原型、访问器是否复制；灯题的第 n 盏灯被其因数个数次翻转，只有完全平方数因数为奇数，因此最终亮灯位置是平方数。

可以继续追问。弱映射如何帮助解决循环引用？稀疏数组如何复制？灯题若只处理前 N 盏，复杂度如何优化？

相关练习见[深拷贝](../js/deep-copy.md)、[算法资源](../resources/algorithms-interview.md)。

## 30 秒与 2 分钟作答模板

**30 秒回答：**先说清输入和约束，再给核心不变量与复杂度，最后点出一个边界。例如“我用快慢指针让两指针始终相距 K 个节点；快指针到尾时慢指针正好在倒数第 K 个位置。时间 O(n)、空间 O(1)，我会先约定 K 越界时返回错误还是空值。”

**2 分钟回答：**描述现象和需求；写出规则与关键机制；说明实现选择和复杂度；用空输入、边界值、异常或并发冲突检验；最后说明另一种方案及其代价。对于异步题，还要说清拒绝传播、取消能力和旧任务能否写回状态。

## 自测

<details>
<summary>展开 4 道自测题与要点</summary>

1. `Promise.all` 第一个 Promise 拒绝后，其他请求会被取消吗？答：不会，除非另行用 AbortController 等机制取消。
2. 对异步搜索框快速输入 `a`、`ab`，怎样防止 `a` 的慢响应覆盖 `ab`？答：取消旧请求或用请求代次校验后再写状态。
3. 通用 Tooltip 为什么不能只用 `mouseenter` 和 `mouseleave`？答：键盘、触屏、浮层间移动、视口边缘和滚动定位都需要额外处理。
4. Canvas 与 SVG 如何选择？答：结合图元数量、更新频率、单项交互、文本语义、可访问性和测量结果，而不是按“谁更快”做绝对判断。

</details>

## 验证状态与深入阅读

从题目走到完整实现，可以继续看[秋招笔试算法](../coding/autumn-exam-algorithms.md)、[动画引擎](../coding/animation-engine-handwritten.md)、[异步场景题](../coding/real-interview-scenarios.md)和[倒计时与打字机](../coding/deadline-clock-and-typewriter.md)。

## 来源链接

表中的编号对应各题附近隐藏的来源记录。日期、岗位与轮次原样保存在记录和机器可读表中，正文只保留题目与解题过程。

| 编号 | 对应条目 | 原帖 |
|---|---|---|
| S01 | PDD Tooltip | [拼多多暑期实习一面](https://www.nowcoder.com/feed/main/detail/5ee26f5246aa497f944511fcafdd03db?sourceSSR=users) |
| S02 | PDD 笔试算法与重启 | [库洛与拼多多笔试](https://www.nowcoder.com/feed/main/detail/f184630a893040e4acbf929f8eb0f2c5) |
| S03 | PDD 题型汇总 | [PDD 应聘者画像](https://www.nowcoder.com/discuss/888142118814818304?sourceSSR=enterprise) |
| S04 | PDD 倒计时与并发 | [PDD 前端笔试记录](https://www.nowcoder.com/feed/main/detail/076d4b5635a0416d97ed42e30e50348a?sourceSSR=dynamic) |
| S05 | 字节剪映两题 | [字节前端日常面经](https://www.nowcoder.com/feed/main/detail/35e2be6f690b450eb8d02ec0ef434509?sourceSSR=users) |
| S06 | 字节生活服务格式化 | [字节生活服务一面](https://www.nowcoder.com/feed/main/detail/3d11766a7e5b4087895879499b82e22c) |
| S07 | 美团链表与树 | [美团 3.27 面经](https://www.nowcoder.com/feed/main/detail/4b583e0e47954541ba7f1b16b9cde180) |
| S08 | 美团事件循环 | [美团 9.2 一面](https://www.nowcoder.com/feed/main/detail/abbf87f1b186479b9b6101c64262b11a) |
| S09 | 美团去重与通知 | [美团暑期面经](https://www.nowcoder.com/feed/main/detail/0b84c76a42b7446a81099f6d3f4e2346?sourceSSR=subject) |
| S10 | 美团 Flex 与并发 | [美团前端一面](https://www.nowcoder.com/feed/main/detail/d71973efbc104198ba989d49605cef3c?sourceSSR=subject) |
| S11 | 美团 Promise 与深拷贝 | [美团 4.23 一面](https://www.nowcoder.com/feed/main/detail/1a6ecdf6581c482a841c4a70418494b6) |
| S12 | 腾讯云三轮题目 | [腾讯云前端实习面经](https://www.nowcoder.com/feed/main/detail/2c141f34992d47f7a2492bfe3648846b?sourceSSR=subject) |
| S13 | 阿里控股 | [阿里控股前端暑期面经](https://www.nowcoder.com/feed/main/detail/480807e5eeb449d7a392f5df4fb5f0fc) |
| S14 | 阿里大文娱 | [阿里大文娱前端暑期面经](https://www.nowcoder.com/feed/main/detail/dbf40616a89d41bf82409a6c2864eabe) |

- [来源与证据字段](../assets/research/interview-provenance-20261012.json)：核对每条题目的原帖、日期和证据类别。
- [手写题目录](../coding/handwritten-question-catalog.md)：把题目扩展为约束、测试、不变量和限时练习。
- [面试练习资源](interview-practice.md)：规划题目复习、模拟和反馈记录。
