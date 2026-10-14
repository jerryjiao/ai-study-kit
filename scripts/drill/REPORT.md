# F13 存量项目升级演练留档（U6 #61 / spec #55 行为级主验收面）

> 2026-09-14 首跑。演练 = 夹具脚本一键生成 v0.13 形态存量项目 → agent 按 skill 流程文档（F1 第 0 步 → F13 → 体检两探测项）真实带跑 → 断言器全绿。
> 回归用法：每次大改升级流程后重跑——`node scripts/drill/make-legacy-fixture.mjs && ` 按 `skills/ask-coach/references/flows.md` F13 带跑 `&& node scripts/drill/check-upgrade.mjs`，断言器 exit 0 = 回归通过。

## 夹具

- 生成命令：`node scripts/drill/make-legacy-fixture.mjs /tmp/ask-drill/project`
- 形态：kit = **v0.13.1 跟踪面快照**（`git archive v0.13.1`，无 kit-version.json = 版本未知）；用户主题 `theme/net-basics/`（外部主题包，住 kit 外）；progress 含答题 6 / 看题 2 / 闪卡 SRS 3 / 课已学完 1（真实 `Date.now()` 时间戳）。
- 故意埋的契约缺口：闪卡 6 张全部无 `examPoint` 映射（v0.11 契约——掌握度静默退纯题维度）；学习记录为 v0.13 旧格式（含「口头题计数」节）；无 oral-attempts.json（v0.14 文件，首用自建）。
- 指纹：`.drill-manifest.json`（progress + 主题文件 sha256）。

## 带跑实录（agent 按 flows.md 逐步执行，命令照抄 playbook）

| 步骤 | 命令/动作 | 实测结果 |
|------|-----------|---------|
| F1 第 0 步 | `test -d <项目>/kit && cat <项目>/kit/kit-version.json` | `kit=exists` · `version=unknown` → **不执行任何拷贝，转 F13**（版本未知 = 按最老） |
| F13 ① 读两处版本 | project kit-version vs 插件快照 | project `unknown`（v0.13.1 形态，版本标记出现之前建的）· snapshot `0.14.0` → 报「版本未知，按最老处理」 |
| F13 ② 备份 progress | `cp …/progress.json <项目>/progress.backup-20260914.json` | 落盘，sha `decf5abe0697…` |
| F13 ③ 重拷 kit | mv progress → `rm -rf kit` → `cp -r <快照>/kit <项目>/kit` → mv 回 | `kit-version.json = 0.14.0` ✅ · `no-nesting=ok` ✅ · progress sha 不变 `decf5abe0697` ✅ |
| F13 ④ 补缺失新文件 | 快照随重拷全量到位 | `scripts/lib/oral.mjs`（v0.14 新文件）到位；`oral-attempts.json` / `graph-map.json` **未预建**（首用自建）；theme-config 可选未补（无配置回退正常态） |
| F13 ⑤ 契约缺口逐项 | 体检节探测命令 | `排布表=有` · `questionsTagged=8/8` · `flashcardsMapped=0/6` ⚠ → 点名缺口 + 补法（给卡补 examPoint）；mastery-report 实测佐证：4 个考点 `flashMapped=0`——掌握度正跑在纯题维度上，补映射才恢复双通道。学习者选择「稍后补」→ 如实记档，不代写 |
| F13 ⑥ 收尾体检 | 版本漂移 + 契约完整性两探测项 | 版本 `0.14.0 = 0.14.0` **已对齐** ✅；契约缺口 1 项如实报（已知悉未补）——全绿口径 = 无漂移 + 无**未告知**缺口 |
| 断言器 | `node scripts/drill/check-upgrade.mjs /tmp/ask-drill/project` | **12 项全绿，exit 0**（progress 逐字节一致 · 主题 6 文件不动 · 版本对齐 · 无嵌套 · 快照 152 文件全到位 · 缺口如实保留 · 旧格式记录兼容） |

### F1 第 0 步分支表补充核验（U3 #58 验收）

