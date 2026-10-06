---
title: CSS 概览
description: CSS 面试知识的学习路径与页面总览：盒模型、布局、动效性能与工程化。
tags:
  - css
---

# CSS 概览

本目录覆盖前端面试中的 CSS 知识：从盒模型、选择器、单位等基础概念，到 BFC、定位、Flex、Grid 等布局机制，再到动画与渲染性能，最后是 CSS Modules、CSS-in-JS、预处理器等工程化话题。每个页面先给出系统讲解（定义、原理图、代码示例、误区），再给出对应的面试题精讲。

## 1. 学习路径

1. [盒模型与长度单位](box-model-and-units.md)
2. [选择器与优先级](selectors-specificity.md)
3. [浮动与清除浮动](float.md)
4. [Flex 布局](flexbox.md)
5. [响应式布局](responsive-layout.md)
6. [BFC 与 margin 塌陷](bfc-margin-collapse.md)
7. [格式化上下文 IFC / GFC / FFC](formatting-contexts.md)
8. [position 与层叠上下文](position-stacking.md)
9. [Grid 布局](grid.md)
10. [居中与多栏布局](centering-and-column-layouts.md)
11. [transition 与 animation](transition-animation.md)
12. [回流、重绘与渲染性能](rendering-performance.md)
13. [常用 CSS 技巧与暗黑模式](practical-techniques.md)
14. [CSS 工程化架构](css-architecture.md)
15. [CSS 预处理与构建工具链](css-toolchain.md)
16. [题目索引](question-index.md)

## 2. 页面总览

| 页面 | 你会学到 | 难度 |
|------|----------|------|
| [盒模型与长度单位](box-model-and-units.md) | 两种盒模型与 box-sizing；rem/em/px/vw/vh/vmin/vmax 的区别；px 为什么不是绝对单位 | 基础 |
| [选择器与优先级](selectors-specificity.md) | 优先级计算规则与陷阱；!important 为何不推荐；级联层 @layer；nth-child 与 nth-of-type、::before 与 :before | 基础 |
| [浮动与清除浮动](float.md) | 浮动的行为规则；clearfix；overflow:hidden 清除浮动；float vs flex | 基础 |
| [Flex 布局](flexbox.md) | 主轴/交叉轴；容器与项目属性；flex:1 展开；常见布局实战 | 基础 |
| [响应式布局](responsive-layout.md) | 媒体查询；Mobile-First vs Desktop-First；常用断点；Container Queries | 基础 |
| [BFC 与 margin 塌陷](bfc-margin-collapse.md) | margin 塌陷三条规则；BFC 创建条件；BFC 清除浮动、防止塌陷、自适应两栏；flow-root | 进阶 |
| [格式化上下文 IFC / GFC / FFC](formatting-contexts.md) | 四种格式化上下文（BFC/IFC/GFC/FFC）的差异与适用场景 | 进阶 |
| [position 与层叠上下文](position-stacking.md) | 各 position 取值的定位参照；包含块规则；fixed 失效原因；层叠上下文如何创建与比较 | 进阶 |
| [Grid 布局](grid.md) | 轨道与单位；auto-fill/auto-fit；容器属性；Grid vs Flex | 进阶 |
| [居中与多栏布局](centering-and-column-layouts.md) | line-height 居中原理；水平/垂直居中方案；双栏/三栏；圣杯 vs 双飞翼 | 进阶 |
| [transition 与 animation](transition-animation.md) | transition 与 @keyframes 用法；动画性能差的原因；transform 为何更快 | 进阶 |
| [回流、重绘与渲染性能](rendering-performance.md) | 渲染流水线；减少回流；GPU 加速与 will-change；opacity/visibility/display；CSS 阻塞渲染与性能优化 | 高级 |
| [常用 CSS 技巧与暗黑模式](practical-techniques.md) | 多行文本省略；0.5px 边框；三角形等图形；瀑布流；prefers-color-scheme 暗黑模式 | 进阶 |
| [CSS 工程化架构](css-architecture.md) | CSS Modules 与 scoped 原理；CSS-in-JS；原子化 CSS；CSS 难维护的原因与 BEM | 高级 |
| [CSS 预处理与构建工具链](css-toolchain.md) | PostCSS 与 Autoprefixer 原理；Sass vs Less；mixin；Houdini | 高级 |
| [题目索引](question-index.md) | 按原题目查找对应页面，便于考前回顾 | 基础 |

