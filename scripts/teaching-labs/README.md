# 代码实战实验

所有命令从仓库根目录运行。使用 Node.js 22.18 或更新版本。Go 版本由 `go/go.mod` 声明。代码不需要第三方服务或生产凭据。

```sh
node scripts/check-teaching-labs.mjs
node --test scripts/teaching-labs/web/*.test.mjs scripts/teaching-labs/node/*.test.mjs
cd scripts/teaching-labs/go
go test -count=1 ./...
go test -race -count=1 ./...
```

Web 有 W001–W040。Node 有 N001–N030。Go 有 G001–G036。各目录的 `catalog.json` 对应具体实现、教学页、业务场景和测试。

## 浏览器验收

另开终端，在仓库根目录启动本地演示服务。

```sh
node scripts/teaching-labs/browser-server.mjs
```

打开 `http://127.0.0.1:8123/scripts/teaching-labs/web/demo.html` 测试 DOM 和键盘。打开同目录的 `network-demo.html` 测试真实 XHR、fetch、HTTP 错误、取消和乱序返回。它们直接导入对应实验模块，不使用另一份演示实现。

全站布局检查需要先构建站点，并安装 agent-browser 和 Chromium。可调整 `AGENT_BROWSER_EXECUTABLE` 与 `CHROME_PATH` 指定程序位置。

```sh
uv run mkdocs build --strict --clean
node scripts/check-browser-teaching.mjs
```

检查会打开真实页面。它验证接口成功与失败、取消、最新结果、DOM 状态、焦点归还、观察器，以及 1440、1024、390、320 像素下的布局。退出时关闭它自己的浏览器会话。本地服务按 Ctrl+C 关闭。

## 验证边界

单元测试覆盖函数和状态。浏览器测试覆盖具体 DOM 与网络行为。Go race 检查本次测试中的并发执行。它们不证明多进程数据库一致性、读屏器支持、真实 GPU 驱动行为或崩溃后的磁盘耐久性。各题解释对应边界，不把内存模拟当生产系统。
