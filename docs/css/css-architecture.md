---
title: CSS 工程化架构
description: CSS Modules、scoped、CSS-in-JS、Tailwind 与 BEM 命名规范。
tags:
  - css
---

# CSS 工程化架构


## 1. 面试精讲：CSS Modules 原理，scoped 原理，深度选择器

### 1.1 CSS Modules

CSS Modules 是 CSS 的局部作用域方案，通过编译时转换实现类名唯一性。

```css
/* Button.module.css */
.button {
  padding: 8px 16px;
  background: blue;
}

.primary {
  background: #0066ff;
}
```

```javascript
import styles from './Button.module.css';

export function Button() {
  return (
    <button className={styles.button + ' ' + styles.primary}>
      Click
    </button>
  );
}

/* 编译后 HTML：*/
/* <button class="Button_button__3x7Kw Button_primary__3x7Kw">Click</button> */
```

**CSS Modules 原理：**
```
源文件：
.button { background: blue; }

编译后（webpack css-loader）：
.button { background: blue; }
.Button_button__3x7Kw { background: blue; }
/* hash 基于文件路径和类名生成，保证全局唯一 */
```

### 1.2 Vue scoped 原理

```html
<style scoped>
.button {
  color: red;
}
</style>
```

```css
/* 编译后： */
.button[data-v-hash] {
  color: red;
}
```

**scoped CSS 原理：**
```
1. Vue 组件编译时，为每个组件生成一个唯一的 hash
2. 所有 CSS 选择器后加 [data-v-hash]
3. 模板中的元素自动添加 data-v-hash 属性
4. 结果：选择器只匹配本组件的元素
```

### 1.3 深度选择器（穿透 scoped）

```css
/* Vue 中穿透 scoped */

/* 方法1：:deep() */
:deep(.external-class) {
  color: red;
}

/* 方法2：::v-deep（Vue2 专用） */
::v-deep .inner {
  color: red;
}

/* 方法3：:global()（Vue3 新语法） */
:global(.global-class) {
  color: blue;
}
```


## 2. 面试精讲：CSS-in-JS，styled-components 原理，TailwindCSS 原理与原子化 CSS

### 2.1 CSS-in-JS

CSS-in-JS 是在 JavaScript 中编写 CSS 样式的方案：

```javascript
// styled-components 方式
import styled from 'styled-components';

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  background: ${props => props.primary ? '#0066ff' : '#ccc'};
  color: white;
`;

// emotion 方式
import { css } from '@emotion/react';
const styles = css`padding: 8px 16px; background: blue;`;
```

### 2.2 styled-components 原理

```javascript
// 第 1 段：设计概览——这套 DSL 把"写样式"拆成四种职责：解析模板、去重类名、注入样式、绑定宿主
/* 原理概述：
   1. 用模板字符串定义 CSS
   2. 运行时生成唯一的类名
   3. 通过 <style> 标签注入到 head
   4. 将类名绑定到组件上 */

// 第 2 段：三级柯里化，逐层收窄求值时机（先定宿主 tag → 再收模板 → 最后才拿 props）
function styled(tag) {
  // tag 被闭包捕获，最内层真正渲染时可直接复用，无需把它当参数一路透传
  return function(strings, ...values) {
    // strings 是模板中的静态片段数组，values 是 ${} 里的插值；
    // 此处刻意"只捕获不求值"：插值往往依赖 props，CSS 必须推迟到渲染期才能确定
    return function(props) {
      // 第 3 段：把静态片段与插值交错拼成最终 CSS
      // reduce 以 '' 为初值：第 i 个插值恰好紧随第 i 个静态片段之后，天然还原原文顺序；
      // 易错点：最后一次迭代 i === strings.length - 1 时 values[i] 必为 undefined，
      // 三元判断就是用来吞掉这次尾插值的——若省略判断，values[i](props) 会直接抛 TypeError
      const css = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] ? values[i](props) : '');
      }, '');
      // 第 4 段：内容寻址生成类名 → 注入样式表 → 把类名绑回宿主元素
      // 用 CSS 文本自身做哈希：同样式必然同名，组件重复实例化也不会让样式表膨胀
      // （该收益依赖 injectStyle 自身幂等，否则每次渲染都会往 head 追加一条 <style>）
      const className = hash(css);
      injectStyle(`.${className}`, css);
      // className 放在展开之前：若 props 里自带 className 会把它顶掉，样式随即失效；
      // 另外 ...props 会把 theme 等"仅供插值使用"的字段一并透传到 DOM，必要时须在上层过滤
      return createElement(tag, { className, ...props });
    };
  };
}
```

### 2.3 TailwindCSS 原理与原子化 CSS

TailwindCSS 是原子化（utility-first）CSS 框架，通过组合小的工具类实现样式：

```html
<!-- 传统 CSS -->
<div class="card">
  <style>.card { padding: 24px; border-radius: 8px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }</style>
