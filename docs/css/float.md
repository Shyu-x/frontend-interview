---
title: 浮动与清除浮动
description: 浮动行为规则、清除浮动的各种方式与 overflow:hidden 的原理。
tags:
  - css
---

# 浮动与清除浮动


## 1. 浮动原理

### 1.1 定义与背景

`float` 是 CSS 2.1 引入的布局属性，最初用于实现文字绕排（图片周围环绕文字），后被广泛用于多栏布局。其核心特性：使元素脱离正常文档流，向左或向右移动直到碰到容器边缘或另一个浮动元素。

### 1.2 浮动行为规则

```
浮动元素的行为规则 ASCII 图（图中文字见下方图例）：

(1)
+----------+
| Block A  |
+----------+
+----------+
| Block B  |
+----------+

(2)
+----------+  +----------+  +----------+
| Block A  |  | Block B  |  | Block C  |  <-- (3)
| (float)  |  |          |  |          |
+----------+  +----------+  +----------+

(4)
+-------------+-------------+
| float: left | float: left |  <-- (5)
+-------------+-------------+

(6)
+--------------+--------------+
| float: right | float: right |  <-- (7)
+--------------+--------------+

图例：
(1) 正常文档流块级元素
(2) 给 Block A 加 float: left 后
(3) B 和 C 填入 A 右侧空白区域
(4) 两个浮动元素
(5) 并排直到父容器宽度不够
(6) float: right
(7) 从右到左排列
```

**浮动三规则**：

1. 浮动元素脱离文档流，但不脱离文字流（文字会绕排）
2. 浮动元素向左/向右移动，直到碰到**容器边缘**或**另一个浮动元素**
3. 多个同方向浮动元素会并排排列，容器宽度不够时自动换行

### 1.3 清除浮动方法对比

| 方法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| `clear: both` 伪元素 | 伪元素放在浮动元素之后，触发清除 | 兼容性好，语义清晰 | 需额外 CSS |
| `overflow: hidden/auto` | 触发 BFC，包含浮动元素高度 | 一行代码 | 可能裁剪内容 |
| `display: flow-root` | 纯 BFC，无副作用 | 无裁剪副作用 | 旧浏览器不支持 |
| 父元素也加 `float` | 共同浮动，父元素自适应 | 简单 | 父元素失去居中能力 |
| 空 `<div>` 加 `clear` | 清除浮动 | 兼容 | 污染 HTML 结构，不推荐 |

### 1.4 Clearfix 详解

```css
/* 最常用的 clearfix 方案 */
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}

/* 加强版（兼容 display: table 等） */
.clearfix::before,
.clearfix::after {
  content: '';
  display: table;
}
.clearfix::after {
  clear: both;
}

/* 方案对比：伪元素 vs overflow */
.clearfix-overflow {
  overflow: hidden; /* 或 auto */
  /* 等价于 display: flow-root（但可能有裁剪） */
}

.clearfix-flow-root {
  display: flow-root; /* 纯 BFC，无 overflow 副作用 */
}
```

### 1.5 float vs flex（现代对比）

| 维度 | float | flexbox |
|------|-------|--------|
| 提出时间 | CSS 2.1（2009 年） | CSS 3（2012 年） |
| 布局能力 | 伪二维（只能左/右） | 真二维（主轴+交叉轴） |
| 脱离文档流 | 是 | Flex 项目仍参与 flex 容器布局 |
| 文字绕排 | 原生支持 | 需额外处理 |
| 换行 | 手动处理 | `flex-wrap: wrap` |
| 垂直对齐 | 困难 | `align-items` 轻松实现 |
| 居中能力 | 困难 | `justify-content: center` 一行 |
| 现代项目推荐 | 不推荐（已淘汰） | 优先使用 |

### 1.6 React / Next.js / TS 代码示例

