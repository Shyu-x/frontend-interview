---
title: HTML 概览
description: HTML 面试知识地图：语义化、脚本与资源加载、DOM、表单、嵌入与媒体、SEO 与无障碍。
---

# HTML 概览

本目录按主题整理 HTML 面试与工程实践知识，覆盖 HTML5 新特性、语义化与无障碍、meta 与 viewport、script 与资源加载、DOM/BOM、表单、iframe 与多媒体、SEO。每页聚焦一组相关概念，可单独复习。

## 1. 学习路径

1. [HTML5 新特性](html5-new-features.md)
2. [语义化与无障碍](semantic-and-accessibility.md)
3. [meta 与 viewport](meta-and-viewport.md)
4. [脚本加载与阻塞](script-loading.md)
5. [资源提示与首屏优化](resource-hints-and-first-screen.md)
6. [DOM 与 BOM](dom-vs-bom.md)
7. [innerHTML 与 textContent](inner-html-text-content.md)
8. [集合与 document.write](dom-collections-and-document-write.md)
9. [data-* 属性](data-attributes.md)
10. [可编辑与拖拽](contenteditable-and-drag.md)
11. [Web Components](web-components.md)
12. [表单提交](form-submission.md)
13. [label 与 input 状态](label-and-input-states.md)
14. [Canvas、SVG 与多媒体](media-canvas-svg.md)
15. [iframe](iframe.md)
16. [SEO 与 Web Vitals](seo-and-web-vitals.md)
17. [HTML/XML/JSON](xhtml-html-xml-json.md)
18. [默认样式重置](default-styles-reset.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
|------|----------|------|
| [HTML5 新特性](html5-new-features.md) | HTML5 新增标签与各类 Web API 的定位与用法 | 基础 |
| [语义化与无障碍](semantic-and-accessibility.md) | 语义化标签的选择、ARIA 与屏幕阅读器 | 基础 |
| [meta 与 viewport](meta-and-viewport.md) | head 中 meta 配置与移动端视口、DPR、1px 边框 | 基础 |
| [HTML/XML/JSON](xhtml-html-xml-json.md) | 四种格式的语法差异与转换 | 基础 |
| [默认样式重置](default-styles-reset.md) | normalize / reset / sanitize 的区别与选型 | 基础 |
| [脚本加载与阻塞](script-loading.md) | src/href 阻塞差异、async/defer/module 执行时序 | 进阶 |
| [资源提示与首屏优化](resource-hints-and-first-screen.md) | preload/prefetch/preconnect 选用与首屏 HTML 优化 | 进阶 |
| [SEO 与 Web Vitals](seo-and-web-vitals.md) | LCP/INP/CLS、SEO meta 与渲染策略 | 进阶 |
| [DOM 与 BOM](dom-vs-bom.md) | DOM 与 BOM 的分工及常用对象 API | 基础 |
| [innerHTML 与 textContent](inner-html-text-content.md) | 三种文本属性的差异、XSS 防护 | 基础 |
| [集合与 document.write](dom-collections-and-document-write.md) | live 与 static 集合、document.write 的坑 | 进阶 |
| [data-* 属性](data-attributes.md) | dataset 读写、类型转换与框架用法 | 基础 |
| [Web Components](web-components.md) | Custom Elements、Shadow DOM 与 Slot | 高级 |
| [可编辑与拖拽](contenteditable-and-drag.md) | 可编辑区域、Selection 与拖拽 API | 进阶 |
| [表单提交](form-submission.md) | 表单编码、上传、FormData 与校验 | 进阶 |
| [label 与 input 状态](label-and-input-states.md) | label 关联与 disabled/readonly/autocomplete | 基础 |
| [iframe](iframe.md) | sandbox、postMessage、加载与性能优化 | 高级 |
| [Canvas、SVG 与多媒体](media-canvas-svg.md) | Canvas 与 SVG 选型、picture/audio/video | 进阶 |

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | 权威标准，元素与属性的最终依据。 | 从目录定位章节，先读元素的内容模型与属性表，遇争议再查对应算法。 |
| [HTML: HyperText Markup Language](https://developer.mozilla.org/en-US/docs/Web/HTML) | MDN 的 HTML 总入口，概览式起点。 | 先读导语看知识结构，再沿元素、属性、教程三条线规划学习顺序。 |
| [MDN HTML 元素参考](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) | 按分类浏览元素，快速建立语义地图。 | 逐类扫读元素名，记下不熟的语义元素，回头查其对应 ARIA 角色。 |
| [MDN HTML 内容分类](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories) | 讲清内容模型，解释嵌套为何有规则。 | 重点读 flow、phrasing、interactive 三节，用它解释 p 里不能放 div。 |
| [HTML 规范：语义](https://html.spec.whatwg.org/multipage/semantics.html) | 用规范定义辨析语义元素的边界。 | 对比 section、article、nav 在规范与 MDN 的表述差异，写下选用准则。 |
| [HTML 规范：解析](https://html.spec.whatwg.org/multipage/parsing.html) | 揭示解析器如何容错，理解标签闭合。 | 读分词与树构建概述，带着“不闭合为何仍能渲染”的问题画一次流程。 |
| [HTML cheatsheet for syntax and common tasks](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Cheatsheet) | 一页速查常见语法与任务写法。 | 当作练习前的对照表，写完示例回来核对自己的写法是否规范。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Playground](https://developer.mozilla.org/en-US/play) | 即改即看，验证元素与属性的真实行为。 | 把教程示例粘进来改属性观察变化，遇到疑惑先在此做最小验证。 |
| [Using HTML form validation and the Constraint Validation API](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation) | 表单校验的完整可运行示例。 | 照示例写一个表单，逐条删掉校验属性，观察浏览器行为如何变化。 |
| [Use data attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) | 数据属性示例，连接 HTML 与脚本。 | 按示例写一遍，再思考何时该用 data-* 而非自造属性。 |
| [Using responsive images in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images) | 响应式图片示例，覆盖多属性协作。 | 读 srcset 与 sizes 示例，动手改尺寸，观察浏览器实际选图结果。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [web.dev Learn HTML](https://web.dev/learn/html) | 成体系的 HTML 入门课程，循序渐进。 | 按章节顺序读，每章后在 CodePen 重做示例并补一次无障碍检查。 |
| [HTML guides](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides) | MDN 指南合集，可按主题补足细节。 | 挑表单、语义、图片三篇精读，用来补齐主线教程中的薄弱环节。 |

