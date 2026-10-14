# Contracts · 落盘契约（契约一 / 契约二 / 契约三）

> F10 陪练教学、F11 考前冲刺与 state.md 探测共用的**格式单源**：COACH.md（契约一）、学习记录（契约二，含口头答题流水写入口径）与计划单元状态维护（契约三，plan.json 三动作写入口径）长什么样、怎么写、怎么合并，都在这里。消费方引用一律指本文件，不另抄格式——抄两份必漂移。
>
> ⚠ 模板里契约二正文的节标题（`## 已过考点` / `## 错的点` / `## 待办` / `## 口头题计数`）**必须顶格 `##`**：解析器（`apps/quiz-app/scripts/lib/records.mjs`）按 `^## ` 切节，把它们降成 `###` 或缩进会让按模板新写的记录解析不到（待办数恒 0、全景「讲过」信号丢失）。它们因此有意不随本文件的章节层级降档——在本文件 grep `^## ` 会命中这些模板行，属预期。

## 契约一 · COACH.md（住主题包根）

```markdown
---
mode: deep             # quick|deep|two-step|adaptive|custom，语义见 coach.md §6
updated: <date>
current-station: 5     # 最新进行中站 = study/records/ 记录编号
---

## 教学偏好便签

<!-- 常规模式：一两句偏好即可（如「例子偏向后端场景」「讲慢一点」） -->
<!-- custom 模式必含两份：
     用户原话：「别让我干背，每讲完一个马上让我用一遍」
     教练解析纪律：每考点 2 道选择题即时判定 + 1 个微产物；
     过关线 = 选择题全对 且 微产物用对考点（判定细则 coach.md §6.6） -->
```

frontmatter `mode` 是全主题教学模式的权威存储；续站时以站内记录的 `mode` 为准（用户可能中途换过），COACH.md 兜底。

## 契约二 · 学习记录（`study/records/<NN>-<slug>.md`，本地）

```markdown
---
id: 5                  # 站编号 = 文件名前缀 NN，主题内递增
topic: HTTP 状态码      # 本站教什么
mode: two-step         # 本站考法，续站沿用此值
status: in-progress    # in-progress | done
---

## 已过考点
- 状态码家族划分 · 金句：「4xx 怪客户端，5xx 怪服务端」
- 3xx 重定向辨析 · 金句：「301 永久搬家，302 临时出门」

## 错的点
- 复述时把 301/302 方向说反——已当场纠（§7 四拍），变体已补答对

## 待办
- [x] 家族划分
- [x] 3xx 重定向
- [ ] 4xx 具体码辨析

## 口头题计数
- EP-01 状态码家族划分：问 3 对 2
- 3xx 重定向辨析：问 2 对 2
```

（「口头题计数」节为 v0.13 旧格式：v0.14 起停写，计数改由口头答题流水派生——见下方写入口径；旧记录照读合并。）

**口头答题流水写入口径（v0.14 起，口头计数的唯一真源）**：

- 聊天陪练的每次口头问答**当场追加一条明细**到 `study/records/oral-attempts.json`（追加式 JSON 数组，学习者私有不上站），并把**同一笔作答实时回流答题站**（v0.26 起，见下条）：

  ```json
  { "target": "EP-01 状态码家族划分", "correct": true, "at": 1789000000000, "source": "recall" }
  ```

  - `target` 目标引用，宽容格式三档：`EP-NN` 前缀（题库考点，全景按它 join 排布表）→ knowflow 图节点相对路径（无题的新知识）→ 裸考点名（兜底）。
  - `correct` 对错布尔；`at` **真实 `Date.now()`**——与 progress.json 同款红线，绝不允许固定值或未来时间戳；`source` 三值：`recall` 抽背 / `recite` 复述 / `case` 案例评分点（判定细则见 coach.md §6.6/§6.7）。
