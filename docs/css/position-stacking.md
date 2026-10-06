---
title: position 与层叠上下文
description: 五种 position、包含块、sticky 与 fixed 失效、z-index 与层叠上下文。
tags:
  - css
---

# position 与层叠上下文


## 1. position 属性

### 1.1 五种 position 值

| 值 | 中文 | 是否脱离文档流 | 参照物 | 典型场景 |
|----|------|-------------|--------|---------|
| `static` | 静态定位 | 否 | 正常文档流位置 | 默认，无定位需求时 |
| `relative` | 相对定位 | 否（占位） | 自身原位置 | 微调元素位置、作为子绝父相的参照 |
| `absolute` | 绝对定位 | 是（不占位） | 最近已定位祖先 / body | 弹窗、Tooltip、下拉菜单 |
| `fixed` | 固定定位 | 是（不占位） | 视口（Viewport） | 固定导航栏、回到顶部按钮 |
| `sticky` | 粘性定位 | 否（占位）→固定 | 滚动容器的可视区域 | 吸顶导航、侧边栏跟踪 |

### 1.2 包含块（Containing Block）规则

**定义**：绝对定位元素相对于其"包含块"进行偏移。包含块是 position 不为 static 的最近祖先元素。

```
Containing Block 确定规则：

position: static / relative
  → 包含块 = 块级父元素（正常文档流中的最近块级祖先）

position: absolute
  → 包含块 = 最近的定位祖先（position 不为 static）
  → 若没有定位祖先 → 相对于 <html>（初始包含块）

position: fixed
  → 包含块 = 视口（viewport）（不受滚动影响）
  → 注意：若祖先有 transform/perspective/filter，fixed 相对于该祖先

position: sticky
  → 包含块 = 最近的滚动祖先（overflow 不为 visible 的祖先）
  → 若没有滚动祖先 → 相对于视口
```

### 1.3 堆叠上下文（Stacking Context）原理

**z-index 生效条件**：`z-index` 只对**定位元素**（position 不为 static）有效。

**Stacking Context 创建条件（满足任一）**：
- 根元素 `<html>`
- `position: relative/absolute` + `z-index` 不为 auto
- `position: fixed / sticky`
- Flex 项目 + `z-index` 不为 auto
- `opacity < 1`
- `transform / filter / perspective`（非 none 值）
- `contain: layout / paint`
- `mix-blend-mode` 不为 normal

**层叠顺序（从底到顶）**：

```
层叠顺序（数值越小越靠下）：
1. 负 z-index 的定位元素（在最低层）
2. 未定位块级元素（z-index: auto 的 static 元素）
3. 浮动元素
4. 未定位行内元素
5. z-index: auto / 0 的定位元素
6. 正 z-index 的定位元素（最顶层）
```

### 1.4 ASCII 堆叠示意图

```
视口（Viewport）
+------------------------------------------+
|  z-index: 10  (fixed header)            |  ← 层叠顶层
|  +-----------------------------------+  |
|  |  z-index: 5   (modal dialog)       |  |
|  |  +------------------------------+  |  |
|  |  |  z-index: 2 (dropdown)       |  |  |
|  |  +------------------------------+  |  |
|  +-----------------------------------+  |
|  z-index: 0  (普通内容块)                 |
|  浮动元素（float: left/right）            |
|  z-index: -1 (背景层/阴影层)              |
+------------------------------------------+
```

### 1.5 React / Next.js / TS 代码示例

```tsx
// components/StickyNav.tsx
// Sticky 粘性定位：滚动超过阈值后固定在顶部
export function StickyNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: '0',           // 距顶部 0px 时触发粘性
        zIndex: 100,
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '12px 24px',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '24px' }}>
        {['首页', '产品', '关于', '联系'].map((item) => (
          <a key={item} href="#" style={{ textDecoration: 'none', color: '#333' }}>
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
}

// components/Modal.tsx
// Absolute 定位：相对于父容器定位
// Fixed 定位：遮罩层相对于视口定位
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const dialogStyle: React.CSSProperties = {
    position: 'relative',  // 配合 z-index 创建新的堆叠上下文
    zIndex: 1001,
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '320px',
    maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px' }}>{title}</h2>
        <div>{children}</div>
        <button
          onClick={onClose}
          style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}

// TypeScript：定位类型定义
type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

interface PositionConfig {
  position: PositionValue;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  zIndex?: number;
}

function resolveContainingBlock(
  element: HTMLElement
): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const pos = window.getComputedStyle(current).position;
    if (pos !== 'static') return current;
    current = current.parentElement;
  }
  return null; // 相对于 html
}
```

