---
title: XHTML、HTML、XML 与 JSON 对比
description: HTML、XHTML、XML、JSON 四种标记与数据格式的差异、适用场景与互相转换。
---

# XHTML、HTML、XML 与 JSON 对比

## 1. 核心对比表

| 特性 | HTML | XHTML | XML | JSON |
|------|------|-------|-----|------|
| 设计目的 | 显示 Web 页面 | 结构化 Web 内容 | 传输/存储数据 | 传输数据 |
| 语法严格性 | 宽松（容错性强） | 严格（必须闭合标签） | 极度严格 | 语法简洁 |
| 大小写敏感 | 不敏感 | 敏感（必须小写） | 敏感 | 敏感 |
| 引号 | 可省略 | 必须双引号 | 必须双引号 | 字符串必须双引号 |
| 标签闭合 | 不强制 | 必须闭合 | 必须闭合 | 无标签 |
| 属性写法 | `disabled` | `disabled="disabled"` | — | — |
| 根元素 | 可省略 | 必须有 | 必须有 | 必须是对象或数组 |
| 空白处理 | 折叠 | 保留 | 保留 | 取决于具体实现 |
| 解析方式 | 浏览器容错解析 | XML 解析器 | XML 解析器 | JSON.parse() |
| 校验 | 不强制 | 可用 DTD/Schema | DTD/Schema | JSON Schema |

## 2. HTML vs XHTML 深度对比

### 2.1 HTML5 宽松语法

```html
<!DOCTYPE html>
<html>
<head><title>HTML</title>
<body>
  <input type="checkbox" checked>  <!-- 属性可省略值 -->
  <img src="a.jpg">                 <!-- 自闭合标签可省略斜杠 -->
  <br>                              <!-- 单标签不用 /> -->
  <p>段落                            <!-- 未闭合标签浏览器容错处理 -->
</body>
```

### 2.2 XHTML 严格语法

```html
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>XHTML</title></head>
<body>
  <input type="checkbox" checked="checked" />  <!-- 属性必须有值 -->
  <img src="a.jpg" alt="图片" />               <!-- 必须有斜杠 -->
  <br />                                       <!-- 自闭合必须 /> -->
  <p>段落</p>                                  <!-- 必须闭合标签 -->
  <div class="box"></div>                       <!-- 双标签也要闭合 -->
</body>
</html>
```

### 2.3 为什么 XHTML 被淘汰

```
XHTML 目标：让 HTML 符合 XML 严格语法
↓ 
实际结果：
1. 浏览器为了兼容性，仍需要"容错"解析 XHTML
2. 严格的语法要求让开发成本提高
3. HTML5 出现后，统一了"宽松但有规则"的语法
4. XHTML 2.0 被废弃，HTML5 成为标准

HTML5 的设计哲学：
- 宽松语法 + 明确规范
- 浏览器统一容错规则（HTML 解析算法）
- 向后兼容 + 新特性（video/canvas/web components）
```

## 3. XML 详解

### 3.1 XML 语法要求

```xml
<!-- XML 必须有且只有一个根元素 -->
<root>
  <child>内容</child>
</root>

<!-- 标签必须成对 -->
<tag></tag>
<self-closing />

<!-- 属性必须加引号 -->
<element attr="value" />

<!-- 大小写敏感 -->
<Book> ≠ <book>

<!-- CDATA 区块：包含特殊字符的内容 -->
<data><![CDATA[
  <script>这里可以写 < > & 不需要转义</script>
]]></data>

<!-- XML 声明（可选但推荐） -->
<?xml version="1.0" encoding="UTF-8"?>
```

### 3.2 XML 用途（现代场景）

| 场景 | 为什么用 XML | 替代方案 |
|------|-------------|---------|
| SOAP API | XML 是 SOAP 协议规范 | REST + JSON |
| RSS/Atom | 历史原因（2000年代） | JSON Feed |
| SVG | SVG 是 XML 格式 | 是 无替代 |
| Office 文档 | .docx/.xlsx 内部是 ZIP+XML | — |
| 配置文件 | Java/XML 遗留项目 | YAML/JSON/TOML |
| SAML/OAuth | 企业 SSO 协议 | OIDC/JWT |

## 4. JSON 详解

### 4.1 JSON 语法

```json
// 正确
{ "name": "张三", "age": 30 }

// 错误示例
{
  name: "张三",      // 错误：键必须加引号（简单值除外）
  'age': 30,         // 错误：只能用双引号
  age: null,         // 正确：支持 null
  active: true,     // 正确：支持 boolean
  score: [1, 2, 3]  // 正确：支持数组
}
```