```tsx
// components/FloatImageText.tsx
// 浮动典型场景：文字绕排图片
export function FloatImageText() {
  return (
    <article style={{ maxWidth: '600px', lineHeight: 1.8, padding: '20px' }}>
      <img
        src="https://picsum.photos/200/150"
        alt="示例图片"
        style={{
          float: 'left',
          marginRight: '16px',
          marginBottom: '8px',
          borderRadius: '8px',
          width: '200px',
          height: '150px',
          objectFit: 'cover',
        }}
      />
      <p style={{ margin: 0, textAlign: 'justify' }}>
        这段文字会环绕在浮动图片的右侧显示。当文字长度超过图片高度时，
        会自动流到图片下方继续排版。这是 float 最原生的使用场景——
        实现图片与文字的环绕效果，而不是做页面布局。
      </p>
      <div style={{ clear: 'both' }} /> {/* 清除浮动，使后续内容从左边缘开始 */}
    </article>
  );
}

// components/GridUsingFloat.tsx
// 模拟 Grid 的等高列效果（不推荐，仅作演示）
export function GridUsingFloat() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
  return (
    <div className="clearfix" style={{ margin: '16px' }}>
      {colors.map((color, i) => (
        <div
          key={i}
          style={{
            float: 'left',         /* 关键：float 使列并排 */
            width: 'calc(25% - 12px)',
            marginRight: '16px',
            backgroundColor: color,
            borderRadius: '8px',
            padding: '24px',
            color: '#fff',
            minHeight: '120px',
          }}
        >
          列 {i + 1}
        </div>
      ))}
    </div>
  );
}

// 配合 CSS Module 的 clearfix（推荐方式）
// Clearfix.module.css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

### 1.7 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 用 float 做页面布局 | 现代 CSS 使用 Flexbox 或 Grid，float 只做文字绕排 |
| 浮动导致父元素塌陷 | 使用 clearfix 或 `display: flow-root` |
| float 和绝对定位混合使用 | float 主要用于内容排版，绝对定位用于 UI 组件，分工明确 |
| 忘记 `clear: both` | 浮动段结束后加清除，防止影响后续内容 |
| `overflow: hidden` 清除浮动导致内容被裁剪 | 使用 `display: flow-root` 或 `clearfix` 代替 |

### 1.8 面试题

**Q1: 浮动的原理是什么？浮动元素会脱离文档流，但对谁"不脱离"？**

> 参考答案：浮动元素会脱离正常文档流（不占位），向左/向右移动直到碰到包含块边缘或另一个浮动元素。关键：浮动元素不脱离**文字流**（text flow），文字会绕排到浮动元素旁边（这是 float 设计初衷）。此外，浮动元素的父元素仍然受其影响（父元素高度塌陷），需要清除浮动。

**Q2: 清除浮动的几种方法？哪种最推荐？**

> 参考答案：① 空 div + `clear: both`（不推荐，污染 HTML）；② 父元素加 `overflow: hidden/auto`（触发 BFC，但可能裁剪内容）；③ Clearfix 伪元素 `::after { content:''; display:block; clear:both; }`（最常用，兼容性好）；④ `display: flow-root`（现代最推荐，无副作用）。当前最佳实践是 `display: flow-root`，语义清晰且无裁剪风险。

**Q3: 为什么 float 不适合现代布局？有哪些场景仍然需要用到 float？**

> 参考答案：float 设计初衷是实现文字绕排，而非页面布局。用 float 做布局需要配合 clearfix hack，且无法做垂直居中、换行对齐、等高列等现代布局需求。Flexbox/Grid 可以优雅地解决这些问题。现代仍需要 float 的场景：① 图片与文字的绕排（CSS Shapes）；② 需要文字沿曲线排布的 CSS Shapes 功能；③ 老项目维护。日常页面布局不推荐使用 float。


## 2. 面试精讲：浮动原理，清除浮动方式，overflow:hidden 清除浮动原理

### 2.1 浮动原理

**浮动元素的行为：**

| 特性 | 说明 |
|------|------|
| 脱离文档流 | 浮动元素从正常流中抽出，位置向左/右移动 |
| 块级元素忽略 | 后续块级元素忽略浮动（但行内元素感知浮动） |
| 行内内容围绕 | 浮动元素在行框内排列，行内内容围绕浮动元素 |

**示例：**

```
(1)
+----------+
| Block A  |
+----------+
+----------+
| Block B  |
+----------+

(2)
+---+---------------+
| A | B  (3)        |
+---+---------------+
  |  (4)

(1) 正常文档流：块级元素垂直排列
(2) A 左浮动后
(3) B 占据 A 右侧空间，块级不感知浮动
(4) 行内内容围绕 A
```

### 2.2 清除浮动方式

**方式1：clear 属性**
```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

**方式2：BFC 清除浮动**
```css
.float-container {
  overflow: hidden; /* 或 auto */
}
```

**方式3：display: flow-root（推荐，无副作用）**
```css
.float-container {
  display: flow-root;
  /* 专门用于创建 BFC，不引入任何副作用 */
}
```

### 2.3 overflow:hidden 清除浮动的原理

| 步骤 | 说明 |
|------|------|
| 触发 BFC | overflow: hidden 触发 BFC（块格式化上下文） |
| 计算高度 | BFC 的特性：计算高度时，浮动子元素也参与计算 |
| 撑开父元素 | 所以父容器被浮动子元素撑开 |
| 视觉效果 | 视觉上等于"清除了浮动"，但 float-child 仍在文档中 |

