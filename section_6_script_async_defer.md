# Section 6: script async / defer 的区别

## 6.1 基本概念

默认情况下（无 async/defer），浏览器加载 `<script src="...">` 时：

1. 暂停 HTML 解析器（Parse）
2. 发起网络请求下载 JS
3. 下载完成后**立即执行**（Execute）
4. 恢复 HTML 解析

这称为**同步阻塞式加载**，会显著延迟首屏渲染（FCP, LCP）。

`async` 和 `defer` 是解决这一问题的两个布尔属性（可共存？不，可二选一）。

---

## 6.2 时序图：三种模式的完整对比

```
时间 ──► ─────────────────────────────────────────────────────────►

[1] 无属性 (sync)：
    HTML Parse:  ████████[    PAUSE: 下载 JS      ][恢复]
                              ████████████████
                              └──────┬──────────┘
                                     ▼
                              JS Execute: ████████
                                         ↑ 执行时页面"死机"

    DOMContentLoaded 触发于: JS 执行完毕后 ───────────────────► DCL
    首屏 FCP: 被延迟到 JS 执行完


[2] async 属性：
    HTML Parse:  ████████████████[继续]────────────────────────
                                     ████████████  ← JS 下载并行
                              └───┬──┘
                                  ▼
                              执行: ████         ← 下载完即执行
                                        ↑
                                    可能发生在解析完成前或后
                                    （顺序不确定！）

    DOMContentLoaded: 在 async 脚本执行后触发（不保证顺序）
    ⚠️ DOM 可能尚未完全构建，访问 DOM 需谨慎


[3] defer 属性：
    HTML Parse:  ██████████████████████████████████████
    （完整解析 HTML，不中断）────────────────────────────►
                                               ↓
                                    JS 下载（并行）: ████████████
                                               ↓
                              执行: ████████  ← DCL 之前，按顺序执行

    DOMContentLoaded 触发于: 所有 defer 脚本执行完毕之后
    保证顺序，保证 DOM 已就绪
```

### 关键时间点标记

```
                         DCL (DOMContentLoaded)
                              │
HTML ──┬──► parse ───► complete ──────────────────────►
        │                  │                          │
     遇到script         遇到async              defer执行窗口
        │                  │                     ↓ DCL
     同步下载+执行       下载完即执行
     (阻塞解析)          (不阻塞解析)
```

---

## 6.3 渲染阻塞（Render-Blocking）详解

### 默认（sync）脚本的渲染阻塞链

```
HTML Parser  ──► 遇到 <script src>  ──► PAUSE
                                             │
                    ┌─────────────────────────┤
                    ▼                         ▼
               网络下载 JS              下载期间：
               （可能 100-500ms+）       页面无响应，无法渲染
                    │
                    ▼
               执行 JS（可能修改 DOM/CSSOM）
                    │
                    ▼
              恢复 HTML 解析  ──► 渲染树  ──► 首屏绘制
```

### async 的渲染阻塞

```
HTML Parser  ──► 遇到 <script async>  ──► 继续解析（不 PAUSE）
                                             │
                                    JS 下载与解析并行
                                             │
                              JS 下载完成 ──► PAUSE（执行）
                                             │
                                        可能阻塞解析（取决于到达时间）
                                             │
                                        执行完继续解析或渲染
```

**async 的陷阱**：如果 JS 在解析完成前下载完毕，会再次暂停解析器来执行脚本，这仍是渲染阻塞。async 只保证"不等待下载"，不保证"不阻塞执行"。

### defer 的渲染阻塞

```
HTML Parser  ──► 遇到 <script defer>  ──► 继续解析（完全不阻塞）
                                             │
                                    JS 下载与解析并行
                                    解析完毕时：scripts 已下载但未执行
                                             │
                              HTML 解析完成 ──► DOMContentLoaded 之前
                                             │
                                    defer scripts 按顺序执行
                                             │
                                        执行完 → DCL 触发 → 渲染
```

**defer 是最理想的**：`async` 下载期间不阻塞，但**执行时**可能阻塞解析；`defer` 完全不阻塞解析，**执行时 DOM 已就绪**，且按顺序执行。

---

## 6.4 多个脚本的执行顺序

### 无属性（sync）— 按文档顺序，依次下载+执行

```html
<script src="a.js"></script>  <!-- 下载a，执行a，阻塞b的下载 -->
<script src="b.js"></script>  <!-- 等a执行完，才下载b，执行b -->
<script src="c.js"></script>  <!-- 等b执行完，才下载c，执行c -->
<!-- 100 + 200 + 150 = 450ms+ 阻塞 -->
```

### async — 顺序不保证（谁先下载完谁先执行）

```html
<script async src="a.js"></script>  <!-- 下载中，继续解析 -->
<script async src="b.js"></script>  <!-- 下载中，继续解析 -->
<script async src="c.js"></script>  <!-- 下载中，继续解析 -->
<!-- 假设网络顺序: b→c→a，执行顺序: b, c, a -->
<!-- 乱序执行！依赖关系必须避免！ -->
```

