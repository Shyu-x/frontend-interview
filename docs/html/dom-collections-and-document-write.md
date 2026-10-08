---
title: HTMLCollection、NodeList 与 document.write
description: HTMLCollection 与 NodeList 的 live/static 差异，以及 document.write 的问题与替代方案。
---

# HTMLCollection、NodeList 与 document.write

## 1. HTMLCollection vs NodeList 区别

### 1.1 核心区别

| 特性 | HTMLCollection | NodeList |
|------|----------------|----------|
| 获取方式 | `getElementsByTagName`等 | `querySelectorAll` |
| 包含节点类型 | 仅 Element 节点 | 任意节点类型（Element/Text/Comment等） |
| 是否实时 | **实时**（live，DOM 变化时自动更新） | **静态**（static，DOM 变化不自动更新） |
| 支持方法 | `namedItem()` | `forEach`, `entries`, `keys`, `values` |
| 有长度 | 有 `.length` | 有 `.length` |
| 可枚举 | 可（但不是 Array） | 可（但不是 Array） |

### 1.2 Live vs Static 行为演示

```javascript
const divs = document.getElementsByTagName('div'); // HTMLCollection（实时）
const spans = document.querySelectorAll('span');    // NodeList（静态）

// HTMLCollection 是实时的
document.body.appendChild(document.createElement('div'));
console.log(divs.length); // 增加 1（实时更新！）

// NodeList 是静态的
document.body.appendChild(document.createElement('span'));
console.log(spans.length); // 不变（快照）

// 都不是真正的数组
divs.push(); // 报错：HTMLCollection 没有 push

// 转为数组
const arr = Array.from(divs);
const arr2 = [...divs];
const arr3 = Array.prototype.slice.call(divs);

// NodeList 支持 forEach（现代浏览器）
spans.forEach(el => console.log(el));
```

### 1.3 childNodes vs children

```javascript
element.childNodes;   // NodeList，包含所有节点（包括文本/注释）
element.children;     // HTMLCollection，只包含 Element 子节点（实时）

// 示例
<div id="container">
  文本节点
  <span>元素节点</span>
  <!-- 注释节点 -->
</div>

container.childNodes.length;  // 5 (文本 + span + 文本 + 注释 + 文本)
container.children.length;    // 1 (只有一个 span 元素)
```

### 1.4 性能与内存影响

| 场景 | HTMLCollection | NodeList |
|------|--------------|----------|
| 频繁 DOM 操作 | 实时更新导致额外开销 | 是 快照，无额外开销 |
| 静态内容遍历 | 否 每次访问都重新计算 | 是 一次性快照 |
| 缓存引用 | 每次访问 live 结果 | 是 稳定引用 |
| 适合场景 | 需要实时反映 DOM 变化的场景 | 大部分场景（推荐 querySelectorAll） |

```typescript
// HTMLCollection 在循环中可能出问题
const divs = document.getElementsByTagName('div');
for (let i = 0; i < divs.length; i++) {
  // 如果循环中删除 div，length 会实时变化，导致跳过元素
}

// 正确：安全做法：先转为数组
const divsArr = Array.from(document.getElementsByTagName('div'));
for (const div of divsArr) {
  // 安全删除，不会跳过
  if (shouldRemove(div)) div.remove();
}

// 正确：或者从后往前删（live collection）
while (divs.length > 0) {
  divs[0].remove(); // 每次移除第一个，length 减小
}
```

### 1.5 namedItem 方法

HTMLCollection 有 `namedItem()` 方法，通过 name 或 id 获取元素：

```javascript
// HTMLCollection 有 namedItem
const forms = document.forms; // HTMLCollection of forms
const myForm = forms.namedItem('myForm'); // 获取 name="myForm" 的表单

// NodeList 没有 namedItem，但可以用多种方式访问
const buttons = document.querySelectorAll('.btn');
const first = buttons[0];           // 数组索引
const named = document.querySelector('[name="save-btn"]'); // CSS 选择器
```

### 1.6 面试 follow-up 问题

#### Q1: 为什么 HTMLCollection 是"实时"的？这种设计有什么优缺点？

