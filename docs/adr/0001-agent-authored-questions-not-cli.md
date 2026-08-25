---
status: accepted
date: 2026-08-17
---

# 0001 · 产题走 agent 直产，不建产题 CLI

仓库已有三个 AI CLI（teach / grill / podcast），唯独产题没有工具化；methodology.md 却宣称「出题：AI 协助生成」。我们决定：**产题 = agent 直产**（ai-study-kit 教练 skill 的 F2 纪律化：先与用户对齐 MISSION.md 考点排布表，再照表逐考点产题），不建第四个 CLI；质量纪律交给既有脚本门——`bidirectional-check.py` 改为解析 MISSION 排布表做考点校验与题量/卡数对账，替代「换主题手改脚本 keywords」。智能（调研、出题判断）归 agent，纪律（schema、对账、全绿门槛）归脚本。

## Considered Options

- **spec + CLI 分层**（agent 调研出 quiz-spec.json，新 CLI 照 spec 批量产题 + 内置 qa 自动修循环，复刻 teach-generate 模式）——暂缓：调研智能天然在 agent 侧，CLI 只省批量生成那段；等 map #1 认证内容包（issue #5）验证百题级 agent 直产确有规模痛点后再启用。届时 MISSION 排布表格式即为该 CLI 的输入契约，升级不返工。
- **app 内 UI 生成**（浏览器填主题、后端调 LLM）——否决：server 零 LLM 集成，且 app 为构建期单主题，隐含运行时多主题大改。

## Consequences

- 排布表格式一旦被 checker 解析即成契约，改格式需迁移存量主题。
- 出题纪律中「选项等长、格式不给线索」等条目源自 teach skill（工作区结构 MISSION/RESOURCES/lessons 亦同源），README 致谢须点名。
