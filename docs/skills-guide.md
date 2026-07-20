# Skills Guide · 工作流支撑 skill

> **EN**: ai-study-kit's learning loop is supported by three user-level skills (not bundled in this repo): `teach` for course generation, `grill-wrong-questions` for wrong-answer deep-dives, and `podcast-generation` for review podcasts. This page points you to each.
>
> **中文**：本工具的学习闭环背后有三个用户级 skill 支撑（不在本仓库内）：`teach` 生成课程、`grill-wrong-questions` 错题精讲、`podcast-generation` 复习播客。本文指引你找到它们。

---

## 重要：skill 是用户级的，不在本仓库

本仓库 (`ai-study-kit`) 只包含：

- 答题站代码 (`apps/quiz-app/`)
- 示例主题 (`examples/dev-intro/`)
- 方法论文档 (`docs/`)

下面三个 skill 是<strong>用户级</strong>工具（位于 `~/.agents/skills/` 或你 AI 客户端的 skill 目录），<strong>不随本仓库分发</strong>。用之前需要自己安装或参照对应 skill 仓库自己实现。

---

## 1. `teach` —— 课程生成

**作用**：把一个主题 + 一份资源清单（`RESOURCES.md`），用 AI 产出多节自包含的 HTML 课程，遵守 Tufte 式版式、有共享 stylesheet、内部用相对路径互链。

**输入**：
- `MISSION.md`：学习动机和目标
- `RESOURCES.md`：高质量外部资源清单（书、文档、视频链接）
- `learning-records/*.md`：历史学习记录（可选，用于判断"最近发展区"）

**输出**：
- `lessons/0001-*.html`、`lessons/0002-*.html` ...：编号递增的课程文件
- `reference/*.html`：速查表、glossary、算法伪代码等参考文档
- `assets/styles.css`：共享样式表（teach 的第一个 reusable component）
- `NOTES.md`：教学笔记

**如何调用**：在你的 AI 客户端里说"用 teach skill 教我 X"或 `/teach X`。

**参考实现**：见 `examples/dev-intro/` —— 那个示例的 `lessons/*.html` 就是按 teach 的产出结构手写的（git-basics、linux-basics 两课）。

---

## 2. `grill-wrong-questions` —— 错题精讲

**作用**：答题站刷完一批题后，把错题按考点聚类，每个聚类产出一份深度精讲 HTML，包含：
- 核心概念复述
- 错题要点表（哪题错在哪）
- 提炼的硬规则（判定术）
- 变体训练（同考点换个问法再练）

**输入**：
- 答题站的错题列表（通过 progress API 或 progress.json）
- 对应 day 的课程 HTML（错题 → 课 反向追溯，遵守四对齐）

**输出**：
- `wrong-questions/cluster-NN-<topic>.html`：每个错题簇一份精讲
- `wrong-questions/index.html`：错题中心主页，列出所有簇
- 可选同步到 `learning-records/00NN-wrong-question-grilling.md`：markdown 沉淀版

**如何调用**：在你的 AI 客户端里说"X 题练完了，进入错题学习"或 `/grill-wrong-questions X`。

**参考实现**：见 `examples/dev-intro/wrong-questions/cluster-01-git-reset-vs-revert.html`——一个完整错题精讲的样子。

---

## 3. `podcast-generation` —— 复习播客

**作用**：把课程、题、错题内容合成男女双播对话播客，方便通勤、运动时复习。

**输入**：
- 课程 HTML / 题 / 错题精讲（任选一个或多个作为素材）
- 主播人设（可选，默认有推荐配置）

**输出**：
- `<话题>-对话脚本.json`：双播对话脚本
- `<话题>-逐字稿.md`：单主播可读的逐字稿
- `<话题>.wav`：合成音频

**如何调用**：在你的 AI 客户端里说"把 X 做成播客"或 `/podcast-generation X`。

**TTS 后端**：通常配置一个 TTS provider（如 GLM-TTS、ElevenLabs、OpenAI TTS 等），凭证放在 `.env`。

---

## 如何自己实现 / 替代

如果这三个 skill 在你的 AI 客户端里没有，可以：

1. **手动产出**：按本文档描述的输入/输出结构，自己写 prompt 让 AI 产出对应格式。`examples/dev-intro/` 就是这种手写产出的完整示例。
2. **替代工具**：
   - `teach` → 任何能产出结构化 HTML 的 AI 工具（Claude、ChatGPT、Cursor 等）
   - `grill-wrong-questions` → 让 AI 读你的错题列表 + 课程，按"错因 / 硬规则 / 变体"三段式产出
   - `podcast-generation` → NotebookLM 等"文档转播客"工具（虽然不可控人设）

3. **参照公开 skill 仓库实现**：本仓库的方法论基于 [Matt Pocock 的 skill 体系](https://github.com/mattpocock) 和作者自己的实践。如果你用 ZCode / Claude Code / Cursor 等 AI 客户端，可以参照其 skill 规范自己写。

---

## 进一步阅读

- [`methodology.md`](./methodology.md) —— 完整方法论，skill 是它的工具支撑
- [`four-alignment.md`](./four-alignment.md) —— skill 产出的内容必须遵守四对齐
- `examples/dev-intro/` —— 手写的完整四产物示例
