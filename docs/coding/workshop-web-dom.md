---
title: DOM 与无障碍手写题解：委托、焦点和异步表单 W025–W032
description: 八道 DOM 题从动态列表委托讲到原生 dialog、combobox 键盘导航、IntersectionObserver、表单错误关联、焦点边界和提交门控；附可直接打开的 HTML 演示及边界测试。
tags: [coding, interview, dom, accessibility, browser]
date: 2026-10-13
level: intermediate
prerequisites:
  - HTML DOM 事件、ARIA 属性与 Promise
  - Node.js 20+；浏览器手动验收需要现代浏览器
runnable: true
tested_with:
  - node@24.16.0
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# DOM 与无障碍手写题解 委托、焦点和异步表单 W025–W032

可在浏览器直接打开 [`demo.html`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/demo.html) 看真实 DOM 操作。源码模块在 [`dom.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/dom.mjs)，Node 单测在 [`dom.test.mjs`](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/web/dom.test.mjs)，运行 `node --test scripts/teaching-labs/web/dom.test.mjs`。Node 测试用轻量对象检查调用合同；它没有浏览器布局树、读屏软件或真实焦点系统，所以不等同于浏览器验收。

## W025 动态订单列表只绑定一次 {#w025}

订单列表不断追加行，每行的“取消”按钮都要更新状态。把事件绑在初始按钮上，新插入行不会响应；若每次渲染都再绑定，旧 listener 容易残留。事件冒泡让父列表处理后代按钮：

```js
const target = event.target.closest(selector);
if (target && root.contains(target)) handler(event, target);
```

`closest` 能从按钮内的图标找到按钮本身，`contains` 则挡住从列表外冒泡的匹配元素。返回的 disposer 解绑父节点 listener。演示页点“新增订单行”，再点新行取消按钮，状态仍能更新；测试覆盖动态目标和列表外目标。

## W026 一个布尔值同时控制面板和读屏状态 {#w026}

点击“显示发票详情”，可见区域与 `aria-expanded` 应一起变成展开；再次点击两者一起关闭。不要分别维护 `isOpen`、hidden 和 ARIA 文本三份状态。

```js
button.setAttribute('aria-expanded', String(expanded));
panel.hidden = !expanded;
```

状态从一个 boolean 派生，避免视觉已展开但读屏仍宣布折叠。演示页的按钮同时更新自身文案，真实浏览器可用 Tab 聚焦后按 Enter 验收；Node 测试仅检查属性和 hidden 的同步。

## W027 优先使用原生 dialog 管理模态焦点 {#w027}

退款说明是阻断当前任务的模态内容。原生 `<dialog>.showModal()` 会进入浏览器模态层，关闭后页面还要把焦点交还给触发按钮：

```js
dialog.addEventListener('close', onClose);
return {
  open() { dialog.showModal(); },
  close() { if (dialog.open) dialog.close(); },
  dispose() {
    const wasOpen = dialog.open;
    if (wasOpen) dialog.close();
    dialog.removeEventListener('close', onClose);
    if (wasOpen) opener.focus();
  },
};
```

`close` 事件由浏览器排队派发。普通关闭由事件监听恢复焦点；`dispose()` 会先关闭仍打开的 dialog、移除监听，再同步调用 `opener.focus()`，不依赖稍后派发的事件。测试用异步 close-event adapter 覆盖这个时序。手写 modal 还得覆盖 Escape、背景点击、滚动锁定、焦点初始位置和 Tab 围栏，所以这里保留原生语义。打开演示页后按 Tab/Shift+Tab 检查焦点没有跑到对话框背后，按关闭后焦点回到“打开退款说明”。Node 用例不是浏览器焦点系统验收。

## W028 Combobox 用 active descendant 移动选项 {#w028}

配送城市输入框的焦点留在 input，方向键仅改变当前选项。列表有 3 项时从最后一项按 ArrowDown 回到 0，从首项按 ArrowUp 到 2；空列表返回 `-1`。

```js
if (!options.length) return -1;
return (current + delta + options.length) % options.length;
```

循环取模让边界两端自然衔接。组合框通常通过 `aria-activedescendant` 暴露当前项，而不是频繁把 DOM 焦点移进列表。本题实现只处理索引移动，筛选、Home/End、Escape、选中值与读屏兼容需由完整组件合同补足。演示页上下箭头后检查焦点仍在输入框。

## W029 图片接近视口时再设置 src {#w029}

商品详情页可以延迟加载长列表中的图片。observer 进入视口或 200px 预加载边距时才设置 `src`，设置后立即停止观察：

```js
if (entry.isIntersecting) {
  const image = entry.target;
  image.src = image.dataset.src;
  observer.unobserve(image);
}
```

一份 observer 可观察多个目标；每个目标只加载一次并减少后续回调。Node 测试注入 observer adapter，只证明回调逻辑。打开演示页并滚动至色块，确认状态提示改变且 Network/元素面板显示 src 更新；这是实际浏览器 API 检查。官方说明见 [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)。

## W030 字段错误不能覆盖帮助文案 {#w030}

资料表单已有 `email-help`，提交格式错误时要再关联 `email-error`，清错后只去掉 error ID。错误节点显示“请输入有效邮箱”，字段设置 `aria-invalid=true`。

```js
const ids = new Set((field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
if (message) { ids.add(errorNode.id); field.setAttribute('aria-invalid', 'true'); }
else { ids.delete(errorNode.id); field.removeAttribute('aria-invalid'); }
```

Set 去重后稳定序列化 ID；直接把字符串换成错误 ID 会让读屏用户丢失原有帮助。演示中提交空/非法 email，再看错误提示、焦点移动和 `aria-describedby`。Node 测试检查保留 help 的失败与清空边界。

## W031 Tab 到边缘时回绕 {#w031}

如果自建 modal 而无法使用原生 dialog，Tab 在最后一个可聚焦项要回到第一项，Shift+Tab 在第一项要跳到最后一项。调用时把 `document.activeElement` 作为第三个参数传入。`wrapTab` 只拦截这两个边界，不干扰中间的浏览器原生顺序：

```js
if (event.shiftKey && event.activeElement === first) { event.preventDefault(); last.focus(); return true; }
if (!event.shiftKey && event.activeElement === last) { event.preventDefault(); first.focus(); return true; }
```

焦点列表必须在打开/关闭和内容变化时重新计算，隐藏项不应纳入。Node 用对象检查调用顺序；实际 demo 用原生 dialog 做浏览器层对照，生产实现优先选择原生对话框。

## W032 提交按钮只在等待期间锁定 {#w032}

资料保存期间重复点击应被忽略。请求成功返回 `{ status: 'submitted', value }`，失败返回 `{ status: 'failed', error }`，两种情况最终都恢复按钮。

```js
if (button.disabled) return { status: 'ignored' };
button.disabled = true;
try { return { status: 'submitted', value: await submit() }; }
catch (error) { return { status: 'failed', error }; }
finally { button.disabled = false; }
```

`finally` 保证失败也能重试。只在成功后解锁会让一次断网永久禁用表单。演示提交有效 email 可观察按钮短暂 disabled；单测让请求 reject 并确认解锁。后端仍需幂等保护，因为客户端按钮门控不阻止跨标签页或重放请求。

## 规范与题型参考

本组聚焦 BFE/GreatFrontEnd 中的 DOM 遍历、事件委托与常见 UI 编码题，再补齐可访问交互的状态边界。参考 [GreatFrontEnd JS interview playbook](https://www.greatfrontend.com/front-end-interview-playbook/javascript)、[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) 与 MDN 的 [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)。浏览器支持范围以各浏览器兼容表为准。
