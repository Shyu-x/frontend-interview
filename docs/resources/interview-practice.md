---
title: 面试练习
description: 前端面试的题库、模拟面试、系统设计、行为面试与简历资源，附间隔重复练习日程
---

# 面试练习

面试能力由三部分构成：知识的主动回忆、现场写代码、清晰地表达。题库解决第一项，在线判题与手写练习解决第二项，模拟面试解决第三项。本页按这三项组织资源，并给出一份 8 周的练习日程。

## 练习日程

!!! tip "这一组怎么学"
    以 8 周为一个周期，每周约 8 小时。前 4 周补知识与手写，后 4 周以模拟面试为主。知识点用间隔重复复习：当天、第 3 天、第 7 天、第 21 天各一次，复习时只看题目，不看答案。

| 周 | 主题 | 每周任务 | 怎么验证 |
| --- | --- | --- | --- |
| 1 | JavaScript 核心 | 本站 [JavaScript](../js/index.md) 的高频题，每天 5 题口述 | 录音回听，每题 90 秒内讲清楚 |
| 2 | 浏览器、网络、安全 | 本站 [浏览器](../browser/index.md)、[网络](../network/index.md)、[安全](../security/index.md) | 能画出从输入 URL 到页面展示的完整流程 |
| 3 | 框架与工程化 | [React](../react/index.md) 或 [Vue](../vue/index.md)，加 [工程化](../engineering/index.md) | 对每题回答“原理、取舍、例子”三点 |
| 4 | 手写题与算法 | 本站 [手写代码](../coding/index.md) 与 [算法](../algorithm/index.md)，每天 2 题 | 限时 25 分钟，通过自己写的测试 |
| 5 | 系统设计 | 每周 2 道前端系统设计题 | 用 20 分钟画出架构并讲清取舍 |
| 6 | 模拟面试 | 每周 2 次模拟，至少 1 次由真人担任面试官 | 收集反馈，列出 3 个改进项 |
| 7 | 行为面试与简历 | 准备 6 个 STAR 故事，打磨简历 | 他人能在 30 秒内说出你的核心亮点 |
| 8 | 查漏补缺 | 重做错题，完整模拟 1 到 2 次全流程 | 错题第二次全部答对 |

## 前端题库

