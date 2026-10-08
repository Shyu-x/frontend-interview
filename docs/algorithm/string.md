---
title: 字符串题型
description: LeetCode Hot 100 字符串类题目：滑动窗口、子串匹配、字母异位词与回文串。
tags:
  - algorithm
  - leetcode
date: 2026-05-17
---

# 字符串题型

## 1. 无重复字符的最长子串

**题号**: 3  
**名称**: Longest Substring Without Repeating Characters  
**链接**: https://leetcode.cn/problems/longest-substring-without-repeating-characters/

**核心思路**: 滑动窗口 + 哈希集合。维护左右指针，遇重复字符时收缩左指针。

**JavaScript 实现**:

```javascript
// 第 1 段：函数入口与窗口状态初始化（搭建滑动窗口的输入、边界与答案容器）
// 采用「滑动窗口 + 哈希集合」：left/right 维护当前无重复子串的闭区间 [left, right]。
// set 负责 O(1) 判断窗口内是否已有某字符，maxLen 记录历史最优；时间 O(n)，空间 O(min(n, 字符集大小))。
function lengthOfLongestSubstring(s) {
  const set = new Set(); // 窗口内字符集合，重复判断的平均复杂度为 O(1)
  let left = 0; // 窗口左界，单调右移，永不回退
  let maxLen = 0; // 目前找到的最长无重复子串长度

  // 第 2 段：右指针线性推进（枚举每个可能的窗口右端点 right）
  // right 只增不减，保证每个字符最多进出窗口一次，是整体 O(n) 的关键。
  // 每轮先把 s[right] 纳入视野，再根据是否重复决定左边界是否需要收缩。
  for (let right = 0; right < s.length; right++) {
    // 第 3 段：发现重复时收缩窗口（用 while 连续移除，直到 s[right] 不再冲突）
    // s[right] 已在 set 中，说明窗口 [left, right-1] 内存在相同字符，必须从左边逐个删除并右移 left。
    // 易错点：删除的是 set 中的 s[left] 再 left++；闭区间长度是 right-left+1，不是 right-left。
    while (set.has(s[right])) { // 重复字符在窗口内，触发收缩
      set.delete(s[left]); // 先移除即将离开窗口的字符
      left++; // 再移动左指针
    }
    // 第 4 段：纳入当前字符并更新答案（此时窗口内一定无重复）
    // while 结束后 s[right] 不再与窗口冲突，可安全加入 set。
    // 立即用 right-left+1 更新 maxLen，避免漏掉以当前 right 结尾的最优解。
    set.add(s[right]); // 窗口右端纳入新字符
    maxLen = Math.max(maxLen, right - left + 1); // 闭区间 [left,right] 的长度
  }

  // 第 5 段：返回全局最优解（空串或全重复等边界自然覆盖）
  // 循环结束时 maxLen 已比较过所有以各 right 结尾的无重复子串。
  return maxLen;
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(min(m, n)) - m 为字符集大小

---

## 2. 最小覆盖子串

**题号**: 76  
**名称**: Minimum Window Substring  
**链接**: https://leetcode.cn/problems/minimum-window-substring/

**核心思路**: 滑动窗口 + 哈希表计数。先扩展右边界找到可行解，再收缩左边界找最优解。

**JavaScript 实现**:

```javascript
function minWindow(s, t) {
  // 第 1 段：统计需求表 need —— 记录 t 中每个字符需要凑齐的次数
  // 用 Map 而非 26/128 长度数组，是为了兼容任意 Unicode 字符（中文、emoji 等）。
  // `(need.get(c) || 0) + 1` 是对 undefined 的兜底：首次出现的字符从 0 起步。
  const need = new Map();
  const window = new Map();

  for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
  }

  // 第 2 段：初始化滑动窗口的状态量
  // 采用左闭右开区间 [left, right)，因此窗口长度恒为 right - left，无需 +1，不易算错。
  // valid 记录"已达标"的字符种数（注意是种类，不是个数）；当 valid === need.size 时窗口即覆盖 t。
  // start/minLen 而非直接存子串，是为了避免每次更新答案都做一次字符串拷贝，把更新降为 O(1)。
  let left = 0, right = 0;
  let valid = 0;
  let start = 0, minLen = Infinity;

  // 第 3 段：右指针扩张窗口，把新字符纳入统计
  while (right < s.length) {
    const c = s[right];
    right++; // 先自增：此后 right 指向区间右边界，s[right-1] 才是刚纳入的字符

    // 只为 need 中出现的字符维护计数：无关字符不进 window，省时间也省空间。
    // 只有"从不足变为刚好达标"这一刻才 valid++；若已超量（如窗口里 3 个 a 而 need 要 2 个），
    // 不能重复加，否则 valid 会被虚高，导致收缩条件误判。
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }

    // 第 4 段：窗口已覆盖 t，左指针收缩以逼近最小长度
    // 内层 while 是本题"找最小"的关键：一旦满足条件就尽可能右移 left，直到覆盖被破坏。
    // 每次收缩前的窗口都是可行解，先更新答案再删字符，避免漏掉当前这个更优解。
    while (valid === need.size) {
      if (right - left < minLen) {
        start = left;
        minLen = right - left; // 窗口长度 = right - left（右开区间）
      }

      const d = s[left];
      left++;

      if (need.has(d)) {
        // 顺序敏感：必须在 window 计数自减之前判断是否等于 need。
        // 若相等，说明这一删就会让该字符由达标变为不足，于是 valid--。
        // 若当前已超量（window > need），删掉一个仍达标，valid 不变。
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d) - 1);
      }
    }
  }

  // 第 5 段：汇总结果
  // minLen 仍为 Infinity 说明从未出现过合法窗口（典型边界：t 比 s 长，或 s 缺少 t 的字符），返回空串。
  // 否则用 substring 按记录的起点与长度截取；时间复杂度 O(n + m)，空间 O(k)，k 为不同字符数。
  return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