- **写入口径（多会话并发安全）**：写前重读文件全文 → 追加新条目 → 整文件写回；消费端按 `at` 排序取信、完全相同的四元组去重（`apps/quiz-app/scripts/lib/oral.mjs` 的纯函数，有单测）。与「已过考点」同节奏：一轮考完就追加，不等收站。
- **实时回流（v0.26，#122）**：写包的**同时**把同一笔作答提交到答题站 API（agent 代跑，可跑不可派给学习者）——掌握度与全景即时反映口述成绩，不再等下次 build：

  ```bash
  curl -sf -X POST http://localhost:8787/api/oral-attempts \
    -H 'Content-Type: application/json' \
    -d '{"theme":"<主题名>","attempts":[{"target":"EP-01 状态码家族划分","correct":true,"at":<毫秒时间戳>,"source":"recall"}]}'
  ```

  - **`at` 用与包内落盘同一个真实毫秒时间戳**：两路是同一笔作答，四元组（target+correct+at+source）一致才会在并流时去重；各编一个时间戳会让同一笔答对/答错被计两次。批量可把一轮的多条放进 `attempts` 一次提，也可逐条提。
  - `theme` 填主题名（仓库内主题 = `examples/` 下目录名；外部主题包 = 目录 basename）——多主题隔离在读端按它过滤，漏填则该笔记入当前主题口径外、全景看不到。
  - **API 离线 / 404（v0.26 前旧实例）→ 跳过不重试不阻塞**：主题包流水才是完整真源，Web 侧本次看不到、下次 build 快照兜底；绝不为走 API 反过来少写包。探测服务在哪见 [state.md](state.md) §3（本地 8787，云端实例同规换 host）。
  - 响应 `{ok, accepted, skipped}`：`accepted=0` 且 `skipped>0` 多半是时间戳在未来或条目畸形——当场改对再提一次，不静默丢。
- **「## 口头题计数」节停写（v0.13 引入、v0.14 废弃）**：总数一律从流水派生（`mastery-report --panorama` 与探测口径自动带出），不再手写「问 N 对 M」——手写两处必漂移。
- **旧记录照读不丢**：解析器兼容旧「口头题计数」节（`lib/records.mjs`），全景「练过/口头」信号把旧手写计数与流水合并，升级不丢历史。

**下站预告（`study/records/next-hook.json`，v0.26 #124 会话收尾开环预告）**：教练收尾产出的下个微块预告的跨会话存储——F10 站收尾与微块收尾写、下次开场（F10 第 0 步）读：

```json
{ "ep": "EP-03", "name": "chmod", "reason": "weak", "action": "oral-3", "minutes": 5, "leftAt": 1789000000000 }
```

- **判据源 `plan-report --json` 的 `next` 字段**（与下一站推荐同判据、与题站会话总结页预告行同口径），不自估考点；`leftAt` 写入时的真实 `Date.now()`（与口头流水 `at` 同款红线：禁固定值、禁未来时间戳）。
- **单条覆写**：每次收尾整体重写（一次最多一个待认领预告）；无可推考点（全掌握）→ 删文件，不留过期钩子。写前重读、整文件写回（与口头流水同款并发纪律）。
- **开场认领前对全景**：预告考点已掌握（预告期间拿下了）→ 跳过不认领——预告过期不是欠账，不提「还欠着一个」。
- **预告与隔期复测不互斥（#134）**：预告考点恰为复测目标（`retest.pick` 同点）时，下次开场认领的口述即覆盖复测——复测入选条件③（当天该目标无口述）天然去重，不另考。预告判据（`next`）与复测判据（`retest`）各自现算，本契约不为其增加任何落盘字段（复测零新增状态，决议 #129）；认领位在前、复测位在同池（F10 第 0 步第 3 条），两者不同点时并列不冲突。
- **学习者私有**：随 `study/records/` 不上站不提交（与 oral-attempts.json / profile.json 同目录语义）。微块不开站不建记录，但这个文件与口述错因台账两个文件例外——它们是跨会话的记忆，不是站档案。