### defer — 按文档顺序执行（保证顺序）

```html
<script defer src="a.js"></script>  <!-- 下载并行，执行等待 -->
<script defer src="b.js"></script>  <!-- 下载并行，执行等待 -->
<script defer src="c.js"></script>  <!-- 下载并行，执行等待 -->
<!-- 下载顺序: 任意 → 执行顺序: a → b → c -->
<!-- ✅ 顺序有保证，适合有依赖关系的模块 -->
```

**defer 的执行时机**：所有 defer scripts 在 DOM 解析完成后、DOMContentLoaded 事件触发**之前**，按文档顺序执行。

---

## 6.5 现代打包 vs 原生 ESM 对比

### 传统打包（Bundle）

```html
<!-- 打包后：单个大 JS 文件，defer 全部 -->
<script defer src="bundle.js"></script>

<!-- 等同于：defer 按顺序加载，模拟打包的顺序执行 -->
```

### 原生 ESM（ES Modules）

```html
<!-- ESM 天然 defer 行为（延迟执行） -->
<script type="module" src="app.js"></script>

<!-- 特性对比： -->
<!-- 1. 默认 defer 行为（不阻塞解析） -->
<!-- 2. 自动 strict mode -->
<!-- 3. 模块级别作用域（不会污染全局） -->
<!-- 4. 静态依赖解析，按依赖顺序执行（类似 defer） -->
<!-- 5. CORS 要求（必须 same-origin 或有 CORS header） -->
```

```javascript
// app.js — ES Module 示例
import { helper } from './helper.js';    // 静态解析，按顺序
import { ui } from './ui.js';            // 在 helper.js 之后执行

export function bootstrap() {
  document.getElementById('app');       // DOM 已就绪（defer 语义）
}
```

### 打包 vs 原生 ESM 关键区别

| 特性 | 打包（Bundle + defer） | 原生 ESM |
|------|----------------------|---------|
| 执行顺序 | 按 bundle 入口顺序（defer） | 按 import 依赖顺序 |
| HTTP 请求数 | 1（大文件） | N（每个模块单独请求） |
| 渲染阻塞 | defer（无阻塞） | defer（无阻塞） |
| 缓存粒度 | 整体失效 | 模块级，可精细化缓存 |
| 依赖共享 | 打包后内联 | 按需加载，可能重复请求 |
| 生产环境 | 仍建议合并减少请求 | 可用 import maps / dynamic import |
| 供应商前缀 | 需配置（browserslist） | 自动按浏览器支持 |

---

## 6.6 何时使用哪个

### 使用 `defer` — 最佳默认选择

- 脚本**有顺序依赖**（a.js 依赖 b.js 的导出）
- 脚本需要**访问 DOM**（已保证解析完毕）
- 通用第三方库、分析脚本（不需要立即执行）

```html
<!-- ✅ 推荐：第三方库、框架、工具函数 -->
<script defer src="vendor.bundle.js"></script>
<script defer src="app.js"></script>
```

### 使用 `async` — 独立运行的脚本

- 脚本**完全独立**，不依赖 DOM 也不被其他脚本依赖
- 如：统计脚本、监控脚本、广告脚本、独立的 widget

```html
<!-- ✅ 推荐：独立脚本，不在乎执行时机 -->
<script async src="analytics.js"></script>
<!-- 加载完立即执行，不等 DOM，不保证顺序 -->
```

### 无属性（sync）— 不推荐，但有场景

- 脚本需要**在页面渲染前运行**（如 Modernizr 检测）
- 使用 `document.write()`（虽然这是糟糕的实践）
- 古老的不兼容 async/defer 的第三方标签

```html
<!-- ⚠️ 明确知道需要阻塞渲染的场景才用 -->
<script src="critical-init.js"></script>
<!-- 不推荐：除非有明确理由，否则用 defer -->
```

---

## 6.7 TypeScript / React 示例

### 在 React + Vite 项目中

```html
<!-- vite 生成的 index.html 默认用 defer -->
<!-- 无需手动加 defer，Vite 打包后的 script 自动 defer -->
<script type="module" src="/src/main.tsx"></script>
<!-- 等效于 defer，天然延迟执行 -->
```

### 动态加载（非阻塞）

```typescript
// 场景：用户点击才加载功能模块
// 不阻塞首屏，用户交互后按需加载
async function loadFeature(): Promise<void> {
  // 动态 import 返回一个 promise，模块下载是异步的
  const { FeatureModule } = await import('./features/FeatureModule.ts');

  const container = document.getElementById('feature-root');
  if (container) {
    const instance = new FeatureModule();
    instance.mount(container);
  }
}

// 按需加载，不影响首屏性能
document.getElementById('load-btn')?.addEventListener('click', loadFeature);
```

