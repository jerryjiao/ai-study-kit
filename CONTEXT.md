# ai-study-kit

把任意主题的题库变成完整学习闭环的开源脚手架：答题、课程、闪卡、错题精讲、间隔重复，进度可跨设备同步。

## Language

**demo（试用站）**:
官网子路径下托管的全功能静态 quiz-app 实例，访客不 clone 仓库即可完整体验；进度绑定单个浏览器，无跨设备同步。
_Avoid_: 演示版、线上版、playground

**本地模式**:
进度 API 不可达时 app 自动进入的形态：进度只存本浏览器、不写服务器，界面明示当前处于该状态。由启动探测自动进入，不是用户手动开关。
_Avoid_: 离线模式、游客模式

**同步模式**:
app 连接进度后端时的默认形态：服务器是进度的唯一权威源，浏览器存储仅作缓存，多端按提交时间合并。
_Avoid_: 在线模式、云同步

**考点排布表**:
MISSION.md 的「## 考点排布表」节——`考点id(EP-NN) | 考点 | 深度 | 题型×题量 | day | 闪卡数` 六列机器可读表。四对齐校验的契约源：考点覆盖、题量/题型/day/闪卡数对账都读它；大纲唯一权威的落盘形态，产题照它直产。
_Avoid_: quiz-spec、题库规格文件（独立文件形态已被 ADR-0001 否决）

**skill（vs CLI）**:
skill 指装进 agent 环境、给 AI 执行的指令包——仓库内共五个：`/ask-coach` 主入口（状态快照 → 推荐 → 带执行，源目录 `skills/ask-coach/`，带 references/ 私有参考 coach.md 教学法 + flows.md/flows/ 十三流程 playbook）+ 四个薄命令 `/study-coach`（陪练直入）/`/study-doctor`（体检）/`/study-recap`（错题串讲直入）/`/study-podcast`（播客直入），薄命令只有十几行 SKILL.md、引用五 skill 共享协议层 `skills/references/`（state.md 探测协议 + contracts.md 落盘契约）、命名一律 study- 前缀。**命名史**：原 study-coach → 2026-08-25 改名 ai-study-kit → 2026-09 v0.13 主 skill 更名 ask-coach（插件名 ai-study-kit 终身不变，市集名不可改）→ v0.16 `/coach` 改名 `/study-coach`（薄命令统一 study- 前缀，取代 v0.13「避内置撞名才加前缀」规则）+ 新增 `/study-podcast`（播客直入）。CLI 指仓库 `apps/quiz-app/scripts/` 下的可执行脚本（teach-generate / grill-wrong / podcast-generate）。两类东西，不混称。
_Avoid_: 把 CLI 叫 skill（旧文档的混称，已纠正）、把插件名 ai-study-kit 当命令名（命令是 ask-coach 一族）

**考点全景（exam-point panorama）**:
每考点三信号的分组全貌视图：**讲过**（契约二学习记录覆盖的考点 ∪ 课已学完——全部课读完才点亮课程通道）、**练过**（该考点有答题记录，口头题计数作弱信号）、**掌握**（掌握度四态判据不变），按 MISSION 排布表 day 列分学程块。web 呈现为**独立页 `/panorama`**（顶栏「全景」入口；v0.17 自首页折叠面板迁出，带汇总带 + day 卡片 + 全部/弱项/未掌握三档筛选，`?filter=` 深链）。数据层双实现：`scripts/lib/panorama.mjs`（`mastery-report --panorama`，聊天层永远现算）与 TS 移植 `src/lib/panorama.ts`（web 独立页）。web 的「讲过/口头」信号走 build 时产出的**内容无关覆盖快照** `src/data/coverage.json`（只含考点 id/布尔/计数，个人叙述不出本地——学习者档案同款隐私边界）。v0.14 起快照可带 `graph.edges`（知识图谱投影投到 EP 级的考点连线，实线箭头=前置、虚线=关联，节点圆点=掌握四态）——无图/超阈值回退分组清单，没装 knowflow 看不到任何变化。
_Avoid_: 进度条（那是答题完成率，不是三信号）、把快照当原始记录（记录私有不上站，快照是派生布尔）、说全景在 web 首页（已迁独立页）

**主题（theme）**:
`examples/<theme>/` 下的一套完整学习内容包（MISSION / RESOURCES / questions / flashcards / lessons / wrong-questions）。仓库同一时刻只激活一个主题（`EXAMPLE_THEME`，默认 dev-intro）。
_Avoid_: 示例（示例主题特指 dev-intro；用户建的主题不是示例）

**考点掌握度（exam-point mastery）**:
从答题进度（+ 闪卡 SRS）对每个考点（EP-NN）确定性派生的四态：掌握（考点下题全答对、无未毕业错题，且映射闪卡全部毕业）/ 弱（有未毕业错题或当前答错）/ 进行中（部分作答无负面，或题已全对但映射闪卡未全毕业）/ 未开始。派生逻辑在 `scripts/lib/mastery.mjs`（报告入口 `scripts/mastery-report.mjs`）与其 TS 移植 `src/lib/mastery.ts`（首页掌握度面板，判据两边同步），无 LLM。闪卡经 `flashcards.json` 的可选 `examPoint` 映射参与判据（SRS phase=review 即毕业）；无映射考点退回纯题维度，不硬凑。
_Avoid_: 及格率、正确率（那是全题库口径，不是考点口径）