**口述错因台账（`study/records/misconceptions.json`，#132 口述错因跨会话接续）**：聊天陪练中已判明的口述错误与诊断的跨会话私有记忆——教练当场写，后续会话经 `mastery-report --json` 的 `misconceptions` 字段与探测（state.md §3/§7）读出，用于针对性纠偏。正式站与微块同规（微块不开站不建记录，本文件例外）。条目：

```json
{
  "theme": "dev-intro",
  "target": "EP-03 chmod",
  "ep": "EP-03", "node": null, "name": "chmod", "via": "ep",
  "observed": { "text": "把 4 说成读权限", "at": 1789000000000, "source": "recall" },
  "diagnosis": { "text": "权限位与八进制对应记反", "at": 1789000000000 },
  "questionId": "GIT-005",
  "status": "open"
}
```

- **什么时候写**：学习者口述答错（站内考步 / 复述 / 微块口述）且教练识别出**具体**误区时追加一条——不是每错必写：泛泛的「不熟」没有行动价值，写有依据的错因。答对不写台账（正确作答走口述流水即可）。
- **observed / diagnosis 分立，缺一即缺不混写**：`observed` 只记事实（学习者实际说了什么错 + 真实事件时间 + `source` 三值同口述流水）；`diagnosis` 只记教练推断的根因。后续引用时如实区分「你上次说过 X」（observed 事实）与「我当时判断根因是 Y」（diagnosis 推断），**不把推断写成学习者已承认的事实**。`diagnosis` 与 `questionId` 可缺省。
- **归属解析随条目落盘**：`target` 一律过既有 `resolveOralTarget`（EP 前缀 → 图节点映射反查 → 图节点直引 → 裸名回退，单源口述流水同一套），解析结果（ep/node/name/via）写进条目；**裸名（`via=null`）永不强行归 EP**——消费端按名字聚合、标「未定位」如实呈现，不猜归属。构建与追加守卫在 `apps/quiz-app/scripts/lib/misconceptions.mjs`（`buildMisconceptionEntry` 拒未来时间戳 / 拒 diagnosis 半缺 / 拒 source 出枚举；`appendMisconceptions` 对完全同一笔观察去重不追加、对坏文件拒写回）。
- **append-only，永不改写旧条目**：写前重读全文 → 追加 → 整文件写回（与口述流水同款并发纪律）；时间戳一律真实 `Date.now()`（同款红线：禁固定值 / 未来值）。**status 落盘恒为 `open`**——`corrected`/`recurred` 是消费端派生态（`deriveMisconceptionStatuses`：同 target 后续口述最近一次答对 = corrected；同根因再现 = recurred），永不回填旧条目，历史全留可追溯。
- **复发写法（接续可判定）**：判断为既有错因复发时，新条目的 diagnosis **一字不差沿用原条目原文**——消费端按「同 target + 同根因键（diagnosis 原文，缺省回退 observed 原文）」接续原条目计 recurred；不同措辞 = 独立新错因各自走生命周期（同 EP 多种错因多条并存，互不覆盖）。
- **主题隔离与私有边界**：文件住主题包 `study/records/`（不上站不提交），条目再冗余 `theme`（读端按主题过滤——两个主题的同号 EP-03 不串用）。
- **与 profile.json 的分工**：profile（grill 串讲产、按题 id 关联）一字不动、零迁移；本台账承接**无题 id 的口述错因**（含微块——微块错了没有站记录的场景由台账直接承接）。消费视图双源 join：`mastery-report --json` 的 `points[].misconceptions`（口述来源）与 `points[].profile`（题 id 来源）按 EP 合流并列。
- **不写什么**：不存聊天全文（只记错因与状态）；不把口述对错写成题库作答；不从旧口述流水回填台账（事后倒推 = 编造既往错因）；旧站记录「错的点」照写照读，不转台账（md 站记录与台账并存不合并）。
- **消费端**：`mastery-report --json` 顶层 `misconceptions`（total / open·corrected·recurred 计数 / byEp / byNode / unlocated）+ `points[].misconceptions`；无台账 / 坏台账 / 条目全属他主题 = 字段静默缺席，输出与没有该功能前零变化。台账是**证据源不是判据输入**——不进 v1.2 掌握判据，不制造题库成绩。

