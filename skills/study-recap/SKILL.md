---
name: study-recap
description: /study-recap 错题串讲直入：先探测（后端在线/有错题/AI 配齐），进 F4 把错题从「知道答案」升级到「知道为什么错」。 Wrong-question deep-dive entry: probes prerequisites then runs F4.
disable-model-invocation: true
---

# /study-recap 错题串讲

错题攒多了想深挖——直进 F4 错题串讲。主入口与完整协议见 [`../ask-coach/SKILL.md`](../ask-coach/SKILL.md)。

1. **先探测**（只读）：按 [`../ask-coach/references/state.md`](../ask-coach/references/state.md) 跑 Step 1，对齐 F4 硬前置——后端在线（离线先 `pnpm run server`）、未毕业错题 ≥ 1（0 就别跑，先去刷题）、AI 配置（CLI 路径需要；agent 会话里直产不需要）。
2. **进流程**：按 [`../ask-coach/references/flows.md`](../ask-coach/references/flows.md) **F4** 执行（agent 会话优先 agent 直产路径）——聚类深挖 + 更新学习者档案，读完交棒「重做错题集」。

错因根子是概念缺口 → 交棒 /study-coach 开补站；只是想刷题 → 答题站。