**学习者档案（learner profile）**:
`study/records/profile.json`——grill 串讲顺产的机器可读错因档案（考点级 wrongReasons/advice/串讲次数），skill 探测与 mastery-report 消费它把推荐理由具体化。与进度档案同目录，学习者私有，不随 build 上站。合并语义：新旧考点有题 id 重叠即同一考点。
_Avoid_: 用户画像（那是增长/营销语境）、记忆图谱（图在 knowflow 知识库，档案是错因记录不是图）

**知识图谱投影（graph projection）**:
知识与学习状态的接法（「投影桥」）：知识（概念与连线）住外部知识库 knowflow 的图，学习状态（作答/复习/掌握）住本仓信号源；掌握度永远现算，经一份只读投影文件（节点→状态）单向流向知识图谱供其着色与导航，绝不回写知识页。与 DeepTutor 同构（其 ConceptGraph 与 LearningStore 分家、靠 knowledge_point id 对接）。考点与图节点的对应见「考点节点映射」。
_Avoid_: 把掌握度写进知识页（状态入库，两处真源打架）、双向同步

**口头答题流水（oral attempts）**:
聊天陪练中每次口头问答的明细记录（考哪个知识点、对错、时间戳），存 `study/records/oral-attempts.json`，学习者私有不上站。无题知识点（图节点）的掌握度信号源：近期加权正确率 + 置信度封顶（答 1 次封 0.5、2 次封 0.8，防一次蒙对），范式照搬 DeepTutor `compute_mastery`，确定性零 LLM。契约二「口头题计数」从它派生，不再手写总数。
_Avoid_: 手写总数当真源（双记必漂移）、把明细流水写进 markdown 表格

**考点节点映射（graph map）**:
knowflow 图节点 id ↔ 考点（EP-NN）的个人映射文件 `study/records/graph-map.json`，agent 辅助建立、学习者确认。未映射节点仍可经口头流水判掌握，只是不并入考点视图。映射是个人学习数据，同 records 隐私边界（不上站、不提交）。
_Avoid_: 把 EP 写进 knowflow 页面 frontmatter（知识库渗学习元数据）、按标题模糊匹配（幻影对齐）

**主题配置（theme-config）**:
主题包内可选的 `theme-config.json`——承载该主题的全部呈现层定制（排序/显示名/子主题/来源徽标/学习优先级层/深度徽标/样式）。应用代码不含任何主题数据，sync 时未提供则按字段逐项回退。
_Avoid_: 皮肤（只管配色）、插件（这是数据配置，不是可执行扩展）

**存量项目（legacy project）**:
用旧版 kit 快照或旧数据契约建的学习项目——kit 代码或主题契约落后于当前 skill/插件版本。主题包住 kit 外不受插件更新影响，「存量」特指 kit 代码代差与主题侧契约缺口（后来加的可选文件/字段缺失）。数据不丢不崩是硬承诺；功能层要求降级必告知、给补齐路径（ADR-0006）。识别靠 kit-version.json（v0.14 后落地）：无此文件 = 版本未知，按最老处理。
_Avoid_: 旧项目（含糊——旧主题包不是存量项目）、坏项目（数据没坏，只是落后）

**kit 版本漂移（kit version drift）**:
用户项目里拷出的 kit 代码落后于插件快照/skill 文档的状态——skill 每次更新都默认 kit 同代，漂移不检测则流程撞墙或静默缺功能。目标态由 kit-version.json 两处版本号 diff 暴露，并进 study-doctor 体检（ADR-0006）。
_Avoid_: 版本不匹配（无「匹配」概念，只有落后方向）、旧版本 bug（漂移本身不是 bug，是缺升级机制）

**F13 升级（upgrade flow）**:
把存量项目带到与当前版本全功能对齐的编号流程：备份 progress → 重拷 kit → 对照插件快照补缺失新文件模板 → 契约缺口逐项引导。F1 探测到 kit 目录已存在时的唯一去向（绝不盲拷）。数据文件（oral-attempts、graph-map 等）不进升级流程，沿用首用时自建。ADR-0006 落地。**编号注**：ADR 定稿时拟名 F12，同日发布的 v0.14 已把 F12 给了知识图谱投影（已随插件/四语文档发出，不可收回），升级流程顺延为 F13。
_Avoid_: 重装（升级保数据，不是推倒重来）、自动迁移脚本（补齐走 agent 带做，不写迁移器）、沿用 F12 指称升级流程（撞号，F12 永指图谱投影）

**kit-version.json**:
kit 快照的版本标记文件——sync-plugin 打包时从根 package.json 写入版本号，F1 拷贝自然带进用户项目，项目由此「自报版本」。skill 读用户项目与插件快照两处 diff 判漂移；存量项目无此文件即「版本未知，按最老处理」。ADR-0006 落地（打包断言：`apps/quiz-app/scripts/lib/kit-version.test.mjs`）。
_Avoid_: 读用户项目 package.json 猜（kit 拷贝不含仓库元数据）、目录 diff 猜（行尾噪声前科）

**一键安装（install.md）**:
统一安装入口——发布在 `https://aistudykit.dev/install.md` 的英文 agent 安装协议：用户把「请根据 <该链接>，安装 ai-study-kit」发给任意工具的 agent，agent 照协议检测工具→plugin 三家走原生两步 / 其余全量下载（5 个教练 skill + kit 快照）→按「skill 所在 skills 目录的同级放 kit」落位→校验并报 kit-version。更新 = 幂等重跑。ADR-0007。
_Avoid_: 安装脚本（是协议文档，不是可执行脚本）、安装页（不是 HTML 页面，是纯 md 直链）、只管长尾工具（它服务所有工具，plugin 三家也在协议里）
