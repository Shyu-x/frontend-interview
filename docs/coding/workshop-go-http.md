---
title: Go HTTP 工程题：重试、中间件与输入边界
description: 通过八道可运行题实现安全的 HTTP 客户端与服务端边界，包括幂等重试、请求追踪、请求体限额、严格 JSON、分页、响应限制和健康探针。
tags: [go, http, coding]
date: 2026-10-13
level: intermediate
prerequisites:
  - Go net/http 与 httptest 基础
  - context.Context、JSON 解码和错误处理
runnable: true
tested_with:
  - go@1.27.1
verified_at: 2026-10-13
source_commit: f682da9816e3f5454a3f1d8d8cb074d0de53236b
---

# Go HTTP 工程题 重试、中间件与输入边界

一个订单服务会访问供应商 API、接收 webhook 并暴露存活探针。只写 handler 的成功路径还不够：请求可能重复，body 可能过大，响应可能永远不结束，依赖暂时失败也不代表应该重复执行写操作。

~~~mermaid
flowchart LR
  Client["外部客户端"] --> Middleware["请求 ID 与入口校验"] --> Handler["业务处理"]
  Handler --> Bounded["限额下游客户端"]
  Handler --> Probe["存活与就绪"]
  Context["请求 context"] -.-> Handler
  Context -.-> Bounded
~~~

从入口向右检查每次数据扩张：请求体先限额再解码，客户端响应先限额再读完；从虚线检查取消是否贯穿 handler 和出站请求。

## 运行与验收

~~~sh
cd scripts/teaching-labs/go
go test ./...
go test -race ./...
~~~

本页的 HTTP 用例以 httptest.NewServer 和 recorder 构造真实请求/响应，不依赖互联网。通过阈值是所有状态码、调用次数和边界断言通过，race 检测无报告。失败时查看对应 TestG011 到 TestG018；测试服务器由 defer Close 清理。

## G011–G018 HTTP 输入、客户端与探针 {#g011}

### G011 对临时 5xx 重试 GET {#g011}

供应商读接口首次返回 503、第二次返回 200。最多尝试 3 次，不能把失败响应体留在连接池里；context 取消后不应继续等待退避时间。

#### 只重放可以安全重复的读取

重试策略限定在幂等 GET。发送每次请求时都绑定 context；遇到 5xx 先关闭响应体，再等待 timer；非 5xx 响应交由业务调用方处理，不做盲目重试。

#### 每次尝试都带上调用方 context

先拒绝无效的尝试次数和负间隔，再为每次循环重新创建请求。每次重试共享一个取消范围，但使用新的 request 对象。

~~~go
for i := 0; i < attempts; i++ {
  req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
  if err != nil { return nil, err }
  resp, err := client.Do(req)
  if err == nil && resp.StatusCode < 500 { return resp, nil }
}
~~~

#### 关闭失败响应，再等待可取消的间隔

5xx 响应体必须关闭，避免连接资源被占住。timer 等待也监听同一个 context，调用方取消后不继续睡眠。

~~~go
_ = resp.Body.Close()
timer := time.NewTimer(delay)
select {
case <-ctx.Done(): timer.Stop(); return nil, ctx.Err()
case <-timer.C:
}
~~~

