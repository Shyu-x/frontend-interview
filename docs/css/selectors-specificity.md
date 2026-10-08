---
title: 选择器与优先级
description: CSS 选择器优先级计算、!important 与 @layer、nth-child 与伪元素写法的区别。
tags:
  - css
---

# 选择器与优先级


## 1. 选择器优先级

### 1.1 定义与计算规则

CSS 选择器优先级（Specificity）决定了当多个 CSS 规则作用于同一元素时，哪条规则优先生效。计算方式为三维权重比较。

### 1.2 优先级计算表

| 选择器类型 | 示例 | 权重分值 | 写法 |
|---------|------|--------|------|
| 通配符 / 组合器 | `*`, ` `, `>`, `+`, `~` | 0,0,0 | 不加分 |
| 元素 / 伪元素 | `div`, `::before`, `::placeholder` | 0,0,1 | A=0 B=0 C=1 |
| 类 / 属性 / 伪类 | `.card`, `[type="text"]`, `:hover` | 0,1,0 | A=0 B=1 C=0 |
| ID 选择器 | `#header`, `#nav.active` | 1,0,0 | A=1 B=0 C=0 |
| 内联样式 | `<div style="...">` | 1,0,0,0 | 最高优先 |
| `!important` | `color: red !important` | 最高 | 最高优先 |

**优先级顺序（从低到高）**：
```
通配符/组合器 < 元素/伪元素 < 类/属性/伪类 < ID < 内联样式 < !important
```

**比较规则**：

- 逐位比较（A > B > C），高一位胜出则不再比较低位
- `(0,1,0)` 强于 `(0,0,9)`（B 位胜出）
- `(1,0,0)` 强于 `(0,9,9)`（A 位胜出）

### 1.3 优先级计算示例

```css
/* 权重: 0,1,1 → (0,1,1) */
div.articles .title { color: red; }

/* 权重: 0,1,0 → (0,1,0) */
.title { color: blue; }                    /* 被上面覆盖 */

/* 权重: 1,0,0 → (1,0,0) */
#header { color: green; }                  /* 覆盖上面的 .articles .title */

/* 权重: 1,0,1 → (1,0,1) */
#header h1 { color: purple; }             /* 覆盖上面的 #header */

/* 内联样式: 最高优先 */
<div style="color: orange">...</div>      /* 覆盖 #header h1 */

/* !important: 最高最高 */
.title { color: pink !important; }        /* 覆盖内联样式 */
```

### 1.4 !important 与 CSS @layer 层级

**级联顺序（由高到低）**：
```
!important 用户代理 < !important 用户样式 < !important 作者样式
作者样式（按 @layer 顺序）
  @layer reset < @layer base < @layer components < @layer utilities
  无名称层（最后定义，覆盖所有 @layer）
一般样式（按 !important 相反顺序）
作者样式 < 用户样式 < 用户代理样式
```

**@layer 语法示例**：
```css
/* 定义层顺序（声明顺序即优先级） */
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; padding: 0; }
}
@layer base {
  body { font-family: system-ui; }
}
@layer components {
  .btn { padding: 8px 16px; border-radius: 4px; }
}
@layer utilities {
  .hidden { display: none; }
}
```

### 1.5 React / Next.js / TS 代码示例

```tsx
// utils/specificity.ts
// TypeScript 优先级计算工具

type SpecificityTuple = [number, number, number];

const SELECTOR_WEIGHTS = {
  universal: [0, 0, 0] as SpecificityTuple,
  element: [0, 0, 1] as SpecificityTuple,
  class: [0, 1, 0] as SpecificityTuple,
  id: [1, 0, 0] as SpecificityTuple,
  inline: [1, 0, 0] as SpecificityTuple, // inline style
} as const;

function compareSpecificity(a: SpecificityTuple, b: SpecificityTuple): number {
  // 从 A 位到 C 位逐位比较
  if (a[0] !== b[0]) return a[0] - b[0]; // ID 比较
  if (a[1] !== b[1]) return a[1] - b[1]; // Class 比较
  return a[2] - b[2];                    // Element 比较
}

function parseSelector(selector: string): SpecificityTuple {
  let a = 0, b = 0, c = 0;
  // 简单解析：ID、Class、Element 分别计数
  const idMatches = selector.match(/#[\w-]+/g) || [];
  const classMatches = selector.match(/\.[\w-]+/g) || [];
  const attrMatches = selector.match(/\[[\w="'-]+\]/g) || [];
  const pseudoClassMatches = selector.match(/:[\w-]+(?!\()[^:(]*/g) || [];
  const elementMatches = selector.match(/^([\w-]+|\*)/g) || [];

  a = idMatches.length; // ID count
  b = classMatches.length + attrMatches.length + pseudoClassMatches.length; // Class count
  c = elementMatches.length; // Element count

  return [a, b, c];
}

// 伪元素 vs 伪类：伪元素也占 C 位（和元素同级）
// :hover       → (0,1,0)   伪类
// ::before     → (0,0,1)   伪元素

// CSS Modules 中避免优先级战争：用类名替代 ID
// Button.module.css
// .button { background: blue; }  覆盖：.button.primary
// 不要用 .button#uniqueId {}  增加优先级复杂度
```