**答案：**
HTMLCollection 内部维护了对 DOM 树的实时引用。当 DOM 变化时，HTMLCollection 自动更新，无需重新查询。

**优点：**

- 始终反映 DOM 最新状态，不需要手动刷新
- 适合需要实时监听 DOM 变化的场景

**缺点：**

- 每次访问 `.length` 或索引时，都会重新计算（遍历底层引用）
- 在循环中修改 DOM 时可能导致意外行为（跳过元素）
- 内存占用比静态 NodeList 高（需要维护引用）

---

#### Q2: `querySelectorAll` 返回的 NodeList 真的是"静态"的吗？

**答案：**
在现代浏览器中，`querySelectorAll` 返回的 NodeList 是**静态的**（snapshot），DOM 变化不会影响已返回的 NodeList 内容。

但需要注意：

1. **子 NodeList** 可能不是静态的：`element.childNodes` 返回的 NodeList 在某些场景下是 live 的（规范允许）
2. **旧版浏览器**（如 IE）行为可能不同
3. **TreeWalker/NodeIterator** 返回的不是 NodeList

---

#### Q3: 如何安全地遍历可能动态变化的集合？

**答案：**
方案一：转为数组（创建快照）
```javascript
const arr = [...collection]; // 或 Array.from(collection)
arr.forEach(item => process(item));
```

方案二：从后往前遍历（避免跳过）
```javascript
for (let i = collection.length - 1; i >= 0; i--) {
  process(collection[i]);
}
```

方案三：while 循环
```javascript
while (collection.length > 0) {
  process(collection[0]);
  collection[0].remove(); // 移除后，集合自动更新
}
```

---

> 参考：
> - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection
> - https://developer.mozilla.org/en-US/docs/Web/API/NodeList
> - https://blog.csdn.net/weixin_43807979/article/details/123851813
> - https://blog.csdn.net/weixin_43317551/article/details/125519289

## 2. document.write 为什么不推荐

### 2.1 document.write 的问题

#### 问题详解

```javascript
// 不推荐的原因：
document.write('<script>alert(1)</script>');

// 1. 同步覆盖页面内容（如果在页面加载后调用，会清空整个文档）
if (condition) {
  document.write('<h1>条件内容</h1>'); // 慎用！
}

// 2. 阻塞页面解析和渲染
// 3. 无法进行错误处理
// 4. 无法利用 CSP（Content Security Policy）
// 5. 违背了 DOM 编程模型
```

#### document.write 时机行为

```
页面加载中调用 document.write：
→ 追加到当前解析位置继续解析

页面加载完成后调用 document.write：
→ 调用 document.open() 清空当前文档
→ 重新开始解析（等同于重新加载页面）
→ 之前的 DOM 树、事件监听全部丢失
```

```javascript
// 危险演示
document.addEventListener('DOMContentLoaded', () => {
  document.write('<p>Hello</p>'); // 清除整个页面！
  // 之前的 DOM 树消失
  // 之前的事件监听器消失
  // 页面重新开始渲染
});
```

### 2.2 CSP 限制

Content Security Policy (CSP) 会阻止 `document.write`：

```html
<!-- CSP 策略阻止内联脚本和外链 document.write -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">
<!-- 任何 document.write 都会被 CSP 拦截 -->
```

现代浏览器越来越倾向于弃用 `document.write`，原因：

1. **安全风险**：XSS 攻击常用手段
2. **性能问题**：同步阻塞解析
3. **与现代 Web 不兼容**：模块系统、async/defer 等机制无法配合

### 2.3 现代替代方案

```javascript
// 替代 document.write 的正确方式
const container = document.getElementById('root');

// 方式1：innerHTML
container.innerHTML = '<p>动态内容</p>';

// 方式2：createElement（更安全）
const p = document.createElement('p');
p.textContent = '安全文本';
container.appendChild(p);

// 方式3：insertAdjacentHTML（性能更好，插入位置可选）
container.insertAdjacentHTML('beforeend', '<p>追加内容</p>');
// 位置：'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

// 方式4：template 元素（适合复杂结构）
const template = document.createElement('template');
template.innerHTML = '<p>Template content</p>';
container.appendChild(template.content.cloneNode(true));
```

#### React/Vue 中的替代