```

**复杂度分析**:

- 时间复杂度: O(n + m) - n=s.length, m=t.length
- 空间复杂度: O(m)

---

## 3. 字符串第一个唯一字符

**题号**: 387  
**名称**: First Unique Character in a String  
**链接**: https://leetcode.cn/problems/first-unique-character-in-a-string/

**核心思路**: 两次遍历。第一次统计频率，第二次找第一个频率为1的字符。

**JavaScript 实现**:

```javascript
// 第 1 段：建立字母频次表（用定长数组替代哈希表）
function firstUniqChar(s) {
  // 题面限定输入只含小写字母，于是 26 个字母可用下标 0-25 一一映射，
  // 比 Map/对象少一次哈希与装箱开销，常数更小；fill(0) 必须写，否则数组元素是 empty，参与 ++ 会得到 NaN。
  const count = new Array(26).fill(0);

  // 第 2 段：第一遍扫描——统计每个字符出现次数
  // 用 for...of 遍历字符串会按 Unicode 码点迭代，这里配合 charCodeAt(0) 取首码元；
  // 'a' 的码点是 97，减去 97 即得 [0,25] 的槽位，这个 97 是整个映射的基石，写错就整体错位。
  for (const c of s) {
    count[c.charCodeAt(0) - 97]++;
  }

  // 第 3 段：第二遍扫描——按原字符串顺序找第一个计数为 1 的字符
  // 注意为什么要有第二遍：频次表本身丢失了"谁先出现"的顺序信息，
  // 只有按下标 i 从 0 递增回访原串，才能保证返回的是最靠前的唯一字符。
  for (let i = 0; i < s.length; i++) {
    // 用 s[i] 而非 for...of 取值，是为了让 i 与字符位置严格对应（for...of 的索引需额外维护）。
    if (count[s[i].charCodeAt(0) - 97] === 1) {
      return i;
    }
  }

  // 第 4 段：兜底返回
  // 走到这里说明不存在唯一字符（含空串、全重复等边界），按约定返回 -1。
  // 复杂度：时间 O(n)（两趟线性扫描），空间 O(1)（固定 26 槽，与 n 无关）；
  // 易错点：若输入含大写字母或非字母字符，下标会越界或为负，此写法不再成立。
  return -1;
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1) - 固定26个字母