### 1.6 优先级常见陷阱

| 陷阱 | 说明 | 解决方案 |
|------|------|---------|
| `!important` 滥用 | 导致样式难以维护和覆盖 | 避免使用，优先用级联层 `@layer` |
| 选择器过长 | `.wrapper .container .card .card-body p span` 权重的陷阱 | 用 BEM / CSS Modules 减少嵌套 |
| 内联样式覆盖 | React `style={}` 优先级过高，难以被 CSS 覆盖 | 用 className + CSS Modules |
| ID 选择器陷阱 | ID 权重过高（0,1,0）比任何单类选择器都高 | 避免在样式文件中用 ID 选择器 |
| 层叠顺序混乱 | 无 `@layer` 时，不同源样式互相覆盖 | 用 `@layer` 声明优先级层级 |

### 1.7 面试题

**Q1: CSS 优先级是如何计算的？用公式说明选择器 `#nav .menu-item a::hover` 的权重。**

> 参考答案：CSS 优先级用三维权重 `[A, B, C]` 表示：`(ID数, 类/属性/伪类数, 元素/伪元素数)`。计算 `#nav .menu-item a::hover`：ID `#nav` = [1,0,0]；类 `.menu-item` = [0,1,0]；元素 `a` = [0,0,1]；伪类 `:hover` = [0,1,0]；总计 [1, 2, 1]，即 A=1, B=2, C=1。比较时从 A 位开始，A 位胜出则 B、C 不再比较。

**Q2: `!important` 的优先级是什么？滥用会带来什么问题？**

> 参考答案：`!important` 声明具有最高优先级（高于内联样式），但当多个 `!important` 同时存在时，仍然按正常优先级规则比较。滥用问题：① 所有用 `!important` 的样式都必须再用 `!important` 才能覆盖，形成恶性循环；② 影响第三方样式库（用户无法用正常优先级覆盖）；③ 调试困难，样式来源不清晰。最佳实践：不使用 `!important`，用 `@layer` 管理优先级层级。

**Q3: CSS `@layer` 是什么？如何用 `@layer` 解决大型项目的样式优先级冲突？**

> 参考答案：`@layer` 是 CSS 2022 年引入的级联层机制，用于显式定义样式的优先级层级。先声明层顺序 `@layer reset, base, components, utilities;`，越后声明的层优先级越高（同层内按 `!important` 规则）。用法：① 在层中编写样式；② 使用 `@import` 指定层；③ 任何不在命名层中的样式属于"默认层"（优先级最高）。优势：无需增加选择器特异性即可覆盖第三方库样式，保持代码清晰可维护。


## 2. 面试精讲：CSS 选择器优先级，!important 为什么不推荐

### 2.1 优先级计算（Specificity）

```
优先级 = (ID选择器数量, 类/属性/伪类数量, 元素/伪元素数量)

计算规则：
内联样式   → 1,0,0,0  （style="..."）
ID 选择器  → 0,1,0,0  （#app）
类/属性/伪类 → 0,0,1,0  （.btn, [type="text"], :hover）
元素/伪元素  → 0,0,0,1  （div, ::before）

比较规则：从左到右逐位比较
(1,0,0,0) > (0,9,0,0) > (0,0,9,0) > (0,0,0,9)
```

```css
/* 0,0,1,0 */
.class1 { color: blue; }

/* 0,0,0,2 */
div p { color: green; } /* div + p = 2 elements */

/* 0,1,0,0 */
#id { color: red; }

/* 1,0,0,0 */
[style="color:purple"] { color: purple; }

/* (0,1,1,1) */
.wrapper .main h1 { color: orange; }

/* !important 优先级最高（但会打破级联） */
button { color: red !important; }
```

### 2.2 !important 为什么不推荐