### 4.2 JSON 的优势

| 优势 | 说明 |
|------|------|
| 解析速度快 | 原生 `JSON.parse()`，无需 DOM 解析 |
| 体积更小 | 无冗余标签，数据密度高 |
| 类型丰富 | 支持 null、boolean、number、string、array，object |
| 跨语言 | JavaScript/Python/Java/Go 都有原生支持 |
| 无循环引用 | JSON 结构简单，不会有循环引用问题 |

### 4.3 JSON 的局限

| 局限 | 说明 |
|------|------|
| 无注释 | 不能加注释（可考虑 JSON5/JSONC） |
| 无小数精度保证 | JavaScript number 精度问题 |
| 无日期类型 | 只能传字符串或时间戳 |
| 无 undefined | undefined 会被忽略 |
| 无循环引用 | 包含循环引用的对象无法序列化 |

```javascript
// JSON.stringify 的限制
const obj = {
  name: "张三",
  fn: () => {},       // 错误：函数被忽略
  undefinedVal: undefined, // 错误：被忽略
  symbol: Symbol('s'), // 错误：被忽略
  bigInt: BigInt(123), // 错误：报错
};
JSON.stringify(obj); // '{"name":"张三"}'
```

## 5. 互相转换

### 5.1 HTML ↔ XHTML

```javascript
// HTML 转 XHTML 规则
1. 所有标签小写
2. 所有属性加引号
3. 所有标签闭合（包括 <br> → <br />）
4. 属性值加引号（checked → checked="checked"）
5. 根元素必须有 xmlns 属性
```

### 5.2 JSON ↔ XML

```javascript
// JSON 转 XML（简单转换）
function jsonToXml(obj, root = 'root') {
  let xml = `<${root}>`;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      xml += jsonToXml(value, key);
    } else {
      xml += `<${key}>${value}</${key}>`;
    }
  }
  xml += `</${root}>`;
  return xml;
}

// XML 转 JSON（用 DOMParser）
const parser = new DOMParser();
const doc = parser.parseFromString(xmlString, 'text/xml');
// 遍历 doc 构建 JSON 对象
```

## 6. 面试 follow-up 问题

### 6.1 Q1: 为什么现代 Web 开发中 JSON 取代了 XML 成为主流数据格式？

**答案：**
1. **语法简洁**：JSON 无需闭合标签、无需大写敏感，体积比 XML 小 20-30%
2. **解析速度**：JSON.parse() 比 XML DOM 解析快 5-10 倍
3. **原生支持**：JavaScript 直接处理，无需额外解析器
4. **类型丰富**：支持 null、boolean、number，XML 只有文本
5. **API 设计**：RESTful API + JSON 成为事实标准（90%+ 新 API）

---

### 6.2 Q2: XHTML 和 HTML5 有什么区别？

**答案：**
- **XHTML**：XML 语法的 HTML，要求严格闭合标签、小写、引号
- **HTML5**：融合了宽松语法（HTML4 风格）和新特性（video、canvas、WebSocket）

| 对比 | XHTML | HTML5 |
|------|-------|-------|
| 语法 | 严格 XML | 宽松 + 规范 |
| DTD | 需要声明 | 不需要 |
| 解析 | XML 解析器 | HTML5 解析算法 |
| 新标签 | 无 | video/audio/canvas/header/main |
| API | 少 | 丰富的 JS API |
| 浏览器支持 | 全部 | 全部（更一致） |

---

### 6.3 Q3: SVG 是 XML 格式，这带来什么优势和问题？

**答案：**
**优势：**
- 可编程：通过 JavaScript 操作 SVG DOM
- 可压缩：文本格式，gzip 压缩率高
- 可搜索：文本内容可被搜索引擎索引
- 可编辑：可用文本编辑器打开和修改
- 可动画：CSS/JS/SMIL 多种动画方式

**问题：**
- 复杂 SVG 体积大（需要优化工具如 SVGO）
- 浏览器兼容性问题（不同浏览器渲染略有差异）
- 大数量节点性能差（复杂图表建议用 Canvas）
- 需要处理命名空间（SVG/MathML/Mixed）

---