---

## 4. 有效的字母异位词

**题号**: 242  
**名称**: Valid Anagram  
**链接**: https://leetcode.cn/problems/valid-anagram/

**核心思路**: 哈希表计数或数组计数。

**JavaScript 实现**:

```javascript
// 第 1 段：长度快速失败（长度不等绝不可能是变位词，提前返回省去后续 O(n) 开销）
function isAnagram(s, t) {
  // 变位词要求字母完全一致、只是顺序不同，长度不等直接判定失败；这行也是最省事的剪枝。
  if (s.length !== t.length) return false;

  // 第 2 段：建立"字母计数账本"（用数组下标代替哈希表，换取常数级访问与更低开销）
  // 只支持小写英文字母 a~z 共 26 个，所以用固定长度数组而非 Map；空间恒为 O(1)。
  // 注意：new Array(26) 产生的是 26 个 empty slot（稀疏数组），必须用 fill(0) 填成真正的 0，否则下面 ++ 会得到 NaN。
  const count = new Array(26).fill(0);

  // 第 3 段：一次遍历同时"记账"和"销账"（核心技巧：加法与减法就地抵消）
  // 遍历 s 时把字母计数 +1，遍历 t 时把同位置字母计数 -1；这样即便两串顺序不同，同一字母也会在同一格子里相互抵消，故只需单次循环而非两次遍历。
  // charCodeAt(0) - 97 是把 'a'(97) 映射到下标 0、'z'(122) 映射到下标 25 的常见技巧；若输入含大写字母或非字母字符，减法会越界产生非法下标，这是该写法的隐含边界假设。
  for (let i = 0; i < s.length; i++) {
    count[s[i].charCodeAt(0) - 97]++; // s 的字母"存入"账本
    count[t[i].charCodeAt(0) - 97]--; // t 的字母"扣减"账本
  }

  // 第 4 段：验证账本是否已全部清零（每个字母在 s、t 中出现次数必须两两相等）
  // every 对数组所有元素做全称判断，全部为 0 才返回 true；一旦某个字母多/少，对应格子非 0 即被识破。
  // 复杂度：时间 O(n)，空间 O(1)（数组长度固定为 26，与 n 无关）；两串都为空时返回 true，符合空串互为变位词的约定。
  return count.every(c => c === 0);
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 5. 找到字符串中所有字母异位词

**题号**: 438  
**名称**: Find All Anagrams in a String  
**链接**: https://leetcode.cn/problems/find-all-anagrams-in-a-string/

**核心思路**: 滑动窗口 + 固定大小窗口计数比较。

**JavaScript 实现**:

```javascript
// 第 1 段：准备工作——用两个固定长度 26 的计数数组做“账本”，再备好结果数组
// 题目限定只含小写字母，所以可以用 26 个桶的下标 0~25 表示 'a'~'z'，把哈希表降维成数组，
// 这样每次读写计数都是 O(1)，也省去了哈希开销；need 记录目标需求，window 记录当前窗口实况。
function findAnagrams(s, p) {
  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  const result = [];

  // 第 2 段：把模式串 p 的需求“记账”到 need 中
  // charCodeAt(0) - 97 是把字符映射到 0~25 的常用技巧（'a' 的编码是 97）；
  // 边界前提是输入只含小写字母，若出现大写或非字母，下标会越界或错位。
  for (const c of p) {
    need[c.charCodeAt(0) - 97]++;
  }

  // 第 3 段：双指针与有效计数器的初始化
  // left/right 构成左闭右开的滑动窗口 [left, right)；valid 不是“窗口长度”，
  // 而是“已经满足需求的字符个数”，它的上限就是 p.length，是判断异位词的唯一依据。
  let left = 0, right = 0;
  let valid = 0;

  // 第 4 段：右指针扩张——把 s[right] 纳入窗口，并维护 valid
  // 这里 valid 的自增条件用的是 <= 而不是 ==：一旦某个字符的出现次数超过 need 的需求，
  // 多出来的部分是“冗余字符”，不计入 valid，这样 valid 才等价于“需求被完整覆盖”。
  while (right < s.length) {
    const c1 = s[right].charCodeAt(0) - 97;
    right++;
    window[c1]++;

    if (window[c1] <= need[c1]) {
      valid++;
    }

    // 第 5 段：窗口达到 p 的长度后进行结算，然后强制收缩一格
    // 因为只在 right-left >= p.length 时进入此分支、且每次只 left++ 一次，
    // 所以后续每轮检查时窗口长度恒等于 p.length——这是“定长窗口”写法，无需再比长度。
    // valid === p.length 意味着窗口内每个字符都不超出需求且需求全部满足，故当前位置就是一个异位词起点。
    if (right - left >= p.length) {
      if (valid === p.length) {
        result.push(left);
      }

      // 收缩：注意 valid 的判断必须在 window[c2]-- 之前，且判断的是“减之前”的计数，
      // 与入窗时的逻辑对称；若先减后判，会漏掉/多加一次 valid，导致结果错误。
      const c2 = s[left].charCodeAt(0) - 97;
      left++;

      if (window[c2] <= need[c2]) {
        valid--;
      }
      window[c2]--;
    }
  }

  // 第 6 段：返回所有匹配的起始下标
  // 整体时间 O(n + m)（n、m 分别为 s、p 长度），空间 O(1)（两个常量大小的数组）；
  // 边界情况：p 比 s 长时循环内永远不会进入结算分支，直接返回空数组。
  return result;
}
```

**复杂度分析**:

- 时间复杂度: O(n)
- 空间复杂度: O(1)

---

## 6. 最长回文子串

**题号**: 5  
**名称**: Longest Palindromic Substring  
**链接**: https://leetcode.cn/problems/longest-palindromic-substring/

**核心思路**: 中心扩展法。从每个位置向两边扩展，考虑奇数和偶数长度。

**JavaScript 实现**:

```javascript
function longestPalindrome(s) {
  if (s.length < 2) return s;

  let start = 0, maxLen = 1;

  function expand(left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      if (right - left + 1 > maxLen) {
        start = left;
        maxLen = right - left + 1;
      }
      left--;
      right++;
    }
  }

  for (let i = 0; i < s.length; i++) {
    expand(i, i);     // 奇数长度
    expand(i, i + 1); // 偶数长度
  }

  return s.substring(start, start + maxLen);
}
```

**复杂度分析**:

- 时间复杂度: O(n^2)
- 空间复杂度: O(1)

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格做列内关键字高亮 | 最长无重复字符子串 | 后端游标分页 + 前端虚拟滚动 | 窗口只对单列文本成立，跨列匹配要另建索引 |
| 采集端每秒数千行日志的截断与去重 | 最长无重复字符子串 | Fluent Bit filter / Vector transform | 先定长度按字节算还是按码点算，两者结果不同 |
| 客服质检取"包含全部关键词"的最短片段 | 最小覆盖子串 | Spark 批处理 / Python 多进程 | 关键词表变更后缓存必须失效并重跑 |
| 搜索联想词把字母构成相同的词合并 | 找到字符串中所有字母异位词 | 倒排索引 + 定长窗口扫描 | 只对等长词成立，大小写与全半角要先归一 |
| 短链接服务校验候选码字符是否重复 | 最长无重复字符子串 | Redis SETNX + 本地校验函数 | 随机码空间随存量缩小，需准备可重复策略 |
| 生物序列里查找反向重复片段 | 最长回文子串 | EMBOSS einverted / 自写中心扩展 | 允许错配时要把严格相等换成带罚分比对 |
| 多人协作白板把英文标签按字母构成聚类 | 有效的字母异位词 | 前端 Web Worker + 频次数组 | 标签混入中文或表情时签名失效，先判字符集 |
| 订单号批量对账中识别重复提交 | 字符串第一个唯一字符 | 数据库唯一索引 + 内存计数 | 流式输入要能在不驻留全量的前提下计数 |

### 三个场景拆解

#### 场景 1：日志采集端的单行去重与截断

**业务背景**：采集端每秒要处理数千到数万行日志，单行长度从几十字节到几万字节不等。带高重复字符的长行（例如 base64 载荷、重复分隔符）会撑大下游索引，需要在采集端先判定再截断。

**怎么用本页知识解决**：思路是用滑动窗口扫一遍，算出最长无重复字符子串占整行的比例。比例低于阈值就判定为高重复行，交给下游截断或丢弃；整个过程只扫一次，不需要额外分配与行长同阶的空间。

```python
def unique_ratio(s: str) -> float:
    last = {}                 # 字符 -> 最近一次出现的下标
    left = 0                  # 窗口左边界
    best = 0                  # 最长无重复窗口的长度
    for right, ch in enumerate(s):
        pos = last.get(ch)
        if pos is not None and pos >= left:
            left = pos + 1    # 左边界跳到重复字符的旧位置之后
        last[ch] = right      # 更新该字符的下标
        span = right - left + 1
        if span > best:
            best = span
    return best / len(s) if s else 1.0   # 返回最长无重复段占比