</div>

<!-- TailwindCSS -->
<div class="p-6 rounded-lg bg-white shadow-md">
```

**TailwindCSS 原理：**
```
1. 配置文件定义设计系统（颜色、间距等）
2. PurgeCSS 扫描源码，找出使用的类名
3. 生成只包含使用过的类的 CSS（约 10-100kb）
4. 生产构建：只打包实际使用的样式
```

**原子化 CSS 的优缺点：**

```
优点：
- 无需写自定义 CSS，快速开发
- 一致性好（基于设计系统）
- 样式复用性极高
- 便于维护（样式即文档）

缺点：
- HTML 标签变长（class="..."）
- 学习曲线（需记忆工具类名）
- 无类型安全（IDE 插件很重要）
```

### 2.4 原子化 CSS 框架对比

| 框架 | 特点 | JIT | 流行度 |
|------|------|-----|--------|
| TailwindCSS | 功能完整，设计系统友好 | 是 | 高 |
| UnoCSS | 超快，按需生成，无预置主题 | 是 | 增长快 |
| WindiCSS | TailwindCSS 替代，启动更快 | 是 | 中 |
| Vanilla Extract | 类型安全，编译时 | 是 | 增长中 |


## 3. 面试精讲：CSS 难维护原因，BEM 命名规范

### 3.1 CSS 难维护的常见原因

1. **全局作用域污染**：所有选择器在全局生效，容易冲突
2. **样式覆盖层叠复杂**：优先级混乱，修改一个样式影响多个地方
3. **选择器耦合**：CSS 依赖 HTML 结构，结构一变样式就乱
4. **重复样式**：相同样式在多处定义，维护困难
5. **无类型安全**：拼写错误静默失效

**解决方案：**

- CSS Modules（局部作用域）
- CSS-in-JS（组件级样式）
- BEM 命名（命名约定）
- Utility-First 框架（原子化）
- CSS 变量（主题一致性）

### 3.2 BEM 命名规范

BEM = Block（块） + Element（元素） + Modifier（修饰符）

```
Block      → 独立的功能模块（最大粒度）
Element    → Block 的组成部分（用 __ 连接）
Modifier   → 状态/变体（用 -- 连接）
```

```css
/* Block：卡片组件 */
.card { }

/* Element：卡片内部元素 */
.card__header { }
.card__body { }
.card__title { }

/* Modifier：卡片变体 */
.card--featured { }
.card--dark { }

/* Element + Modifier */
.card__title--large { }
```

```html
<!-- 第 1 段：卡片根容器——用 article 承载可独立成立的内容单元 -->
<!-- 选 article 而非 div：卡片常被单独摘取/分发（信息流、检索结果），语义上应能脱离页面上下文独立成篇 -->
<!-- 类名走 BEM：card 为块，card--featured 是"精选"变体；变体只覆盖外观差异，不重复基础结构，方便换肤与组合复用 -->
<article class="card card--featured">
  <!-- 第 2 段：头部区——仅容纳标题的语义化容器 -->
  <!-- 用 header 划定"标题层"，与下方 body/footer 形成对等的结构划分；层级统一用 h2，视觉尺寸交给 card__title，避免结构与样式耦合 -->
  <header class="card__header">
    <h2 class="card__title">标题</h2>
  </header>
  <!-- 第 3 段：主体区——承载正文文本流 -->
  <!-- 外层 div 作为通用装载槽，内层 p 保留段落语义；样式挂在 card__text 上，便于整块替换内容而不牵动结构 -->
  <div class="card__body">
    <p class="card__text">内容</p>
  </div>
  <!-- 第 4 段：底部区——收束操作入口 -->
  <!-- footer 声明"操作/页脚"语义；此处用原生 button 而非 a 或 span，才能获得键盘聚焦、回车触发、可禁用等内建交互能力 -->
  <!-- card__button 定基础样式，card__button--primary 标记首选行动；一个卡片通常只放一个主按钮，用视觉权重引导点击优先级 -->
  <footer class="card__footer">
    <button class="card__button card__button--primary">按钮</button>
  </footer>