!!! tip "这一组怎么学"
    题库用来检查，而不是用来背诵。每道题先自己回答，再对照答案，把答错的题标记并进入间隔重复。不要只收藏不做。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Front End Interview Handbook](https://www.frontendinterviewhandbook.com/) | 手册与题库 | English | 初到高级，进阶 | 先读准备指南，再按 JavaScript、CSS、HTML 分类过题 |
| [GreatFrontEnd](https://www.greatfrontend.com/) | 在线题库 | English | 初到高级，进阶 | 用其在线编辑器做 UI 与 JavaScript 函数题，并看官方解法 |
| [GreatFrontEnd 面试攻略](https://www.greatfrontend.com/front-end-interview-playbook) | 攻略 | English | 初到中级，入门 | 阅读各类面试轮次的准备要点 |
| [BFE.dev](https://bigfrontend.dev/zh) | 在线题库 | 中文 | 中级，进阶 | 专注 JavaScript 与手写题，有在线判题，每天 1 题 |
| [h5bp：Front-end Developer Interview Questions](https://github.com/h5bp/Front-end-Developer-Interview-Questions) | 题库 | English | 初到中级，入门 | 作为问题清单，用来检查知识盲区 |
| [Daily-Interview-Question](https://github.com/Advanced-Frontend/Daily-Interview-Question) | 题库 | 中文 | 初到中级，进阶 | 每日一题的社区讨论，读高赞回答后用自己的话重写 |
| [web-interview](https://github.com/febobo/web-interview) | 题库 | 中文 | 初到中级，入门 | 按分类刷题，记录错题 |
| [FE-Interview](https://github.com/lgwebdream/FE-Interview) | 题库 | 中文 | 初到中级，进阶 | 浏览真实面经与题目，筛选与目标公司相关的 |
| [javascript-questions](https://github.com/lydiahallie/javascript-questions) | 题库 | English | 初到中级，进阶 | 每题先写出预期输出再看答案，覆盖语言细节与陷阱 |
| [ExplainThis 前端面试指南](https://www.explainthis.io/zh-hant/interview-guides/frontend) | 面试指南 | 中文（繁体） | 初到中级，入门 | 阅读面试流程与题目讲解，与本站内容互相对照 |
| [type-challenges](https://github.com/type-challenges/type-challenges) | 类型练习 | English | 中级，进阶 | 每天 1 题，面试涉及 TypeScript 时用于热身 |
| [Frontend Mentor](https://www.frontendmentor.io/) | 项目练习 | English | 初到中级，入门 | 选一个项目限时 3 小时完成，作为 UI 编码题训练 |
| [Exercism JavaScript](https://exercism.org/tracks/javascript) | 练习 | English | 初级，入门 | 练习后看他人解法，学习惯用写法 |

## 算法与手写代码

!!! tip "这一组怎么学"
    算法按题型而不是按题号刷。每种题型先学一个模板，再做 5 到 8 道题，第二轮时限时重做。前端面试里手写题的比重通常高于难算法题。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [LeetCode 热题 100](https://leetcode.cn/studyplan/top-100-liked/) | 题单 | 中文 | 初到中级，进阶 | 作为主线，每天 2 题，一周后复做错题 |
| [LeetCode 面试经典 150 题](https://leetcode.cn/studyplan/top-interview-150/) | 题单 | 中文 | 中级，进阶 | 在热题 100 做完后补充 |
| [LeetCode 75](https://leetcode.cn/studyplan/leetcode-75/) | 题单 | 中文 | 初级，入门 | 时间紧时的最小题集，限期 3 周 |
| [NeetCode Roadmap](https://neetcode.io/roadmap) | 题单与视频 | English | 初到中级，入门 | 按依赖关系图推进，看视频理解模板 |
| [CodeTop](https://codetop.cc/) | 题频榜 | 中文 | 面试前冲刺，进阶 | 按目标公司与出现频率筛选，只刷高频题 |
| [代码随想录](https://programmercarl.com/) | 教程 | 中文 | 初到中级，入门 | 按顺序学习每类题型并做对应题目 |
| [labuladong 的算法笔记](https://labuladong.online/algo/) | 教程 | 中文 | 初到高级，进阶 | 学习解题框架，读完后自己重做一遍 |
| [VisuAlgo](https://visualgo.net/zh) | 可视化 | 中文 | 初级，入门 | 在写代码前先观察算法运行过程 |
| [Tech Interview Handbook：算法速查表](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/) | 速查表 | English | 初到中级，入门 | 按建议的 5 周计划推进 |
| [Coding Interview University](https://github.com/jwasham/coding-interview-university) | 学习清单 | English | 零基础到中级，进阶 | 作为知识清单，选取与目标岗位相关的部分 |
| [牛客网](https://www.nowcoder.com/) | 判题与面经 | 中文 | 初到中级，入门 | 查阅目标公司的面经与笔试题，并在线判题 |

## 系统设计

!!! tip "这一组怎么学"
    前端系统设计的回答结构：需求澄清、整体架构、数据流、接口、性能、可访问性、权衡。每道题限时 30 分钟，先画图再讲，练习后对照参考答案补漏。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [GreatFrontEnd 前端系统设计攻略](https://www.greatfrontend.com/front-end-system-design-playbook) | 攻略 | English | 中到高级，进阶 | 先学其回答框架（RADIO），再用其题目练习 |
| [GreatFrontEnd 系统设计题](https://www.greatfrontend.com/questions/system-design) | 题库 | English | 中到高级，进阶 | 每周选 2 题，先自己设计再看解答 |
| [System Design Primer](https://github.com/donnemartin/system-design-primer) | 学习指南 | English | 中级，进阶 | 通读基础概念章节，做其中的设计题 |
| [System Design 101](https://github.com/ByteByteGoHq/system-design-101) | 图解 | English | 初到中级，入门 | 用图解快速建立词汇表，辅助后端部分的回答 |
| [ByteByteGo](https://bytebytego.com/) | 课程 | English | 中级，进阶 | 阅读系统设计面试课程，练习其中的估算方法 |
| [roadmap.sh System Design](https://roadmap.sh/system-design) | 路线图 | English | 初到中级，入门 | 作为知识清单，逐项勾选 |
| [Hello Interview](https://www.hellointerview.com/) | 题库与指南 | English | 中到高级，进阶 | 阅读其系统设计模式总结，配合模拟面试 |
| [Exponent 前端工程师课程](https://www.tryexponent.com/courses/frontend-engineer) | 课程 | English | 中级，进阶 | 学习面试各环节的示范回答，部分内容需付费 |
| [Designing Data-Intensive Applications](https://dataintensive.net/) | 书 | English | 中到高级，深入 | 用于理解后端取舍，不必全读 |

## 模拟面试

!!! tip "这一组怎么学"
    模拟面试的价值来自真实压力与外部反馈。至少完成 4 次真人模拟，每次结束后写下 3 条改进项，下一次检查是否改进。找不到人时，用录音自测并回放。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Pramp](https://www.pramp.com/) | 同伴模拟 | English | 初到中级，入门 | 与其他求职者互相扮演面试官，免费，注意提前预约 |
| [interviewing.io](https://interviewing.io/) | 匿名模拟 | English | 中到高级，进阶 | 与工程师进行匿名模拟，用于检验真实水平 |
| [Exponent](https://www.tryexponent.com/) | 同伴与导师模拟 | English | 中级，进阶 | 参加其同伴练习，并观看示范面试 |
| [CodeSignal](https://www.codesignal.com/) | 在线测评 | English | 初到中级，入门 | 熟悉在线笔试的环境与计时 |
| [HackerRank：10 Days of JavaScript](https://www.hackerrank.com/domains/tutorials/10-days-of-javascript) | 在线判题 | English | 初级，入门 | 十天一轮，熟悉输入输出格式 |
| [Educative：Grokking the Coding Interview](https://www.educative.io/courses/grokking-the-coding-interview) | 课程 | English | 初到中级，进阶 | 按模式学习题型，需付费 |
| [AlgoExpert](https://www.algoexpert.io/) | 题库与视频 | English | 初到中级，进阶 | 看视频讲解后自己重做，需付费 |
| [InterviewBit](https://www.interviewbit.com/) | 题库 | English | 初到中级，入门 | 按主题与进度做题 |
| [Codewars](https://www.codewars.com/) | 练习 | English | 初到中级，入门 | 每天 1 题，学习他人的简洁写法 |

## 行为面试、简历与薪资

!!! tip "这一组怎么学"
    行为面试的核心是 6 个故事：一次冲突、一次失败、一次领导、一次技术难题、一次跨团队协作、一次影响决策。每个故事按 STAR 结构（情境、任务、行动、结果）写 150 字，并用数字量化结果。

| 资源 | 类型 | 语言 | 适合谁与难度 | 怎么学 |
| --- | --- | --- | --- | --- |
| [Tech Interview Handbook：行为面试](https://www.techinterviewhandbook.org/behavioral-interview/) | 指南 | English | 所有人，入门 | 学习回答框架与评分维度 |
| [Tech Interview Handbook：行为面试问题](https://www.techinterviewhandbook.org/behavioral-interview-questions/) | 题库 | English | 所有人，入门 | 对每个问题写出对应的故事，检查是否覆盖全部维度 |
| [Tech Interview Handbook：简历](https://www.techinterviewhandbook.org/resume/) | 指南 | English | 所有人，入门 | 对照其清单检查简历，用动词开头加量化结果 |
| [Tech Interview Handbook：自我介绍](https://www.techinterviewhandbook.org/self-introduction/) | 指南 | English | 所有人，入门 | 写一份 60 秒版本并计时练习 |
| [Tech Interview Handbook：薪资谈判](https://www.techinterviewhandbook.org/negotiation/) | 指南 | English | 有 offer 时，进阶 | 在拿到 offer 前阅读，准备好谈判话术 |
| [Tech Interview Handbook：面试总览](https://www.techinterviewhandbook.org/software-engineering-interview-guide/) | 指南 | English | 所有人，入门 | 了解完整流程，据此规划准备时间 |
| [Levels.fyi](https://www.levels.fyi/) | 薪资数据 | English | 所有人，入门 | 查询岗位级别与薪酬范围，作为谈判参考 |
| [牛客网讨论区](https://www.nowcoder.com/discuss) | 面经 | 中文 | 所有人，入门 | 读目标公司的面经，归纳常问问题 |

## 把练习变成习惯

!!! tip "这一组怎么学"
    面试通过率取决于练习的次数与反馈质量。下面是一份最低可执行的清单。

- 每天固定 1 小时，早上做新题，晚上复习错题。
- 建立错题表，列：题目、日期、错因、下次复习日期（当天、第 3 天、第 7 天、第 21 天）。
- 每周至少 1 次口述演练：随机抽 5 题，每题限时 2 分钟，录音。
- 每次面试后 24 小时内记录被问到的题目与答得不好的点，补进错题表。
- 面试前一周停止学习新知识，只做错题与模拟。

更多按阶段整理的学习资料见 [前端学习路线](learning-paths.md)，书籍与课程见 [书籍、课程与视频](books-courses-videos.md)。