| 场景 | 探测输出 | 分支 |
|------|---------|------|
| kit 存在 + 版本落后（0.13.1 < 0.14.0） | `kit=exists version=0.13.1 < snapshot` | 转 F13，不拷贝 |
| kit 存在 + 无版本文件（主演练） | `kit=exists version=unknown` | 转 F13，不拷贝 |
| 干净目录 | `kit=clean` | F1 从零初始化（与现状一致） |

## 结论

#55 的行为级验收达成：F1 识别 → 转 F13 → 对齐 → 体检报无漂移，全链路走通；progress 分毫未失、无嵌套拷贝、新文件模板补齐（快照文件级全到位）、契约缺口逐项告知且零代写。

## 边界（如实声明）

- 演练未在夹具项目里跑 `npm install` / build / 四门校验——那是仓库形态体检的活，演练聚焦升级机制本身（版本/拷贝/契约三个接缝）。升级后的 kit 可构建性由快照与仓库同源保证（kit 快照字节契约 + CI 测试带）。
- 契约缺口选择「稍后补」路径演练；「当场补」路径 = 学习者按 F13 第 5 步补法编辑 `flashcards.json` 后重跑体检，断言器 ⑥ 认两种合法终态（如实保留 / 全量补齐）。

---

# 假绿探测演练留档（#100 / spec #99 行为级验收面）

> 2026-09-28 首跑。F13 第 1 步新增**复探**（state.md §8 第三处「最新发布」，`ASK_KIT_VERSION_URL` 可覆盖）：本体落后 → 停在复探不重拷（绝不把项目对齐到旧快照）+ Route A/B 引导；本体最新 → 照常升级。断言器加 `--scenario=stalled` 场景（断言先行，先红后绿验证）。

## 夹具新增

- 假 version.json 两桩（`.drill-stubs/`，随 `make-legacy-fixture.mjs` 生成）：`version-ahead.json`（最新 v0.22.1 > 快照 v0.22.0 → 本体落后）、`version-same.json`（最新 = 快照 → 本体最新）。演练用 `ASK_KIT_VERSION_URL=file://<桩路径>` 指桩，不出网。
- 桩版本记入 `.drill-manifest.json` 的 `stubs` 字段（断言器读 `aheadVersion` 验引导文本里的版本号）。

## 断言器新增（--scenario=stalled）

- ③' kit 未重拷：`kit/kit-version.json` 仍缺失（v0.13.1 形态原样——重拷会带进快照版本文件）。
- ④' refresh 引导给出：`.drill-refresh-guidance.md`（演练者按 F13 Route A 文案输出的引导留档）含四要素——「代不了」声明、marketplace refresh 步骤、快照版本号、桩的最新版本号。
- ①② 复用（progress 与主题分毫未失——停下的流程什么都不能动）；upgraded 场景断言面不变（向后兼容，不带 flag 即旧口径）。

## 带跑实录（agent 按 flows.md F13 改后文案逐步执行）

