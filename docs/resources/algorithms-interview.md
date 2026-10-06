---
title: 算法与面试题库资料
description: 算法学习、刷题路线、前端手写题与计算机基础面试资料，每条资源附学习动作
---

# 算法与面试题库资料

建议先按专题刷 Hot 100，再用面试题库查漏补缺，计算机基础用小林 coding 补强。

所有链接均已检查可访问。语言标签为资料正文语言；级别：入门（建立概念）、进阶（实战与原理）、深入（规范与源码）。

## 刷题平台与路线

!!! tip "这一组怎么学"
    第 1 周：在 LeetCode Hot 100 或 NeetCode 150 里选一条路线，不要同时开多条。每天 2 题，先自己想 20 分钟，想不出再看题解，第二天默写一遍。
    第 2 到 6 周：按专题（数组、哈希、双指针、链表、二叉树、回溯、动态规划）连续做，每个专题做完在笔记里写一句"这类题的识别信号"。
    预期总耗时：Hot 100 约 6 到 8 周，每天 1 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [LeetCode 中国](https://leetcode.cn/) | 刷题平台 | 中文 | 入门 | 注册后先把每日一题连续做 14 天，养成提交节奏。 |
| [LeetCode Hot 100](https://leetcode.cn/studyplan/top-100-liked/) | 学习计划 | 中文 | 入门 | 按计划顺序做，每题提交后记录用时与卡点，一周回顾一次错题。 |
| [LeetCode 学习计划合集](https://leetcode.cn/studyplan/) | 学习计划 | 中文 | 入门 | 在合集里挑"算法入门"或"数据结构入门"，14 天内做完一份。 |
| [NeetCode Roadmap](https://neetcode.io/roadmap) | 路线图 | English | 入门 | 沿着图中节点从 Arrays and Hashing 往下走，每个节点先看视频再自己写。 |
| [NeetCode 首页与题单](https://neetcode.io/) | 题单与视频 | English | 入门 | 选 NeetCode 150 题单，每题先看题目暂停视频，自己写完再对照。 |
| [LeetCode Patterns（Sean Prashad）](https://seanprashad.com/leetcode-patterns/) | 题型分类 | English | 进阶 | 按 pattern 列表挑一个题型，一次连做同类 5 题，总结共同模板。 |
| [Hello 算法](https://github.com/krahets/hello-algo) | 开源教程 | 中文 | 入门 | 阅读数据结构章节的动画图解，每章末尾用你熟悉的语言重写代码示例。 |
| [AlgoMonster](https://algo.monster/) | 模板化教程 | English | 进阶 | 先学二分与 BFS 模板，把模板抄成自己的代码片段再套题。 |
| [LeetCode Top Interview 经典题单（doocs 题解仓库）](https://github.com/doocs/leetcode) | 题解仓库 | 中文 | 入门 | 做完题后到仓库对照多语言题解，找一个更简洁的写法重新实现。 |
| [CSES Problem Set](https://cses.fi/problemset/) | 竞赛题集 | English | 深入 | 从 Introductory Problems 开始，每天 1 题，提交通过再看别人的做法。 |
| [Codeforces EDU](https://codeforces.com/edu/courses) | 竞赛课程 | English | 深入 | 选 Binary Search 课程，边看讲义边做课内练习，再提交实战题。 |
| [HackerRank Interview Preparation Kit](https://www.hackerrank.com/interview/interview-preparation-kit) | 题单 | English | 入门 | 做 Warm-up 与 Arrays 两个模块，每天 3 题，记录超时的题。 |

## 体系化算法教程与课程

!!! tip "这一组怎么学"
    选一本主线教材（中文读者建议 labuladong 或代码随想录，英文读者建议 Tech Interview Handbook 加 CP-Algorithms），其余作为查漏补缺的参考，不要平行读。
    每读完一个主题（如二叉树），当天用 LeetCode 做 3 到 5 题验证理解。
    预期耗时：主线教材完整读完约 8 周，每天 1 小时；MIT 6.006 视频课约 12 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [labuladong 的算法笔记](https://labuladong.online/algo/) | 网站教程 | 中文 | 进阶 | 先读"框架思维"章节，再读动态规划与回溯框架，每个框架手写一遍。 |
| [labuladong fucking-algorithm 仓库](https://github.com/labuladong/fucking-algorithm) | 开源仓库 | 中文 | 进阶 | 按仓库 README 的目录挑弱项专题，读完后默写框架代码。 |
| [代码随想录](https://programmercarl.com/) | 网站教程 | 中文 | 入门 | 从数组章节开始，严格按顺序做，每天一个章节并把题解抄成笔记。 |
| [代码随想录 leetcode-master 仓库](https://github.com/youngyangyang04/leetcode-master) | 开源仓库 | 中文 | 入门 | 在仓库里选与你语言一致的代码，对比自己提交的代码找差异。 |
| [OI Wiki](https://oi-wiki.org/) | 百科 | 中文 | 深入 | 遇到不熟的算法（如并查集、线段树）时查对应词条，把例题做完。 |
| [CP-Algorithms](https://cp-algorithms.com/) | 算法百科 | English | 深入 | 挑一个算法词条（如 Binary Search、DSU），读证明后自己实现并对拍。 |
| [Tech Interview Handbook](https://www.techinterviewhandbook.org/) | 面试手册 | English | 入门 | 先读 Algorithms 章节的学习计划与速查表，再读面试流程与行为面试部分。 |
| [Tech Interview Handbook 仓库](https://github.com/yangshun/tech-interview-handbook) | 开源仓库 | English | 入门 | 浏览 contents 目录下各算法速查表，打印成一页纸贴在桌边复习。 |
| [Coding Interview University](https://github.com/jwasham/coding-interview-university) | 学习清单 | English | 进阶 | 用它的复选清单规划 3 个月计划，每完成一项在 fork 里打勾。 |
| [Algorithms, 4th Edition 官方网站](https://algs4.cs.princeton.edu/home/) | 教材配套 | English | 进阶 | 阅读 Sorting 与 Searching 章节的网页讲义，运行站点提供的 Java 代码并改写成 JS。 |
| [Algorithms 课程（Coursera 专项）](https://www.coursera.org/specializations/algorithms) | 视频课程 | English | 进阶 | 先试听第一门课的分治与归并排序，完成每周测验后再决定是否继续。 |
| [MIT 6.006 算法导论（OCW）](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) | 公开课 | English | 进阶 | 每周看 2 节讲座视频并完成对应 problem set 的前两题。 |
| [Jeff Erickson《Algorithms》](https://jeffe.cs.illinois.edu/teaching/algorithms/) | 免费教材 | English | 深入 | 读递归与动态规划两章，做书中章末习题的前 5 道。 |
| [Stanford CS161](https://web.stanford.edu/class/cs161/) | 公开课 | English | 深入 | 下载讲义，按 Lecture 顺序读，重点做 Section 练习。 |
| [Khan Academy 算法](https://www.khanacademy.org/computing/computer-science/algorithms) | 交互课程 | English | 入门 | 完成二分查找与渐进分析两个单元的交互练习，建立复杂度直觉。 |
| [GeeksforGeeks DSA 教程](https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/) | 教程目录 | English | 入门 | 当字典用：不懂某个数据结构时查对应页，看完立即在 LeetCode 找一题实现。 |
| [roadmap.sh 数据结构与算法路线](https://roadmap.sh/datastructures-and-algorithms) | 路线图 | English | 入门 | 打开路线图，把已掌握的节点标记完成，未完成的节点列成两周计划。 |
| [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) | 速查表 | English | 入门 | 把常见数据结构的增删查复杂度抄一遍，之后每做一题先口述复杂度。 |
| [CS-Notes](https://github.com/CyC2018/CS-Notes) | 笔记合集 | 中文 | 入门 | 读算法章节的排序与查找部分，其余操作系统与网络章节留到基础复习阶段。 |
| [JavaGuide](https://javaguide.cn/) | 知识库 | 中文 | 入门 | 只读计算机基础和系统设计部分，当面试八股补充；Java 语言章节可跳过。 |

## 可视化与数据结构工具

!!! tip "这一组怎么学"
    可视化只用来建立直觉：看动画前先预测下一步，看完再对照。每个数据结构看 10 到 15 分钟即可，然后立刻写代码。
    预期耗时：整组一个周末。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [VisuAlgo](https://visualgo.net/zh) | 动画 | 中文 | 入门 | 打开排序页，输入同一组数据，对比冒泡、归并、快排的步骤数。 |
| [VisuAlgo 英文版](https://visualgo.net/en) | 动画 | English | 入门 | 使用 Training 模式的自测题检验你对图与树算法的理解。 |
| [Data Structure Visualizations](https://www.cs.usfca.edu/~galles/visualization/Algorithms.html) | 动画 | English | 入门 | 在红黑树与哈希表页面插入同一序列，观察再平衡与冲突处理。 |
| [javascript-algorithms（trekhleb）](https://github.com/trekhleb/javascript-algorithms) | JS 实现仓库 | English | 进阶 | 读一个数据结构的 JS 实现（如 LRU Cache 或 Trie），再合上仓库自己写。 |

## 前端面试题库

!!! tip "这一组怎么学"
    先用 GreatFrontEnd 或 BigFrontEnd.dev 练手写题（debounce、Promise.all、深拷贝、事件总线），每题限时 20 分钟，写完跑测试。
    再用中文题库扫知识点盲区，把答不上来的写进错题本，一周后复测。
    预期耗时：手写题 30 题约 2 到 3 周；八股扫描约 1 周。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [GreatFrontEnd](https://www.greatfrontend.com/) | 题库平台 | English | 进阶 | 先做 JavaScript 函数类题，再做 UI 编码题，最后练系统设计题。 |
| [BigFrontEnd.dev](https://bigfrontend.dev/) | 题库平台 | English | 进阶 | 从标记为 easy 的手写题开始，在浏览器内通过测试用例后再看他人解法。 |
| [BigFrontEnd.dev 题目列表](https://bigfrontend.dev/problem) | 题库列表 | English | 进阶 | 按标签筛选 Promise 与 DOM 类题目，各完成 5 题。 |
| [Front End Interview Handbook](https://www.frontendinterviewhandbook.com/) | 面试手册 | English | 入门 | 读 Coding 与 Quiz 章节，把每个问答用自己的话口述一遍。 |
| [Front-End-Interview-Handbook（GitHub）](https://github.com/yangshun/front-end-interview-handbook) | 面试手册 | English | 进阶 | 浏览 JavaScript 问答列表，圈出答不出的题，逐个查 MDN 补齐。 |
| [Front-end Developer Handbook](https://frontendmasters.com/guides/front-end-handbook/2019/) | 全景指南 | English | 入门 | 通读一遍建立知识地图，在地图上标出自己没接触的领域。 |
| [30 Seconds of Code](https://www.30secondsofcode.org/) | 代码片段 | English | 入门 | 每天选一个 JS 片段，不看实现先自己写，再对照差异。 |
| [JavaScript.info](https://javascript.info/) | 在线教程 | English | 入门 | 读 Closures、Promises、Event loop 章节，完成章末任务。 |
| [前端面试题 Daily-Interview-Question](https://github.com/Advanced-Frontend/Daily-Interview-Question) | 题库仓库 | 中文 | 进阶 | 每天看一题并在评论区找最佳答案，用自己的话写 3 句总结。 |
| [fe-interview（haizlin）](https://github.com/haizlin/fe-interview) | 题库仓库 | 中文 | 入门 | 按分类（JS、CSS、浏览器）各取 10 题自测，标出不会的。 |
| [web-interview](https://github.com/febobo/web-interview) | 题库仓库 | 中文 | 入门 | 选 HTML、CSS、JS 分类，限时口述每题答案并记录卡壳点。 |
| [FE-Interview](https://github.com/lgwebdream/FE-Interview) | 题库仓库 | 中文 | 入门 | 浏览大厂真题分类，挑目标公司题目，模拟回答并录音复盘。 |
| [javascript-questions（Lydia Hallie）](https://github.com/lydiahallie/javascript-questions) | JS 选择题 | English | 进阶 | 每天做 5 题，先写下预测输出，再运行验证并读解析。 |
| [roadmap.sh 前端路线图](https://roadmap.sh/frontend) | 路线图 | English | 入门 | 对照路线图自评每个节点，把"不会"的节点排入下月学习计划。 |

## 计算机基础

!!! tip "这一组怎么学"
    面试中网络、操作系统和数据库是高频考点。按"网络 → 操作系统 → MySQL → Redis"顺序读图解，每章读完用 3 句话向别人复述。
    预期耗时：每个主题 3 到 5 天，每天 1 小时。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [小林 coding](https://xiaolincoding.com/) | 图解网站 | 中文 | 入门 | 先读图解网络的 TCP 三次握手与 HTTP 章节，再读操作系统。 |
| [小林 coding：图解 MySQL](https://xiaolincoding.com/mysql/) | 图解教程 | 中文 | 进阶 | 重点读索引与事务章节，读完回答"为什么用 B+ 树"。 |
| [小林 coding：图解 Redis](https://xiaolincoding.com/redis/) | 图解教程 | 中文 | 进阶 | 读数据类型与持久化章节，用 redis-cli 逐个命令验证。 |