```css
/* 示例 */
.container {
  overflow: hidden; /* 创建 BFC，浮动子元素参与高度计算 */
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [`overflow` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow) | overflow 属性的权威参考，含语法、计算值与格式化上下文相关说明 | 查语法表和注释中建立块级格式化上下文的部分，整理出最小可用的清除浮动写法 |
| [`<overflow>` CSS type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/overflow_value) | 澄清 overflow 各取值语义，避免把 hidden 当成 display:none | 对照表格记下各值是否建立滚动容器，判断清除浮动时该选 auto 还是 hidden |
| [`hidden` HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden) | 澄清 HTML hidden 属性与 CSS overflow:hidden 的区别，避免概念混淆 | 读它与 display:none 的关系，确认它不产生 BFC，再对比 overflow:hidden 的作用范围 |
| ['`<input type="hidden">` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/hidden) | 区分表单隐藏字段与 CSS 的 overflow:hidden，防止名词误用 | 只需浏览定义，记住它与布局无关；遇到 hidden 一词先分清是 HTML 还是 CSS |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Creating CSS carousels](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow/Carousels) | 完整可运行的示例，能直观看到 overflow 的裁剪与滚动容器效果 | 抄下示例代码，把内部元素改成浮动并切换 overflow 取值，观察父元素高度如何变化 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow) | 讲透 overflow 取值与裁剪行为，是理解 overflow:hidden 清除浮动的前提 | 先读 visible 与 hidden 的行为差异，思考 hidden 为何能包住浮动子元素，再回代码里验证父元素高度 |
| [Flow layout and overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Flow_layout_and_overflow) | 说明普通流中块盒子的溢出处理，是 BFC 与清除浮动的背景知识 | 重点读块级盒子与溢出一节，带着“为什么父元素加 overflow 后能包住浮动”回看自己的示例 |
| [Handling overflow in multi-column layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Multicol_layout/Handling_overflow) | 展示多列布局中的溢出处理，帮助理解溢出与格式化上下文的互动 | 读多列溢出一节，关注容器如何包裹内容，类比父元素包裹浮动子元素的思路 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格：左侧筛选栏 + 右侧数据区 | float 脱离文档流、父容器高度塌陷 | float: left + margin-left + ::after 清除 | 右栏宽度偏移量必须与左栏宽度相同 |
| 低端安卓 WebView 的活动页两栏卡片 | 浮动定位、清除浮动的兼容写法 | float 栅格 + display: table 的 clearfix | 用定宽或百分比列，不依赖后续计算 |
| 多人协作白板的评论气泡（头像 + 正文） | 行盒避让浮动、BFC 包含浮动 | float: left + overflow: hidden | overflow 会把溢出内容裁掉 |
| HTML 邮件模板的左右两栏 | float 脱流、行盒避让 | table 布局与 float 混用 | 各邮件客户端对 float 的处理不一致 |
| 内容站正文插图与文字绕排 | 行盒逐行避开浮动盒 | img float: left + 段落自然绕排 | 图片比段落高时，末尾几行仍会缩进 |
| 老项目的分页条、标签列表 | 同级浮动自动换行 | li float: left + 父级清除 | 清除元素必须有块级 display |
| 第三方 SDK 注入的客服浮层 | 浮动元素不计入父容器高度 | float: right + BFC | 父容器塌陷会把底部内容顶上来 |
| 需要三列等高的卡片列表 | 浮动做不到等高 | 改用 flex 或 grid | 强行用 float 要配 min-height 兜底 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台要在一屏里放下左侧筛选面板和右侧宽表格，表格行数在千行量级，横向滚动条由右栏自己承担。筛选面板的宽度会随权限项数量变化，两栏在窄屏上掉成上下排列是常见故障。

**怎么用本页知识解决**：思路是左栏脱离文档流，右栏用外边距让出等宽位置，父容器负责把两栏的高度一起包住。

```html
<div class="layout">                  <!-- 父容器：把两栏高度包住 -->
  <aside class="filters">筛选项</aside>  <!-- 左栏：浮动 -->
  <main class="table-area">表格</main>   <!-- 右栏：靠外边距让位 -->