| 步骤 | 命令/动作 | 实测结果 |
|------|-----------|---------|
| 断言红验证 A | 生成夹具后直接跑 `check-upgrade --scenario=stalled`（未跑场景） | `❌ refresh 引导缺失` · exit 1——新断言在缺引导时真红 |
| F13 ① 本地两处 | `cat` 项目/快照 kit-version.json | 项目 `unknown`（v0.13.1 形态）· 快照 `0.22.0` |
| F13 ① 复探（ahead 桩） | `ASK_KIT_VERSION_URL=file://…/.drill-stubs/version-ahead.json curl --max-time 3 -sf "$ASK_KIT_VERSION_URL"` | `{"version":"0.22.1"}`；0.22.1 不在 CHANGELOG 已知序列 → 快照旧于最新发布 → **本体落后，停下**（不执行第 2 步及以后），报三处版本 + Route A 引导（`/plugin marketplace update ai-study-kit` 等 + 明说「代不了」+ 刷新完回来复探），引导留档 `.drill-refresh-guidance.md` |
| stalled 断言 | `check-upgrade /tmp/ask-drill/project --scenario=stalled` | **12 项全绿，exit 0**（progress 逐字节一致 · 主题 6 文件不动 · kit 未重拷 · 引导四要素齐） |
| F13 ① 复探（same 桩，模拟刷新完回来） | 同上，指 `version-same.json` | `{"version":"0.22.0"}` = 快照 → 本体最新，继续第 2 步 |
| F13 ②③ 备份 + 重拷 | 备份 progress → 挪运行期文件 → `rm -rf kit` → `cp -r 快照` → 拷回 | `kit-version.json = 0.22.0` ✅ · `no-nesting=ok` ✅ · progress 与备份逐字节一致（sha `da449401d24a…`） |
| F13 ④⑤⑥ 补缺失 + 契约缺口 + 收尾体检 | diff 文件清单 / 探测命令 / 三信号 | 重拷后无缺失（168 文件全到位，含 `oral.mjs`）；`排布表=有` · `questionsTagged=8/8` · `flashcardsMapped=0/6` ⚠ 如实点名（学习者稍后补）；收尾体检：项目 0.22.0 = 快照 0.22.0 = 最新发布 0.22.0 → **已对齐 + 本体最新** |
| upgraded 回归断言 | `check-upgrade /tmp/ask-drill/project` | **12 项全绿，exit 0**（既有六断言面全数回归通过） |
| 断言红验证 B | 升级后的项目再跑 `--scenario=stalled` | `❌ kit 被重拷` · exit 1——「没停在复探就重拷」会被抓红 |
| 软失败验证 | 探真实 URL（未部署，404）/ 坏 JSON 桩 | `latest=unknown` 或解析不出 version 字段 → 注一句照报本地两态，管道不阻塞——**软失败语义成立** |

## 结论

#100 的行为级验收达成：假绿被三处版本探测暴露（本体落后 → 快照「版本」行报三态、推荐算法第 2 条先引导刷新、F13 复探绝不落在旧快照上）；停在复探时 kit/progress/主题分毫未动、Route A 引导四要素齐；本体最新时既有升级面零回归。

## 回归用法（#100 后）

```bash
node scripts/drill/make-legacy-fixture.mjs /tmp/ask-drill/project
# 本体落后场景：ASK_KIT_VERSION_URL=file:///tmp/ask-drill/project/.drill-stubs/version-ahead.json
#   → 按 flows.md F13 第 1 步复探停下（不重拷），引导留档后：
node scripts/drill/check-upgrade.mjs /tmp/ask-drill/project --scenario=stalled
# 本体最新回归：ASK_KIT_VERSION_URL=file:///tmp/ask-drill/project/.drill-stubs/version-same.json
#   → 复探通过，按 F13 完整升级后：
node scripts/drill/check-upgrade.mjs /tmp/ask-drill/project
```

---

# 口述错因跨会话接续演练留档（#132 / spec #131 行为级验收面）

> 2026-10-14 首跑。验收切分按 #130 决议：数据面由确定性夹具保（`apps/quiz-app/scripts/lib/misconceptions.test.mjs` 台账纯函数 14 项 + `mastery-report.test.mjs` 报告端到端新增 2 项——双源 join / 主题隔离 / 未定位桶 / 状态派生 / 无台账零变化），行为面由本演练保。演练脚本可重复跑，时间戳全部真实 `Date.now()`（红线），两会话 = 两次独立命令序列（判错落条 → 跨会话读出 → 答对派生 corrected）。

## 夹具

- 生成命令：`node scripts/drill/misconception-drill.mjs`（默认目录 `/tmp/ask-drill-misconception`，外部主题包形态；每次重跑重建）。
- 形态：三考点主题（EP-01 暂存区 / EP-03 chmod / EP-05 分支模型）+ profile.json（题 id 来源错因挂 EP-03，验证双源 join）+ 空答题进度；正式站记录 `01-perm.md` 照写「错的点」（旧通道不丢）；他主题同号 EP-03 条目预置（验证读端隔离）。

## 带跑实录（15 项断言全绿，exit 0）