**旧格式兼容（只报事实，不要求补格式）**：无 frontmatter 的旧记录，按文件名带 `-in-progress` 后缀、或正文含「待办」节，识别为进行中站，照常续；无「口头题计数」节的旧记录照常解析，计数缺省为空。

## 契约三 · 计划单元状态维护（`examples/<theme>/plan.json`，主题数据）

plan.json（带日程的学习计划）是**主题数据**：住 `examples/<theme>/`（含外部主题包路径），**agent 直改主题文件、运行期不另存**——不进 progress、不写第二副本。字段定义单源在仓库 `apps/quiz-app/src/types.ts` 的 `PlanFile`/`PlanUnit`（状态四态 `planned | in-progress | done | paused`）/`PlanReschedule`（重排审计，v0.27 #125），分层决策见仓库 ADR-0009——此处只定**怎么维护**，不抄 schema。它是 kit 第一个被学习流程改写的主题数据文件（题库/闪卡/课都是人写机器读），唯一维护方是 F10 陪练；state.md §3 的快照「计划」行只读消费。

**四个维护动作（触发在 F10，前三个只碰两个字段；重排走生成器）**：

| 动作 | 触发 | 改动 |
|---|---|---|
| 开站 | 本站开始学某计划单元 | 该 unit `status: "in-progress"`（`planned`/`paused` 均可翻入——暂停后复学也是开站） |
| 收站 | 单元学完（本站考点全过且该单元内容至此讲完） | 该 unit `status: "done"` + 补 `doneDate` |
| 搁置 | 用户明确暂停某单元（「这个先放放」） | 该 unit `status: "paused"` |
| 重排（v0.27 #121/#125） | ①学习者明确说「重排计划 / 按实际速度重新排」（manual）；②断档/落后时的重排建议——教练报建议、学习者确认（gap/behind）；③`--auto` 明示自动（gap/behind，agent 收尾/维护时代跑） | 剩余单元的 `plannedDate` 按实测速率重写（交错模式另重排剩余 `order`）+ **追加一条重排审计**（见下）；done 单元、`deadline`/`day`/`topic`/`title` 不动 |

**写入口径**：