</article>
```

**BEM 优点：**

- 类名自解释（命名即文档）
- 避免命名冲突
- 结构清晰，易维护
- 配合 CSS Modules 效果更好

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Tailwind CSS 文档](https://tailwindcss.com/docs) | 原子化 CSS 的官方权威文档，直接对应 Tailwind 原理与取舍 | 按目录读 Utility-First 与复用两节，边读边在 Playground 试写，总结原子类的代价 |
| [PostCSS 文档](https://postcss.org/docs/) | PostCSS 插件与 AST 机制是 CSS Modules 改写类名的基础 | 读插件编写一节，写个给类名加前缀的最小插件，观察 AST 与产物变化 |
| [Vite：功能（中文）](https://cn.vitejs.dev/guide/features.html) | 官方说明 Vite 中 CSS Modules、作用域与资源处理链路 | 逐项试 CSS 与 glob 导入，写一个 .module.css，看生成类名与打包结果 |
| [Stylelint 入门](https://stylelint.io/user-guide/get-started) | 把命名约定变成可执行规则，是治理难维护的直接手段 | 读入门与规则清单，为项目加类名命名校验并接入编辑器 |
| [MDN 特异性](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) | 层叠与特异性是 scoped、深度选择器行为的底层规则 | 手算十个选择器权重并用 DevTools 验证，再解释 scoped 下的样式覆盖 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Lightning CSS](https://lightningcss.dev/) | 开源 CSS 转换器，内置 CSS Modules 作用域实现，可直接读源码 | 读其 CSS Modules 章节后启用它替代 PostCSS，对比产物与构建耗时 |
| [fe-interview（haizlin）](https://github.com/haizlin/fe-interview) | 题库覆盖 CSS 与工程化真题，便于自测面试掌握度 | 取 10 道 CSS 题自测，标出不会的，回本页对应章节补齐 |
| [web-interview](https://github.com/febobo/web-interview) | 面试题库 CSS 分类，可检验原理能否口头讲清楚 | 限时口述 CSS 题答案并记录卡壳点，再复述一遍对应原理 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Harry Roberts：CSS Wizardry](https://csswizardry.com/) | BEM 与 ITCSS 的推广者，讲 CSS 架构与可维护性 | 读架构与性能文章，用分层命名思路重构一段遗留样式 |
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 系统讲层叠、继承与模块化写法，解释难维护的成因 | 先读布局与层叠章节，每章写一个实验页并总结可复用规则 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 从 JS 开发者视角建立 CSS 心智模型，理解 CSS-in-JS 动机 | 读作用域与层叠模块，完成配套项目，再对比 styled-components 写法 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频讲解直观，适合快速补齐选择器与命名规范直觉 | 挑架构与命名主题视频，看完复刻其示例并改写成 BEM |
| [CSS 与网络性能](https://csswizardry.com/2018/11/css-and-network-performance/) | 讲清 CSS 为何阻塞渲染，理解原子化与按需样式的收益 | 照文中方法检查阻塞渲染的样式，再对比 Tailwind 构建产物体积 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理万行表格 | 局部作用域、编译时类名唯一 | CSS Modules + 构建工具 | 表头与行共享的声明用 composes，别复制 |
| 多人协作白板嵌入第三方 SDK | `:global` 与穿透写法 | CSS Modules + 画布 SDK | 穿透只写到 SDK 根节点，再往里会被升级打断 |
| 中后台主题切换 | CSS-in-JS 动态样式 | styled-components 的 ThemeProvider | 运行时注入有开销，长列表页要实测 |
| 低端安卓首屏加载 | 原子化 CSS 与按需生成 | TailwindCSS | content 扫描范围漏配会丢类名 |
| 老项目局部改造 | BEM 命名、作用域隔离 | BEM 与 CSS Modules 并存 | 同一个文件不同时用两套命名 |
| 组件库发 npm 包 | 编译时类名唯一性 | CSS Modules + 打包配置 | 产物类名要保持稳定，消费方才覆盖得住 |
| 营销活动页并行开发 | 命名冲突、维护成本来源 | BEM 约定 + 原子类 | 约定写进脚手架模板，不靠口头传 |
| 微前端子应用接入 | scoped 原理与隔离边界 | 微前端框架 + CSS Modules | 主应用全局样式会渗透，需类名前缀或 Shadow DOM |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：表格页一次渲染上万行记录，行内有状态标签和三个操作按钮。样式来自多个业务组各自维护的全局 CSS，改一处类名要回归整页。

**怎么用本页知识解决**：把行样式收进 `.module.css`，类名由编译期加上 hash，跨文件共享的声明用 `composes` 组合而不是复制。

```css
/* tableRow.module.css */
.row {                       /* 编译后类名带 hash，跨组不会撞名 */
  display: flex;
  align-items: center;
}
.denseRow {
  composes: row;            /* 复用 row 的声明，产物里挂上两个唯一类名 */
  height: 32px;
}
.status {
  composes: tag from './base.module.css'; /* 跨文件组合，基类只维护一份 */
  margin-left: 8px;
}

