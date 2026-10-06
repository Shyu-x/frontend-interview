---
title: CSP、iframe 与点击劫持
description: 内容安全策略、iframe sandbox 属性以及 X-Frame-Options/frame-ancestors 防点击劫持。
---

# CSP、iframe 与点击劫持

## 1. CSP 与 iframe sandbox（深度）

### 1.1 CSP（Content Security Policy）

```http
# 服务器响应头设置 CSP（多层防护）
Content-Security-Policy:
  default-src 'self';                    # 默认仅允许同源
  script-src 'self' 'nonce-abc123';      # 仅同源 + 带 nonce 标签的内联脚本
  style-src 'self' https://fonts.googleapis.com;  # 同源 + Google Fonts
  img-src 'self' data: https:;           # 同源 + data: + https 图片
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;    # AJAX/WebSocket 目标
  frame-ancestors 'none';               # 不允许被任何 frame 嵌入
  base-uri 'self';                      # 限制 <base> 目标
  report-uri /csp-violation;            # 违规报告地址
```

```html
<!-- meta 标签设置 CSP（不推荐用于报告 URI） -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'nonce-abc123';" />

<!-- nonce 策略：每次页面加载生成随机 nonce，内联脚本需匹配才能执行 -->
<script nonce="abc123">
  // 带有匹配 nonce 的内联脚本才会执行
  // 攻击者的 XSS 注入脚本没有 nonce，无法执行
</script>
```

### 1.2 iframe sandbox

```html
<!-- 基本用法：完全隔离 -->
<iframe src="/sandboxed.html" sandbox></iframe>
<!-- 等价于: sandbox="allow-scripts" (默认仅允许脚本执行，禁止其他所有权限) -->

<!-- 细粒度权限控制 -->
<iframe
  src="https://untrusted.example.com/page.html"
  sandbox="
    allow-scripts         # 允许执行脚本
    allow-forms          # 允许表单提交
    allow-same-origin    # 允许访问同源内容（注意：降低隔离级别）
    allow-top-navigation # 允许顶层导航（注意：安全风险）
    allow-popups         # 允许弹窗
  "
></iframe>

<!-- 最严格的 sandbox（适合完全不可信的内容）: 不允许脚本 + 表单 + 导航 -->
<iframe src="untrusted.html" sandbox="allow-scripts"></iframe>
```

## 2. 同源策略、CSP、iframe sandbox（速记版）

### 2.1 同源策略（Same-Origin Policy）

```
同源定义: 协议 + 域名 + 端口 三者完全相同

示例:
https://example.com:443 (基准)
  正确：https://example.com:443 (同源)
  正确：https://example.com/ (同源)
  错误：http://example.com:443 (协议不同)
  错误：https://sub.example.com:443 (子域名不同)
  错误：https://example.com:8080 (端口不同)
```

### 2.2 CSP（Content Security Policy）

```http
# 服务器响应头设置 CSP
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123';
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  frame-ancestors 'none';
  report-uri /csp-violation;
```

### 2.3 iframe sandbox

```html
<iframe
  src="https://untrusted.example.com/page.html"
  sandbox="
    allow-scripts
    allow-forms
    allow-same-origin
    allow-top-navigation
    allow-popups
  "
></iframe>

<!-- 最严格的 sandbox（完全不信任的内容） -->
<iframe src="untrusted.html" sandbox></iframe>
```

## 3. 点击劫持 (Clickjacking)

### 3.1 什么是点击劫持

攻击者通过`iframe`将目标网站覆盖在恶意页面上，通过视觉欺骗诱导用户点击：

```html
<!-- 恶意页面 -->
<style>
  iframe { position:absolute; top:100px; left:50px;
    opacity:0.1; width:600px; height:400px; }
  button { position:absolute; top:200px; left:200px; z-index:1; }
</style>

<iframe src="https://bank.com/send-money?to=attacker&amount=10000"></iframe>
<button>领取奖励</button>
<!-- 实际点击的是iframe中的"确认转账"按钮 -->
```

### 3.2 Clickjacking防御

