---
status: accepted
date: 2026-09-28
---

# 计划分层：计划数据住主题、派生与展示住 kit（+ day 命名空间契约）

2026-09-28 学习计划刀定案（spec #89，数据底座票 #90）。背景：kit 的进度信号全部挂在题/课/闪卡上（已答 N/M、课已学完、错题、闪卡到期、考点掌握度），学习者把大纲排成**带日程的学习计划**（一组学习单元 + 目标日期）时，kit 无法回答三个高频问题——学到哪了（覆盖）、快了还是慢了（节奏）、断档多久了。排布表的 day 分组已机器可读（sync-examples 解析 MISSION 产 `theme.json` 的 `examDays`），缺的是**日期与状态**维度——`plannedDate` / `deadline` / 单元完成状态，这些只存在人写的 MISSION.md 里。

决策两条：

1. **计划数据住主题**：`examples/<theme>/plan.json`（可选文件）承载 `deadline` + `units[]`（`{ id, title, order, plannedDate?, day?, topic?, status, doneDate? }`）。计划是内容决策（这个主题打算怎么排、粒度切多大——考点/站/章均可），与题库/闪卡/课同为主题数据，随主题目录走（含外部主题包）。**不进 progress**：单元完成态由 `status`/`doneDate` 字段承载、学习流程（F10 开站/收站/搁置）写回主题文件——progress 是按题 id 键控、跨设备 LWW 合并的运行期信号，塞计划结构要发明一套没有消费方的合并语义，且 progress 单份全局、plan 随主题走，装载位置互相冲突。缺失 = 无计划面，全链路优雅回退（sync 写空计划 `{units:[]}`，同 theme-config 的 `{}` 回退风格，import 恒可解析），既有主题（dev-intro）现状零变化。

2. **派生与展示住 kit**：覆盖（done/total、当前单元、剩余清单）、节奏（日历对照 + 速率外推）、断档天数全部从 plan.json + progress **确定性派生**（无 LLM，mastery-report 同风格），脚本侧与 TS 侧判据同步（mastery.ts 先例）；主题文件只存原始数据，不存任何派生值。

**day 命名空间契约**：`unit.day` 与 `theme.json` `examDays` 的 day 是**同一命名空间**（同源于 MISSION 排布表 day 列），`unit.day ≡ examDays` 的 day。首页计划面板与全景页 day 卡是同一 day 的两个呈现面，必须同源显示，禁止两处各写一套口径——改排布表 day 列，两个呈现面同源跟随。

## Considered Options

- **计划进 progress（运行期数据）**——拒：见决策 1。progress 的合并语义（per-key LWW/墓碑）是为答题记录设计的，单元状态的「多端同时改一份主题文件」没有定义语义；且计划结构随主题切换装载，progress 是全局单份，二者生命周期不同。
- **计划写进 MISSION.md 再解析**（day 列的先例延伸）——拒：排布表的 day 是**内容组织**（考点怎么分块，人写定稿），计划是**执行安排**（哪天做什么、做没做完）——后者会被学习流程持续改写（status 翻转、doneDate 补记），让 agent 频繁改写人写的内容文件会污染 MISSION 的权威性；机器可改写的数据放独立 JSON，MISSION 保持只读真源。
- **派生值（落后天数、预计完成日）写回 plan.json 缓存**——拒：派生随进度每天变，写回主题文件 = 双源漂移（进度改了缓存没改）；现算，mastery 判据同款态度。

## Consequences

- 无 plan.json 的主题（dev-intro）全链路现状零变化：sync 产物仅多一个空计划回退文件（gitignored 产物），UI/快照无计划面。
- 已知边界（后续刀裁决）：sync-study 是全目录拷贝（排除清单只挡 study/records 等私有目录），有 plan.json 的主题其 plan.json 会随包进 public/study/<theme>/ 上站。units 结构是主题内容、发布无碍；status/doneDate 是学习流程写的执行痕迹，与「学习痕迹不上站」的隐私精神有张力——是否排除单文件留后续票决策，dev-intro 无 plan.json 故现行发布面零变化。
- plan.json 成为 kit 的**第一个被学习流程改写的主题数据文件**（题库/闪卡/课都是人写机器读，plan 的 status/doneDate 是机器写）：F10 playbook 补写入口契约，派生字段（外推/对照结果）永不写入，手改只允许 `status`/`doneDate` 语义内的编辑。
- day 命名空间统一后，计划面板（unit.day）与全景页（examDays）的对照关系是契约级：同一天两处显示不一致即 bug，不是呈现自由度。
- 后续刀（#89 第 2-6 条：派生脚本、首页面板、全景页结合、快照计划行、F10 契约）都以本 ADR 的分层为依据；本刀（#90）只落数据契约、sync 链路与术语。