```

- 循环里只做字典读写与一次比较，单行处理时间随行长线性增长。
- `left = pos + 1` 是关键：重复字符在窗口外时不移动左边界，否则会把合法窗口切短。
- 返回的是占比而不是绝对长度，阈值可以跨不同长度的行复用。
- 空串返回 1.0，调用方不必为边界单独分支。
- 函数不修改入参，采集端可对原始字节做一次解码后直接调用。

**怎么度量收益**：看采集端进程的 CPU 占用与单行处理耗时的 P99，用 `perf` 或 `py-spy` 采样，再用 Prometheus 的 histogram_quantile 看分位值。下游看索引写入字节数与段合并次数，用同一份日志语料跑前后两轮做对照。

**什么时候不该用**：

- 行长度上限本身就很小（少于 32 字节）时，插入判定分支的维护成本高于收益。
- 合规审计要求保留原文，截断会破坏证据链，此时只能做标记，不能改内容。
- 文本包含代理对或组合字符时，按码元计数与按码点计数会给出不同占比，必须先明确口径。

#### 场景 2：质检系统截取包含全部关键词的最短片段

**业务背景**：一通会话少则几十轮、多则上千轮，关键词表有几十到几百个词。质检需要从整段文本里给出覆盖全部关键词的最短片段，让人工复核时只看这一小段。

**怎么用本页知识解决**：思路是右边界持续扩展直到窗口覆盖全部关键词，然后收缩左边界，每收缩一步就记录一次可行窗口，取最短的那个。缺口用计数表维护，窗口是否覆盖由"还差多少个字符"这个整数判断，不必每次重扫窗口。

```python
from collections import Counter