1. **打破级联**：覆盖任何选择器，降低样式系统的可预测性
2. **难以维护**：后期开发者只能再加 `!important` 覆盖，造成恶性循环
3. **Bugs 难排查**：`!important` 散落各处，样式冲突难定位
4. **响应式/动态样式失效**：媒体查询等条件样式可能被 `!important` 意外覆盖

```css
/* 反面示例 */
.btn { color: red !important; background: blue !important; }
.button { color: blue !important; } /* 恶性循环开始 */
#submit-btn { color: green !important; } /* 继续加 */
button { color: yellow !important; } /* 最后变成 !important 大混战 */
```

**正确的解决方式：**
```css
/* 提升选择器优先级，而不是用 !important */
.wrapper .button { color: red; } /* 变成 (0,2,0,1) */
#app .button { color: red; }     /* 变成 (1,1,0,1) */
```


## 3. 面试精讲：nth-child vs nth-of-type，::before vs :before

### 3.1 nth-child vs nth-of-type

```html
<div class="container">
  <p>第一个段落</p>    <!-- p:nth-child(1) (匹配)  p:nth-of-type(1) (匹配) -->
  <p>第二个段落</p>    <!-- p:nth-child(2) (匹配)  p:nth-of-type(2) (匹配) -->
  <span>第一个 span</span> <!-- span:nth-child(3) (匹配) span:nth-of-type(1) (匹配) -->
  <p>第三个段落</p>    <!-- p:nth-child(4) (匹配)  p:nth-of-type(3) (匹配) -->
  <p>第四个段落</p>    <!-- p:nth-child(5) (匹配)  p:nth-of-type(4) (匹配) -->
</div>
```

```css
/* nth-child(n)：先选第 n 个子节点，再看类型是否匹配 */
p:nth-child(2)  { color: red; }
/* 选择：作为第 2 个子节点 且 是 p 元素的节点 */

/* nth-of-type(n)：先选同类型中的第 n 个 */
p:nth-of-type(2) { color: blue; }
/* 选择：作为 p 元素中的第 2 个 */

/* 负向选择 */
li:nth-child(odd)      { } /* 奇数个子节点 */
li:nth-child(even)     { } /* 偶数个子节点 */
li:nth-child(2n+1)     { } /* 同 odd */
li:nth-child(3n)       { } /* 3的倍数 */
li:nth-child(-n+3)     { } /* 前3个 */
li:nth-last-child(1)   { } /* 倒数第1个 */
```

### 3.2 ::before vs :before

| 写法 | 含义 | 兼容性 |
|------|------|--------|
| `:before` | CSS2 语法（单冒号） | IE8+ |
| `::before` | CSS3 语法（双冒号） | 现代浏览器 |