### 1.6 常见误区与最佳实践

| 误区 | 正确做法 |
|------|------|
| 子元素 absolute 不生效（找不到定位祖先） | 父元素必须设 `position: relative`（或其他非 static） |
| `z-index: 999` 滥用导致层叠冲突 | 建立统一的 z-index 分层体系（base=0, nav=100, modal=1000, toast=2000） |
| `position: sticky` 在父容器 overflow: hidden 时失效 | 确保父容器不是 overflow: hidden 或 auto |
| `fixed` 定位在 transform 祖先上失效 | `transform` 会创建新的 containing block，使 fixed 相对于该元素定位 |
| 多层 absolute 嵌套导致定位混乱 | 使用 React Context 或 CSS 变量管理位置，避免深层嵌套 |

### 1.7 面试题

**Q1: `position: absolute` 和 `position: fixed` 的区别是什么？各自相对于什么定位？**

> 参考答案：absolute 相对于**最近已定位祖先元素**定位（若没有则相对于初始包含块 html）；fixed 相对于**视口（viewport）**定位，不随页面滚动而移动。两者都脱离文档流，但定位基准不同。补充：若 fixed 的祖先设置了 `transform`/`perspective`/`filter` 非 none 值，则 fixed 相对于该祖先而非视口定位（这是容易被忽视的陷阱）。

**Q2: 如何理解 CSS 的层叠上下文（Stacking Context）？什么情况下元素会创建新的层叠上下文？**

> 参考答案：层叠上下文是 HTML 元素在 Z 轴上的层叠顺序上下文。创建条件包括：根元素、定位+非 auto z-index、opacity<1、transform/filter/perspective 非 none、flex/grid 项目+z-index 非 auto 等。子元素的 z-index 只在父层叠上下文内比较，不会跨上下文比较——这是"z-index 失效"的常见原因。

**Q3: `position: sticky` 的生效条件是什么？为什么有时候不生效？**

> 参考答案：sticky 生效需满足：① 设置了 `top`/`bottom` 等偏移量（没有则等同于 relative）；② 最近的滚动祖先（overflow 不为 visible 的祖先）可滚动；③ 距离未达到阈值之前表现为 relative，超过阈值后表现为 fixed。常见不生效原因：父容器设置了 `overflow: hidden`（吞噬了滚动事件）、父容器高度不够、或没有设置偏移量。


## 2. 面试精讲：position 属性

| 属性值 | 定位参照 | 是否脱离文档流 | 滚动时 |
|--------|---------|--------------|--------|
| `static` | 自然位置（无定位） | 否 | 随页面滚动 |
| `relative` | 自身原始位置 | 否（占据原位） | 随页面滚动 |
| `absolute` | 最近已定位祖先（不含 static） | 是 | 随页面滚动（若祖先 fixed 则随窗口） |
| `fixed` | 视口（viewport） | 是 | 不随页面滚动 |
| `sticky` | 视口 + 滚动容器（混合） | 否（占位） | 条件性固定 |

### 2.1 相对定位（relative）

```css
.relative {
  position: relative;
  top: 10px;
  left: 20px;
  /* 相对于自身原始位置偏移 */
  /* 原位保留（其他元素不知道它偏移了） */
}
```

### 2.2 绝对定位（absolute）

```css
/* 定位参照：最近已定位祖先 */
.parent {
  position: relative; /* 创建参照物 */
}
.child {
  position: absolute;
  top: 0;
  right: 0;
  /* 相对于 parent 右上角定位 */
}

/* 无已定位祖先 → 相对于初始包含块（html）定位 */
```

### 2.3 固定定位（fixed）失效原因

