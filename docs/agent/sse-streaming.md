# SSE 流式对话实现

## 什么是 SSE

Server-Sent Events (SSE) 是一种服务器推送技术，允许服务器通过 HTTP 连接向客户端推送数据。

## 为什么选择 SSE

| 方案 | 优点 | 缺点 |
|------|------|------|
| WebSocket | 双向通信、低延迟 | 实现复杂、需要额外协议 |
| **SSE** | 简单、基于 HTTP、自动重连 | 单向（服务器→客户端） |
| Long Polling | 兼容性好 | 资源占用高、延迟 |

对于 AI 对话场景，SSE 是最佳选择——简单可靠，原生支持流式输出。

## 实现原理

```
Client                              Server
  │                                    │
  │──── POST /api/chat/stream ────────▶│
  │                                    │
  │     ◀── data: {"content": "你"} ───│
  │     ◀── data: {"content": "好"} ───│
  │     ◀── data: {"content": "！"} ───│
  │     ◀── data: [DONE] ──────────────│
  │                                    │
```

## 前端实现

```typescript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, stream: true })
});

const reader = response.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  // 解析 SSE 数据...
}
```

## 后端实现 (NestJS)

```typescript
@Post('chat/stream')
async chatStream(@Body() dto: ChatRequestDto, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for await (const token of stream) {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.end();
}
```

## 关键 HTTP 头

```typescript
res.setHeader('Content-Type', 'text/event-stream');  // MIME 类型
res.setHeader('Cache-Control', 'no-cache');          // 禁用缓存
res.setHeader('Connection', 'keep-alive');           // 保持连接
res.setHeader('X-Accel-Buffering', 'no');            // Nginx 禁用缓冲
```

## 错误处理

- 网络断开：浏览器自动尝试重连
- 服务器错误：发送错误数据后 end()
- 超时：设置合理的超时时间

## 性能优化

1. **批量发送**：每隔 50-100ms 发送一次
2. **压缩**：启用 gzip 压缩
3. **反向代理**：配置 Nginx 禁用缓冲

```nginx
location /api/chat/stream {
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_buffering off;
  chunked_transfer_encoding on;
}
```