```css
/* ::before 和 ::after 是伪元素（pseudo-elements） */
/* :hover 和 :focus 是伪类（pseudo-classes） */

/* 正确：双冒号 */
p::before {
  content: '前缀 ';    /* content 必须写，即使空内容也要 content: '' */
  color: #999;
}

p::after {
  content: ' 后缀';
  display: block;
}

/* 单冒号是 CSS2 的旧写法，效果一样，但不推荐 */
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN 特异性](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) | 用权重三元组讲优先级计算，是面试答题的标准口径与权威依据。 | 按示例手算十组选择器权重，再用 DevTools 逐条验证，记下算错的类型。 |
| [`!important` CSS keyword](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/important) | 官方定义 !important 的作用与层叠位置，是判断该不该用的前提。 | 读语法与层叠相关段落，想清何时覆盖第三方样式；用 DevTools 看覆盖链。 |
| [`:nth-child()` CSS pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:nth-child) | 官方定义按兄弟顺序计数与 An+B 语法，是与 nth-of-type 对比的基准。 | 重点读语法与示例，注意「所有兄弟」这一前提；写列表交错标记验证。 |
| [`:nth-of-type()` CSS pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:nth-of-type) | 明确按同类型元素计数的语义，是两者差异的官方答案。 | 对照 nth-child 同结构示例，找命中不同的位置，再改写一个进度条用例。 |
| [`::before` CSS pseudo-element](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::before) | 规范伪元素写法与 content 必需性，解释单双冒号的历史差异。 | 读语法与可访问性提示，生成内容装饰元素，检查是否会干扰读屏。 |
| [MDN 选择器模块](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) | 系统梳理选择器语法，并说明 :is/:where/:has 对优先级的影响。 | 按目录过一遍清单，重点看 :is 与 :where 的权重，各写两个用例。 |
| [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) | 说明层叠层让顺序优先于特异性，是现代替代 !important 的方案。 | 读层叠层与优先级关系一节，把重置、组件、工具类分三层验证覆盖。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [fe-interview（haizlin）](https://github.com/haizlin/fe-interview) | CSS 分类下有成组带答案的面试题，可直接检验本页考点掌握度。 | 取优先级与伪类相关题目自测，标出答不上的回查 MDN 对应页。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 层叠与选择器章节配可运行示例，把理论落到真实样式表里。 | 读层叠与选择器部分，每章写一个实验页，故意制造冲突观察覆盖结果。 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 用工程师熟悉的心智模型讲层叠与优先级，降低理解门槛。 | 读完选择器与层叠模块并做练习，回头解释自己一次覆盖失败的案例。 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频演示优先级调试全过程，比文字更直观地看到覆盖如何发生。 | 挑选择器与优先级主题视频，暂停跟敲，复刻其覆盖冲突的例子。 |
| [CSS-Tricks](https://css-tricks.com/) | Almanac 按选择器速查并附实例，适合查证单个选择器的行为细节。 | 查 nth-child、nth-of-type、::before 词条，对照示例确认边界情况。 |
| [张鑫旭的博客](https://www.zhangxinxu.com/wordpress/) | 中文语境下讲透优先级与伪类细节，表达更贴近面试说法。 | 搜优先级、伪元素相关文章精读一篇，整理成自己的答题话术。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格（选中、禁用、悬停三态） | 三维权重比较、`nth-child` 与 `nth-of-type` 的差别 | 原生 CSS 加状态类名 | 行被 JS 重排后序号会变，斑马纹要改挂类名 |
| 低端安卓机的首屏样式加载 | 选择器匹配自右向左、权重链长度 | PostCSS 插件扫描选择器深度 | 压平选择器会改变权重，改前先存 Computed 结果 |
| 多人协作白板的光标与选区标记 | 同权重规则靠书写顺序决胜 | 自定义属性加状态类 | 行内样式压过普通选择器，覆盖要换手段 |
| 引入第三方组件库后改主题色 | 权重三维、`!important` 的代价 | `@layer` 加 `:where()` | 未分层的普通样式优先于分层样式，容易漏掉 |
| CMS 富文本内容区 | 后代选择器给裸标签兜底 | `.article h2 {}` 这类作用域前缀 | 作者写的行内样式无法用普通规则覆盖 |
| 设计系统暗色主题切换 | 自定义属性加稳定权重 | `[data-theme="dark"]` 属性选择器 | 属性选择器权重等同类，别叠成链条 |
| 营销落地页 A/B 实验 | 两套样式同时上线的优先级隔离 | 根节点挂实验标记类 | 实验结束不清理，权重会长期抬高 |
| 嵌入式 WebView 组件被多个宿主复用 | 选择器作用域与权重上限 | 自定义元素加 Shadow DOM | Shadow DOM 内部样式不参与外部层叠 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格行高亮

**业务背景**：表格一次渲染上千行，滚动时每秒触发多次样式重算。斑马纹用 `:nth-child` 写，筛选后行序号整体变化，选中高亮时而失效。

**怎么用本页知识解决**：先分清斑马纹的参照物是兄弟元素序号，再让选中态与它同权重、靠书写顺序胜出，而不是动 `!important`。

```css
/* 底样式：一条类名，权重 0,1,0 */
.grid-row { height: 36px; }