def min_window(s: str, t: str) -> str:
    need = Counter(t)          # 每个目标字符还需要的个数
    missing = len(t)           # 还差多少个字符才覆盖完
    left = 0
    best = (0, 10 ** 9)        # 最优窗口的 (起点, 终点)
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1       # 这个字符确实被缺口需要
        need[ch] -= 1
        while missing == 0:    # 窗口已覆盖全部目标字符
            if right - left < best[1] - best[0]:
                best = (left, right)   # 记录更短的可行窗口
            need[s[left]] += 1         # 左边界右移，归还字符
            if need[s[left]] > 0:
                missing += 1           # 归还后重新出现缺口
            left += 1
    return "" if best[1] == 10 ** 9 else s[best[0]:best[1] + 1]
```

- 内层 `while` 每轮至少右移一次左边界，整个函数左右指针合计移动不超过 2n 次。
- `best` 存下标而不是子串，避免每轮都做字符串切片。
- 关键词表里重复出现的字符由 `Counter` 自动累加，调用方不必去重。
- 返回空串表示不存在覆盖片段，调用方据此走"无命中"分支。
- 要定位到轮次而不是字符下标，可在返回后对片段做一次轮次映射。

**怎么度量收益**：看单次质检耗时与单会话耗时分布，用 pytest-benchmark 或 hyperfine 在固定语料上跑前后对比，线上用 OpenTelemetry 打 span 看分位。业务侧看人工复核的单条平均查看字数与复核耗时。

**什么时候不该用**：

- 关键词允许同义替换时，字符级覆盖不成立，要先做同义扩展再跑窗口。
- 关键词表只有一个词时，直接用字符串查找定位首次出现位置即可，窗口逻辑都是多余的。
- 会话文本以流式方式到达且不能全量驻留内存时，需要改成按块处理并处理跨块边界。

#### 场景 3：协作白板把英文标签按字母构成聚类

**业务背景**：白板上贴纸标签数量在几百到几千之间，需要把字母构成相同的英文标签合并展示，减少视觉重复。分组在浏览器主线程做会把拖拽的帧间隔拉长，需要把计算移出主线程。

**怎么用本页知识解决**：思路是先给每个标签算一个 26 位字母频次签名，签名相同即归为一组。若还要在长文本里定位所有与目标词字母构成相同的片段，就用定长窗口在文本上滑一次，每次只增减两个字符的计数。

```python
def sign(word: str) -> tuple:
    cnt = [0] * 26            # 只认小写 a-z，其他字符直接跳过
    for ch in word:
        if 'a' <= ch <= 'z':
            cnt[ord(ch) - 97] += 1
    return tuple(cnt)         # 字母频次相同则签名相同