/* tableRow.jsx */
import styles from './tableRow.module.css';
const cls = dense ? styles.denseRow : styles.row; /* 取到的就是唯一类名 */
```

- 唯一类名在构建时生成，运行时不做查找，行组件的渲染路径不变。
- `composes` 只在 CSS 里展开声明，不在 DOM 上加嵌套层，选择器权重保持单类。
- 共享基类集中到 `base.module.css`，主题色改一处，所有行同步生效。
- 不要用 `.row td` 这类后代选择器，表格结构一调整就失效。

**怎么度量收益**：指标看成样式冲突的回归单数、改一次主题色触及的文件数、首屏未使用 CSS 字节数。测法是用 `git log` 统计改动的样式文件数，用 Chrome DevTools 的 Coverage 面板记录未使用字节，改完样式跑一次 Playwright 截图对比。

**什么时候不该用**：一是单页营销活动，样式只此一份且上线两周后下线，接入 module 编译链路的配置成本收不回。二是 E2E 用 `document.querySelector('.row')` 做断言的团队，hash 类名会让选择器失效，应改用 `data-testid`。

#### 场景 2：多人协作白板嵌入第三方 SDK

**业务背景**：白板基于第三方画布 SDK，SDK 把工具栏挂到团队指定的 DOM 节点上。团队要调工具栏按钮间距和图标颜色，但这些节点的类名由 SDK 输出。

**怎么用本页知识解决**：自己写的元素照常走 CSS Modules。要命中 SDK 的节点，用 `:global()` 把选择器声明为全局，并让每条规则以自有的根类名开头。

```css
/* board.module.css */
.board {                          /* 自己的根节点，编译后是唯一类名 */
  position: relative;
}
.board :global(.toolbar) {        /* :global 内的类名不加 hash，用来命中 SDK 节点 */
  gap: 6px;
  background: var(--board-bg);    /* 主题色走变量，SDK 升级只改这里 */
}
.board :global(.toolbar) :global(.icon) {
  color: var(--brand);
}
```

- 每条全局规则都以 `.board` 开头，改动关在白板区域内，不漏到页面其他位置。
- 穿透的层数写在注释里，层数越深，SDK 升级时越容易断。
- 颜色和间距统一走 CSS 变量，升级时改变量，不动选择器。
- `:global()` 内多层选择器的编译结果在不同实现下有差别，落地前需核对官方文档：Vite 与 css-loader 的 CSS Modules 章节里 `:global` 的写法与产物。

**怎么度量收益**：指标是 SDK 升级后需要改动的全局规则条数，以及穿透选择器的层数。测法是留一个只挂 SDK 的 demo 页，升级前后各跑一次 Playwright 截图 diff，并在 Elements 面板核对节点上的最终类名。

**什么时候不该用**：一是要改 SDK 的 DOM 结构而不只是样式，CSS 穿透做不到，应让 SDK 暴露插槽或 fork。二是页面只有一处一次性覆盖且不长期维护，写一个带前缀的全局 CSS 文件即可。

#### 场景 3：低端安卓的首屏加载

**业务背景**：首屏要跑在三年前的低端安卓机上，JS 与 CSS 的体积都要控。设计稿里间距和色值重复出现在多个组件，组件各写一份 CSS 会重复声明。

**怎么用本页知识解决**：用原子类把声明拆到最小粒度，再由构建工具按 content 扫描范围只生成用到的类。

```js
// tailwind.config.js（字段名与加载方式以所装版本的官方文档为准）
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'], // 扫描范围，漏掉的目录会丢类名
  theme: { extend: { colors: { brand: '#2b6cb0' } } }, // 生成 bg-brand 这类工具类
};
```

```html
<!-- 只保留用到的工具类 -->
<button class="px-3 py-2 text-sm text-white bg-brand">提交</button>
```

- content 要覆盖所有会写类名的文件类型，`.vue`、`.svelte`、`.mdx` 漏掉就丢样式。
- 动态类名写成完整字符串放进映射表，不用 `text-${size}` 这种拼接。
- 复用度高的组合用 `@apply` 收进组件类，避免 JSX 里堆长串。
- 产物体积要实测，构建后看 CSS 文件字节数，不按印象估计。

**怎么度量收益**：指标是构建产物中 CSS 的 gzip 字节数和移动端的 FCP。测法是用构建输出的体积报告取 CSS 字节数，用 Lighthouse 的移动端预设或 WebPageTest 取 FCP，并在 DevTools Performance 面板开 CPU 降速复测。

**什么时候不该用**：一是页面里有大量一次性复杂布局，工具类会拼成长串，此时用 CSS Modules 写组件样式可读性可控。二是设计系统要求组件暴露 `size`、`variant` 这类语义化接口，主题对象加组件样式文件的写法维护成本更低。

### 行业先进实践

1. `composes` 与 `:global` 的复用约定（出处：css-modules 开源仓库 README）
README 说明 `composes` 用于跨文件复用声明，`:global` 用于保留全局选择器。做法有效的原因是复用发生在编译期展开，产物仍是单类选择器，权重不叠加。借鉴方式是把共享声明放进 `base.module.css`，业务文件只写差异部分。

2. 构建期类名生成规则（出处：Vite 官方文档的 CSS Modules 章节、css-loader 文档的 `modules.localIdentName`）
两处文档都给出在构建配置里控制生成类名格式的选项。开发环境保留文件名与局部名便于定位，生产环境换成短 hash 压低体积。借鉴方式是在构建配置里分别写 dev 与 build 两套命名规则，构建后抽查产物类名。

3. 主题注入与全局样式组件化（出处：styled-components 官方文档）
文档中的 ThemeProvider 通过 context 传主题，createGlobalStyle 用来写 reset 这类全局规则。做法有效的原因是组件只引用主题字段，不写死色值。借鉴方式是把字号、间距、色板收进主题对象，组件样式里只读主题字段。

4. 原子类的按需生成（出处：TailwindCSS 官方文档的 Content Configuration 与 Optimizing for Production）
文档说明 content 字段决定扫描哪些文件，产物只包含匹配到的工具类。借鉴方式是把 content 覆盖到所有写类名的文件类型，并用 `@apply` 把高频组合收进组件类。

5. BEM 作为跨团队命名契约（出处：BEM 官方文档）
文档给出 block、element、modifier 三段式的命名结构，让类名自带归属信息。借鉴方式是在迁移期让 BEM 类名与 CSS Modules 并存，逐个组件替换，替换完就删掉旧的全局类。

### 从学到用：落地路线

第 1 步，选一个只有单个页面、样式文件少于 5 个、且由一人维护的后台列表页做试点。验收标准：该页 DOM 上不再出现旧的全局类名，且与迁移前的 Playwright 截图逐像素一致。

第 2 步，在同一页面抽出共享基类，用 `composes` 在多个组件里复用，构建后检查产物的选择器结构。验收标准：产物选择器全是单类名，新增基类只改一个文件即可让所有引用处生效。

第 3 步，把迁移清单按页面粒度排进迭代，每迁完一页就删掉对应的全局 CSS，并在 CI 里加一条阻断规则。验收标准：CI 检查通过，仓库里全局 CSS 的总字节数逐迭代下降，下降数字记录在迭代报告里。

第 4 步，在评审模板里加检查项，并在构建里对 `src` 下非 module 的 `.css` 文件输出告警。验收标准：新增非 module 样式文件时 CI 打印告警，评审记录里有对应的处理结论。

### 动手作业

**目标**：把一个三组件的卡片列表从全局 CSS 迁到 CSS Modules，并产出前后两组实测数字。

**步骤**

1. 建一个最小构建工具项目，写三张卡片，样式放在全局 `cards.css`，类名用 `.card`、`.title`、`.tag`。
2. 用 Playwright 打开页面截一张基线图，存进 `baseline` 目录。
3. 把文件改名为 `cards.module.css`，组件里 `import styles`，把 `className` 换成 `styles.xxx`。
4. 抽出 `base.module.css` 存卡片共享声明，用 `composes` 在两张卡片里复用。
5. 在构建配置里为 dev 与 build 分别设置类名生成规则，各自构建一次并记录产物类名。
6. 用 DevTools 的 Coverage 面板记录迁移前后的未使用 CSS 字节数，再做一次截图对比。
7. 写一份 200 字结论，写明哪一步省掉了后续改动，哪一步只是配置成本。

**验收标准**

1. DOM 上三张卡片的类名都带 hash，且改其中一张的样式不影响另外两张。
2. 产物里所有选择器都是单类名，没有后代选择器参与权重竞争。
3. 迁移前后的基线截图 diff 为 0 像素。
4. 结论里同时给出迁移前后的未使用 CSS 字节数与产物类名两组数字。
5. 只改 `base.module.css` 一处，两张卡片的外观同时改变。

