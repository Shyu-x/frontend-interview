---
title: CSS 预处理与构建工具链
description: PostCSS、Autoprefixer、Sass/Less 与 CSS Houdini。
tags:
  - css
---

# CSS 预处理与构建工具链


## 1. 面试精讲：PostCSS，Autoprefixer 原理，Sass/Less 区别，Sass mixin，CSS Houdini

### 1.1 PostCSS

PostCSS 是一个用 JavaScript 插件转换 CSS 的工具（不是预处理器）：

```
CSS 输入 → PostCSS 解析器 → AST（抽象语法树） → 插件链 → 输出 CSS
```

**常见插件：**

- `autoprefixer`：自动添加浏览器前缀
- `postcss-preset-env`：将现代 CSS 转换为兼容性更好的版本
- `cssnano`：压缩优化 CSS
- `stylelint`：CSS 代码检查

### 1.2 Autoprefixer 原理

```css
/* 输入 */
.flex {
  display: flex;
  user-select: none;
  transition: transform 0.3s;
}

/* Autoprefixer 输出（根据 browserslist） */
.flex {
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-transition: -webkit-transform 0.3s;
  transition: -webkit-transform 0.3s;
  transition: transform 0.3s;
}
```

**原理：**
```
1. Autoprefixer 读取 browserslist 配置（如 "> 1%", "last 2 versions"）
2. 解析 CSS，识别需要前缀的属性
3. 查询 Can I Use 数据库，确定哪些特性需要前缀
4. 在 CSS 声明前插入前缀版本
```

### 1.3 Sass/Less 区别

| 特性 | Sass (SCSS) | Less |
|------|------------|------|
| 语法 | SCSS（CSS 超集，大括号） / 缩进语法 | 类 CSS 语法 |
| 变量符号 | `$var` | `@var` |
| 混合宏 | `@mixin` / `@include` | `.mixin()` |
| 继承 | `@extend` | 无（用 mixin 或占位符） |
| 条件语句 | `@if / @else` | `.when`（有限） |
| 循环 | `@for / @each / @while` | 无原生循环 |
| 编译 | Dart Sass / LibSass | JS（lessc） |

```scss
/* Sass/SCSS */
$primary: #0066ff;
$spacing: 8px;

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  padding: $spacing;
  @include flex-center;

  &__item {
    margin: $spacing / 2;
  }

  &:hover {
    background: darken($primary, 10%);
  }
}

/* 继承 */
.error {
  color: red;
  padding: 12px;
}
.error-box {
  @extend .error;
  border: 1px solid red;
}
```

```less
/* Less */
@primary: #0066ff;
@spacing: 8px;

.flex-center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  padding: @spacing;
  .flex-center();

  &__item {
    margin: @spacing / 2;
  }

  &:hover {
    background: fade(@primary, 80%);
  }
}
```

### 1.4 Sass Mixin

```scss
/* 简单 mixin */
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 带参数的 mixin */
@mixin rounded($radius: 4px) {
  border-radius: $radius;
}

/* 多参数 */
@mixin box-shadow($x, $y, $blur, $color) {
  box-shadow: $x $y $blur $color;
}

/* 可变参数 */
@mixin transform($values...) {
  transform: $values;
}

/* 条件 mixin */
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'mobile' {
    @media (max-width: 576px) { @content; }
  } @else if $breakpoint == 'tablet' {
    @media (max-width: 768px) { @content; }
  }
}

.sidebar {
  @include respond-to('tablet') {
    display: none;
  }
}
```

### 1.5 CSS Houdini

CSS Houdini 是一组底层 API，允许开发者介入浏览器的 CSS 引擎：

```javascript
// 1. Paint Worklet：自定义绘制
registerPaint('my-pattern', class {
  static get inputProperties() { return ['--my-color']; }
  paint(ctx, size, props) {
    ctx.fillStyle = props.get('--my-color');
    ctx.fillRect(0, 0, size.width, size.height);
  }
});
```

```css
/* 使用 */
.pattern {
  background: paint(my-pattern);
  --my-color: red;
}
```

**Houdini 主要 API：**