| 原因 | 说明 |
|------|------|
| **transform 祖先** | 祖先元素设置了 transform（即使 transform: none）导致 fixed 相对于 transform 祖先定位，而不是视口 |
| **filter 祖先** | 同样会创建新的堆叠上下文，导致 fixed 失效 |
| **移动端 WebView** | iOS Safari 使用惯性滚动时 fixed 会"飘" |
| **创建新容器的 CSS** | perspective, will-change 等也会导致失效 |

**解决方案：**
```css
/* 将 fixed 元素移到 body 或更高层级 */
body {
  transform: none; /* 确保无 transform 干扰 */
}

/* 或使用 JS 在滚动时动态计算位置（iOS workaround） */
```

### 2.4 粘性定位（sticky）

```css
.sticky {
  position: sticky;
  top: 10px;
  /* 滚动容器内的行为：
     1. 初始：正常文档流位置
     2. 滚动后距离顶部 < 10px 时：固定在 top: 10px
     3. 滚动出容器时：恢复文档流（不再固定） */
}
```

**sticky 原理：**

| 阶段 | 说明 |
|------|------|
| 初始位置 | sticky 元素在正常文档流中 |
| 滚动至阈值 | 当滚动位置到达 top: 10px 位置时 |
| 固定不动 | 元素固定在 top: 10px 位置 |
| 继续滚动 | 当 sticky 随内容离开容器时，恢复文档流（不再固定） |

**sticky 注意事项：**
- 必须指定 `top/left/right/bottom` 中的一个
- 父容器必须有明确的高度（不能是 `overflow: hidden` 裁剪了子元素）
- 父容器不能是 `overflow: hidden/auto`，否则 sticky 无法超出

### 2.5 z-index 与层叠上下文

```css
.a { z-index: 1; }   /* 数值越大，越在上层 */
.b { z-index: 10; } /* 10 > 1，b 在 a 之上 */
```

**层叠上下文（Stacking Context）触发条件：**
```css
/* 以下属性会创建新的层叠上下文 */
position: relative/absolute/fixed + z-index !== auto;
position: fixed/sticky; /* 即使 z-index 是 auto 也创建 */
z-index !== auto;       /* flex 子元素 */
z-index !== auto;       /* grid 子元素 */
opacity < 1;
transform !== none;
filter !== none;
mix-blend-mode !== normal;
isolation: isolate;
will-change: <上述任意属性>;
-webkit-overflow-scrolling: touch; /* iOS */
```

**层叠等级（从低到高）：**
```
1. 块级盒（block boxes）
2. 浮动盒（float boxes）
3. 行内盒（inline boxes）
4. z-index: auto / z-index: 0 的定位元素
5. z-index: 正整数 的定位元素（数值越大越上层）
```

**z-index 失效的常见原因：**
```css
/* 1. 父元素没有创建层叠上下文，子元素 z-index 再高也受父限制 */
.parent1 { z-index: 100; } /* 未创建层叠上下文 */
.parent2 { z-index: 1; transform: scale(1); } /* 创建了层叠上下文 */
.child { z-index: 9999; }
/* child 虽然 z-index 很高，但因为在 parent1 内，
   所以不会超过 parent2 的子元素 */

.parent1 {
  position: relative;
  z-index: 100;
}
.parent2 {
  position: relative;
  z-index: 1;
  transform: scale(1); /* 创建层叠上下文 */
}

/* 2. 元素不是定位元素（position 不是 relative/absolute/fixed/sticky） */
.element { z-index: 999; } /* 无效！ */

/* 3. 层叠上下文嵌套，按父级上下文比较 */
```

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行订单表（吸顶表头 + 冻结首列） | 绝对定位与 sticky 都以最近的定位祖先为参照 | 原生 CSS，滚动容器 position: relative | 祖先 overflow: hidden 会截断吸附；交叉单元格要单独提层级 |
| 低端安卓首屏的引导气泡与蒙层 | 气泡相对锚点容器偏移，而不是相对视口 | 原生 CSS，class 切 display | 字体与图片撑高锚点后，写死的像素坐标会指错位置 |
| 多人协作白板的光标与批注 | 偏移量相对白板容器的 padding box 计算 | Canvas 覆盖层 + 绝对定位 DOM 光标 | 白板容器上的 scale 会同步缩放子元素坐标 |
| 视频播放器的自定义控件 | 控件绝对定位在播放器容器上 | 原生 video + CSS | 进入全屏后包含块换成全屏元素，需重新确认基准 |
| 地图瓦片上的标注点 | 标注相对地图容器偏移 | MapLibre / Leaflet 的 marker 层 | 平移交给容器 transform，不要逐点改 left 与 top |
| 富文本编辑器的悬浮工具栏 | 工具栏相对编辑区容器定位 | ProseMirror / TipTap + 绝对定位 | 编辑区滚动时要换算视口坐标或改用 sticky |
| 数据大屏的标注线与连线端点 | 绝对定位元素随画布缩放一起变换 | ECharts + CSS 定位 | 适配统一用 transform: scale，不要另写像素重算 |
| 图片裁剪框与拖拽手柄 | 手柄相对图片容器偏移 | 原生 CSS 加指针事件 | 容器 overflow 与 pointer-events 会影响手势捕获 |
| 虚拟列表里的吸顶分组头 | 吸附边界由最近的滚动容器决定 | react-window 或自研虚拟列表 | 节点回收复用时必须重置 top 与类名 |