```tsx
// React: 使用 JSX
function App() {
  const [show, setShow] = useState(false);
  return show ? <p>Dynamic content</p> : null;
}

// Vue: 使用 v-if/v-show
// <p v-if="show">Dynamic content</p>

// 绝对不要在 React 中使用 document.write
// 它会破坏虚拟 DOM 机制
```

### 2.4 面试 follow-up 问题

#### Q1: 如果页面加载完成后调用 `document.write`，实际会发生什么？

**答案：**
页面加载完成后调用 `document.write` 实际上等同于：

1. 隐式调用 `document.open()` — 清空当前文档（包括 DOM 树）
2. 将新内容写入文档流
3. 触发新的页面解析和渲染流程

**后果：**

- 当前页面的 DOM 树完全销毁
- 所有 JavaScript 变量和状态丢失
- 所有事件监听器被解除
- 页面 URL 保持不变（不是真正的页面跳转）
- 如果在 `window.onload` 之后调用，浏览器行为不可预测

```javascript
// 实际效果等同于
document.open(); // 清除文档
document.write('<p>New content</p>');
document.close(); // 结束写入
```

---

#### Q2: 有什么场景必须用 `document.write` 吗？

**答案：**
几乎没有。现代 Web 开发中，**没有任何场景必须使用 `document.write`**。

可能的遗留场景：

1. **极老项目的书签脚本**（bookmarklet）
2. **CDN 注入脚本的简单方案**（但有安全风险）
3. **测试/调试时的快速注入**（仅开发阶段）

**替代方案总结：**

| 场景 | document.write | 现代替代 |
|------|--------------|---------|
| 动态插入内容 | `doc.write('<div>')` | `innerHTML` / `createElement` |
| 延迟加载脚本 | `doc.write('<script src=...>')` | `dynamic import` / `JSONP` |
| 第三方脚本注入 | `doc.write(script)` | `appendChild(createElement('script'))` |
| 书签脚本 | `doc.write(...)` | `body.insertAdjacentHTML` |

---

> 参考：
> - https://developer.mozilla.org/en-US/docs/Web/API/Document/write
> - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
> - https://blog.csdn.net/weixin_45517869/article/details/123851813
> - https://blog.csdn.net/qq_43522036/article/details/122890463

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格，勾选后批量删行 | HTMLCollection 实时性 | `getElementsByTagName` 加事件委托 | 循环中删行会让集合变短，先转数组 |
| 低端安卓的首屏配置直出 | document.write 的解析期行为 | 服务端拼 HTML 加内联脚本 | 只在解析阶段可用，defer 脚本里调用会清空文档 |
| 多人协作白板的节点同步 | NodeList 是静态快照 | `querySelectorAll` 抓快照加增量广播 | 消息到达时先抓快照，再算差异 |
| 第三方广告位同步填充 | document.write 注入脚本 | 广告位的同步渲染模式 | 阻塞解析，弱网下会被浏览器干预 |
| 埋点统计按钮点击率 | HTMLCollection 实时 | `getElementsByClassName` | 每次现查，别缓存集合再判断元素是否存在 |
| 富文本编辑器粘贴清理 | NodeList 静态快照 | `querySelectorAll` 加递归处理 | 父节点已移除时，先取子节点快照再递归 |
| 无限滚动列表的可见项统计 | 两者的差别 | IntersectionObserver 加 `querySelectorAll` | 回调里重新查询，不要复用上一轮的 NodeList |
| 单页应用路由切换后的节点回收 | NodeList 静态快照 | `querySelectorAll` | 路由离开前抓快照，卸载时按快照逐个移除 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格，勾选后批量删除行

**业务背景**：后台表格一次渲染几千行，运营勾选若干行后点"批量删除"。行数由筛选条件决定，用 `table.rows.length` 就能读到当前规模。

**怎么用本页知识解决**：思路是把实时集合复制成数组，再在数组上做筛选和删除。

