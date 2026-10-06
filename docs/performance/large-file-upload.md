---
title: 大文件上传
description: 分片、断点续传与并发控制。
tags:
  - performance
  - upload
date: 2026-05-17
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
