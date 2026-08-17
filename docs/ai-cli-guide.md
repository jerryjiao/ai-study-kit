# AI CLI Guide · 三个 AI 命令行工具

> **EN**: ai-study-kit ships with three built-in CLI tools that turn any study material into a complete learning loop: `teach-generate` (courses), `grill-wrong` (wrong-question deep-dives), `podcast-generate` (review podcasts). All powered by your own LLM/TTS API key — supports OpenAI, GLM, DeepSeek, Moonshot, 通义, 豆包, etc.
>
> **中文**：ai-study-kit 内置三个 AI 命令行工具，把任意学习素材变成完整学习闭环：`teach-generate`（产课程）、`grill-wrong`（产错题精讲）、`podcast-generate`（产复习播客）。全部用你自己的 LLM/TTS API key 驱动——支持 OpenAI / 智谱 GLM / DeepSeek / Kimi / 通义 / 豆包 等任何 OpenAI 兼容协议的服务。

---

## 🚀 快速开始

### 1. 配置 API Key

复制 `.env.example` 为 `.env`，填上你的 LLM provider 信息：

```bash
cp .env.example .env
# 编辑 .env，至少配 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三项
```

完整的 provider 选项和说明见 [`docs/configuration.md`](./configuration.md)。

### 2. 启动 quiz-app 后端（grill-wrong 需要）

```bash
pnpm run server  # 在另一个终端，跑 :8787
```

### 3. 跑三个 CLI

```bash
# A. 生成课程（从 course-spec.json）
node apps/quiz-app/scripts/teach-generate.mjs --theme dev-intro

# B. 生成错题精讲（从服务器拉错题）
node apps/quiz-app/scripts/grill-wrong.mjs --theme dev-intro

# C. 生成播客（从任一学习素材）
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/dev-intro/lessons/git-basics.html
```

---

## 📚 teach-generate.mjs — 生成课程

把主题规格（mission + resources + audience）变成多节自包含 HTML 课程。

### 输入

`examples/<theme>/course-spec.json`：

```json
{
  "theme": "react-basics",
  "mission": "学完能独立写一个 React 组件库",
  "audience": "有 JS 基础、第一次学 React 的开发者",
  "depth": "beginner",                          // beginner | intermediate | advanced
  "lessonsCount": 3,                            // 想要几节课
  "outline": ["Hooks 基础", "状态管理", "组件设计"],  // 可选，不填让 LLM 自动拆
  "resources": [                                // 可选，权威材料链接
    { "title": "React 官方文档", "url": "https://react.dev" }
  ]
}
```

### 输出

`examples/<theme>/lessons/0001-<slug>.html`、`0002-<slug>.html`...：
- 每节自包含 HTML（链接共享 `../assets/styles.css`）
- 结构：h1 + meta + lead + 多个 h2 + callouts（重点/警示/技巧）+ quiz-anchor
- prev/next 链接互链

### 用法

```bash
node apps/quiz-app/scripts/teach-generate.mjs                       # 默认 dev-intro
node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics
node apps/quiz-app/scripts/teach-generate.mjs --theme X --lessons 5  # 覆盖 lessonsCount
node apps/quiz-app/scripts/teach-generate.mjs --theme X --lang en    # 课程用英语产
```

