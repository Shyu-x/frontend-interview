---
title: Go 数据结构实战：缓存、前缀检索与区间算法
description: 通过六道独立题解实现 LRU、Unicode 前缀树、堆选 K 项、区间合并、稳定去重和二分下界；每题给出边界测试、运行源码与可扩展练习。
tags: [go, algorithms, data-structures]
date: 2026-10-13
level: intermediate
prerequisites:
  - Go map、slice、泛型和排序基础
  - 大 O 复杂度基础
runnable: true
tested_with:
  - go@1.27.1
verified_at: 2026-10-13
source_commit: 27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb
---

# Go 数据结构实战 缓存、前缀检索与区间算法

实时服务中有些数据需要快速反复读取，有些输入需要做前缀搜索或区间归并。这组题练习从题目约束选结构：键值淘汰用双向链表加 map，前缀匹配用 trie，最小 K 项用大小为 K 的最大堆。

~~~mermaid
flowchart LR
  KeyValue["键和值"] --> LRU["LRU：map + 双向链表"]
  Text["Unicode 文本"] --> Trie["按 rune 分支的前缀树"]
  Stream["大量数字"] --> Heap["固定大小最大堆"]
  Ranges["区间集合"] --> Sort["排序后一次扫描"]
  Sorted["有序数组"] --> Search["二分下界"]
~~~

判断结构时先看需要的操作和输入规模，再决定是否付出额外内存来换查询速度。这里的 LRU 保证线程安全；Trie 没有加锁，示例调用方应串行访问。

## 运行与验收

~~~sh
cd scripts/teaching-labs/go
go test ./...
go test -race ./...
~~~

每题测试用输入输出断言覆盖空值、容量和非法边界；LRU 的并发访问会由 race detector 检查。通过标准是全部测试通过且无 race 报告。测试只使用内存数据，不需要清理额外资源。

## G025–G030 常用数据结构与算法 {#g025}

### G025 模板缓存的 LRU 淘汰 {#g025}

容量为 2，依次写入 a、b，读取 a 后写入 c；此时 b 应被淘汰。更新 a 的值后再次读取必须拿到新值。

#### 先让 map 定位节点

map 通过键找到链表节点，双向链表把最近访问项移到头部。读取也会改变新旧顺序，因此 Get 同样要拿互斥锁。