</div>
```

```css
.layout::after {
  content: " ";        /* 伪元素必须有 content 才会生成 */
  display: block;      /* 变成块级盒，clear 才能吃掉浮动 */
  clear: both;         /* 左右两侧都不许有浮动元素 */
}
.filters    { float: left; width: 240px; }
.table-area { margin-left: 240px; }   /* 偏移量必须等于左栏宽度 */
```

- 左栏浮动后不再占据正常流位置，右栏的内容会从父容器左边开始排。
- 右栏的 `margin-left` 把内容推到左栏右侧，数值不一致时两栏会重叠。
- 父容器的 `::after` 是最后一个块级子元素，`clear: both` 让它落到两栏下方。
- 清除生效后父容器高度等于两栏中较高的那个，下面的分页条不再被覆盖。
- 只给右栏写 `overflow: hidden` 也能包住浮动，但会一并裁掉右栏的溢出内容。

**怎么度量收益**：用 Chrome DevTools 的 Performance 面板录制滚动 3 秒，看 Layout 事件次数与单次耗时；用 Lighthouse 读 Cumulative Layout Shift；在控制台断言 `document.querySelector('.filters').getBoundingClientRect().top` 与右栏同项差值为 0。

**什么时候不该用**：右栏需要垂直居中时，浮动加外边距算不出居中位置，改用 flex 的 `align-items: center`；两栏各自需要独立滚动容器时，浮动元素的高度算不准，改用 grid 的固定行高。

#### 场景 2：低端安卓 WebView 的活动页首屏

**业务背景**：活动页要投放到安卓 4.4 到 7 的设备上，这些设备的 WebView 内核版本参差。首屏是两栏优惠券卡片，样式在旧内核上解析失败会整段失效。

**怎么用本页知识解决**：用 float 加定宽列排两栏，清除浮动选用 `display: table` 的伪元素写法，减少对解析分支的依赖。

```css
.row::after {
  content: " ";         /* 伪元素必须有 content 才会生成 */
  display: table;       /* 旧内核也能识别的块级化写法 */
  clear: both;          /* 两侧浮动都不许越出这一行 */
}
.col {
  float: left;          /* 卡片并排，靠浮动换行 */
  width: 50%;           /* 两列各占一半 */
  box-sizing: border-box; /* 内边距算进宽度，避免总宽超出 */
}
```

- `::after` 在父行末尾生成一个匿名盒，它落在所有浮动卡片下方。
- `display: table` 让这个匿名盒成为块级盒，`clear` 才会产生效果。
- 百分比宽度加 `box-sizing`，两列相加正好等于容器宽度，不会掉行。
- 不写 `calc()` 和自定义属性，旧内核上少一层解析失败的可能。
- 卡片数量变化时，浮动会自动换行，不需要改样式。

**怎么度量收益**：用真机或云真机统计首屏可交互时间，指标取 WebView 的 `onPageFinished` 到首屏卡片可见的间隔；用 `window.onerror` 收集样式解析相关报错的数量；对比改动前后 CSS 文件的字节数。

**什么时候不该用**：列宽由后端返回的内容长度决定时，定宽百分比放不下，改用 `flex-wrap`；需要按容器宽度自动决定列数时，改用 grid 的 `auto-fill`。

#### 场景 3：多人协作白板的评论气泡

**业务背景**：白板上每个评论锚点旁边挂一个气泡，气泡里是头像、昵称、时间和正文。气泡宽度固定但正文长度不定，正文只有一行和十行时对齐表现不一致是主要抱怨点。

**怎么用本页知识解决**：头像浮动，正文用外边距让出位置，气泡容器建立 BFC 把浮动包含进去。

```html
<div class="tip">                     <!-- 气泡容器 -->
  <img class="avatar" src="a.png">    <!-- 头像：浮动 -->
  <p class="text">正文内容</p>         <!-- 正文：靠外边距避让 -->
