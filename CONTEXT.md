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
skill 指装进 agent 环境、给 AI 执行的指令包——仓库内共四个：`/ask-coach` 主入口（状态快照 → 推荐 → 带执行，源目录 `skills/ask-coach/`，带 references/ 三份参考文档）+ 三个薄命令 `/coach`（陪练直入）/`/study-doctor`（体检）/`/study-recap`（错题串讲直入），薄命令只有十几行 SKILL.md、共享主入口的 references/。**命名史**：原 study-coach → 2026-08-25 改名 ai-study-kit → 2026-09 v0.13 主 skill 更名 ask-coach（插件名 ai-study-kit 终身不变，市集名不可改）。CLI 指仓库 `apps/quiz-app/scripts/` 下的可执行脚本（teach-generate / grill-wrong / podcast-generate）。两类东西，不混称。
_Avoid_: 把 CLI 叫 skill（旧文档的混称，已纠正）、把插件名 ai-study-kit 当命令名（命令是 ask-coach 一族）

**考点全景（exam-point panorama）**:
每考点三信号的分组全貌视图：**讲过**（契约二学习记录覆盖的考点 ∪ 课已学完——全部课读完才点亮课程通道）、**练过**（该考点有答题记录，口头题计数作弱信号）、**掌握**（掌握度四态判据不变），按 MISSION 排布表 day 列分学程块。数据层双实现：`scripts/lib/panorama.mjs`（`mastery-report --panorama`，聊天层永远现算）与 TS 移植 `src/lib/panorama.ts`（web 首页面板）。web 的「讲过/口头」信号走 build 时产出的**内容无关覆盖快照** `src/data/coverage.json`（只含考点 id/布尔/计数，个人叙述不出本地——学习者档案同款隐私边界）。
_Avoid_: 进度条（那是答题完成率，不是三信号）、把快照当原始记录（记录私有不上站，快照是派生布尔）

**主题（theme）**:
`examples/<theme>/` 下的一套完整学习内容包（MISSION / RESOURCES / questions / flashcards / lessons / wrong-questions）。仓库同一时刻只激活一个主题（`EXAMPLE_THEME`，默认 dev-intro）。
_Avoid_: 示例（示例主题特指 dev-intro；用户建的主题不是示例）

**考点掌握度（exam-point mastery）**:
从答题进度（+ 闪卡 SRS）对每个考点（EP-NN）确定性派生的四态：掌握（考点下题全答对、无未毕业错题，且映射闪卡全部毕业）/ 弱（有未毕业错题或当前答错）/ 进行中（部分作答无负面，或题已全对但映射闪卡未全毕业）/ 未开始。派生逻辑在 `scripts/lib/mastery.mjs`（报告入口 `scripts/mastery-report.mjs`）与其 TS 移植 `src/lib/mastery.ts`（首页掌握度面板，判据两边同步），无 LLM。闪卡经 `flashcards.json` 的可选 `examPoint` 映射参与判据（SRS phase=review 即毕业）；无映射考点退回纯题维度，不硬凑。
_Avoid_: 及格率、正确率（那是全题库口径，不是考点口径）

**学习者档案（learner profile）**:
`study/records/profile.json`——grill 串讲顺产的机器可读错因档案（考点级 wrongReasons/advice/串讲次数），skill 探测与 mastery-report 消费它把推荐理由具体化。与进度档案同目录，学习者私有，不随 build 上站。合并语义：新旧考点有题 id 重叠即同一考点。
_Avoid_: 用户画像（那是增长/营销语境）、记忆图谱（借自外部项目的词，本仓库没有这层）

**主题配置（theme-config）**:
主题包内可选的 `theme-config.json`——承载该主题的全部呈现层定制（排序/显示名/子主题/来源徽标/学习优先级层/深度徽标/样式）。应用代码不含任何主题数据，sync 时未提供则按字段逐项回退。
_Avoid_: 皮肤（只管配色）、插件（这是数据配置，不是可执行扩展）