> 参考：
> - https://www.w3.org/TR/html52/ （HTML5.2 规范）
> - https://developer.mozilla.org/en-US/docs/Web/XML/XML_reference
> - https://www.json.org/json-zh.html （JSON 官方）

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | HTML 与 XHTML 语法差异的最终裁判，权威且可逐条核对 | 读元素定义中的内容模型与属性表，对照 XHTML 必须闭合、小写的要求，列出差异清单 |
| [HTML 规范：解析](https://html.spec.whatwg.org/multipage/parsing.html) | 解释容错解析，说明 HTML 为何不要求格式良好 | 读分词与树构建概述，思考同样标签在 XHTML 中报错的原因，写一段对比笔记 |
| [HTML reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference) | 元素与语法总参考，遇到对比细节随时回查 | 按章节浏览元素条目，重点看语法与浏览器兼容性表，标注 XHTML 不支持项 |
| [HTML attribute reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes) | 属性写法差异明显，是 XHTML 校验失败的高发区 | 读布尔属性与属性值引号部分，用 XHTML 规则手写一遍同一元素并对比 |
| [MDN HTML 内容分类](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories) | 内容模型是理解 HTML 允许与 XHTML 要求差别的关键 | 读 flow 与 phrasing 分类，解释 p 内不能放 div，再判断哪些嵌套在 XHTML 合法 |
| [JSON:API 规范](https://jsonapi.org/) | 展示 JSON 承载结构化数据的规范设计，远超语法层面 | 读 Fetching Data 部分，思考同一数据用 XML 表达会多出什么，写对比结论 |
| [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) | 错误响应的 JSON 规范案例，适合做格式对比练习 | 读字段定义，把自己的错误响应改成 problem+json，再设想 XML 版本差异 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN Playground](https://developer.mozilla.org/en-US/play) | 可在同一处跑 HTML 与 XHTML 片段，验证解析差异 | 粘贴未闭合标签与自闭合标签各一份，观察渲染结果并记录与预期不符处 |
| [JSON Crack](https://jsoncrack.com/editor) | 把大 JSON 可视化成图，直观看出层级与嵌套结构 | 用真实接口响应画图，找出深层嵌套，思考转 XML 时如何映射为元素 |
| [transform.tools](https://transform.tools/) | 现成的格式互转工具，可快速验证转换规则 | 把一段 JSON 转成 TypeScript 或 XML 再看回去，记录信息丢失的地方 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [web.dev Learn HTML](https://web.dev/learn/html) | 系统补齐 HTML 基础，适合对比时当作标准写法参照 | 按章节顺序读，每章后重做示例并检查是否满足 XHTML 语法要求 |
| [web-interview](https://github.com/febobo/web-interview) | 面试题库，正好用于本页末尾的 follow-up 自测 | 选 HTML 分类限时口述答案，记录卡壳点，回本页对比表补强 |
| [JWT 入门教程（阮一峰）](https://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html) | 用 JSON 序列化承载结构化数据，串起 JSON 章节 | 手动解码一个 JWT 并说明三部分含义，思考换成 XML 的可行性与代价 |
| [Understanding quirks and standards modes](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Quirks_mode_and_standards_mode) | 解释文档模式差异，呼应 XHTML 与 HTML 的解析分歧 | 读标准模式与怪异模式触发条件，用缺失 DOCTYPE 的页面验证渲染差异 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到的本页知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格 | HTML 节点数量与解析开销 | 前端框架 + 虚拟滚动组件 | 只把可见行挂到 DOM，滚动时回收节点 |
| 低端安卓的首屏加载 | JSON 体积与解析耗时 | 服务端渲染 + JSON 接口 | 首屏只传可见区数据，别把全表塞进响应体 |
| 多人协作白板 | 数据交换格式选型（JSON 与二进制） | CRDT 库 + WebSocket | 高频笔迹走二进制，拖拽结果走 JSON |
| 新闻站的搜索引擎收录 | 语义化 HTML 与爬虫解析顺序 | 静态生成 + sitemap | 正文必须出现在初始 HTML，不能只靠脚本注入 |
| 老系统报表导出 | XML 严格性与 Schema 校验 | XML Schema + XSLT | 改标签名会直接断掉下游解析器 |
| 手机端离线缓存 | JSON 序列化与结构演进 | IndexedDB 存 JSON | 写版本字段，读取时按版本做迁移 |
| 跨端配置下发 | JSON Schema 校验 | 配置中心 + 校验脚本 | 校验失败要有默认值兜底，不能阻塞启动 |
| 邮件模板渲染 | XHTML 严格标签与行内样式 | 表格布局 HTML + 行内 CSS | 邮件客户端只认闭合标签和行内属性 |
| 埋点日志上报 | JSON 行格式与嵌套深度 | 每行一个 JSON 对象 | 嵌套不超过两层，字段名固定不可改名 |

### 三个场景拆解

#### 场景 1：低端安卓的首屏列表加载

**业务背景**：列表接口一次返回全量数据，低端安卓上白屏时间明显拉长。数据规模按“接口响应体的字节数”和“总行数”两个量级来估。

**怎么用本页知识解决**：思路是先砍传输量，再砍 DOM 数量。接口改成分页 JSON，渲染用文档片段批量插入，一次只挂可见区。

```js
// 首屏只取 50 行，避免把全量 JSON 一次读进内存
const page = await fetch('/api/rows?start=0&count=50').then(r => r.json());
// 用 DocumentFragment 攒够再插入，减少页面重排次数
const frag = document.createDocumentFragment();
for (const row of page.rows) {
  const tr = document.createElement('tr');
  // 转义后再拼 HTML，防止字段内容被当成标签执行
  tr.innerHTML = `<td>${escapeHtml(row.name)}</td><td>${row.qty}</td>`;
  frag.appendChild(tr);
}
tbody.appendChild(frag);
```

- 服务端分页把响应体从全量降到一屏，解析耗时随字节数下降。
- `DocumentFragment` 只在最后触发一次插入，重排次数从每行一次降到一次。
- 转义函数拦掉 `row.name` 里的尖括号，避免 HTML 注入。
- 滚动到底部时再请求下一页，接口参数复用同一套 `start` 与 `count`。

**怎么度量收益**：用 Chrome DevTools 的 Network 面板看响应体压缩前后字节数，用 Performance 面板看首次内容绘制时间，用 Lighthouse 跑移动端性能评分。

**什么时候不该用**：需要给用户导出完整 CSV 时，不要走这条分页渲染路径；总行数不足一屏时，不必引入分页和虚拟滚动。

#### 场景 2：多人协作白板的增量同步

**业务背景**：多人同时拖动图形，每次鼠标移动都广播一条全量画布 JSON，房间人数上升后消息量成倍增长。规模用“房间内人数”和“每秒消息条数”衡量。

**怎么用本页知识解决**：把全量快照换成增量操作，拖动过程只发关键帧，落笔结束才广播最终坐标。JSON 负责可读的结构化操作，高频采样另走二进制通道。

```js
// 落笔结束时才发一条操作，不在每次 mousemove 都发
const op = {
  type: 'move',        // 操作类型，接收端按此分支处理
  id: shapeId,         // 图形标识，定位到具体对象
  x: Math.round(x),    // 坐标取整，缩短 JSON 文本长度
  y: Math.round(y),
  v: 7                 // 版本号，用于丢弃迟到的旧消息
};
// 发送前本地先做字段校验，缺字段直接抛错不发出
if (!op.id || typeof op.x !== 'number') throw new Error('bad op');
socket.send(JSON.stringify(op));
```

- 只发增量，单条消息不再携带整块画布，消息字节数随操作数而非画布规模增长。
- 坐标取整把浮点长尾裁掉，JSON 文本更短，序列化开销同步下降。
- 版本号让接收端能判断乱序，旧消息直接丢弃，画面不会回跳。
- 发送前校验字段，坏消息在本地就被拦住，不会污染其他人的画布。

**怎么度量收益**：用 DevTools 的 Network 面板切到 WS 标签，看单帧字节数和每秒帧数；用 Performance 面板的 Frames 轨道看拖动期间的掉帧。

**什么时候不该用**：手写笔迹的逐点采样不要用 JSON 每帧发送；需要服务端强一致写入的场景，不能只靠 JSON 覆盖式更新。

#### 场景 3：老报表导出与格式迁移

**业务背景**：财务侧导出的报表被下游系统拒收，原因是文件里有未闭合的标签和类型不符的数值字段。规模按“每天导出文件数”和“被拒收次数”统计。

**怎么用本页知识解决**：先用 XML Schema 卡住字段类型，再用 XSLT 把同一份 XML 转成 XHTML，屏幕预览和打印共用一份源数据。

```bash
# 用 XML Schema 校验源文件，字段类型不符会直接报错并指出行号
xmllint --noout --schema invoice.xsd invoice.xml

# 校验通过后再套 XSLT，把 XML 转成 XHTML
xsltproc invoice.xhtml.xsl invoice.xml > invoice.xhtml

# XHTML 要求标签闭合、大小写正确，用 XML 解析器复查一遍
xmllint --noout invoice.xhtml

# 抽查生成的表格单元格数量，确认模板没吃掉数据
grep -c '<td' invoice.xhtml
```

- `xmllint --schema` 在导出链路的入口拦错，错误定位到具体行，修复成本低于下游报错。
- 严格 XML 解析要求标签闭合，历史模板里的野标签会在这步暴露。
- XSLT 让屏幕与打印共用一份源数据，避免两套模板各改一遍。
- 生成后抽查单元格数量，挡住模板静默丢字段的情况。

**怎么度量收益**：统计校验脚本的失败率与被下游拒收的文件数，两者都从构建日志和下游回执里取。

**什么时候不该用**：下游只接受 CSV 时，不要为了统一格式强推 XML；一次性脚本不值得引入 XSLT，直接写程序转换更快。

### 行业先进实践

**用 JSON Schema 校验配置与接口（出处：JSON Schema 官方规范站点）**
做法是把配置和接口响应体写成 Schema，用校验器在写入前和读取后各跑一遍。它有效的原因是字段类型和必填项被机器检查，坏数据进不了下游。你的项目可以先把下发配置的 Schema 落地，接到发布流水线里。

**用 XML Schema 与 XSLT 做文档转换（出处：W3C 的 XML Schema 与 XSLT 规范）**
做法是把业务数据存成合法 XML，用 Schema 定义结构，用 XSLT 生成多种展示格式。它有效的原因是结构与呈现分离，一份数据能出多种版式。你的项目如果已有稳定 XML 源，可以先用它替换手工拼字符串的导出代码。

**用 DOMPurify 清洗用户提交的 HTML（出处：开源项目 DOMPurify）**
做法是把渲染前的 HTML 片段送进清洗库，白名单外的标签与属性被移除。它有效的原因是 XSS 的主要入口就是未清洗的 HTML 片段。你的项目在渲染富文本和评论时可以先接这一层。

**用 Web Vitals 与 Lighthouse 量化首屏（出处：Chrome 官方 web.dev 文档）**
做法是把 Largest Contentful Paint 与 Interaction to Next Paint 作为上线门槛，在持续集成里跑 Lighthouse。它有效的原因是首屏体验被拆成可对比的指标，改动前后能直接对照。你的项目可以先在预发布环境固定跑一次，记录基线。

**用 Protocol Buffers 替换大流量 JSON 传输（出处：Protocol Buffers 官方文档）**
做法是把高频、体积敏感的接口改成二进制编码，Schema 单独维护并做兼容检查。它有效的原因是字段按序号编码，省掉重复的字段名文本。你的项目只在实测响应体偏大且解析占比较高时才需要迁移。

### 从学到用：落地路线

1. 在报表导出链路试点校验，第一步只加 XML Schema 或 JSON Schema 校验，不改任何业务逻辑。验收标准：校验脚本能在持续集成里对全部样例行给出通过或失败结论。
2. 用指标验证，把首屏耗时、响应体字节数、校验失败率记录成基线。验收标准：连续一周的数据能画成趋势图，改动前后可对照。
3. 推广到同类模块，把校验与指标接入发布流水线，作为合并前的检查项。验收标准：新提交的代码在未跑检查时无法合并。
4. 防止回退，把 Schema 与指标阈值写进仓库，改动需要单独评审。验收标准：阈值被修改时留下评审记录，且改动后一周内指标不劣化。

### 动手作业

**目标**：做一个“发票导出与预览”小工具，输入 XML 源文件，输出经校验的 XHTML 预览页，同时提供一份 JSON 接口给前端列表用。

**步骤**
1. 手写一份 `invoice.xml`，包含发票号、开票日期、三行明细，字段类型写清楚。
2. 写出 `invoice.xsd`，为发票号和金额加类型约束，日期用日期类型。
3. 用 `xmllint --noout --schema invoice.xsd invoice.xml` 跑一遍，故意改错一个金额字段，确认能报错。
4. 写 `invoice.xhtml.xsl`，把 XML 转成表格版 XHTML，金额列右对齐。
5. 用 `xsltproc` 生成 XHTML，再用 `xmllint --noout invoice.xhtml` 复查闭合性。
6. 写一个脚本把同一份 XML 转成 JSON，字段名固定，供列表接口使用。
7. 用浏览器打开 XHTML，对照 XML 源文件核对每一行的金额与数量。

**验收标准**
- `xmllint --schema` 对正确文件返回成功，对改错金额的文件返回失败并指出行号。
- `xmllint --noout invoice.xhtml` 无输出，说明标签闭合且大小写正确。
- 生成的 XHTML 行数与 XML 明细行数一致，金额逐行核对无误。
- JSON 版本包含与 XML 相同的发票号和明细数量，字段名在两次运行中保持一致。
- 把日期字段改成非法值后，校验脚本仍然能拦住，工具不会输出半成品文件。