## 3. 参考资料

### 3.1 官方文档

- [MDN - CSS 盒模型](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Box_Model)
- [MDN - box-sizing](https://developer.mozilla.org/zh-CN/docs/Web/CSS/box-sizing)
- [MDN - BFC 块格式化上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Display)
- [MDN - z-index 与层叠上下文](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Positioning/Understanding_z_index)
- [MDN - CSS Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [MDN - CSS Grid](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout)
- [MDN - Media Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Media_Queries)
- [MDN - @keyframes](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@keyframes)
- [MDN - CSS animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_JavaScript_animation_performance)
- [Chrome Developers - Container Queries](https://developer.chrome.com/docs/css-container-queries/)

### 3.2 精选文章

- [腾讯云 - CSS 100道面试题](https://cloud.tencent.com/developer/article/2564400)
- [CSDN - CSS 专题之 BFC](https://blog.csdn.net/m0_56326830/article/details/147133068)
- [张鑫旭 - flow-root 详解](https://www.zhangxinxu.com/wordpress/?p=9404)
- [PHP中文网 - CSS @layer 级联层](https://www.php.cn/faq/490369.html)
- [CSDN - CSS @layer 级联层](https://blog.csdn.net/weixin_41455464/article/details/155615503)
- [W3Schools - Flexbox](https://www.w3schools.com/css/css3_flexbox.asp)
- [SegmentFault - CSS Grid auto-fill vs auto-fit](https://segmentfault.com/a/1190000040116599)
- [掘金 - CSS flex: 1 vs flex: auto](https://juejin.cn/)
- [腾讯云开发者社区 - CSS float 与 BFC](https://cloud.tencent.com/developer/article/2543541)
- [知乎 - CSS transition vs animation](https://zhuanlan.zhihu.com/p/688210155)

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN CSS 文档](https://developer.mozilla.org/zh-CN/docs/Web/CSS) | 最权威的 CSS 入门与参考，按模块概述可快速建立整体框架。 | 先读「选择器、盒模型、布局」三篇概述，再随机挑一个属性页精读并做笔记。 |
| [W3C CSS 规范总览](https://www.w3.org/Style/CSS/specs.en.html) | 规范总览可当索引，了解各模块成熟度与最新进展。 | 浏览模块列表，挑 Flexbox 或 Grid 查看所处阶段，再决定是否深入原文。 |
| [CSS guides](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides) | MDN 指南聚合页，按主题串起从基础到进阶的学习路线。 | 按目录挑 2-3 个尚未掌握的指南通读，读后写一段自己的总结。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS layout cookbook](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook) | 可直接套用的布局配方，附完整可运行代码，边改边学。 | 挑 Card 与 Media objects 两篇，把代码复制到本地改写尺寸和内容。 |
| [CSS Grid Garden](https://cssgridgarden.com/) | 游戏化练习 Grid，快速建立对轨道与网格区域的直觉。 | 通关全部关卡后，用 Grid 重写一个三栏页面并回到文档对照。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSS in Depth（Manning）](https://www.manning.com/books/css-in-depth-second-edition) | 系统讲解布局与层叠，适合从「会用」走向「理解原理」。 | 先读布局与层叠章节，每章写一个实验页面验证书中结论。 |
| [CSS for JavaScript Developers](https://css-for-js.dev/) | 专注补全 CSS 心智模型，解释为什么这样写而非只讲语法。 | 按模块学习并完成配套项目，重点看层叠、布局与响应式部分。 |
| [Kevin Powell](https://www.youtube.com/@KevinPowell) | 视频讲解直观，适合观察布局与响应式的实际操作过程。 | 每看一个视频就暂停复刻示例，再自行改一处参数看效果变化。 |
| [CSS Weekly](https://css-weekly.com/) | 每周精选 CSS 技巧与新特性，帮助保持对生态的敏感度。 | 每期挑一个技巧在 CodePen 复现，并记录它适用的真实场景。 |
| [CSS-Tricks](https://css-tricks.com/) | 文章与 Almanac 速查结合，实践中查漏补缺非常方便。 | 写样式时用 Almanac 查属性，再顺带读一篇相关深入文章。 |