### 关键脚本预加载（preload + defer 配合）

```html
<!-- 关键 JS 预加载，但不阻塞解析 -->
<link rel="preload" href="main.js" as="script" />
<!-- 后续脚本自然用 defer 或 type="module" -->
<script defer src="main.js"></script>
```

---

## 6.8 常见陷阱

### 陷阱 1：async 脚本中直接访问 DOM 可能失败

```html
<script async src="app.js"></script>
<script>
  // ❌ 错误：async 脚本可能在 DOM 解析完成前执行
  const btn = document.getElementById('btn'); // null！
</script>

<script defer src="app.js"></script>
<script>
  // ✅ 正确：defer 保证 DOM 解析完成后才执行
  const btn = document.getElementById('btn'); // 必定存在
</script>
```

### 陷阱 2：多个 async 脚本假设顺序执行

```html
<script async src="vue.js"></script>
<script async src="my-plugin.js"></script>
<!-- my-plugin.js 依赖 vue.js，但如果 vue.js 下载更慢， -->
<!-- my-plugin.js 会先执行，报错：Vue is not defined -->
```

### 陷阱 3：模块脚本（type="module"）默认 defer，但不支持 nomodule

```html
<!-- module 脚本默认 defer，但无 polyfill 回退机制 -->
<script type="module" src="app.mjs"></script>
<!-- 旧浏览器不认识 module，旧 JS 不会执行 -->

<!-- 正确做法：module + nomodule 双版本 -->
<script type="module" src="app.mjs"></script>
<script nomodule src="legacy-app.js" defer></script>
```

---

## 6.9 面试追问

### Q1：defer 脚本和 DOMContentLoaded 事件的执行顺序是什么？

**答**：**所有 defer 脚本在 DOMContentLoaded 事件触发之前执行**，且按文档顺序执行。时序：

1. HTML 解析器解析 HTML
2. 遇到 defer 脚本 → 并行下载，不阻塞解析
3. HTML 解析完毕（DOM 完全构建）
4. **defer 脚本按顺序执行**
5. DOMContentLoaded 事件触发
6. 后续同步任务（如 `DOMContentLoaded` 回调）执行

```javascript
// DOMContentLoaded 回调在 defer scripts 之后才运行
document.addEventListener('DOMContentLoaded', () => {
  // 此时所有 defer script 已执行完毕
});
```

---

### Q2：给所有 script 都加 defer 有什么潜在问题？

**答**：主要问题是**执行时机延迟**：

1. **依赖立即执行的脚本**会失效（如老旧的 `document.write` 注入、无模块系统的全局变量初始化）
2. **首屏交互延迟**：用户可见页面但点击无响应，因为 defer 脚本还没执行（用户会感知"页面卡顿"）
3. **破坏需要 early execution 的逻辑**：如需要尽早读取 `window.pluginAPI` 的第三方集成代码

最佳做法是分析依赖关系，按需分层：
- **关键路径（阻塞首屏交互）**：内联少量同步脚本
- **框架/核心逻辑**：defer
- **统计/监控**：async（不需要等 DOM）
- **按需加载**：dynamic import

---

### Q3：模块脚本（type="module"）和 defer 一起使用会怎样？

**答**：**模块脚本默认就是 defer 行为**，两者语义重复：

```html
<!-- 完全等效 -->
<script type="module" src="app.mjs"></script>
<script type="module" defer src="app.mjs"></script>

<!-- 等效原因：ES Module spec 规定模块延迟执行 -->
```

区别在于：`type="module"` 会：
- 默认请求 CORS（需要 `crossorigin` 属性配合）
- 在 `window.module` 中暴露为模块（而非普通脚本）
- 有独立的模块级作用域（不污染全局）
- 支持 `import.meta` 对象

`defer` 则没有这些特性。所以实际开发中，如果用 `type="module"`，**不需要再加 defer**。

---

## 6.10 总结表

| 特性 | 无属性（sync） | `async` | `defer` |
|------|--------------|--------|--------|
| 下载阻塞解析器？ | 是（暂停） | 否（并行） | 否（并行） |
| 执行阻塞解析器？ | 是 | 是（执行时阻塞） | 否（DOM 已就绪） |
| 执行顺序 | 文档顺序 | 乱序（谁先下完谁执行） | 文档顺序 |
| DOMContentLoaded 之前执行？ | 是（会延迟 DCL） | 否（可能在 DCL 前后） | 是（执行完才触发 DCL） |
| 适合场景 | 需要 early run 的脚本 | 独立第三方脚本 | 有依赖关系的脚本 |
| 渲染阻塞 | 严重 | 中等 | 最小 |

---

> 📚 参考：
> - https://segmentfault.com/a/1190000045432965
> - https://juejin.cn/post/6844904197423382535
> - https://blog.csdn.net/canjava/article/details/140057832
> - https://blog.csdn.net/weixin_45092437/article/details/129752333