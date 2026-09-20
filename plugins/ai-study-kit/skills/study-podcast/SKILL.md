---
name: study-podcast
description: /study-podcast 播客直入：先探测（AI 配置必须、TTS 可缺、素材存在），进 F5 把学习素材合成男女双播音频，通勤路上听。 Podcast entry: probes prerequisites then runs F5 to turn study material into a two-host audio show.
disable-model-invocation: true
---

# /study-podcast 播客直入

通勤前想把学习素材变成能听的——直进 F5 做播客。主入口与完整协议见 [`../ask-coach/SKILL.md`](../ask-coach/SKILL.md)。

1. **先探测**（只读）：按 [`../ask-coach/references/state.md`](../ask-coach/references/state.md) 跑 Step 1，对齐 F5 前置——AI 配置（`.env` LLM 三项，缺了先给配置指引）、TTS 可缺（没配就提示 `--no-tts` 只出逐字稿，可用其他 TTS 工具二次合成）、素材存在（没掌握的课 / 错题串讲 / 题库任一有货）。
2. **进流程**：按 [`../ask-coach/references/flows/F5.md`](../ask-coach/references/flows/F5.md) 执行。素材选择是 playbook 选择点，问用户（默认按 F5 优先级推荐：没掌握的课 > 错题串讲 > 整个题库）。

不是播客的活（刷题 → 答题站、错题串讲 → /study-recap、陪练 → /study-coach、其他 → /ask-coach 路由），说一句该去哪。
