---
title: 大文件上传
description: 逐步拆解分片上传的并发上限、重试粒度、取消和服务端合并校验，说明 ETag 或分片摘要如何发现错序与重复提交，并识别秒传的内容寻址风险。
tags:
  - performance
  - upload
date: 2026-10-13
level: advanced
prerequisites: [File 与 Blob, Promise, HTTP PUT 与校验和]
runnable: false
tested_with: []
verified_at: 2026-10-13
verified_scope: 只核对新增的 AbortController 取消边界。
---

# 大文件上传

## 1. 大文件上传

```javascript
// 大文件上传方案：分片 + 断点续传 + 秒传

// 分片上传原理：
// 1. 文件按固定大小分割（如2MB/片）
// 2. 每片单独上传，服务端合并
// 3. 支持并行上传多片

class Uploader {
  constructor(file, { chunkSize = 2 * 1024 * 1024, threads = 3 }) {
    this.file = file;
    this.chunkSize = chunkSize;
    this.threads = threads;
    this.uploadedChunks = new Set(); // 记录已上传的片
  }

  // 计算文件分片数
  get totalChunks() {
    return Math.ceil(this.file.size / this.chunkSize);
  }

  // 上传单片
  async uploadChunk(index) {
    const start = index * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunk = this.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('index', index);
    formData.append('hash', await this.getChunkHash(chunk));

    await fetch('/upload/chunk', { method: 'POST', body: formData });
    this.uploadedChunks.add(index);
  }

  // 并发控制
  async upload() {
    const total = this.totalChunks;
    let uploading = 0;
    let i = 0;

    while (i < total || uploading > 0) {
      while (i < total && uploading < this.threads) {
        this.uploadChunk(i).then(() => uploading--);
        i++;
        uploading++;
      }
      await new Promise(r => setTimeout(r, 100)); // 等待
    }
  }

  // 文件hash（用于秒传判断）
  async getFileHash() {
    const hash = await crypto.subtle.digest('SHA-256',
      await this.file.arrayBuffer()
    );
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 秒传：上传前先询问服务端文件是否已存在
  async checkHash() {
    const hash = await this.getFileHash();
    const res = await fetch(`/upload/check?hash=${hash}`);
    const { exists, url } = await res.json();
    if (exists) { console.log('秒传成功', url); return true; }
    return false;
  }

  // 断点续传：记录已上传的片（下一次打开从断点继续）
  saveProgress() {
    localStorage.setItem('upload_' + this.file.name,
      JSON.stringify([...this.uploadedChunks])
    );
  }
}

## 上传队列要定义取消和提交确认 {#handwrite-upload-cancel-commit}

浏览器取消上传只能停止客户端继续发送字节，不会自动撤销服务端已落盘的分片。服务端需要给上传会话设置过期时间，合并操作应校验分片数量、索引、长度和摘要，并在最终文件可读后才返回完成状态。`AbortController` 应被单个上传任务拥有，用户取消后还要显式调用服务端清理接口；若清理失败，过期回收仍要兜底。[MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

测量时记录每片字节数、同时在途请求数、重试次数与最终摘要。仅统计浏览器 `upload.onprogress` 到 100% 不能证明服务端完成合并或持久化。

取消控制器应由一次“上传会话”持有，而不是由每一个分片回调临时创建。用户点击取消时先 abort 所有在途请求，然后调用会话取消端点；服务端拒绝后续分片并清理临时文件，清理失败由 TTL 回收。最终合并必须由服务器端状态机从 `receiving` 切换到 `committing`，摘要校验成功后再原子发布为 `complete`。

```js

const controller = new AbortController();
try {
  await uploadAllChunks(file, { signal: controller.signal });
  await commitUpload(uploadId, finalDigest);
} catch (error) {
  if (controller.signal.aborted) await cancelUpload(uploadId);
  throw error;
}
```

调用顺序：先上传两片并记录服务端确认；中途 abort 后检查第三片未提交；再用同一 uploadId 恢复并重传缺片；最后故意篡改一个分片摘要，确认服务端不发布完整文件。并发上传数需要受浏览器连接预算和服务端配额限制，不能把所有分片直接 `Promise.all`。

// 服务端合并（Node.js）：
const fs = require('fs');
async function mergeChunks(filename, totalChunks) {
  const chunksDir = `./chunks/${filename}`;
  const dest = fs.createWriteStream(`./uploads/${filename}`);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = fs.readFileSync(`${chunksDir}/${i}`);
    dest.write(chunk);
  }
  dest.end();
}
```