def anagram_positions(s: str, p: str) -> list:
    need = sign(p)
    win = [0] * 26
    res = []
    for i, ch in enumerate(s):        # 前提：s 已归一为小写英文
        win[ord(ch) - 97] += 1
        if i >= len(p):
            win[ord(s[i - len(p)]) - 97] -= 1   # 左端字符离开窗口
        if i >= len(p) - 1 and tuple(win) == need:
            res.append(i - len(p) + 1)          # 记录起始下标
    return res
```

- 签名是定长元组，直接当字典键用，比把词排序成字符串更省比较次数。
- 窗口每次移动只改两个计数，判断相等是 26 次整数比较，与模式长度无关。
- 归一化要在调用前完成，大小写与全半角没统一会把同一组拆开。
- 跳过非小写字符意味着中文与表情不参与签名，混排语料要先按字符集分流。
- 返回下标而不是子串，交给渲染层决定高亮范围。

**怎么度量收益**：看分组函数的耗时与拖拽的帧间隔，用 Chrome DevTools 的 Performance 面板录制同一段交互，观察长任务时长与掉帧位置。用 Performance API 在代码里打点，取分组耗时的分位值。

**什么时候不该用**：

- 标签里混有中文或表情符号时，字母频次签名没有意义，应改用其他归一化键。
- 标签总量在几十条这个量级时，直接排序后比较字符串即可，引入签名只增加维护面。
- 需要保留原始大小写做展示时，签名前的小写归一要在展示层之外完成，否则展示内容被改写。

### 行业先进实践

**线性时间匹配优先（出处：RE2 开源项目 README 与 Go 官方 regexp 包文档）**
RE2 与 Go 的 regexp 选择自动机实现，放弃回溯，使匹配耗时随输入长度线性增长。输入长度由用户控制时，回溯实现的耗时会随输入规模急剧上升。项目里对用户可控长度的文本匹配，可以在接口层统一收口到线性引擎，并保留同一组用例做前后对照。

**哈希链加懒匹配的重复串查找（出处：zlib 源码 doc/algorithm.txt）**
zlib 的 deflate 用哈希表把起始字节映射到候选位置，再用链把同哈希的历史位置串起来逐个比对，并延迟一个字节决定是否改用更长的匹配。这套结构在滑动窗口内复用历史位置，避免每个位置重建索引。项目里做"窗口内找最长重复片段"时，可以让哈希只负责挑候选，最长判定仍逐字节比对，保证结果与朴素实现一致。

**按模式长度分流的查找策略（出处：CPython 源码 Objects/stringlib/fastsearch.h）**
CPython 的字符串查找对短模式使用布隆过滤加双向扫描，对长模式使用 Crochemore-Perrin 的 two-way 算法，兼顾常数辅助空间与线性时间。短模式走廉价分支、长模式走有保证分支，这个分流思路可以搬到自己封装的 substring 工具里，并在测试中覆盖两类长度的输入。

**高亮片段按打分选段（出处：Elasticsearch 官方文档 Unified Highlighter）**
Unified Highlighter 把文档切成句子级片段，按片段包含的查询词及其权重打分，再取前 N 段返回。覆盖全部关键词的最短片段可以作为兜底：先用权重筛出候选段，再对候选段跑最小覆盖窗口做压缩。注意打分依赖索引中的词频与文档频率统计，冷启动阶段统计不足会偏移。

**反向重复序列查找（出处：EMBOSS 官方文档 einverted 程序）**
EMBOSS 的 einverted 在核酸序列里查找反向重复区域，允许设定错配数与间隔上限。它与最长回文子串的中心扩展同源，只是把严格相等放宽为带罚分的比对。项目里做严格回文展示时用中心扩展，做近似回文时再加错配预算；具体参数含义需核对官方文档：错配罚分与最大间隔的定义。

### 从学到用：落地路线

**第 1 步 试点**：在离线批处理任务里挑一个入口函数，把最长无重复子串或最小覆盖子串替换成滑动窗口版本，范围限制在单机、数据量小于内存的任务。验收标准：同一批输入下新旧实现输出逐字节一致。

**第 2 步 验证**：用生产回放的固定语料跑前后对比，记录 P50 与 P99 耗时、内存峰值。验收标准：`perf` 或 cProfile 显示窗口函数耗时不超过原实现，内存峰值不超过原实现。

**第 3 步 推广**：把函数抽成内部库，补齐空串、单字符、全重复字符、含代理对四类边界用例，在接入方灰度切换。验收标准：边界用例全部通过，灰度期内接入方错误率不高于基线。

**第 4 步 防回退**：在 CI 上加基准测试与输入长度上限断言，超限走降级路径并打日志。验收标准：基准测试超阈值即失败，超长输入能触发降级并在日志中留下记录。

### 动手作业

**目标**：写一个命令行工具，输入一个日志文本文件和一个关键词文件，输出高重复行清单与每行覆盖全部关键词的最短片段。

**步骤**：

1. 定义输入格式：每行一条记录，关键词文件每行一个词，全部按 UTF-8 读取。
2. 实现 `unique_ratio`，对每条记录算出最长无重复字符子串的占比，写入结果表。
3. 实现 `min_window`，对每条记录输出覆盖全部关键词的最短片段与起止下标。
4. 设定阈值参数，占比低于阈值的记录标记为高重复行。
5. 写单元测试，覆盖空串、单字符、全重复字符、关键词不在文本中四种情况。
6. 用 hyperfine 跑三组不同规模语料，记录耗时与内存峰值。
7. 加一个只按字符扫描的朴素实现作为对照，比较两者输出是否一致。

**验收标准**：

- 对同一输入，滑动窗口实现与朴素实现输出的片段起止下标完全相同。
- 空串输入不抛异常，返回空片段并标记为无命中。
- 关键词不存在时输出空片段，退出码为 0。
- hyperfine 的三组结果中，滑动窗口版本的耗时随输入行数线性增长。
- 单测覆盖四类边界情况，全部通过且不依赖网络与外部服务。