/* 斑马纹按兄弟序号取值，权重 0,2,0 */
.grid-row:nth-child(even) { background: #f7f8fa; }

/* 选中态与斑马纹同为 0,2,0，靠写在后面胜出 */
.grid-row.is-selected { background: #e6f0ff; }

/* 悬停态权重升到 0,3,0，压过上面两条 */
.grid-row.is-selected:hover { background: #d6e6ff; }

/* 不参与竞争的复位规则放进 :where()，权重归零 */
:where(.grid-row) { outline: none; }
```

- `nth-child` 数的是同父下所有兄弟元素，插入分隔行或加载占位行后序号会整体错位。
- 选中态与斑马纹同为 0,2,0，胜负由书写顺序决定，所以两条规则的先后位置不能随意调整。
- 悬停态多一个伪类，权重升到 0,3,0，与位置无关，后续插规则也不会翻车。
- `:where()` 内部权重恒为 0，任意一条普通规则都能覆盖它，适合放复位样式。
- 每条规则的权重数字写进注释，评审时不用逐条心算。

**怎么度量收益**：用 Chrome DevTools Performance 面板录制 5 秒滚动，看 Recalculate Style 的耗时；用 Elements 面板的 Computed 标签确认胜出规则；用 `document.querySelectorAll('.grid-row').length` 核对匹配节点数。

**什么时候不该用**：行顺序由 JS 按列排序重排时，`nth-child` 会跟着变，此时该改用写入 DOM 的 `data-row-index` 属性。只为了给个别行改背景就引入 `!important`，会让后面所有状态样式的排序失去依据。

#### 场景 2：低端安卓机首屏样式性能

**业务背景**：低端安卓机（2GB 内存档位）首屏要求尽快出内容，样式表由多人长期叠加，出现四层后代加标签选择器的写法。用 Lighthouse 移动端配置加 4 倍 CPU 节流即可复现。

**怎么用本页知识解决**：把深层后代链换成扁平类名。选择器匹配自右向左，右侧候选集越小，样式重算越快；扁平类名同时把权重固定在第二维。

```css
/* 改前：四层后代加标签选择器，权重 0,4,2 */
.app .layout .panel .list li a { color: #333; }

/* 改后：单类名，权重固定 0,1,0 */
.list-link { color: #333; }

/* 局部变体叠加一个语义类，而不是加父级层级 */
.list-link.is-danger { color: #c0392b; }   /* 权重 0,2,0 */

/* 主题差异交给自定义属性，切换主题不改选择器 */
.list-link { color: var(--link-color, #333); }
```

- 改前权重是 0,4,2，任何一次覆盖都要写到同级别，链条越写越长。
- 改后权重是 0,1,0，覆盖只需再挂一个类，权重关系写在选择器上就能看全。
- 自定义属性承载主题色，暗色模式只改变量值，权重结构保持不动。
- 构建流程里若已有 PostCSS，可先扫描选择器深度定位候选文件，再人工改写。

**怎么度量收益**：Lighthouse 的 Reduce unused CSS 审计给出未使用字节数；DevTools Coverage 面板给出未使用规则占比；Performance 录制里对比 Recalculate Style 条目耗时。三处都在改动前后各测一次，使用同一设备和同一档节流。

**什么时候不该用**：内容区渲染的是 CMS 产出的裸标签 HTML，没有类名可挂，只能用后代选择器给 `h2`、`p` 设默认样式。若压平选择器会改变既有页面视觉，而团队没有截图回归手段，就先别做全量替换。

#### 场景 3：第三方组件库主题覆盖

**业务背景**：项目引入第三方组件库后主题色与设计稿不一致，团队长期用 `!important` 覆盖。每次升级组件库都要人工比对页面，覆盖规则条数随版本迭代增长。

**怎么用本页知识解决**：把权重竞争换成层级隔离。用 `@layer` 声明层的先后顺序，第三方样式放低层，自有覆盖放高层，覆盖选择器只要一层类名。

```css
/* 先声明层顺序：写在前面的层优先级低 */
@layer vendor, app;

/* 第三方样式整段归入 vendor 层 */
@layer vendor {
  .btn.primary { background: #1f6feb; }   /* 权重 0,2,0，仍低于 app 层 */
}

/* 自有覆盖放 app 层，选择器保持一层类 */
@layer app {
  .btn-brand { background: #0b5ed7; }     /* 权重 0,1,0，在 app 层内胜出 */
}

/* 复位规则权重归零，不干扰任何层 */
:where(figure, blockquote) { margin: 0; }
```

- 普通声明里后声明的层优先于先声明的层，与权重无关，所以 0,1,0 能压过 vendor 层的 0,2,0。
- `!important` 在层间顺序是反的：先声明的层反而优先，这条常被记错，需要写进团队约定。
- 没放进任何层的普通样式优先于所有分层样式，改造时先给第三方样式分层，成本最低。
- 组件库把主题写成行内样式时，普通声明一律覆盖不动，只能改组件库对外暴露的变量。借鉴前需核对官方文档：核对 `@layer` 在你们支持的最低浏览器版本上的兼容表。

**怎么度量收益**：用 DevTools Styles 面板统计被划掉的声明条数；用视觉回归工具（例如 Playwright 的 `toHaveScreenshot`）在升级前后各跑一次截图对比；用 `grep -r '!important' src` 统计覆盖用法数量。

**什么时候不该用**：目标浏览器版本不支持层叠层时不要上这套方案，先确认兼容范围。组件库样式挂在 Shadow DOM 内部时，外部规则不参与其内部层叠，`@layer` 也不生效。

### 行业先进实践

- **`:where()` 归零权重写复位样式（出处：MDN Web Docs 的 `:where()` 条目、CSS Selectors Level 4 规范）**

  规范定义 `:where()` 的权重恒为 0，`:is()` 取参数中权重最高的一项。把复位和排版默认值整段包进 `:where()`，业务侧任意规则都能覆盖它，不用再比拼层级。借鉴方式：把项目 reset 里的标签规则从 0,0,1 降到 0。

- **层叠层划分样式来源（出处：MDN Web Docs 的 CSS cascade layers 条目、CSS Cascading and Inheritance Level 5 规范）**

  规范给出 `@layer` 的先后顺序规则，并规定重要声明在层间反向排序。把第三方样式与自有样式分层，权重竞争转成层顺序，覆盖选择器可以保持扁平。借鉴方式：入口文件声明 `@layer reset, vendor, app, utilities;` 四层，再逐步把旧样式归位。

- **Blink 的选择器过滤（出处：Chromium（Blink）开源项目样式重算相关实现）**

  Blink 在样式重算时用过滤结构快速排除不可能匹配的规则，避免为每个元素逐条比对全部选择器。这说明深层后代链会扩大候选集，代价落在重算阶段而非解析阶段。借鉴方式：审查样式时优先压平最右侧是标签选择器的长链。

- **BEM 命名约定（出处：getbem.com 官方文档）**

  BEM 约定块、元素、修饰符都用单类名表达，选择器权重稳定在 0,1,0，不随嵌套加深而变化。覆盖时只需挂类名，不用提升层级。借鉴方式：把区块类写法写进代码规范，禁止组件内出现超过两层的后代选择器。

- **Stylelint 的权重上限规则（出处：开源项目 stylelint 官方文档）**

  stylelint 提供 `selector-max-specificity`、`selector-max-id`、`max-nesting-depth` 等规则，可在 CI 里拦截超标选择器。这让权重约定从口头规范变成可执行门禁。借鉴方式：先把 `selector-max-id` 设为 0，再把 `selector-max-specificity` 从项目实测最高值逐步下调。

### 从学到用：落地路线

1. **试点**：先在一个组件目录内落地，把该目录样式统一改成单类名加状态类。验收标准：该目录 `!important` 出现次数为 0，id 选择器检查通过。
2. **验证**：对试点目录跑一次视觉回归和一次滚动性能录制，改动前后各测一遍。验收标准：截图对比无差异，Computed 面板里胜出规则与设计预期一致。
3. **推广**：把写法写进代码规范，在 CI 加 stylelint 规则和入口文件的 `@layer` 声明。验收标准：新提交的选择器深度不超过两层，层顺序在评审中被确认。
4. **防回退**：把权重上限做成可量化门禁，对历史超标文件建白名单并只减不增。验收标准：每次发布记录当前上限数值与白名单文件数。

### 动手作业

**目标**：在一个真实列表或表格组件上，把权重竞争改成扁平类名加可选层叠层，并给出可复现的前后对比数据。

**步骤**：

1. 选一个带状态变化的列表组件，例如含选中、禁用、悬停三种状态的表格。
2. 用 Elements 面板逐个记录三种状态下的胜出规则与其权重，整理成一张表。
3. 列出用于覆盖的 `!important` 和超过两层的选择器，统计条数。
4. 改写成扁平类名，状态用类名叠加表达，复位规则移入 `:where()`。
5. 环境支持时，在入口文件声明 `@layer reset, vendor, app, utilities;`，把第三方样式归入 vendor 层。
6. 用同一设备、同一档 CPU 节流录制一次滚动，对比 Recalculate Style 耗时。
7. 在 CI 加一条 stylelint 规则，拦截新增的 id 选择器与三层以上嵌套。

**验收标准**：

1. 改动后该组件内 `!important` 条数为 0，三种状态在 Computed 面板里的胜出规则与设计预期一致。
2. 滚动录制的 Recalculate Style 耗时不高于改动前，两次测量使用同一设备和同一节流档位。
3. 视觉回归截图对比无差异，若有差异需在提交说明里逐条列出原因。
4. CI 在提交含 id 选择器或三层嵌套时失败，并指出具体文件与行号。
5. 提交里包含一张权重对照表，列出改动前后每条状态规则的权重数值。