| 会话 | 动作 | 实测结果 |
|------|------|---------|
| 1 · 正式站 | EP-03 chmod 口述判错（把 4 说成读权限）→ 台账落条（observed 事实 + diagnosis 推断分立、questionId=C1、via=ep） | ✅ 站记录「错的点」与台账并存，旧通道不丢 |
| 1 · 微块 | 裸知识点「补零权限位」判错 → 台账落条 via=null | ✅ 未定位如实呈现；`study/records/` 仍只有 1 份站记录——微块不被迫建正式站 |
| 1 · 边界 | 他主题同号 EP-03 条目预置 + 同一笔观察重复提交 | ✅ 读端过滤不串用；append 幂等去重、计数不虚增 |
| 2 · 开场读出 | state.md §7 探测命令（`grep -c '"status"'`）+ §3 `mastery-report --json` | ✅ 探测报 3 条；报告 total=2（他主题被滤）；observed / diagnosis 分开可引（「你上次说过 X」与「我当时判断根因是 Y」不同句）；profile（题 id 来源）与台账（口述来源）同 EP-03 并存互不覆盖 |
| 2 · 判据对拍 | 有台账 vs 临时移走台账重跑报告，四态逐考点对比 | ✅ 完全一致（`{"EP-01":"untouched","EP-03":"weak","EP-05":"untouched"}`——EP-03 weak 是口述判错通道的 v1.2 语义，与台账无关：台账是证据源不是判据输入） |
| 2 · 接续闭环 | 学习者答对同目标口述（真实事件时间）→ 流水落判对条 → 重跑报告 | ✅ 台账条 open → corrected（消费端派生，不改写旧条目）；口述流水两笔，错因与成绩各走各的通道互不冒充 |
| 边界 | sync-study LOCAL_ONLY 规则核对 | ✅ `study/records/` 不上站（台账私有边界随目录继承） |

## 结论

#132 验收达成：判错落条 → 跨会话经既有报告与开场路径读出同一根因 → 新作答进流水后状态派生 corrected，正式站与微块同规；observed/diagnosis 诚实分立；主题隔离、去重、真实时间戳、判据零变化全部实证。

## 边界（如实声明）

- 复测选择/限量/编排（#129 规则）不在本票——台账 `misconceptions` 字段已可消费，复测候选派生与 F10 抽背位并入由 #133/#134 接续。
- 演练为脚本化两会话（非真人对话）；时间戳真实但两「会话」同日相邻——隔期天数不参与本票任何判据（#129 已决不设固定间隔）。
- `POST /api/oral-attempts` 实时回流未在演练中起服务端（演练聚焦台账链路）；回流面已有既有行为测试覆盖，台账消费的是并流后的同一份流水。

---

# 隔期复测闭环演练留档（#133 / spec #131 行为级验收面）

> 2026-10-14 首跑。验收切分按 #130 决议：数据面由确定性夹具保（`apps/quiz-app/scripts/lib/retest.test.mjs` 复测派生 13 项——三条件 / 双闸 / 当天退场 / 跨日重选 / 午夜边界 / 三周不堆叠 / 弱项排序 / 复发接续，`mastery-report.test.mjs` 报告端到端新增 1 项——零闪卡派生 / 回流去重 / 答对退场），行为面由本演练保。时间口径：会话 1 = 真实墙钟的昨日整点（夹具注入面——跨日边界是本票判据，注入只存在于夹具），会话 2-4 作答全部真实 `Date.now()`。

## 夹具

- 生成命令：`node scripts/drill/retest-drill.mjs`（默认目录 `/tmp/ask-drill-retest`，外部主题包形态；每次重跑重建）。
- 形态：三考点主题（EP-01 暂存区 / EP-03 chmod / EP-05 分支模型）+ **零闪卡**（flashcards 空、progress.srs 空、答题空——复测入选与 srsDue/题库进度无关）；会话 1 以微块形态判错三考点（不开站）→ 台账三条（EP-03 带 diagnosis、EP-05 缺省）。

## 带跑实录（17 项断言全绿，exit 0）

