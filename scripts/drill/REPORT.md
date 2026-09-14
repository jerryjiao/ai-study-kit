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