- **无 plan.json（或文件损坏）→ 三个动作整体跳过**：noop 不是故障，也**不替用户发明计划**——要不要排计划、粒度切多大（考点/站/章）是内容决策，kit 只在计划已存在时维护它。
- **读-改-写**：写前重读文件全文 → 只改目标 unit 的 `status`（收站另补 `doneDate`）→ 整文件写回，与口头流水（契约二）同款并发纪律。
- **只许改 `status` 与 `doneDate` 两个字段**：`plannedDate`/`deadline`/`order`/`title`/`day`/`topic` 是用户的内容决策（排程、粒度、映射），agent 不改——要调日程是用户的事。**唯一例外是重排**（上一行表格第四动作，v0.27 #125 起**契约放宽**）：学习者明确说「重排计划」、或断档/落后场景的重排建议获学习者确认、或 `--auto` 明示自动时，agent 代跑**计划生成器**（工具链命令，可跑不可派给学习者手敲）按实测速率重写剩余单元的 `plannedDate`——排期从「用户手写」变「用户委托生成」，委托本身是用户的决策：
  ```bash
  node apps/quiz-app/scripts/plan-generate.mjs --theme "$THEME" --days-per-unit <实测> --activity <活跃率> [--margin 0.25] [--interleave]
  node apps/quiz-app/scripts/plan-generate.mjs --theme "$THEME" --auto            # 自动模式：断档/落后才排，在轨 noop
  node apps/quiz-app/scripts/plan-generate.mjs --theme "$THEME" --auto --dry-run  # 只出建议不写回（可否决）
  ```
  - **实测速率 `--days-per-unit` 与活跃率 `--activity` 优先用学习者认可的实测值显式传**（复盘/对账口径）；缺省时生成器从 done 历史（14 天窗 → 全历史跨度）与进度接触日派生并在输出报来源；**零 done 历史且无显式速率 → 报错不猜**（没有实测速率就没有排期）。
  - **数学与写回范围**：剩余 N × X 天/单元 ÷ 活跃率 → 日历天数，逐单元落 `plannedDate`；`--interleave` 硬算/概念交错（掌握=重 / 理解·了解=轻，轻先行，另重排剩余 `order`）；done 单元逐字段原样、`day`/`topic`/`title` 不动。判据单源仓库 `apps/quiz-app/scripts/lib/plan-generate.mjs`。
  - **先预览后写回**：先 `--dry-run`（或 `--out` 到主题外如 `/tmp`）出预览件，把公式行与富余/缺口报给学习者，点头后去掉 flag 重跑写回（读-改-写同款并发纪律）——**重排建议可被学习者否决**：不点头就不写，计划保持原样（#125 验收②）。**排不进考期 → 生成器报错附全算术**，如实转达（缩量/降余量/提活跃率学习者拍板），绝不静默压缩速率。
  - **自动重排触发（#125）**：`--auto` 先判 `shouldReschedule`（判据单源 `lib/plan-generate.mjs`：behind=存在逾期单元 / gap=断档 ≥3 天且后移建议可算）——触发才排（审计 reason 自动取判定值），在轨或今天已重排 → noop exit 0 不写任何文件。断档/落后**不再自动 `paused`**（搁置仍是用户决策），修复动作是重排不是催办。
  - **重排审计（#125 契约放宽的边界）**：每次写回在 `plan.rescheduled` **追加**一条（历史全留 = 可追溯，永不改写旧条目）：`at`（真实 `Date.now()`，与 `doneDate` 同款红线：禁固定值/未来值）+ `reason`（behind/gap/manual）+ `triggerDays`（触发时的落后/断档天数）+ `start`/`scheduledEnd`。web 首页/全景读最新一条（新鲜 ≤ 7 天）出「已重排：下一站 X，日期 Y」钩子行——「落后 N 天」债务红字由此退场（#125 验收①：修好即宣告，不再陈列累积欠账）。
- **`doneDate` = 写入当天的真实日历日**（`YYYY-MM-DD`，本地时区；实现上取系统当日，如 shell `date +%F`）。与 progress.json 的 `submittedAt` 真 `Date.now()` 同款红线：**禁固定值、禁未来日期、禁编造**。已 `done` 的单元不重写 `doneDate`（首次完成日是真源）。
- **幂等且单向**：目标状态已达成则跳过（开站遇 `in-progress`、收站遇 `done` 均为 no-op）；`done` 是终态不回翻（不翻 `paused`、也不翻回 `in-progress`——复习性重学照常开站教学，只是不动单元状态）——完成是事实，撤销/重开是用户手改文件的事，教练不做。
- **搁置只在用户明确说时做**：逾期、断档、落后 N 天都不自动 `paused`——那是节奏事实（`behind`），搁置是用户决策；派生层也不因 `paused` 豁免日程（ADR-0009）。
- **单元 ↔ 站不强求一一对应**（单元粒度主题自定）：按 `unit.topic`（与题库 topic 同名）、`unit.day`（与 MISSION 排布表 day 同命名空间）或用户点名对号；对不上的单元不动，不硬凑映射。
- **派生值永不写入**：落后天数、预计完成日、覆盖计数全部现算（`plan-report`，state.md §3），plan.json 只存原始数据——写回 = 双源漂移（ADR-0009 已拒）。重排写的 `plannedDate` 与 `rescheduled` 审计不属此列：前者是学习者委托生成的排期本身（输入决策落地），后者是重排发生的**审计事实**（挪过就是挪过，不随当天进度漂移）——都不是对账派生值。
- **产物时滞属预期**：站点 `src/data/plan.json` 是 sync 产物，主题文件改完要等下次 sync/build 才上 UI；`plan-report --theme` 直读主题文件，立即生效。