```js
// getElementsByTagName 返回 HTMLCollection，它是实时的
const rows = document.getElementsByTagName('tr');

// 不要这样写：i 递增的同时集合在变短，会漏掉后面的行
// for (let i = 0; i < rows.length; i++) rows[i].remove();

// 先做一次快照，复制成静态数组
const snapshot = Array.from(rows);

snapshot
  .filter(tr => tr.querySelector('.check').checked)  // 只挑勾选行
  .forEach(tr => tr.remove());                       // 删行不影响 snapshot
```

- 实时集合的 `length` 是查询结果，不是缓存值，删一个节点它就少一个。
- `Array.from` 复制出的数组长度固定，遍历过程不受删除影响。
- 筛选和删除分两步走，先算清目标集合再动 DOM。
- 如果一定要用索引循环，就倒着遍历：`for (let i = rows.length - 1; i >= 0; i--)`。

**怎么度量收益**：用 Chrome DevTools Performance 面板录制一次批量删除，数 `Recalculate Style` 与 `Layout` 的出现次数。再用 `performance.mark` 和 `performance.measure` 包住删除逻辑，通过 `PerformanceObserver` 读时长。最后核对删除前后的 `table.rows.length` 与勾选数是否吻合。

**什么时候不该用**：

- 表格只有几十行、删除后由后端返回整段 HTML 时，直接替换容器内容，省掉遍历逻辑。
- 需要保留滚动位置和输入焦点时，逐行 `remove()` 会触发多次重排，改为一次性替换或 CSS 隐藏。

#### 场景 2：低端安卓的首屏，同步脚本注入配置

**业务背景**：低端安卓机上首屏要先拿到一份配置再渲染骨架，配置以同步脚本方式注入。规模用 `document.scripts.length` 和 Network 面板的请求数衡量。

**怎么用本页知识解决**：思路是先分清调用时机，解析期调用和解析完成后调用的结果完全不同。

```html
<!-- 解析到这里时文档还在加载，write 的标签接在当前脚本之后，继续阻塞解析 -->
<script>
  document.write('<script src="/config.js"><\/script>');
</script>

<!-- 同一段写入逻辑放进 defer 脚本，执行时机变成文档解析完成之后 -->
<script defer src="/late.js"></script>
<script>
  // late.js 内部：此时文档已解析完，write 会先清空整页
  // document.write('<p>late</p>');  // 结果只剩这一行
</script>
```

- 解析期调用 `write`，内容插入当前位置，后面的解析继续。
- 文档解析完成后调用 `write`，浏览器先清空文档再写入，页面只剩新内容。
- 同步脚本会阻塞解析，弱网下这段阻塞直接推后首屏内容出现的时间。
- 配置改成内联 JSON 或 `defer` 脚本读取，效果一样，且不再阻塞解析。

**怎么度量收益**：用 DevTools Coverage 面板看首屏关键脚本的未使用字节占比。在 Performance 面板里看 FCP 与 LCP 标记的时间点。用 Lighthouse 对改造前后各跑 3 次，取中位数比较。

**什么时候不该用**：

- 配置不需要在解析期同步返回时，用 `defer` 或 `type="module"` 加载。
- 页面加载完成后才需要动态加载脚本时，用 `createElement('script')` 加 `appendChild`。

#### 场景 3：多人协作白板的节点同步

**业务背景**：白板上百个图形节点，多端通过长连接同步增删。节点规模用 `board.querySelectorAll('.node').length` 直接读出。

**怎么用本页知识解决**：思路是远端消息到达时先抓静态快照，按快照算差异，避免边遍历边被实时集合改动带偏。

```js
// querySelectorAll 返回静态 NodeList，抓到的是这一瞬间的节点
const before = document.querySelectorAll('.node');

// 收到远端批量增删消息，把要删的 id 装进 Set
const removed = new Set(msg.removedIds);

before.forEach(node => {                 // 遍历期间这个集合不会变
  if (removed.has(node.dataset.id)) node.remove();
});

// 插入新节点后，下一次查询拿到的是新集合
const after = document.querySelectorAll('.node');
```

- 静态集合的长度固定，遍历时删节点不会让循环跳项。
- 对比实时集合：用 `getElementsByClassName` 抓到的集合，删一个就少一个。
- 差异计算基于快照，远端消息处理逻辑可以独立测试。
- 插入新节点不放进同一个循环，避免遍历中途改变视图。

