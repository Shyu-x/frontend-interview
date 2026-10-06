---
title: 网络协议
description: HTTP 各版本、TCP/UDP/QUIC、HTTPS/TLS、DNS、实时通信、REST/GraphQL 以及 CDN 与 nginx 的网络知识。
---

# 网络协议

本目录按协议栈由上到下组织：先看 HTTP 与应用层语义，再到传输层的 TCP、UDP 与 QUIC，随后是 TLS 与证书、DNS，最后是实时通信、API 风格、CDN 与反向代理。每个主题提供原理图、代码示例、对比表与面试追问，并附速记版。跨域（CORS）、OAuth2 等安全相关内容见[网络安全](../security/index.md)。

## 1. 学习路径

1. [HTTP 版本与连接复用](http-versions.md)
2. [状态码、重定向与方法](http-semantics.md)
3. [TCP、UDP 与 QUIC](tcp-udp-quic.md)
4. [TCP 拥塞与流量控制](tcp-congestion-control.md)
5. [握手、挥手与 SYN Flood](tcp-connection-lifecycle.md)
6. [HTTPS 与 TLS 握手](tls-handshake.md)
7. [CA 证书链与 HSTS](certificates-hsts.md)
8. [DNS](dns.md)
9. [WebSocket 与 SSE](websocket-sse.md)
10. [REST 与 GraphQL](rest-graphql.md)
11. [CDN](cdn.md)
12. [nginx 代理与负载均衡](nginx-proxy.md)
13. [速查卡与参考来源](cheatsheet.md)

## 2. 页面一览

| 页面 | 你将学到 | 难度 |
| --- | --- | --- |
| [HTTP 版本与连接复用](http-versions.md) | 各版本差异、多路复用、keep-alive 原理 | 基础 |
| [状态码、重定向与方法](http-semantics.md) | 状态码速查、重定向选择、幂等与安全方法 | 基础 |
| [TCP、UDP 与 QUIC](tcp-udp-quic.md) | 传输层协议取舍、QUIC 可靠传输机制 | 进阶 |
| [TCP 拥塞与流量控制](tcp-congestion-control.md) | 拥塞控制四阶段与窗口机制 | 高级 |
| [握手、挥手与 SYN Flood](tcp-connection-lifecycle.md) | 连接建立与断开的状态机、SYN Flood 防御 | 进阶 |
| [HTTPS 与 TLS 握手](tls-handshake.md) | 握手流程、1.3 的改进、前向安全 | 进阶 |
| [CA 证书链与 HSTS](certificates-hsts.md) | 信任链如何建立、HSTS 的作用与配置 | 进阶 |
| [DNS](dns.md) | 解析流程、缓存、DNS 安全问题 | 基础 |
| [WebSocket 与 SSE](websocket-sse.md) | WebSocket 握手与帧、SSE 重连、选型对比 | 进阶 |
| [REST 与 GraphQL](rest-graphql.md) | REST 约束、GraphQL 查询模型、选型 | 基础 |
| [CDN](cdn.md) | CDN 请求路径、缓存策略、常见问题 | 进阶 |
| [nginx 代理与负载均衡](nginx-proxy.md) | 代理类型区别、负载均衡算法、nginx 配置 | 进阶 |
| [速查卡与参考来源](cheatsheet.md) | 复习时快速回顾全部要点 | 基础 |