| 会话 | 动作 | 实测结果 |
|------|------|---------|
| 1 · 昨天 | 三考点口述判错 → 流水 3 条 + 台账 3 条 | ✅ 微块不开站也有证据通道；diagnosis 有/缺省两种形态各一条 |
| 2 · 今天 | 「考考我上次错的」→ `mastery-report --json` 读 `retest` | ✅ 零闪卡照常派生 3 候选；pick=EP-03（三目标同为 weak·加权 0 → tiebreak 取观察最新）；observed 事实 / diagnosis 推断分开可引 + 口头四态——「为何选它」有据 |
| 2 · 今天 | 沿 diagnosis 出变体 → 答对（真实时间）→ 落流水 + 模拟 POST 回流 → 重跑报告 | ✅ 台账条 open → corrected；EP-03 退出候选（历史错误不被当作当前仍错）；流水两笔各计一次（回流副本同四元组去重）；题库作答面零记录（口述不伪造成题库作答） |
| 3 · 今天 | 下一候选 EP-05（diagnosis 缺省 → 按 observed 出变体）→ 答错 → 当场纠 + 再验 1 题（1-2 题预算封顶）→ 仍错 → 追加复发条目（observed 一字不差沿用） | ✅ 旧条 recurred、新条 open（接续可判定，不改写旧条）；EP-05 当天已答 → 今天退场、明天按状态重新判入选 |
| 4 · 今天 | pick=EP-01 → 学习者「先不复习了」 | ✅ 零写入（台账 4 条 / 流水 6 条 / records 目录文件数不变）；EP-01 留待后续会话——跳过零欠账零催办 |
| 降级 | 空台账主题跑报告 | ✅ `retest` 与 `misconceptions` 字段整体缺席（复测通道静默不出现，输出与功能前零变化）；私有边界复认（台账/流水住 study/records/） |

## 结论

#133 验收达成：显式复习意图 → 按已确认规则选择目标并解释依据（非随意出题）→ 沿 diagnosis 出变体（非原题重放）→ 实际口述作答判分 → 结果进既有口述流水与回流（主题归属/去重/题库隔离照旧）→ 答对退场 / 答错复发接续闭环走通；零闪卡全程可用；跳过零欠账；无证据诚实降级。

## 边界（如实声明）

- 自动并入 F10 第 0 步抽背位（与 srsDue 同池 ≤3 题）的**开场编排**不在本票——#134 收口；本演练验证的是显式请求路径。
- 演练为脚本化多会话（非真人对话）；「昨日」为夹具注入的墙钟偏移（跨日边界判据所需），真实学习记录全部真实事件时间。
- `POST /api/oral-attempts` 回流在演练中以「同四元组写 progress.oralAttempts」模拟（与既有行为测试同法，未起服务端）；回流面已有 #122 行为测试覆盖。

---

# 复测接入开场与微块演练留档（#134 / spec #131 行为级验收面）

> 2026-10-14 首跑。#132/#133 演练同模式：数据面由确定性夹具保（`retest.test.mjs` / `misconceptions.test.mjs` / `mastery-report.test.mjs`），行为面由本演练保——**两会话**各自独立跑「探测 → 按编排优先级行动 → 落盘 → 再探测」，证明 #134 的新增推荐实际可消费（不是关键词扫描）。时间口径：夹具预置用真实墙钟的昨日整点（跨日边界是 #133 判据，注入只存在于夹具），两会话全部作答与落盘时间戳真实 `Date.now()`。

## 夹具

- 生成命令：`node scripts/drill/opening-drill.mjs`（默认目录 `/tmp/ask-drill-opening`，外部主题包形态；每次重跑重建）。
- 形态：三考点主题（EP-01 暂存区 / EP-03 chmod / EP-05 分支模型）+ 4 张闪卡（`examPoint` 映射，FC-3/FC-4 昨日到期 → `srsDue=2`，phase 非 review 不构成毕业超题证据）+ **昨日微块判错三考点**（台账 3 条 open + 流水 3 条；EP-01 缺省 diagnosis）+ **未认领下站预告**（EP-05，昨日收尾留）+ `plan.json` 两单元（全程字节对照）。

## 带跑实录（27 项断言全绿，exit 0）

