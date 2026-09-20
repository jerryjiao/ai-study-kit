---
name: study-doctor
description: /study-doctor 一站式体检：串跑品牌扫描/题库 QA/四对齐/测试四门校验 + 环境探测（LLM/.env、后端、主题、sync 新鲜度），出过红汇总报告与修复顺序。 One-stop health check of all quality gates plus environment probes.
disable-model-invocation: true
---

# /study-doctor 体检

出问题时、新主题建站后、发布前想快速确认状态——一句话跑完全部校验。主入口见 [`../ask-coach/SKILL.md`](../ask-coach/SKILL.md)。

1. **先探测**（只读）：按 [`../ask-coach/references/state.md`](../ask-coach/references/state.md) §1 解析激活主题（体检里的四对齐校验要主题目录）。
2. **进流程**：按 [`../ask-coach/references/flows.md`](../ask-coach/references/flows.md) **「体检（study-doctor）」** 节执行——四门校验（品牌扫描 / 题库 QA / 测试 / 四对齐）+ 环境探测（LLM 三项、TTS、`:8787` 后端、主题目录、sync 产物新鲜度）+ 版本漂移与契约完整性两项探测（ADR-0006：用户项目 kit 版本 vs 插件快照、排布表/examPoint 标记/闪卡映射缺口——只报事实与补法，走 F13 补）逐项跑，按该节模板输出过/红汇总报告与**建议修复顺序**。

零新校验逻辑：全是对既有命令的编排聚合；发布前的最后一道门（含 build）仍走 /ask-coach 的 F8。

不是体检的活（想学 → /study-coach、错题串讲 → /study-recap、其他 → /ask-coach 路由），说一句该去哪。