</div>
```

```css
.tip {
  overflow: hidden;   /* 建立 BFC：高度包含浮动，也不被外部浮动影响 */
  padding: 8px;
}
.avatar {
  float: left;        /* 头像脱离文档流，正文行盒自动避开 */
  width: 32px;
  height: 32px;
  margin-right: 8px;
}
.text {
  margin: 0 0 0 40px; /* 40 = 头像 32 + 间隔 8，每行都右移 */
}
```

- 头像浮动后不占正常流位置，正文的行盒逐行避开它。
- 正文用外边距而不是定宽，字数增长时不会被头像压住。
- 气泡容器上的 `overflow: hidden` 触发 BFC，高度等于正文高度，不用另写清除。
- 行盒避让是逐行发生的，正文一行和十行的左边界结果相同。
- 挪走 `overflow: hidden` 后气泡高度只剩内边距，头像会溢出到容器外。

**怎么度量收益**：用视觉回归工具（Playwright 的截图断言或 BackstopJS）比对不同正文长度下的气泡截图；用脚本断言 `.avatar` 与 `.text` 的 `getBoundingClientRect().left` 差值为 40。

**什么时候不该用**：气泡里有绝对定位的箭头和下拉菜单时，`overflow: hidden` 会把它们裁掉，这里改用 `::after` 清除浮动；头像要与正文首行垂直居中时，浮动加外边距要手算偏移，改用 flex 的 `align-items: center`。

### 行业先进实践

- **micro clearfix（出处：Nicolas Gallagher 的博客文章 A new micro clearfix hack，HTML5 Boilerplate 采用同一份实现）**：容器上同时生成 `::before` 与 `::after` 两个 `display: table` 的伪元素，`::after` 负责 `clear: both`，`::before` 阻止子元素的上外边距与容器外边距合并。借鉴方式是把这段写进项目公用样式，命名成 `.clearfix`，约定凡是有浮动的容器都挂这个类。
- **Bootstrap 3 的栅格系统（出处：Bootstrap 3 官方文档 Grid system 页面）**：`.row` 用 clearfix 包住 `.col-*` 的浮动，列用百分比宽度加 `float: left`。维护 Bootstrap 3 项目时，遇到列掉行的故障，先检查 `.row` 的清除是不是被业务样式覆盖了。
- **`display: flow-root` 建立 BFC（出处：MDN Web Docs 的 display 属性页面）**：该取值让元素建立新的 BFC，浮动子元素被包含，父元素高度不塌陷，也不需要额外的伪元素。新项目可以用它替换 clearfix，用之前要在项目的目标浏览器矩阵里核对支持范围。
- **float 的原始用途是文字环绕（出处：MDN Web Docs 的 float 属性页面，W3C CSS 2.1 规范 9.5 节 Floats）**：规范定义了浮动的定位规则与 `clear` 取值，MDN 说明该属性最初是为图文绕排设计的。借鉴方式是把 float 限定在图文绕排和小部件排列上，整页布局交给 flex 或 grid。
- **需核对官方文档：flex 与 grid 在项目目标浏览器矩阵里的最低支持版本，以及 `display: flow-root` 的支持范围。** 这条要在项目立项时查一次，再决定新页面用哪种布局方式。

### 从学到用：落地路线

1. **试点**：挑一个后台页面里靠浮动撑起来的两栏模块，只补清除处理，不改结构。验收标准是父容器的盒模型高度等于两栏中较高的那个。
2. **验证**：在试点页面跑改动前后的截图对比，再加一条脚本断言两栏的 `top` 值相等。验收标准是截图差异为零、断言通过。
3. **推广**：把清理好的写法收进公用样式，搜出项目里所有 `float` 声明逐条补上清除，把这项加进代码评审清单。验收标准是搜索 `float` 的结果里，每条都能在同容器上找到清除处理。
4. **防回退**：在 CI 里加一条 Stylelint 的 `property-disallowed-list` 规则，把 `float` 放进禁止属性，需要图文绕排时用注释按行放行。验收标准是在测试分支故意加一条 `float` 声明，CI 检查失败，加上放行注释后通过。

### 动手作业

**目标**：在一份本地 HTML 里复现父容器高度塌陷，比较三种清除方案在盒模型和溢出裁剪上的差别。

**步骤**：

1. 写 `index.html`，父容器 `.box` 里放左栏 `.left`（`float: left`、宽 200px、高 120px）和右栏 `.right`（`margin-left: 200px`、高 60px），`.box` 不加任何清除。
2. 用浏览器打开，DevTools 选中 `.box` 记下盒模型的高，并在控制台执行 `document.querySelector('.box').getBoundingClientRect().height` 核对。
3. 给 `.box` 加 `.clearfix`（`::after` + `content` + `display: table` + `clear: both`），刷新后重复第 2 步的记录。
4. 把 `.clearfix` 换成 `overflow: hidden`，再记录一次。
5. 把 `overflow: hidden` 换成 `display: flow-root`，再记录一次。
6. 在 `.right` 里放一个 `position: absolute; right: -40px` 的子元素，逐个方案看它是否可见。
7. 把三次记录整理成表，写一页结论：哪种方案在哪些条件下成立。

**验收标准**：

- 第 2 步记录的 `.box` 高度小于 120px，第 3、4、5 步的记录都等于 120px。
- 控制台打印值与 DevTools 盒模型面板显示的差值不超过 0.5px。
- 表格覆盖三种方案乘以「父容器高度、绝对定位子元素是否可见」两列，每格都有实测值。
- 结论里写明 `overflow: hidden` 方案下绝对定位子元素被裁剪，另外两种方案下可见。
- 页面中每一条 `float` 声明都能在同容器上找到对应的清除处理。