**1. X-Frame-Options 响应头**

```http
X-Frame-Options: DENY       <!-- 完全禁止被iframe嵌入 -->
X-Frame-Options: SAMEORIGIN <!-- 只允许同源iframe -->
```

**2. CSP frame-ancestors指令**

```http
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self' https://trusted.com;
```

### 3.3 iframe sandbox原理

```html
<!-- sandbox属性完全隔离iframe内的代码能力 -->
<iframe src="https://untrusted.com/page" sandbox="
  allow-scripts          <!-- 允许执行JS -->
  allow-same-origin      <!-- 允许同源访问(会降低安全性) -->
"></iframe>
```

```
sandbox隔离的能力:
  × 修改父页面DOM
  × 读取父页面Cookie/Storage
  × 发起跨域请求(但form提交仍可发往任何域)
  × 使用top/history API修改URL
  √ 可以展示内容
  √ 可以执行JS(加了allow-scripts)
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [MDN：同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) | 同源策略是理解 iframe 嵌入与点击劫持的前提，必须先行。 | 重点读跨源交互一节，带着“iframe 能否读取父页”的问题读；读完用两个本地端口做实验验证。 |
| [CSP 规范 Level 3](https://www.w3.org/TR/CSP3/) | 指令语义的最终依据，解释浏览器行为差异时回来查它。 | 查 sandbox、frame-ancestors、source list 的精确定义；发现浏览器行为不一致时对照规范确认。 |
| [Reporting API（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API) | 把 CSP 违规从控制台搬到服务端，便于持续监控策略。 | 读报告格式与 report-to 一节；在测试页配置上报端点，观察违规报告是否送达。 |
| [Clickjacking](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking) | 本页核心攻击，讲清 frame-ancestors 与 X-Frame-Options 的取舍。 | 读攻击原理与防御两节；随后写一个被嵌入的演示页，加 frame-ancestors 'none' 验证是否被挡。 |
| [Content-Security-Policy (CSP) header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy) | 按指令逐条查阅的速查表，写策略时最常用。 | 重点读 sandbox、frame-ancestors、script-src 三节与默认值说明；写策略时逐条核对取值。 |
| [Content-Security-Policy: sandbox directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox) | iframe sandbox 属性的 CSP 对等物，二者易混淆需明确区分。 | 对比它与 iframe sandbox 属性允许项的差异；读完做实验：同一页面分别用两者限制再观察。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | 把策略粘进去即可发现绕过点，动手校验效果直观。 | 粘贴自己写的策略，逐条阅读高危与中危提示；修改后再评估一次，直到无高危项。 |
| [`<iframe>` HTML inline frame element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) | sandbox、allow、referrerpolicy 等属性的一手参考，附带示例。 | 读 sandbox 属性小节与示例代码；照着改写一个内嵌第三方页面的 demo 并观察限制效果。 |
| [IFrame credentialless](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/IFrame_credentialless) | 展示 iframe 隔离的新做法，理解跨源嵌入的隐私取舍。 | 读 credentialless 的行为说明与示例；在跨源 iframe 上开启，观察 Cookie 是否随请求发送。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) | 防御点击劫持与 XSS 的实操清单，落地速度快。 | 先看 frame-ancestors 一节；按 report-only 到强制执行的顺序部署，逐项勾选落地。 |
| [web.dev：内容安全策略](https://web.dev/articles/csp) | 把严格 CSP 拆成可执行步骤，适合从零配置 nonce。 | 跟做 nonce 与 strict-dynamic 的示例；在自己的测试页复现，读完检查控制台无违规。 |
| [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) | MDN 的 CSP 主指南，概念与常见攻击覆盖最全。 | 通读“缓解常见攻击”一节，重点看点击劫持与 frame-ancestors 的写法，再回看自己的策略。 |
| [Content Security Policy errors and warnings](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP/Errors) | 控制台报错不再靠猜，可直接查到原因与修正方向。 | 读 CSPViolation 页面的错误示例；遇到违规时按报错关键词检索，再回到策略中定位修改。 |

