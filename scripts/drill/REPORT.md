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