### 三个场景拆解

#### 场景 1：后台管理的万行表格

**业务背景**：运营后台的订单表在筛选后仍可能返回上万行，用户需要一边横向核对字段一边纵向翻页。翻到表格中部时表头与首列已经离开视野，用户记不住列名和订单号。规模量级的测量方法：在浏览器 Performance 面板录制一次从顶翻到底的滚动，记录帧数与 Layout 次数。

**怎么用本页知识解决**：先确定参照物。滚动容器声明 position: relative 成为包含块，表头与冻结列交给 sticky，吸附边界由最近的滚动容器决定，不写 scroll 监听。列宽拖拽时的指示线用 absolute，基准就是这个容器。

```css
.table-scroll {                /* 滚动容器：同时是定位参照物 */
  position: relative;          /* 建立包含块，覆盖层相对它偏移 */
  overflow: auto;              /* 横向与纵向都在容器内滚动 */
  max-height: 60vh;            /* 把滚动范围限制在容器内 */
}
.table-scroll thead th {       /* 吸顶表头 */
  position: sticky;            /* 吸附边界由最近滚动祖先决定 */
  top: 0;
  z-index: 2;                  /* 压住滚动上来的普通单元格 */
  background: #fff;            /* 不透明背景，遮住下方文字 */
}
.table-scroll .col-fixed {     /* 冻结首列 */
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
}
.table-scroll thead th.col-fixed { z-index: 3; } /* 交叉单元格再高一档 */
```

- `.table-scroll` 的 position: relative 是显式包含块，列宽指示线以它为准偏移。
- sticky 的吸附在滚动过程中完成，不执行 JS，滚动不产生额外任务。
- 表头层级高于冻结列，交叉单元格再高一档，避免被普通单元格盖住。
- 单元格背景必须不透明，否则滚动内容会从文字下方透出。
- 高度用 max-height 限制，让滚动发生在容器内而不是页面文档上。

**怎么度量收益**：DevTools Performance 录制同一次滚动，对比 Layout 次数与 Frames 轨道的掉帧位置。用 PerformanceObserver 监听 longtask 确认滚动期间没有长任务。用 Lighthouse 报告里的 CLS 检查表格加载阶段的位移。

**什么时候不该用**：需要横向虚拟化、只渲染可见列的表格，sticky 的列与虚拟占位列宽度会互相打架。需要跨分组 rowspan 合并单元格的表格，吸附位置与合并单元格的实际高度不一致，要在目标浏览器实测后再决定。

#### 场景 2：多人协作白板的光标与批注

**业务背景**：白板要显示其他协作者的光标、选区框和批注气泡，房间里的人数会从几人涨到几十人。用户缩放和平移画布时，光标必须与内容一起移动，不能出现漂移。测量方法：用 requestAnimationFrame 记录相邻两帧的时间间隔，统计超过 16.7ms 的帧数占比。

