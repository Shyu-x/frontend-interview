---
title: HTML 与 CSS 资料
description: HTML、CSS 规范、文档、课程与实战练习，附每条资料的具体学习方式
---

# HTML 与 CSS 资料

先用 MDN 建立查证习惯，再用 web.dev 课程系统学习；遇到行为争议时回到规范原文。

所有链接均已用 curl 检查可访问。语言标签为资料正文语言；难度：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 基础与权威文档

!!! tip "这一组怎么学"
    1. 第 1 天：通读 MDN「Web 入门」中的结构化内容与样式基础两章，边读边在本地写一个单页。
    2. 第 2 至 3 天：按 web.dev Learn HTML、Learn CSS 的顺序各过一遍，每章结束写一个小 demo。
    3. 之后把 MDN 元素表与 CSS 参考当作查证工具，不要通读。预计总时间 15 至 20 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN HTML 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTML) | 官方文档 | 中文 | 入门 | 遇到不确定的元素或属性时先查此页的兼容性表，再决定是否使用。 |
| [MDN CSS 文档](https://developer.mozilla.org/zh-CN/docs/Web/CSS) | 官方文档 | 中文 | 入门 | 按「选择器、盒模型、布局」三个模块各读一篇概述，再用参考页查属性。 |
| [MDN 学习区：Web 入门](https://developer.mozilla.org/zh-CN/docs/Learn_web_development) | 教程 | 中文 | 入门 | 按模块顺序学习，每个模块末尾的评估练习必须自己独立完成。 |
| [MDN 结构化内容（中文）](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content) | 教程 | 中文 | 入门 | 学完后用语义化元素重写一份只用 div 的页面，对比文档结构。 |
| [MDN 样式基础](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics) | 教程 | English | 入门 | 按顺序做完盒模型、选择器、文本样式的示例，再给自己的页面加样式。 |
| [MDN CSS 布局入门](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout) | 教程 | English | 入门 | 依次用 Flexbox、Grid、浮动、定位各实现一次三栏页面，比较差异。 |
| [MDN HTML 元素参考](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) | 官方文档 | English | 入门 | 按分类浏览一遍，记下语义元素与它们对应的 ARIA 角色。 |
| [MDN HTML 内容分类](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories) | 官方文档 | English | 进阶 | 理解 flow、phrasing 等内容模型，解释为何 p 内不能放 div。 |
| [web.dev Learn HTML](https://web.dev/learn/html) | 教程 | English | 入门 | 按章节顺序读，每章后在 CodePen 重做示例并加上可访问性检查。 |
| [web.dev Learn CSS](https://web.dev/learn/css) | 教程 | English | 进阶 | 先读层叠与继承、盒模型，再读布局章节，每章写出一个能复现的最小例子。 |
| [web.dev Learn CSS：盒模型](https://web.dev/learn/css/box-model) | 教程 | English | 入门 | 用 DevTools 审查任意元素，对照本章验证 content、padding、border、margin。 |
| [web.dev Learn CSS：Grid](https://web.dev/learn/css/grid) | 教程 | English | 进阶 | 照章节示例实现 12 栏网格，再用 grid-template-areas 重写一遍。 |
| [web.dev Learn Responsive Design](https://web.dev/learn/design) | 教程 | English | 进阶 | 学完后把一个固定宽度页面改成响应式，并记录每个断点的取舍。 |
| [web.dev Learn Images](https://web.dev/learn/images) | 教程 | English | 进阶 | 学习 srcset、sizes 与 picture，用 Network 面板验证不同视口下实际下载的图片。 |
| [web.dev Learn Forms](https://web.dev/learn/forms) | 教程 | English | 进阶 | 先读原生校验与 autocomplete，再实现一个不依赖 JS 的注册表单。 |
| [web.dev Baseline](https://web.dev/baseline) | 官方文档 | English | 进阶 | 了解 Baseline 状态含义，选用新特性前先查它是否达到 Widely available。 |
| [Can I use](https://caniuse.com/) | 工具 | English | 入门 | 每次使用新属性前查询并记录目标浏览器的支持情况。 |
| [Chrome for Developers：CSS 与 UI](https://developer.chrome.com/docs/css-ui) | 官方文档 | English | 进阶 | 每月浏览一次新特性文章，挑一个特性在 demo 中试用。 |

## 布局、层叠与现代 CSS

!!! tip "这一组怎么学"
    1. 先读 MDN Flexbox 与 Grid 基本概念各一篇，再玩 Flexbox Froggy 与 Grid Garden（约 2 小时）。
    2. 读 Josh Comeau 的布局算法文章，建立「布局由算法决定」的认识。
    3. 最后补层叠、层叠上下文、容器查询、嵌套、@layer 等现代特性，每个特性写一个 demo。预计 10 至 15 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [CSS-Tricks Flexbox 完全指南](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) | 教程 | English | 入门 | 对着图逐个属性在浏览器里改值，观察主轴与交叉轴变化。 |
| [CSS-Tricks Grid 完全指南](https://css-tricks.com/snippets/css/complete-guide-grid/) | 教程 | English | 入门 | 把它当速查表，先自己写布局，卡住时再查对应属性。 |
| [CSS-Tricks Almanac](https://css-tricks.com/almanac/) | 官方文档 | English | 入门 | 查属性时配合示例阅读，与 MDN 交叉验证取值。 |
| [Flexbox Froggy](https://flexboxfroggy.com/#zh-cn) | 工具 | 中文 | 入门 | 完成全部关卡后，不看提示在空白页重做前 10 关。 |
| [CSS Grid Garden](https://cssgridgarden.com/#zh-cn) | 工具 | 中文 | 入门 | 完成全部关卡，再用 grid-template-areas 把同一布局重写。 |
| [MDN Flexbox 基本概念（中文）](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox) | 官方文档 | 中文 | 入门 | 读完后解释 flex-grow、flex-shrink、flex-basis 三者如何分配剩余空间。 |
| [MDN Grid 布局（中文）](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout) | 官方文档 | 中文 | 入门 | 阅读基本概念与网格线定位两篇，实现一个带跨行跨列的相册布局。 |
| [MDN Grid 布局（English）](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) | 官方文档 | English | 进阶 | 阅读子网格、masonry 等较新指南，了解中文页面尚未覆盖的内容。 |
| [MDN Flexbox 模块](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout) | 官方文档 | English | 入门 | 阅读「对齐」「控制子项比例」等指南，再做一个导航栏。 |
| [MDN 层叠与继承](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade) | 官方文档 | English | 进阶 | 阅读层叠、继承、初始值三篇，解释一个样式冲突案例由哪条规则胜出。 |
| [MDN 特异性](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) | 官方文档 | English | 入门 | 手算十个选择器的权重，再用 DevTools 验证结果。 |
| [MDN 层叠上下文](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context) | 官方文档 | English | 进阶 | 复现 z-index 不生效的案例，找出创建新层叠上下文的属性。 |
| [MDN 盒模型简介](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model) | 官方文档 | English | 入门 | 切换 box-sizing 并测量尺寸，写下两种取值下宽度的计算公式。 |
| [MDN 选择器模块](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) | 官方文档 | English | 入门 | 练习 :is、:where、:has 与属性选择器，各写三个实际用例。 |
| [MDN 容器查询](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) | 官方文档 | English | 进阶 | 把一个卡片组件改成容器查询驱动，放进不同宽度的容器验证。 |
| [MDN CSS 嵌套](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) | 官方文档 | English | 进阶 | 将一份现有 CSS 改写为原生嵌套，留意与预处理器的语义差别。 |
| [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) | 官方文档 | English | 进阶 | 用层把重置样式、组件样式、工具类分层，验证顺序优先于特异性。 |
| [MDN CSS 自定义属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) | 官方文档 | English | 入门 | 用 var() 与回退值实现一套亮暗主题，并在 JS 中读写变量。 |
| [MDN 逻辑属性](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) | 官方文档 | English | 进阶 | 把 margin-left 等改成逻辑属性，再切换 dir 为 rtl 观察效果。 |
| [MDN 媒体查询](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) | 官方文档 | English | 入门 | 练习 prefers-color-scheme 与 prefers-reduced-motion 两个用户偏好查询。 |
| [MDN CSS 过渡](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions) | 官方文档 | English | 入门 | 给按钮做 hover 过渡，并用 Performance 面板确认只触发合成。 |
| [MDN CSS 动画](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations) | 官方文档 | English | 入门 | 用 @keyframes 写一个加载动画，并支持 prefers-reduced-motion。 |
| [MDN 滚动捕捉](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap) | 官方文档 | English | 进阶 | 用纯 CSS 实现横向轮播，不引入任何 JS。 |
| [web.dev 渲染性能](https://web.dev/articles/rendering-performance) | 教程 | English | 进阶 | 读完后在 Performance 面板找出一次强制同步布局并修复。 |
| [Josh Comeau：理解布局算法](https://www.joshwcomeau.com/css/understanding-layout-algorithms/) | 教程 | English | 进阶 | 读文并用其中的心智模型解释一个你曾经写错的布局。 |
| [Josh Comeau：交互式 Flexbox 指南](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/) | 教程 | English | 进阶 | 边读边操作页内交互组件，读完用自己的话复述 flex 的尺寸算法。 |
| [Josh Comeau：交互式 Grid 指南](https://www.joshwcomeau.com/css/interactive-guide-to-grid/) | 教程 | English | 进阶 | 完成页内交互后，用 Grid 重做一个 Flexbox 难以实现的布局。 |
| [Josh Comeau：自定义 CSS Reset](https://www.joshwcomeau.com/css/custom-css-reset/) | 教程 | English | 进阶 | 逐条理解每条重置规则的原因，再裁剪成适合自己项目的版本。 |
| [CSS for JavaScript Developers](https://courses.joshwcomeau.com/css-for-js) | 视频 | English | 进阶 | 付费课程；先看免费试看章节，判断是否适合自己的基础再决定是否购买。 |
| [Every Layout](https://every-layout.dev/) | 书 | English | 进阶 | 每次读一个布局原语，如 Stack、Sidebar，在 CodePen 中复现并组合。 |
| [Modern CSS Solutions](https://moderncss.dev/) | 教程 | English | 进阶 | 选一个你项目里仍在用旧写法的场景，用文中方案替换。 |
| [CSSLayout.io](https://csslayout.io/) | 工具 | English | 入门 | 浏览常见布局与组件模式，挑三个自己动手实现后再对照答案。 |
| [Ahmad Shadeed 博客](https://ishadeed.com/) | 教程 | English | 进阶 | 先读其中的布局与容器查询系列，每篇动手复刻示例。 |
| [Piccalilli](https://piccalil.li/) | 教程 | English | 进阶 | 阅读其 CSS 文章与 CUBE CSS 方法论，将其中一种组织方式用到小项目。 |
| [CUBE CSS](https://cube.fyi/) | 教程 | English | 进阶 | 通读后用 Composition、Utility、Block、Exception 重组一个页面的样式。 |
| [Open Props](https://open-props.style/) | 工具 | English | 进阶 | 阅读其设计令牌命名，再自己定义一套颜色与间距自定义属性。 |
| [Kevin Powell 官网](https://kevinpowell.co/) | 视频 | English | 入门 | 按其课程目录挑与你薄弱点对应的短视频，看完立刻手写。 |
| [Kevin Powell YouTube 频道](https://www.youtube.com/@KevinPowell) | 视频 | English | 入门 | 以 1 倍速看完一个主题视频，暂停后自己复现再继续。 |
| [Smashing Magazine CSS 专栏](https://www.smashingmagazine.com/category/css) | 教程 | English | 进阶 | 挑与当前项目相关的长文，记录文中提出的权衡与适用条件。 |
| [Frontend Masters CSS 学习路径](https://frontendmasters.com/learn/css/) | 视频 | English | 进阶 | 付费为主；先浏览路径大纲，补齐自己知识图谱中的缺口。 |

## 可访问性与语义

!!! tip "这一组怎么学"
    1. 先读 W3C 可访问性原则与 WCAG 速查，了解四大原则与常见成功标准。
    2. 再学 web.dev Learn Accessibility，并用键盘与屏幕阅读器实际操作自己的页面。
    3. 做组件时查 ARIA Authoring Practices 的模式。预计 8 至 12 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [MDN 可访问性](https://developer.mozilla.org/en-US/docs/Web/Accessibility) | 官方文档 | English | 入门 | 先读概述与 ARIA 指南，再用键盘走一遍自己的页面。 |
| [web.dev Learn Accessibility](https://web.dev/learn/accessibility) | 教程 | English | 入门 | 按章节学习，用浏览器可访问性树面板验证每个示例。 |
| [W3C 可访问性原则](https://www.w3.org/WAI/fundamentals/accessibility-principles/) | 规范 | English | 入门 | 读完后用自己的话列出可感知、可操作、可理解、健壮四项含义。 |
| [WCAG 2.2 速查](https://www.w3.org/WAI/WCAG22/quickref/) | 规范 | English | 进阶 | 筛选 A 与 AA 级标准，对一个页面逐条做自查清单。 |
| [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | 规范 | English | 进阶 | 选一个模式如对话框或标签页，按其键盘交互表实现并测试。 |
| [The A11Y Project](https://www.a11yproject.com/) | 教程 | English | 入门 | 使用其检查清单审查一个已有页面，修复发现的三个问题。 |
| [W3C Markup Validator](https://validator.w3.org/) | 工具 | English | 入门 | 将自己的页面提交校验，解释每条错误的成因后再修复。 |

## 规范与标准

!!! tip "这一组怎么学"
    规范用于查证而不是通读。先学会看目录与索引，再针对一个具体问题（如解析规则、特异性计算）读对应小节；每次读 20 至 30 分钟，并尝试用 DevTools 验证结论。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | 规范 | English | 深入 | 从目录定位章节，先读元素定义的内容模型与属性表，再看算法部分。 |
| [HTML 规范：语义](https://html.spec.whatwg.org/multipage/semantics.html) | 规范 | English | 深入 | 挑 section、article、nav 三个元素阅读定义，对比 MDN 描述。 |
| [HTML 规范：解析](https://html.spec.whatwg.org/multipage/parsing.html) | 规范 | English | 深入 | 阅读分词与树构建概述，解释为何不闭合的标签仍能渲染。 |
| [W3C CSS 规范总览](https://www.w3.org/Style/CSS/specs.en.html) | 规范 | English | 深入 | 把它当索引，按成熟度查看某个模块当前处于哪个阶段。 |
| [CSS Working Group 规范草案](https://drafts.csswg.org/) | 规范 | English | 深入 | 查看你关心的新特性草案，关注 Issues 与示例区了解设计取舍。 |
| [CSS 值与单位（CSS Values）](https://www.w3.org/TR/css-values-4/) | 规范 | English | 深入 | 查阅长度单位定义，对照 DevTools 解释 rem、dvh 的取值来源。 |
| [CSS 2 规范](https://www.w3.org/TR/CSS2/) | 规范 | English | 深入 | 阅读视觉格式化模型章节，理解块格式化上下文与外边距折叠。 |
| [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/) | 规范 | English | 深入 | 阅读层叠排序一节，复述来源、层、特异性、顺序的比较顺序。 |
| [Selectors Level 4](https://www.w3.org/TR/selectors-4/) | 规范 | English | 深入 | 阅读 :is、:where、:has 的定义与特异性规则。 |
| [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/) | 规范 | English | 深入 | 阅读轨道尺寸算法概述，解释 fr 与 auto 的区别。 |
| [CSS Flexible Box Layout Level 1](https://www.w3.org/TR/css-flexbox-1/) | 规范 | English | 深入 | 阅读弹性长度解析一节，手算一个 flex-shrink 例子。 |
| [CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/) | 规范 | English | 深入 | 阅读容器查询相关定义，理解 container-type 带来的限制。 |

## 练习与中文资料

!!! tip "这一组怎么学"
    每周做 3 至 5 个 CSSBattle 或 CSS Diner 题目巩固选择器与细节；中文文章用于快速建立布局直觉，读完后用英文文档核对术语。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [CSS Diner](https://flukeout.github.io/) | 工具 | English | 入门 | 完成全部关卡，再不看提示重做后半部分。 |
| [CSSBattle](https://cssbattle.dev/) | 工具 | English | 进阶 | 每周完成三道题，先求还原再压缩代码，复盘他人高分解法。 |
| [阮一峰：Flex 布局语法篇](https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html) | 教程 | 中文 | 入门 | 对照文中 6 个容器属性与 6 个项目属性各写一个示例。 |
| [阮一峰：CSS Grid 网格布局教程](https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html) | 教程 | 中文 | 入门 | 跟着示例实现，再用 MDN 补充文中未覆盖的属性。 |
| [阮一峰：CSS 五种一行布局](https://www.ruanyifeng.com/blog/2020/08/five-css-layouts-in-one-line.html) | 教程 | 中文 | 入门 | 逐个复现五种布局，说明每种写法的适用场景。 |