完整实现见 [RetryGET](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG011RetryGET](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是对付款 POST 自动重试可能重复扣款；需要幂等键和服务端去重。下一步可以对 429 支持 Retry-After，并对退避加上随机抖动。

### G012 传播请求 ID {#g012}

请求带 X-Request-ID: trace-9，handler 能从 context 取回相同值，响应头也返回相同编号。缺少 ID、包含非法字符或超过 128 字节时，服务生成新的随机追踪编号。

#### 先校验客户端给的编号

中间件在 handler 运行前创建派生 context，把请求范围的数据传入调用树；同时写回响应头，方便调用方提交故障证据。

~~~go
ctx := context.WithValue(r.Context(), requestIDKey{}, id)
next.ServeHTTP(w, r.WithContext(ctx))
~~~

完整实现见 [RequestID](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG012RequestID](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是包级可变 currentRequestID 会让并发请求互相覆盖。下一步可以用 crypto/rand 生成缺省 ID，并限制客户端 ID 长度和字符集。

### G013 限额读取 JSON 上传 {#g013}

最多接收指定字节数的 webhook JSON；超过限制或 JSON 错误时必须返回解码错误，不能把整个 body 先读入内存再检查。

#### 在解码前限制读取量

http.MaxBytesReader 在读取过程中执行上限检查，并将请求体超限报告为 *http.MaxBytesError。解码器再读一次以确定没有第二个 JSON 值。

~~~go
r.Body = http.MaxBytesReader(w, r.Body, limit)
defer r.Body.Close() // 成功与失败路径都关闭请求体
dec := json.NewDecoder(r.Body)
if err := dec.Decode(dst); err != nil { return err }
~~~

第一次解码成功后再读一次，只有 EOF 才说明 body 里刚好是一个 JSON 值。第二个值即使合法也不能被静默忽略。

~~~go
var extra any
if err := dec.Decode(&extra); err != io.EOF {
  if err == nil { return errors.New("multiple JSON values") }
  return err
}
~~~

完整实现见 [DecodeJSONLimit](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG013DecodeJSONLimit](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是 io.LimitReader 到上限后会表现为 EOF，调用方可能误以为截断 JSON 合法。下一步可以把超限错误映射成 413，把语法错误映射成 400。

### G014 严格配置 JSON {#g014}

只允许一个 JSON 值且不接受未知字段。{"name":"Ada"} 可通过；增加拼错字段或尾随第二个值必须失败。

#### 把拼错字段变成显式错误

DisallowUnknownFields 让字段拼写错误变得可见；第二次 decode 必须得到 EOF，才能拒绝拼接在后面的 JSON 值。

~~~go
dec.DisallowUnknownFields()
if err := dec.Decode(dst); err != nil { return err }
~~~

解码后继续读取，拒绝拼在后面的第二个值。这个检查与未知字段校验解决的是两种不同输入错误。

~~~go
var extra any
if err := dec.Decode(&extra); err != io.EOF {
  if err == nil { return errors.New("trailing JSON value") }
  return err
}
~~~

完整实现见 [DecodeStrictJSON](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG014StrictJSON](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是只调用一次 Decode 会接受 {} {} 的第一个值并忽略剩余字节。下一步可以区分 io.EOF、*json.SyntaxError 与未知字段错误，映射不同 API 错误码。

### G015 越界安全分页 {#g015}

输入 a,b,c，第 2 页、每页 2 项输出 c；越过末尾返回空页；页码为 0 或偏移量乘法溢出要报错。

#### 在计算切片范围前验证参数

先验证一基页码与正页大小，再检查偏移量乘法溢出。超出切片长度时返回空页；有效时用剩余元素数计算终点，避免 start 加 size 溢出。函数返回拷贝，调用方不能改写输入。

~~~go
if page-1 > maxInt/size { return nil, errors.New("page offset overflows int") }
start := (page - 1) * size
if start >= len(items) { return []T{}, nil }
~~~

完整实现见 [Page](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG015Page](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是 start := (page-1)*size 可能先溢出，再得到负索引。下一步可以为总页数计算补上加法溢出边界。

### G016 解析 Content-Length {#g016}

接受无空格、非负十进制字节数；拒绝 -1、前后空格、空串和超过 int64 的数字。

#### 校验头部的格式和数值范围

先确保原串没有空白，再用 ParseInt 限制目标位宽，最后显式拒绝负数。这样错误归一成调用方可识别的输入问题。

~~~go
n, err := strconv.ParseInt(raw, 10, 64)
if err != nil || n < 0 { return 0, errors.New("invalid content length") }
~~~

完整实现见 [ParseContentLength](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG016ContentLength](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是 Atoi 后忽略错误会把溢出输入当作零。下一步可以说明为什么实际 HTTP handler 仍应以读取时限制为准，不能只信请求头。

### G017 读取供应商响应且限制字节数 {#g017}

GET 出站 API 必须绑定调用方 context，只接受 2xx，读取最多 max 字节；超过限制、非 2xx、连接错误都返回错误并关闭响应体。

#### 同时限制等待和响应体

LimitReader(max+1) 只多读一个字节，用它判断超限；比把响应无限制读入内存再检查少一次无界分配。

~~~go
data, err := io.ReadAll(io.LimitReader(resp.Body, max+1))
if int64(len(data)) > max { return nil, errors.New("response body too large") }
~~~

完整实现见 [ReadHTTPBody](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG017ReadHTTPBody](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是只限请求体、不限对端响应仍可能耗尽客户端进程内存。下一步可以支持内容压缩时，明确限制压缩前还是解压后的字节。

### G018 区分存活与就绪 {#g018}

数据库不可用时 /live 仍返回 204，/ready 返回 503；未知路径返回 404。就绪检查最长运行两秒。

#### 把进程存活与依赖健康拆开

存活回答“进程是否还在响应”，就绪回答“当前能否承接流量”。如果把数据库检查放进 liveness，数据库短暂故障会触发进程重启风暴。

~~~go
if r.URL.Path == "/live" { w.WriteHeader(http.StatusNoContent); return }
~~~

完整实现见 [HealthHandler](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http.go)，对应测试见 [TestG018HealthHandler](https://github.com/Shyu-x/frontend-interview/blob/f682da9816e3f5454a3f1d8d8cb074d0de53236b/scripts/teaching-labs/go/http_test.go)。容易出错的是返回 200 却继续接入无法服务的流量。下一步可以把探针响应体和状态码定义成运维可监控的契约。

## 面试回答、真实验收与案例

30 秒回答：HTTP 边界先约束输入和输出字节，再解析；出站请求传入 context，只有可安全重放的操作才能重试；服务探针要区分进程存活和依赖就绪。

2 分钟回答：webhook handler 用 MaxBytesReader 在读取时限额，严格 JSON 解码拒绝未知字段和尾随值；GET 客户端用有限重试但每次关闭 5xx body，并将取消传给请求与退避 timer；响应体再用 LimitReader 限制。测试以真实 httptest 服务核对重试次数、HTTP 状态和响应大小边界，race 测试检查并发安全。

验收环境是本地 Go 1.27.1，无网络副作用；两条测试命令通过是阈值。错误证据由独立 TestGxxx 给出；httptest server 在测试退出前关闭，没有遗留文件或后台服务。

可对照 [Go net/http 官方文档](https://pkg.go.dev/net/http) 中的 MaxBytesReader 与 [标准库 HTTP server 源码](https://go.dev/src/net/http/server.go)：分别观察请求字节边界和 handler 生命周期。实际服务项目方面，可阅读 [Caddy 的 HTTP server 源码](https://github.com/caddyserver/caddy/tree/master/modules/caddyhttp) 与 [Kubernetes apiserver handlers](https://github.com/kubernetes/kubernetes/tree/master/staging/src/k8s.io/apiserver/pkg/endpoints/handlers)，比较成熟项目如何把协议入口和业务处理拆开。

## 自测与深入阅读

1. 为什么响应体大小限制不能只依据 Content-Length？
2. HTTP 客户端重试 POST 需要补充什么约束？
3. readiness 与 liveness 分别应该表达什么？

答案：头部可能缺失或不可信，读取时必须实际限额；幂等键/服务端去重以及明确的重放策略；是否能继续接流量、进程是否存活。深入阅读 [Go 关于请求取消的数据库示例](https://go.dev/doc/database/cancel-operations) 可了解请求 context 如何传到更深的 I/O 操作。