~~~go
func (c *LRU[K, V]) Get(k K) (V, bool) {
  c.mu.Lock()
  defer c.mu.Unlock()
  n := c.order.items[k]
~~~

完整实现见 [LRU](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG025LRU](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。容量为 0 在构造时拒绝。若只更新 map、不移动链表，热键会被错误淘汰。下一步可以增加删除键方法，并检查头尾指针在删唯一节点时的状态。

### G026 中文站点名称前缀树 {#g026}

插入“东京”和“東京駅”后，精确查找“东京”成功，查找“东”不应误作完整词命中，而“東京”应命中前缀。

#### 按字符而不是字节推进

Go 的 string 是 UTF-8 字节序列。按 rune 遍历能让边界落在 Unicode 码点上；节点另存 terminal 标志来区分完整单词和仅为前缀的节点。

~~~go
for _, r := range word {
  if n.children[r] == nil { n.children[r] = &trieNode{children: make(map[rune]*trieNode)} }
  n = n.children[r]
}
~~~

完整实现见 [Trie](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG026Trie](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。空串在未插入时不算词。直接按字节切字符串会把多字节字符切成无效片段。下一步可以实现删除词，同时保留仍属于其他词前缀的节点。

### G027 价格表里的最小 K 项 {#g027}

输入 [9,1,5,2,8] 且 K 为 3，返回 [1,2,5]；K 为 0 返回空切片，K 大于输入长度报错。

#### 用堆保留候选

先用 K 个值建最大堆。之后只需比较堆顶：新值更小时替换最大项。最后对 K 个候选排序，既保持 O(K) 额外空间，又输出有序答案。

~~~go
if v < h[0] {
  h[0] = v
  heap.Fix(&h, 0)
}
~~~

完整实现见 [KSmallest](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG027KSmallest](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。对所有 N 项完整排序需要 O(N log N)，当 K 远小于 N 时做了多余工作。下一步可以把结果改成最大的 K 项，并支持价格相同时按商品 ID 排序。

### G028 合并维护时间段 {#g028}

闭区间 [1,3]、[3,4] 和 [5,7] 应输出 [1,4]、[5,7]；起点大于终点的输入报错。

#### 先排序再扫描

先复制再排序，避免调用方传入的切片被改写。随后一次扫描已排序区间；闭区间在端点相等时也相交，所以起点大于当前终点才新开一段。

~~~go
if n == 0 || v.Start > out[n-1].End {
  out = append(out, v)
} else if v.End > out[n-1].End {
  out[n-1].End = v.End
}
~~~

完整实现见 [MergeIntervals](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG028MergeIntervals](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。若业务用半开区间，接触边界的合并规则要重新定义。下一步可以输入区间改成半开，写一组恰好相接的反例。

### G029 保留首次选择顺序的去重 {#g029}

输入标签 [a,b,a,c,b]，结果应为 [a,b,c]，保留各元素第一次出现的顺序。

#### 只在首次出现时写入

用 map 记录是否见过，只在首次出现时 append。泛型约束 comparable 是因为 map 键需要可比较；不应为了去重把结果排序，那会丢掉用户选择顺序。

~~~go
if _, ok := seen[v]; ok { continue }
seen[v] = struct{}{}
out = append(out, v)
~~~

完整实现见 [StableUnique](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG029StableUnique](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。slice、map 等不可比较类型不能直接作为元素类型。下一步可以传入 key 提取函数，为不可比较结构体按业务 ID 去重。

### G030 查找首个达标价格 {#g030}

在 [1,3,3,7] 中找第一个不小于目标的索引。目标 3 返回 1，目标 4 返回 3，目标 8 返回切片长度 4。

#### 维护半开搜索范围

维护半开搜索范围 [lo, hi)，每轮都缩小到仍可能是答案的区域。中点写成 lo + (hi-lo)/2，避免 lo+hi 溢出。

~~~go
if values[mid] < target { lo = mid + 1 } else { hi = mid }
~~~

完整实现见 [LowerBound](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures.go)，对应测试见 [TestG030LowerBound](https://github.com/Shyu-x/frontend-interview/blob/27ac651e0a1ac3d53eee663fe2d6e5b0d45f00eb/scripts/teaching-labs/go/structures_test.go)。输入未排序时二分结论无效。下一步可以用两个 lower bound 找出等于目标的完整索引范围。

## 面试回答、真实验收与案例

30 秒回答：根据操作选结构。LRU 用 map 做 O(1) 定位、链表维护访问顺序；Trie 按字符路径做前缀查找；最小 K 用固定大小堆；区间问题先排序后扫描；下界查找要求输入已排序。

2 分钟回答：先写明输入规模、排序要求、是否保序与并发访问。LRU 读也修改链表，所以需要互斥锁；前缀树按 rune 迭代以避免拆开 UTF-8 字符；KSmallest 以最大堆维护当前最小候选，复杂度 O(N log K)；区间合并排序后线性扫描。测试分别覆盖淘汰、中文字符、K 边界、端点相接及下界首个重复项。

真实验收输入全在内存构造，不依赖时钟或外部数据。普通测试检查精确输出与反例；race 测试检查 LRU 读写共享状态。通过阈值是两项命令都通过。

真实系统阅读：[Kubernetes client-go 的缓存目录](https://github.com/kubernetes/client-go/tree/master/tools/cache) 可观察 informer index/cache 的查询需求，[Prometheus TSDB index](https://github.com/prometheus/prometheus/tree/master/tsdb) 可观察大规模时间序列索引设计。算法基础可对照 [Go heap 接口文档](https://pkg.go.dev/container/heap)。

## 自测与深入阅读

1. 为什么 LRU 的 Get 也需要写锁？
2. 按 UTF-8 字节遍历与按 rune 遍历有什么区别？
3. K 接近 N 时，最大堆方案还一定优于完整排序吗？

答案：读取会移动链表节点；rune 迭代以码点为单位，字节索引可能落在字符中间；不一定，需结合常数、K/N 和是否需要排序判断。深入阅读 [Go sort 包](https://pkg.go.dev/sort) 与 [container/heap](https://pkg.go.dev/container/heap) 可了解标准库接口如何配合自定义数据结构。