| 会话 | 动作 | 实测结果 |
|------|------|---------|
| A · 常规开场 | 「继续学习」→ 探测（主入口 /study-coach 同一 state.md 协议） | ✅ `retest.pick`=EP-05（观察最新 tiebreak）+ observed/diagnosis 分开可引 + `srsDue=2` · 未认领预告 EP-05 · `plan-report next`=EP-01——四类开场信号同场可见，编排优先级（#129：预告认领 > 抽背/复测同池 ≤3 > 弱考点 > 新学）的全部输入在盘上 |
| A · 认领位 | 预告考点（EP-05）恰为复测 pick → 认领口述 1 题答对 | ✅ **认领即覆盖复测**：当天无第二笔复测题；EP-05 corrected 退场，pick 转 EP-03 |
| A · 同池位 | 复测 EP-03 变体 2 题（答错 → 当场纠 → 再验仍错 → 复发接续写法）；到期卡 FC-3 目标 == pick → 抽背让位改抽 FC-4 | ✅ 池合计 = 复测 2 + 抽背 1 = **3 ≤ 3**；EP-03 台账旧条 recurred / 新条 open；EP-03 当天已答退场、候选剩 EP-01（不陈列）；抽背不清 srs（清偿走 F3） |
| A · 跳过 | 学习者「EP-01 先不复测，直接学新的」 | ✅ 零写入（台账 4 / 流水 / records 目录不变）、零催办，正题照常；plan.json 字节不变 |
| A · 收尾 | 跑 `plan-report --json` 读 `next` 现算写预告 | ✅ hook=EP-01（== next，判据单源一致）、action/minutes 齐、leftAt 真实；答对退场的 EP-05 不再进预告位（**与这次结果一致**）；corrected 派生不改写旧条目 |
| B · 低能量微块 | 「就学 5 分钟，考考我上次错的」→ 探测 | ✅ 唯一候选 EP-01 恰为上次预告考点 → 微块预告认领与复测同点合并（判据不依赖间隔，同日稍晚照常派生）；EP-01 缺省 diagnosis → 出题回退 observed |
| B · 块内复测 | 变体 1 题答错 → 当场纠 → 再验 1 题答对 | ✅ 台账条 open → corrected 退场；轻量尺寸（2 题）与判分纪律照旧；**微块不开站**（records 零 .md）、plan.json 两会话字节不变（AC 4）；候选清空 `pick:null` + excluded 如实计数（快照行按口径省略） |
| B · 收尾 | 预告照 next 现算落盘 | ✅ leftAt 真实、零催办字样逐字段核对 |
| 降级 | 无台账对照主题跑两个 CLI | ✅ `retest`/`misconceptions` 字段缺席、`next` 照常派生——原有续站与学习入口正常可用（AC 7） |

## 结论

#134 验收达成：复测从显式请求的独立闭环扩为开场自动编排——两入口（主入口/薄命令同一探测协议）都能看见复测信息并给出带实测证据的动作；开场建议按已确认优先级产生且理由可指认；同目标三通道（认领/抽背/复测）去重不重复考；微块复测保持轻量尺寸与判分/落盘纪律且不动站与 plan；收尾预告与这次结果、下一次候选一致；跳过零欠账零催办；无台账主题原有路径零变化。

## 边界（如实声明）

- 演练为脚本化两会话（非真人对话）；「昨日」为夹具注入的墙钟偏移，会话 B 与 A 同日稍晚——#129 已决复测不设固定间隔，判据不依赖间隔天数，同日演练不影响判定语义。
- 开场话术（「今天最该练 X，因为 Y」的解释句式）在 REPORT 与断言里以证据字段齐备性验证（observed/diagnosis/四态/今天未考），逐字话术由 F10/coach.md 协议约束，演练不复制文案。
- `POST /api/oral-attempts` 回流以「同四元组写 progress.oralAttempts」模拟（与 #132/#133 演练同法，未起服务端）；回流面已有 #122 行为测试覆盖。
- 主入口与薄命令的差异只在 SKILL.md 路由（探测与编排同走 state.md + F10 第 0 步），演练以同一命令序列覆盖两者，未分别起两个 agent 会话。

---

# 存量主题升级 × 跨会话验收收口演练留档（#135 / spec #131 行为级验收面）

