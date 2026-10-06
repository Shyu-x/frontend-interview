---
title: 网络安全
description: 浏览器安全模型、同源与跨域、XSS、CSRF、CSP 以及认证授权与服务端常见攻击。
---

# 网络安全

本目录先讲浏览器的安全模型与同源策略，再讲跨域机制（CORS、跨源隔离）和页面层攻防（XSS、CSRF、CSP、点击劫持），然后是认证授权（Token、Session、OAuth2），最后是服务端攻击与传输加密。协议基础请先阅读[网络协议](../network/index.md)与[浏览器原理](../browser/index.md)。

## 1. 学习路径

1. [浏览器安全模型与同源策略](same-origin-policy.md)
2. [CORS 与跨源隔离](cors.md)
3. [XSS](xss.md)
4. [CSRF](csrf.md)
5. [CSP、iframe 与点击劫持](csp-and-framing.md)
6. [OAuth2 与 Token 安全](oauth2-and-tokens.md)
7. [服务端攻击与传输安全](server-side-attacks.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
| --- | --- | --- |
| [浏览器安全模型与同源策略](same-origin-policy.md) | Web 安全总览、沙箱如何隔离、同源策略限制了什么 | 基础 |
| [CORS 与跨源隔离](cors.md) | CORS 工作流程与配置、跨源隔离策略头、Spectre 缓解 | 进阶 |
| [XSS](xss.md) | XSS 分类、攻击路径与完整防御体系 | 基础 |
| [CSRF](csrf.md) | CSRF 攻击流程与多层防御 | 基础 |
| [CSP、iframe 与点击劫持](csp-and-framing.md) | CSP 指令配置、iframe 隔离、点击劫持防御 | 进阶 |
| [OAuth2 与 Token 安全](oauth2-and-tokens.md) | 各授权模式、PKCE、JWT 与 Session 风险 | 进阶 |
| [服务端攻击与传输安全](server-side-attacks.md) | 服务端攻击类型、传输层安全与签名校验 | 进阶 |