**怎么用本页知识解决**：白板容器建立包含块，光标用 absolute 相对它定位。缩放与平移只写在容器的 transform 上，光标只用 transform: translate 更新坐标，避免改动 left 与 top 触发重排。

```css
.board {                         /* 画布容器：缩放与平移的唯一来源 */
  position: relative;            /* 建立包含块，光标相对它定位 */
  transform: translate(var(--pan-x), var(--pan-y)) scale(var(--zoom));
  transform-origin: 0 0;         /* 固定原点，坐标换算只做一步乘除 */
}
.cursor {                        /* 协作者光标 */
  position: absolute;            /* 相对 .board 的 padding box 偏移 */
  left: 0;
  top: 0;
  transform: translate(var(--x), var(--y)); /* 只改合成属性 */
  will-change: transform;        /* 让浏览器提前提升为合成层 */
}
.cursor__label {                 /* 光标旁的名字气泡 */
  position: absolute;            /* 包含块是 .cursor，跟随光标移动 */
  left: 12px;
  top: 12px;
}
```

- 世界坐标只存一份，写入 --x 与 --y 前先减去平移量再除以缩放系数。
- 位置更新走 transform，改 left 与 top 会让该元素参与布局与重绘。
- transform-origin 设为 0 0，平移与缩放的换算不需要额外补偿。
- `.cursor__label` 的包含块是光标自身，气泡不需要单独计算位置。
- 协作者离开房间时要移除或隐藏节点，复用节点前重置自定义属性。

**怎么度量收益**：在光标密集的房间用 rAF 采样帧间隔，记录超时帧比例。用 DevTools Performance 的 Frames 轨道与 Rendering 面板的 Paint Flashing 观察重绘范围。用 PerformanceObserver 的 longtask 观察输入是否被长任务阻塞。

**什么时候不该用**：光标要显示在白板容器之外的固定工具条上时，absolute 会跟随容器缩放，应改用 fixed 并确认祖先没有 transform。需要把批注导出成静态图片时，绝对定位的 DOM 不会进入 Canvas 导出结果，要在导出路径里单独绘制。

#### 场景 3：低端安卓首屏的引导气泡

**业务背景**：首屏在字体加载与图片撑开后会改变卡片高度，写死像素坐标的气泡会指错位置。低端安卓机的首屏脚本执行窗口有限，定位逻辑要做的事越少越好。测量方法：在目标机型上跑 Lighthouse 移动端报告，记录 CLS 与 TBT。

**怎么用本页知识解决**：把气泡放进锚点卡片的子树里，让卡片自己建立包含块。气泡用 top: 100% 这类相对偏移跟随卡片，卡片变高时浏览器重新解析百分比，不需要 JS 读坐标。开关只用 class 切换 display，不写内联样式。

```css
.card {                          /* 锚点卡片：建立包含块 */
  position: relative;
}
.menu {                          /* 气泡：包含块是 .card */
  position: absolute;            /* 相对卡片偏移，不相对视口 */
  top: 100%;                     /* 紧贴卡片下沿，不写死像素 */
  right: 0;                      /* 对齐右边缘，避免量算宽度 */
  display: none;
}
.card.open .menu {
  display: block;                /* 用 class 开关，不读坐标 */
}
```

- 气泡的包含块是卡片，字体或图片让卡片变高后百分比会重新解析。
- 用 right: 0 对齐右边缘，比用 left 加宽度计算稳定。
- 开关走 class 与 display，避免 getBoundingClientRect 加内联样式的往返。
- 气泡被祖先 overflow: hidden 裁剪时，需要把它提到 body 下或改成 fixed。
- 祖先带 transform 时 fixed 的包含块会变成该祖先，检查后再决定定位方式。

**怎么度量收益**：看 Lighthouse 移动端报告的 CLS 与 TBT 两项。用 DevTools Performance 录制首屏，统计 Layout 与 Recalculate Style 的耗时。用 PerformanceObserver 的 layout-shift 条目累计位移分数。