> 2026-10-14 首跑。#132-#134 三票已各自完成功能与演练（见上三节），本票收口**存量面**：旧项目形态（仅 profile + 旧口述流水 + 站记录 + 答题/闪卡/计划数据，**无台账**）升级到含复习闭环的能力面后，逐字断言兼容与诚实降级，再走「升级后首用建立 → 后续独立会话读错因 → 少量复测 → 结果写回」的跨会话闭环（决议 #130 夹具④的行为面落地）。演练脚本 `scripts/drill/legacy-review-drill.mjs`（可重复跑）。

## 夹具

- 生成：脚本自建临时外部主题包（默认 `/tmp/ask-drill-legacy-review`，每次重跑重建）。
- 旧项目形态：老 profile（只有题 id 关联，`questionIds: [C1,C2]`）+ 旧口述流水（v0.26 前形态，条目无 `theme` 字段：EP-05 三周前与昨日各判错一次、EP-01 昨日答对一次）+ 正式站记录 `01-branches.md`（含「错的点」）+ 存量答题（EP-01 两题答对）与 srs 一条 + 根级 `plan.json`；**无 `misconceptions.json`、无 `next-hook.json`**；闪卡 2 张全部无 `examPoint`（存量契约缺口如实保留）。
- 时间口径：存量数据与会话 A = 真实墙钟偏移（昨日整点、三周前——夹具注入面，跨日边界是 #133 判据）；会话 B 作答与全部落盘 = 真实 `Date.now()`。

## 带跑实录（31 项断言全绿，exit 0）

| 幕 | 动作 | 实测结果 |
|----|------|---------|
| 0 · 升级后首探测（只读） | `mastery-report --json` + 文本输出 + study/ 文件集指纹 | ✅ `misconceptions`/`retest` 字段双双缺席（复测通道静默零变化）；EP-05 有旧判错但**无错因条目**（不从旧流水回填倒推）；老 profile 照题 id join（C1/C2 → EP-03 档案错因贴回）；旧流水照读（EP-05 问 2 对 0 → weak，真实旧成绩不夸大）；存量作答照读；报告文本零催办词；**只读探测零建文件**（文件集与字节不变） |
| 1 · 会话 A（昨日） | 口述判错 EP-05 → 台账落条 | ✅ 台账**首用建立**（升级后第一次真实判错才落第一笔，不是升级动作建的）；落盘 `status=open`、`via=ep`、observed/diagnosis 分立；老 profile 与站记录字节不动（零迁移、站记录与台账并存不合并） |
| 2 · 会话 B（今日） | 探测 → 读错因与复测候选 → 沿 diagnosis 出变体 → 答对写回 | ✅ §7 探测读出台账 1 条；报告读出同一根因（observed/diagnosis 分开可引）；`retest.pick`=EP-05（三条件齐：open + weak + 今日未考）；出题依据齐备；候选无 dueAt/overdue（三周旧错因同池，无到期清单）；**回流合并后 answers/srs 分毫未失、无新 answer id**（口述不伪造成题库作答）；回流副本四元组去重；结果写回 → 派生 `corrected`（不改写旧条目）；`pick=null` + `excluded.notOpen=1` 如实退场；口头四态按新证据更新（问 4 对 1）；`plan.json` 字节未动；全程零催办 |
| 3 · 边界 | 坏台账 / 同号 EP 他主题 / 跳过 / 私有边界 | ✅ 坏台账：字段静默缺席 + 考点四态逐项不变 + 写端拒覆盖（文件原样不重置）+ 留档处置后恢复；他主题同号 EP-05 条目读端过滤不串用；跳过零写入（文件集字节不变）；`study/records/` 在 sync-study LOCAL_ONLY 边界内（不上站）+ `git check-ignore` 命中 `examples/*/study/records/`（不提交） |

## 回归面（同日实跑）