参考：[`examples/dev-intro/course-spec.json`](https://github.com/jerryjiao/ai-study-kit/blob/main/examples/dev-intro/course-spec.json)。

---

## 🔥 grill-wrong.mjs — 生成错题精讲

从服务器拉你的答题错题，LLM 按考点聚类后逐簇深度展开。

### 流程

1. `GET /api/progress` 拉你的错题列表（`SERVER` 环境变量指定后端）
2. 关联 `examples/<theme>/questions.json` 拿到完整题干
3. LLM 按"考点"把错题聚类（如"git reset vs revert"3 题、"HTTP 状态码"2 题）
4. 每簇 LLM 产深度精讲 HTML（核心区别表 + 决策流程图 + 易错警示 + 变体训练）
5. 写到 `examples/<theme>/wrong-questions/cluster-NN-<slug>.html`
6. 更新 `examples/<theme>/wrong-questions/index.html` 错题中心主页

### 用法

```bash
# 前提：quiz-app 后端要跑着，且你已经刷过题、答过错题
pnpm run server  # 另一个终端

node apps/quiz-app/scripts/grill-wrong.mjs                          # 默认 dev-intro
node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics
node apps/quiz-app/scripts/grill-wrong.mjs --max-clusters 5         # 最多分 5 簇
node apps/quiz-app/scripts/grill-wrong.mjs --lang es                # 精讲用西语产
SERVER=http://my-server:8787 node apps/quiz-app/scripts/grill-wrong.mjs  # 拉远端错题
```

### 错题毕业规则（与 quiz-app 一致）

| wrongCount | 阈值 | 含义 |
|------------|------|------|
| 1 | 答对 1 次 | 新错题，一次答对就移出 |
| 2 | 答对 2 次 | 错过 2 次，要连续答对 2 次才毕业 |
| 3+ | 答对 3 次 | 高频错题，要连续答对 3 次才毕业 |

---

## 🎙 podcast-generate.mjs — 生成复习播客

把任一学习素材（课程 HTML / 题 / 错题精讲）合成男女双主播对话播客。

### 输入

`--input` 指定一个文件，脚本自动识别格式：

| 格式 | 处理方式 |
|------|---------|
| `.html` | 去标签，提取标题和正文 |
| `.md` | 原样 |
| `.json`（questions.json） | 每题格式化为"题干+选项+答案+解析" |
| `.txt` | 原样 |

### 输出（三件套，写到 `podcast-out/`）

| 文件 | 内容 |
|------|------|
| `<slug>-script.json` | 对话脚本（结构化，含 title / source / generatedAt / script 数组） |
| `<slug>-transcript.md` | Markdown 逐字稿（👩 女主播 / 👨 男主播 标记） |
| `<slug>.wav` | 合成的双主播音频（除非 `--no-tts`） |

### 用法

```bash
# 基础用法
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/dev-intro/lessons/git-basics.html

# 控制段数和风格
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/dev-intro/questions.json \
  --segments 15 \
  --style interview

# 只产脚本不合成音频（省 TTS 成本）
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/dev-intro/wrong-questions/cluster-01-*.html \
  --no-tts

# 对白用其他语言产（先 --no-tts 验证脚本，见下方「输出语言」）
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/dev-intro/questions.json \
  --lang ru --no-tts
```

### 风格选项（`--style`）

| 值 | 风格 |
|----|------|
| `conversational`（默认） | 两人轻松对话，互相补充、提问、举例 |
| `lecture` | 一位主播主讲，另一位补充提问和总结 |
| `interview` | 一位扮演专家，另一位扮演采访者问问题 |

### TTS 配置

合成音频需要 TTS provider 配置（默认 GLM-TTS）。详见 [`docs/configuration.md`](./configuration.md)。

`--no-tts` 模式只产对话脚本 + 逐字稿，不调 TTS——可以省成本，或后续用其他 TTS 工具（NotebookLM 等）合成。

---

## 🌍 输出语言（`--lang` / `STUDY_LANG`）

三个 CLI 都支持指定**生成内容**的输出语言：

```bash
node apps/quiz-app/scripts/teach-generate.mjs  --theme X --lang en   # 英语课程
node apps/quiz-app/scripts/grill-wrong.mjs     --theme X --lang es   # 西语错题精讲
node apps/quiz-app/scripts/podcast-generate.mjs --input Y --lang ru  # 俄语播客对白

# 或统一走环境变量（.env 可配）
STUDY_LANG=en node apps/quiz-app/scripts/teach-generate.mjs --theme X
```

支持的语言：`zh`（默认）/ `en` / `es` / `ru`。语言注册表在 [`scripts/lib/langs.mjs`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/scripts/lib/langs.mjs)，加新语言 = 注册表加一项。

行为约定：

- `--lang` 只影响**生成内容**（课程正文、大纲、精讲正文、播客对白/标题）和生成 HTML 的固定文案（上一课/下一课导航、页脚说明、`<html lang>` 属性、逐字稿主播称呼）；
- CLI 自身的日志/报错仍是中文（操作者是维护者）；
- 题库原文（题干/选项）不会被翻译——精讲里的引用保持原样，这是刻意的：题目和解析必须与你刷的题一致；
- **podcast 注意**：TTS 当前只接了 GLM-TTS，非中文对白能否合成取决于 provider 的多语支持。建议先 `--lang X --no-tts` 看脚本，确认 TTS 支持后再合成音频。

前端答题站 UI 的多语言（顶栏切换中/EN/ES/RU）是另一套机制，见 README 的「多语言」章节。

---

## 🤖 不用 AI 也能用

三个 CLI 是<strong>增量能力</strong>，不是必需。如果你只想用 ai-study-kit 当答题站 + 闪卡工具，完全可以不配 LLM、不跑 CLI——`pnpm dev` 就够用了。

但如果你想要课程讲解、错题深度分析、复习播客这些 AI 辅助能力，配一个 API key 就能解锁全套。

---

## 🔧 三个 CLI 的设计哲学

| 设计点 | 选择 | 理由 |
|--------|------|------|
| LLM provider | OpenAI 兼容协议 + baseURL | 一份代码覆盖 95% 国内外 provider（OpenAI/GLM/DeepSeek/Kimi/通义/豆包） |
| 配置接口 | `.env` 三项（`LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL`） | 最简，单文件管理 |
| 健壮性 | `parseJsonLoose` + 重试 3 次指数退避 + 清晰报错 | LLM 经常返"假 JSON"或限流，必须容错 |
| 测试 | 纯函数抽到 `lib/`，用 `node:test` 单测 | LLM 调用本身不可单测，但周边逻辑全测 |
| 不绑 AI 客户端 | CLI 脚本而非 SKILL.md | ZCode / Claude Code / Cursor 用户都能用，甚至 CI 也能跑 |

完整的方法论背景见 [`docs/methodology.md`](./methodology.md)，三个 CLI 是方法论的工程落地。

---

## 🐛 常见问题

### Q: 跑 CLI 报 "LLM 配置不完整"

A: `.env` 缺字段。复制 `.env.example` 为 `.env`，填上三项：`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`。详见 [`docs/configuration.md`](./configuration.md)。

### Q: LLM 返回的 JSON 解析失败

A: 已经有 `parseJsonLoose` 容错（提取 `{...}` / 去 markdown 代码块）。如果还失败，说明 LLM 输出严重跑偏——换个 model 试试（`gpt-4o-mini` / `glm-4.6` / `deepseek-chat` 都稳定）。

### Q: TTS 合成特别慢

A: GLM-TTS 每段约 5-10 秒，12 段对话约 2 分钟。如果要快，用 `--no-tts` 只产脚本，后续用其他工具合成。

### Q: 生成的课程/精讲质量不好

A: 调整 `course-spec.json` 的 `audience` / `depth` / `resources` 字段——越具体的受众和资源，产出质量越高。也可以改 `--segments`（podcast）或 `--lessons`（teach）控制粒度。

### Q: 想接 Claude / Gemini / 其他非 OpenAI 协议的 provider

A: 当前抽象层只支持 OpenAI 兼容协议。Claude 和 Gemini 都有 OpenAI 兼容代理（如 LiteLLM Proxy、OpenRouter），通过代理接入即可。后续可能加原生 adapter。