**怎么度量收益**：用 `performance.mark` 在消息到达和渲染结束处打点，读 `performance.measure` 的时长。用 Performance 面板看一次消息触发的 Layout 次数。用 `MutationObserver` 记录一次消息产生的 DOM 变更条数，确认只动受影响的节点。

**什么时候不该用**：

- 远端消息携带完整画布状态、节点只有几十个时，重建容器内容比逐个算差异少写代码。
- 单机模式、本地是唯一写入方时，直接用实时集合遍历，不需要额外快照。

### 行业先进实践

**对 document.write 注入的脚本做干预（出处：Chrome 官方博客 Intervening against document.write）**
浏览器在弱网条件下会拦截由 `document.write` 注入的解析阻塞脚本，并在控制台给出警告。项目里出现这类警告，说明首屏依赖了同步注入。借鉴方式：在 CI 里跑 Lighthouse，检查控制台是否出现该警告。

**用 querySelectorAll 取静态快照（出处：MDN Web Docs 的 HTMLCollection 与 NodeList 页面）**
MDN 明确标注 HTMLCollection 为实时集合，`querySelectorAll` 返回静态 NodeList。凡是"遍历时集合不能变"的位置，就用后者。借鉴方式：在代码规范里写一条，循环体内增删节点前先做快照。

**用 MutationObserver 观察节点增删（出处：MDN Web Docs MutationObserver 页面与 WHATWG DOM 规范）**
规范把 `DOMNodeInserted` 这类变更事件标为废弃，MutationObserver 以微任务批量回调。借鉴方式：需要监听列表变化时用 MutationObserver，不要轮询 HTMLCollection 的 `length`。

**流式服务端渲染替代整页拼装（出处：React 官方文档 renderToPipeableStream）**
该 API 把 HTML 分块推给浏览器，浏览器边解析边渲染，首屏不依赖 document.write。借鉴方式：首屏 HTML 交给服务端直出或流式输出，前端只负责挂载。

**第三方广告位的同步与异步渲染（出处：需核对官方文档：Google Publisher Tag 关于同步渲染模式与异步渲染模式的说明，以及是否给出迁移步骤）**
核对要点有两个：同步模式是否仍写入文档流；异步模式如何改写现有的加载顺序。

### 从学到用：落地路线

1. 试点：挑一个含"循环内删节点"的模块，改成快照写法。验收标准是该模块的代码评审记录里不再出现循环内增删节点。
2. 验证：用 Performance 面板和 `performance.measure` 记录改造前后的脚本时长与 Layout 次数，各跑 3 次取中位数。验收标准是这组数据写进 PR 描述。
3. 推广：把快照规则和 document.write 禁用规则写进 ESLint 自定义规则或评审清单。验收标准是新提交代码里这两类写法命中数为零。
4. 防回退：在 CI 里跑 Lighthouse 加静态检查，命中规则或出现 document.write 警告就阻断合并。验收标准是连续 10 次合并流水线通过且无新增命中。

### 动手作业

**目标**：做一个页面，用同一份数据分别演示实时集合与静态集合在循环删除时的差别，并测出各自耗时。

**步骤**：

1. 写一个脚本生成 200 行表格，每行带一个复选框。
2. 写函数 A：用 `getElementsByTagName` 拿到集合，在 `for` 循环里按索引删除勾选行。
3. 写函数 B：先用 `Array.from` 做快照，再按快照删除勾选行。
4. 放两个按钮分别触发 A 和 B，每次触发前重建表格并随机勾选若干行。
5. 用 `performance.mark` 和 `performance.measure` 包住删除逻辑，把时长打印到页面上。
6. 打开 DevTools Performance 面板，分别录制一次 A 和 B，记下 Layout 次数。
7. 在控制台输出删除后的 `table.rows.length`，与勾选数做对照。

**验收标准**：

1. 函数 A 在勾选数大于 0 时出现漏删，且代码注释里写明了原因。
2. 函数 B 删除后的行数等于原行数减勾选数。
3. 页面上打印的 measure 时长，与 Performance 面板中同一次操作的脚本耗时相差不超过 2 倍。
4. 交一份不超过 5 行的说明，写出这两种集合各自的适用位置。

