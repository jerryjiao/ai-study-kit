# Mission: software-designer 软件设计师复习包

> 软考中级「软件设计师」复习学习包。目标定位：2026 年 10 月场**稳过线**——综合知识与案例分析两科各 ≥45 且同次全过。学习者是在职开发者：下午案例（DFD / ER / UML / 算法 / 设计模式）是主场保熟练，上午综合知识里的计算机基础（组成 / OS / 网络 / 数学 / 法规）补广度。

## 学习主题

**软件设计师（软考中级）全考纲**——按 D1–D10 十个学程块组织，每块约一周滚动。题面全原创（真题风格），考点频次对齐历年真题分布。

## 考点排布表

大纲是唯一权威——先定考什么、考多深，再照表产题产卡。**考点列填核心关键词**：四对齐校验（`pnpm run check:alignment`）按它做课程覆盖、闪卡覆盖和题量对账。全库 300 题（single:multi:judge ≈ 6:2:2），闪卡 60 张。

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | 补码 | 掌握 | single×5, multi×2, judge×2 | D1 | 2 |
| EP-02 | 校验码 | 掌握 | single×4, multi×2, judge×1 | D1 | 2 |
| EP-03 | 流水线 | 理解 | single×3, multi×1, judge×1 | D1 | 1 |
| EP-04 | Cache | 掌握 | single×3, multi×1, judge×1 | D1 | 1 |
| EP-05 | 可靠性 | 理解 | single×3, judge×1 | D1 | 0 |
| EP-06 | 进程 | 掌握 | single×5, multi×2, judge×2 | D2 | 2 |
| EP-07 | 死锁 | 掌握 | single×4, multi×2, judge×1 | D2 | 2 |
| EP-08 | 存储管理 | 掌握 | single×4, multi×1, judge×2 | D2 | 1 |
| EP-09 | 磁盘调度 | 理解 | single×3, multi×1, judge×1 | D2 | 1 |
| EP-10 | 文件系统 | 了解 | single×2 | D2 | 0 |
| EP-11 | OSI | 理解 | single×4, multi×2, judge×1 | D3 | 1 |
| EP-12 | 子网划分 | 掌握 | single×5, judge×2 | D3 | 2 |
| EP-13 | TCP | 掌握 | single×4, multi×2, judge×1 | D3 | 2 |
| EP-14 | 应用协议 | 理解 | single×3, multi×1, judge×1 | D3 | 1 |
| EP-15 | 网络设备 | 了解 | single×2, multi×1, judge×1 | D3 | 0 |
| EP-16 | 关系代数 | 掌握 | single×4, multi×1, judge×1 | D4 | 1 |
| EP-17 | SQL | 掌握 | single×5, multi×2, judge×1 | D4 | 2 |
| EP-18 | ER 模型 | 掌握 | single×3, multi×1, judge×2 | D4 | 2 |
| EP-19 | 范式 | 掌握 | single×4, multi×1, judge×1 | D4 | 1 |
| EP-20 | 事务 | 理解 | single×2, multi×1, judge×1 | D4 | 0 |
| EP-21 | 开发模型 | 理解 | single×4, multi×2, judge×1 | D5 | 1 |
| EP-22 | 需求分析 | 掌握 | single×4, multi×2, judge×1 | D5 | 1 |
| EP-23 | 软件测试 | 掌握 | single×5, multi×1, judge×2 | D5 | 2 |
| EP-24 | 项目管理 | 理解 | single×3, multi×1, judge×1 | D5 | 1 |
| EP-25 | 软件维护 | 了解 | single×2, judge×1 | D5 | 1 |
| EP-26 | 数据流图 | 掌握 | single×6, multi×2, judge×2 | D6 | 3 |
| EP-27 | 数据字典 | 理解 | single×4, multi×2, judge×2 | D6 | 2 |
| EP-28 | 模块设计 | 掌握 | single×8, multi×2, judge×2 | D6 | 1 |
| EP-29 | 用例图 | 掌握 | single×5, multi×2, judge×2 | D7 | 2 |
| EP-30 | 类图 | 掌握 | single×6, multi×2, judge×2 | D7 | 2 |
| EP-31 | 行为图 | 理解 | single×4, multi×1, judge×1 | D7 | 1 |
| EP-32 | 设计模式 | 掌握 | single×3, multi×1, judge×1 | D7 | 1 |
| EP-33 | 线性表 | 掌握 | single×4, multi×1, judge×1 | D8 | 1 |
| EP-34 | 树 | 掌握 | single×5, multi×2, judge×2 | D8 | 2 |
| EP-35 | 图 | 掌握 | single×4, multi×1, judge×1 | D8 | 1 |
| EP-36 | 排序 | 掌握 | single×3, multi×1, judge×1 | D8 | 1 |
| EP-37 | 散列 | 理解 | single×2, multi×1, judge×1 | D8 | 1 |
| EP-38 | 命题逻辑 | 理解 | single×4, multi×1, judge×1 | D9 | 1 |
| EP-39 | 概率统计 | 理解 | single×4, multi×1, judge×1 | D9 | 1 |
| EP-40 | 专业英语 | 掌握 | single×5, multi×1, judge×2 | D9 | 1 |
| EP-41 | 著作权 | 理解 | single×5, multi×3, judge×2 | D9 | 3 |
| EP-42 | 易混概念 | 掌握 | single×10, multi×3, judge×3 | D10 | 3 |
| EP-43 | 计算综合 | 掌握 | single×8, multi×3, judge×3 | D10 | 3 |

题的 `examPoint` 填考点 id（EP-NN）、`day` 对齐表的 day 列（D1–D10 每档约一周，进度按题 id 存、档位可重排）；闪卡数 0 = 大纲声明该考点不配卡（了解级或并入综合档）。题 id 前缀 `SD-NNN`（SD-001~300 按 day 顺序），闪卡 `FC-SD-NN`（01~60）。

## 学程分块与 topic

| day | topic | 内容块 | 性质 |
|-----|-------|--------|------|
| D1 | sd-system | 计算机系统基础（数据表示 / 组成 / 体系结构） | 补弱 |
| D2 | sd-os | 操作系统 | 补弱 |
| D3 | sd-net | 计算机网络 | 补弱 |
| D4 | sd-db | 数据库（ER / 范式 / SQL） | 补弱+案例 |
| D5 | sd-se | 软件工程基础 | 主场 |
| D6 | sd-dfd | 结构化分析与设计（DFD / 数据字典 / 模块） | 案例主场 |
| D7 | sd-uml | UML、面向对象与设计模式 | 案例主场 |
| D8 | sd-algo | 数据结构与算法 | 主场 |
| D9 | sd-misc | 数学 / 专业英语 / 著作权与标准化 | 补弱 |
| D10 | sd-mixed | 跨点综合与易混辨析（冲刺档） | 混合 |

下午案例考点（DFD 填空 / ER 建模 / UML 补图 / 算法填空）一律**选择题化**入库：给上下文片段 + 选项，保持可刷、可判分、可进错题本。