- **Paint API**：自定义背景、边框等绘制逻辑
- **Layout API**：自定义布局算法（如 masonry）
- **Animation Worklet**：与主线程分离的高性能动画
- **Properties & Values API**：注册自定义 CSS 属性（带类型和初始值）
- **Typed OM**：类型化 CSS 对象模型（替代字符串拼接）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [PostCSS 文档](https://postcss.org/docs/) | PostCSS 官方文档，插件机制与 AST 转换的第一手说明。 | 读「写一个插件」与 API 一节，边读边跑最小插件，弄清 AST 如何被转换。 |
| [CSS Houdini](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Properties_and_values_API/Houdini) | Houdini 各 API 的权威概览，看清浏览器可扩展 CSS 的边界。 | 先读 Properties and Values API 一节，想清它能做预处理器做不到的什么事。 |
| [MDN CSS 嵌套](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) | 原生嵌套的规范行为，是理解 Sass/Less 嵌套差异的基准。 | 把现有 Sass 嵌套改写为原生嵌套，比较 & 与选择器解析的语义差别。 |
| [Vite：功能（中文）](https://cn.vitejs.dev/guide/features.html) | Vite 官方中文文档，讲清 CSS、预处理器与 PostCSS 的接入方式。 | 逐项试用 CSS 与 PostCSS 配置，写一个引入 Sass 与 Autoprefixer 的最小例子。 |
| [CSS custom properties for cascading variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables) | 自定义属性是 Houdini 与变量方案的规范基础。 | 读 cascading variables 定义，比较它与 Sass 变量在作用域与继承上的差别。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Lightning CSS](https://lightningcss.dev/) | Lightning CSS 可替代 PostCSS 做转换与压缩，便于横向对比。 | 在 Vite 中启用它替代 PostCSS，记录构建耗时与产物差异。 |
| [Stylelint 入门](https://stylelint.io/user-guide/get-started) | Stylelint 入门示例，展示构建链里如何加静态检查。 | 照文档装好规则接入编辑器，为一份含 Sass 的样式文件试跑并修一处告警。 |
| [CSS-Tricks](https://css-tricks.com/) | CSS-Tricks 文章与 Almanac 示例多，适合边查边验证。 | 用 Almanac 速查嵌套、变量等条目，配合文章理解预处理与原生语法的取舍。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 从层叠与布局讲透 CSS 心智模型，弥补只学预处理器语法的短板。 | 先读布局与层叠章节，每章写一个实验页面验证书中的层叠结论。 |
| [张鑫旭的博客](https://www.zhangxinxu.com/wordpress/) | 中文长期积累，CSS 与交互细节讲得细，适合查缺补漏。 | 搜预处理器与 CSS 变量相关文章，对照自己的构建配置验证文中结论。 |
| [State of CSS](https://stateofcss.com/) | 年度调查数据，看清原生嵌套、容器查询等特性的真实采用率。 | 查特性采用率图表，判断哪些预处理功能已可被原生方案替代。 |

## 应用与行业实践

前面几节讲的是原理：PostCSS 是一个用 JavaScript 插件转换 CSS 的工具，不是预处理器。这一节回答另一个问题：这些知识在真实项目里落在哪一行代码、哪一次评审、哪个监控指标上。

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理系统的万行表格页 | PostCSS 插件链与执行顺序 | postcss + autoprefixer + cssnano | 插件按数组顺序执行，压缩放最后 |
| 低端安卓机的首屏加载 | Autoprefixer 与 Browserslist | postcss-import + autoprefixer | 合并 @import 后再补前缀，顺序不能反 |
| 多人协作白板的网格与主题 | CSS Houdini（Painting API） | CSS.paintWorklet.addModule | 不支持时回退到渐变或图片背景 |
| 老项目从 Less 迁到 Sass | Sass/Less 区别、Sass mixin | sass + postcss | 变量作用域与嵌套展开规则不同 |
| 组件库发包给第三方使用 | Autoprefixer | autoprefixer + browserslist 字段 | 不要把使用方的目标浏览器锁死 |
| 设计系统的主题令牌 | CSS 自定义属性 + postcss-preset-env | postcss-preset-env | stage 数值越低，编译出的代码越多 |
| 营销活动页兼容存量 WebView | Browserslist 查询 | browserslist 配置段 | 用线上 UA 采样校准查询，别凭印象写 |
| 团队 CSS 规范与提交卡点 | PostCSS 作为插件宿主 | stylelint（内部跑 PostCSS） | 先 lint 再压缩，否则报错行号对不上 |
| 面试与方案评审 | 面试精讲：PostCSS | 无 | 先讲清 PostCSS 与预处理器的定位差别 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格页

**业务背景**：表格一屏渲染上千行，组件目录按业务拆开，样式文件数量跟着功能一起涨。开发机上不卡，值班同事的办公笔记本滚动时掉帧。

**怎么用本页知识解决**：先确认瓶颈是 CSS 体积而不是渲染逻辑，再把压缩这一步补进构建链，并用条件判断让开发态保留可读源码。

```js
// postcss.config.js
const isProd = process.env.NODE_ENV === 'production' // 构建环境判定
module.exports = {
  plugins: [
    require('autoprefixer')(), // 按 browserslist 补厂商前缀
    isProd && require('cssnano')(), // 生产构建才压缩，开发态保留可读性
  ].filter(Boolean), // 过滤掉 false，避免把非插件值传给 PostCSS
}
```

- 第 1 行用环境变量分支，避免开发时每次改样式都等压缩。
- 插件数组的先后顺序就是执行顺序，autoprefixer 必须先于 cssnano。
- `.filter(Boolean)` 用来剔除条件为假时留下的 `false`。
- blogslist 写在 package.json，autoprefixer 会自动读取，不需要在配置里重复声明。

**怎么度量收益**：看构建产物里 CSS 的 gzip 后字节数，用 `gzip -c dist/app.css | wc -c` 复现。前端侧看 Chrome DevTools 的 Coverage 面板中 CSS 的 unused bytes 占比，以及 Performance 面板里长任务的总时长。

**什么时候不该用**：项目还在原型阶段、样式文件总量只有几十 KB，引入压缩只会增加构建等待。团队没有 CI 校验产物、压缩后的 sourcemap 没人看，出问题定位成本高于收益。

#### 场景 2：低端安卓机的首屏加载

**业务背景**：页面样式按模块拆成多个文件，入口文件用 @import 串联，浏览器要按依赖顺序发多次请求。低端机网络往返慢，首屏空白时间被请求数放大。

**怎么用本页知识解决**：把 @import 在构建期内联成一个文件，请求数从多次降到一次；再让 autoprefixer 只针对真实用户覆盖到的浏览器生成前缀，避免为不存在的用户写代码。

```js
// postcss.config.js：把多个 @import 合并成一个文件
module.exports = {
  plugins: [
    require('postcss-import')(), // 内联 @import，减少首屏请求数
    require('autoprefixer')(),   // 只生成 browserslist 命中的前缀
    require('cssnano')(),        // 压缩产物，去掉注释与空白
  ],
}
```

- postcss-import 会按 @import 的顺序把内容拼进同一个产物文件。
- 它必须排在 autoprefixer 前面，否则被内联进来的片段拿不到前缀。
- autoprefixer 的目标浏览器来自 package.json 的 browserslist 字段，改配置就改产物。
- cssnano 放最后，压缩的是已经补好前缀的完整代码。
- 内联后 sourcemap 行号会变化，构建配置里要同步打开 sourceMap。

**怎么度量收益**：用 Chrome DevTools Network 面板记录首屏 CSS 的请求条数与传输字节数。用 Lighthouse 报告中的 LCP 与 Total Blocking Time 做前后对比，两次跑分用同一台设备、同一网络限速配置。

**什么时候不该用**：样式文件需要按路由懒加载、首屏只用到其中一小部分，内联会把整站样式推给每个访客。多个入口共享同一份 @import 图、构建配置里已经有别的合并步骤，重复内联会产出重复代码。

#### 场景 3：多人协作白板的网格与主题

**业务背景**：白板画布需要随缩放画网格，网格间距和颜色由主题配置决定。用背景图实现时，每次改主题色都要重新导出切图，换缩放级别还会糊。

**怎么用本页知识解决**：把网格改成运行时绘制的自定义属性驱动绘制器。主题色和间距通过 CSS 自定义属性传入，绘制逻辑放进 Paint Worklet，改主题只需改变量。

```js
// 在白板页面注册绘制模块
CSS.paintWorklet.addModule('/grid-painter.js') // 加载绘制模块

class GridPainter {
  static get inputProperties() {
    return ['--grid-color', '--grid-size'] // 声明依赖的 CSS 变量
  }
  paint(ctx, size, props) {
    const gap = props.get('--grid-size').value // 需先用 CSS.registerProperty 声明语法
    const color = props.get('--grid-color').toString()
    ctx.strokeStyle = color
    for (let x = 0; x < size.width; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke()
    }
  }
}
registerPaint('grid', GridPainter) // 供 background: paint(grid) 调用
```

- `inputProperties` 声明绘制器关心哪些自定义属性，属性变化会触发重绘。
- `--grid-size` 想拿到数值型结果，需要先用 `CSS.registerProperty` 声明 `<length>` 语法。
- 未声明语法时取到的是未解析字符串，做算术前要先转换。
- 绘制在主线程之外执行，画布滚动时不会阻塞交互逻辑。
- 不支持 Paint Worklet 的环境要准备回退：保留一层渐变或纯色背景。

**怎么度量收益**：看主题切换后首帧的绘制耗时，用 Performance 面板录制切换操作，对比切换前后的帧时长。看主题切换这一操作触发的样式重算次数，同样在 Performance 面板的 Rendering 区域开启 Paint flashing 观察。

**什么时候不该用**：目标用户集中在不支持 Paint Worklet 的浏览器，回退分支会变成主路径，维护两套绘制逻辑。网格样式由设计师在 Figma 里频繁改版，每次改版都要同步一份 JS 绘制代码，改图成本反而高于切图。

### 行业先进实践

Autoprefixer 交给 Browserslist 决定前缀（出处：Autoprefixer 官方文档 / Browserslist 官方文档）。配置里不写浏览器名单，只写查询语句，autoprefixer 按查询结果决定生成哪些前缀。这样同一份配置能被构建工具、lint 工具共用。你的项目可以把 browserslist 收敛到一处，别让每个子包各写一份。

postcss-preset-env 用 stage 控制编译范围（出处：postcss-preset-env 官方文档）。它按 CSS 规范的推进阶段决定哪些新语法要降级，stage 数值越高编译的语法越多、产物越大。项目可以从较高的 stage 起步，只在遇到具体兼容问题时下调。改 stage 后要重新测一次产物体积。

Sass 用 @use 取代 @import（出处：Sass 官方文档）。@use 有明确命名空间、只加载一次，@import 会把变量泄漏到全局并重复加载。迁移时可以按文件逐个替换，先跑一遍编译看报错。新项目直接按 @use 写，不要沿用旧模板。

构建工具内置 PostCSS 支持，读取项目根的 postcss.config.js（出处：Vite 官方文档 / Next.js 官方文档）。这意味着接入 PostCSS 通常不需要额外的 loader 配置，装插件、写配置即可。借鉴点是先确认构建工具已经支持什么，再决定要不要自己拼插件链。

Houdini Paint API 的落地边界（需核对官方文档：核对 MDN 上 CSS Painting API 的浏览器兼容表，以及各浏览器对 `paintWorklet` 的支持范围）。在把绘制作业迁进 Worklet 之前，先对照兼容表确认目标用户覆盖比例。确认不了就先做特性检测加回退，再评估迁移范围。

### 从学到用：落地路线

第 1 步，在一个样式文件不超过几十个、构建链已经稳定的子项目里试点，只加 autoprefixer 一个插件。验收标准：构建产物中出现与 browserslist 匹配的前缀，且源码目录与产物目录能对应上。

第 2 步，验证插件顺序与体积变化，把 autoprefixer、postcss-import、cssnano 按顺序接入，记录接入前后的产物字节数与 sourcemap 可用性。验收标准：同一份源码在接入前后渲染结果一致，产物字节数有记录可查。

第 3 步，把配置抽成团队共享包，其他子项目通过 extends 或直接复用同一份 postcss.config.js 接入。验收标准：两个子项目使用同一份配置，跑出的前缀集合相同。

第 4 步，把构建与校验挂进 CI，构建失败或 prefix 集合变化时阻断合并。验收标准：CI 日志里能看到插件执行结果，回退版本时同样能构建通过。

### 动手作业

**目标**：给一个已有的静态站点接入 PostCSS，完成样式合并、前缀补齐与压缩，并量出改动前后的差异。

**步骤**：

1. 准备一个至少包含 3 个 CSS 文件、用 @import 串联的静态站点，记录当前产物字节数与请求数。
2. 安装 postcss、postcss-import、autoprefixer、cssnano，在项目根写 postcss.config.js。
3. 在 package.json 中添加 browserslist 字段，选择一组你能说清覆盖范围的查询。
4. 执行构建，检查产物 CSS 中是否出现与查询匹配的前缀。
5. 用 DevTools Coverage 面板分别测量改动前后的 unused bytes 占比。
6. 故意把 cssnano 挪到 autoprefixer 前面，记录构建结果有什么变化，再改回来。
7. 写一段 200 字以内的说明，解释每个插件在链上的职责。

**验收标准**：

1. 产物 CSS 文件的请求数从多个降为 1 个，且在 Network 面板可复现。
2. 产物中存在至少一处与 browserslist 查询对应的厂商前缀，并能指出对应源码行。
3. 构建产物的 gzip 字节数有前后两组记录，测量命令写在项目 README 里。
4. 把 cssnano 前置后构建报错或产物异常，恢复到正确顺序后构建通过。
5. 源码与产物的 sourcemap 映射可用，能在 DevTools 里定位到原始文件。