- F13 升级演练（#61/#100 机制面）：`make-legacy-fixture` 重新生成 v0.13 形态夹具 → 按 F13 备份/重拷/拷回 → `check-upgrade` **12 项全绿 exit 0**（progress 逐字节一致、主题 6 文件不动、版本对齐 0.27.0、无嵌套、快照 204 文件全到位、契约缺口如实保留、旧格式记录照读）——升级机制面与 #135 新口径（F13 第 4 步「台账不预建不回填」）不冲突。
- 四场复习闭环演练全绿：`misconception-drill`（#132）、`retest-drill`（#133）、`opening-drill`（#134）、`legacy-review-drill`（本票）。
- 数据面：`pnpm test` 全绿（vitest 21 文件 360 项 + node:test scripts/lib 358 项，0 失败）——含 `misconceptions.test.mjs` 14 项（解析/追加/状态派生/坏文件/主题过滤）、`retest.test.mjs` 13 项（三条件/双闸/当天退场/跨日/午夜/三周不堆叠/弱项排序/复发接续/裸名）、`mastery-report.test.mjs` 端到端（双源 join/无台账零变化）。`pnpm run scan` 零命中。

## 结论

#135 验收达成：存量主题（旧题 id 档案、旧口述流水、缺新私有记录）升级后原学习路径零变化、已有作答/学习站/闪卡/计划数据分毫未失；探测与体检能如实报告台账与复测契约的事实与补齐路径（升级不预建不回填，能力在学习者下次真实判错时自然到位）；升级后首用建立 → 独立会话读错因 → 少量复测 → 结果写回的跨会话闭环走通；同号 EP 跨主题、坏/缺记录、零闪卡、长时间中断、用户跳过全部给出确定且诚实的结果。

## 与父规格 / 四道设计决策的对账（AC9）

| 决议 | 采纳要点 | 实施证据（本仓可指认） |
|------|---------|----------------------|
| #127 短口述先行 | 复测证据走既有口述流水，case 只读不排、不改造成短口述成绩 | `retest.mjs` 入选不走 case 判据、出题口径 F10「复测一律短口述形态」；`retest.test.mjs`「案例边界」用例；演练确认无新 source 枚举 |
| #128 最小私有台账 | append-only、observed/diagnosis 分立、resolveOralTarget 复用、theme 读端过滤、profile 一字不动、无 CLI | `misconceptions.mjs`（拒未来时间戳/半缺 diagnosis/坏文件拒写）+ 14 项单测；`mastery-report --json` 双源 join；契约二写入口径；演练第 1/3 幕 |
| #129 证据派生 + 每会话 1 目标 | 三条件入选、无固定间隔、同池 ≤3 题、跳过零欠账、无调度器 | `deriveRetest` 判据单源 + 13 项单测；F10 第 0 步编排（#134）；本票演练确认候选无到期/堆叠语义、跳过零写入 |
| #130 夹具 + 演练、四消费点 | 夹具①-④ + 两会话演练 + 报告/开场/预告/探测四消费点同验 | 夹具①②③=既有单测与端到端；夹具④=本票 `legacy-review-drill.mjs`；四消费点分别由 #132（报告/探测）、#134（开场/预告）与本票（F13/体检探测面）收口 |
| 父规格边界 | 不改 v1.2 判据、不回填、不预建、零催办、web 侧不在本轮 | 演练「坏台账不改四态」「旧错答不倒推」「只读不建文件」「零催办词扫描」逐项断言；本轮代码改动仅 drill 与 skill 文档面 |

## 边界（如实声明）

- 演练为脚本化两会话（非真人对话）；「昨日/三周前」为夹具注入的墙钟偏移（跨日与长中断边界是判据所需，注入只存在于夹具）；会话 B 全部落盘真实 `Date.now()`。**代码门禁与演练通过 ≠ 真人学习效果已被实证**——跨会话学习收益仍需真实使用者检验。
- kit 重拷升级机制由 F13 演练保（同日回归 12 项全绿）；本票演练管数据与行为兼容面（存量主题数据 + 新代码）。
- 开场快照对「无台账」保持静默（#129 零变化纪律）是有意设计：AC2 的「探测与体检报事实与补齐路径」落在升级/诊断面（F13 第 4/5 步 + 体检契约完整性探测），不打扰日常开场的零催办红线——两处的分工在对账表中指认。
- `POST /api/oral-attempts` 回流以「同四元组写 progress.oralAttempts」模拟（与 #132/#134 演练同法，未起服务端）；回流面已有 #122 行为测试覆盖。
- 体检/F13 的新口径是 agent 协议文档（flows.md），其执行质量由 skill 会话承担，脚本断言面覆盖的是报告/探测命令的确定性行为。