**什么时候不该用**：需要覆盖整个视口的模态蒙层，absolute 会被祖先的 overflow 裁剪，应挂到 body 下用 fixed。锚点位于虚拟列表的可复用节点中时，节点回收后气泡会跟着复用到别的行，应把气泡移到列表容器外。

### 行业先进实践

**用 sticky 替代滚动监听实现吸附（出处：MDN Web Docs 的 position 页面）**。sticky 的吸附边界由最近的滚动容器决定，滚动期间不需要执行 JS。把手写的 scroll 监听换成 sticky 后，滚动不再产生脚本任务。借鉴时先检查祖先链上有没有 overflow: hidden 与 transform。

**用 contain 限制布局影响范围（出处：MDN Web Docs 的 contain 页面）**。contain: layout 让元素成为后代的包含块，contain: paint 会裁剪溢出内容。把这两个值加在长列表项上，子元素的绝对定位偏移被限制在项内，跨项重排减少。借鉴前先确认项内确实没有需要溢出到项外的弹层。

**弹层挂到 body 的 Portal（出处：React 官方文档的 createPortal）**。createPortal 把弹层渲染到 body 下，绕开父级的 overflow: hidden 与层叠上下文。只在需要脱离裁剪时使用；留在原地的弹层滥用 Portal 后，坐标换算和事件冒泡的复杂度会上升。

**用 middleware 计算浮层位置（出处：开源项目 Floating UI 文档）**。Floating UI 通过 middleware 处理偏移、翻转与边界，并监听锚点与浮层的尺寸变化。借鉴做法是把重算时机交给这类库，同时核对它的定位策略与项目的包含块结构一致。

**用 z-index 令牌约束分层（出处：Bootstrap 官方文档的 z-index 章节）**。Bootstrap 用 $zindex-dropdown、$zindex-sticky、$zindex-fixed、$zindex-modal 等变量给出统一刻度。借鉴做法是把刻度写成项目的 CSS 自定义属性或 SCSS 变量，禁止在业务代码里直接写 9999。

### 从学到用：落地路线

1. **试点**：先在一个高频列表页上改造，把滚动容器显式声明为包含块，把吸顶表头换成 sticky。验收标准：该页面滚动录制的 Layout 次数不高于改造前，且没有新增裸 z-index 数字。
2. **验证**：在目标浏览器与目标机型上分别录制 Performance，并把改造前后的指标写成对照表。验收标准：两次录制都有文件留存，指标差异可复现，浏览器之间的差异有书面说明。
3. **推广**：把包含块声明规则与 z-index 刻度写进样式规范，抽成公共类与自定义属性。验收标准：新提交的样式里，绝对定位元素都有明确的包含块声明，评审清单包含对应检查项。
4. **防回退**：在 CI 加入样式检查与关键页面的视觉回归测试。验收标准：stylelint 的声明值限制规则能拦住裸 z-index；视觉回归在定位错位时失败并给出截图差异。

### 动手作业

**目标**：做一个 600 行的订单表，包含吸顶表头、冻结首列和一个跟随行的下拉气泡，用一次改造验证包含块规则。

**步骤**

1. 用脚本生成 600 行 5 列的订单数据，放进固定高度的滚动容器。
2. 给滚动容器加 position: relative，把它声明为包含块。
3. 用 sticky 实现吸顶表头与冻结首列，交叉单元格单独提高层级。
4. 在中间某行加"更多"按钮与下拉气泡，气泡相对该行卡片偏移。
5. 用 DevTools Performance 录制一次从顶到底的滚动，记录 Layout 次数与帧率。
6. 把气泡改成挂到 body 下的 fixed 版本，再录一次，记录两次差异。
7. 在代码注释里写清气泡被祖先 overflow: hidden 裁剪的现象与修法。

**验收标准**

1. 滚动到底部时表头仍在容器顶部，首列仍贴左，文字与相邻单元格不重叠。
2. 交叉单元格始终压住滚动上来的普通单元格，用录屏或截图确认。
3. 两次 Performance 录制都有文件或截图，Layout 次数可逐项对比。
4. 把窗口宽度缩到原来的一半，气泡仍与按钮对齐。
5. 样式文件里的 z-index 全部取自同一组 CSS 自定义属性，没有裸数字。

