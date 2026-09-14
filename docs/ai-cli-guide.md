# AI CLI Guide · 三个 AI 命令行工具

**简体中文** · [English](ai-cli-guide.en.md) · [Español](ai-cli-guide.es.md) · [Русский](ai-cli-guide.ru.md)

ai-study-kit 内置三个 AI CLI，把学习素材变成闭环里的三样产物：`teach-generate` 产课程、`grill-wrong` 产错题精讲、`podcast-generate` 产复习播客。全部用你自己的 LLM/TTS API key 驱动，支持任何 OpenAI 兼容协议的服务（OpenAI / 智谱 GLM / DeepSeek / Kimi / 通义 / 豆包等）。

三个 CLI 在仓库根都有快捷命令，下文统一用短形式（等价于 `node apps/quiz-app/scripts/<脚本名>.mjs`）：

| 快捷命令 | 脚本 | 产物 |
|----------|------|------|
| `pnpm run ai:teach` | `teach-generate.mjs` | 课程 HTML（`lessons/*.html`） |
| `pnpm run ai:grill` | `grill-wrong.mjs` | 错题精讲 HTML（`study/wrong-questions/*.html`） |
| `pnpm run ai:podcast` | `podcast-generate.mjs` | 播客脚本 + 逐字稿 + 音频（`podcast-out/`） |

---

## 快速开始

### 1. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，至少配 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三项
```

完整的 provider 选项和说明见 [`configuration.md`](./configuration.md)。

### 2. 启动 quiz-app 后端（grill 需要）

```bash
pnpm run server  # 在另一个终端，跑 :8787
```

### 3. 跑三个 CLI

```bash
# A. 生成课程（从 course-spec.json）
pnpm run ai:teach -- --theme dev-intro

# B. 生成错题精讲（从服务器拉错题）
pnpm run ai:grill -- --theme dev-intro

# C. 生成播客（从任一学习素材）
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html
```

三个 AI CLI 都支持 `--json`：人读日志降级到 stderr，stdout 只出一份结果 JSON（产物路径清单），供其他 agent / 脚本管道消费（与 `mastery-report --json` 同一约定）。noop 路径（如当前无错题）也出 JSON（`status: "noop"`），便于管道分支判断。

---

## teach-generate — 生成课程

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
- 核心机制示意图：每课至少 1 张内联 SVG，图大字少、只画机制（节点+箭头表达流转/层次/对比）
- 出处回链：每课页尾 `📚 出处` 块列出权威来源链接——资源 = `course-spec.json` 的 `resources` 与主题目录 `RESOURCES.md`（teach 工作流约定的权威资源清单）按 URL 去重合并，既进 LLM 备课参考也进页尾展示（「以参考材料建概念」原则的产物面）
- 参考正文抓取（v0.13）：产课时把上述链接的**页面正文**抓进 LLM 备课上下文（「以参考材料建概念」从引用层落到内容层，备课第一依据）；本地缓存按 URL 去重（`apps/quiz-app/node_modules/.cache/teach-resources/`），重跑产课不重抓；个别源抓取失败自动降级回 URL 清单引用，产课不中断
- prev/next 链接互链

### 用法

```bash
pnpm run ai:teach -- --theme react-basics
pnpm run ai:teach -- --theme X --lessons 5   # 覆盖 lessonsCount
pnpm run ai:teach -- --theme X --lang en     # 课程用英语产
pnpm run ai:teach -- --theme X --json        # 机器可读输出（agent 消费）
```

不传 `--theme` 时默认 `dev-intro`。参考：[`examples/dev-intro/course-spec.json`](https://github.com/jerryjiao/ai-study-kit/blob/main/examples/dev-intro/course-spec.json)。

---

## grill-wrong — 生成错题精讲

从服务器拉你的答题错题，LLM 按考点聚类后逐簇深度展开。

### 流程

1. `GET /api/progress` 拉你的错题列表（`SERVER` 环境变量指定后端）
2. 关联 `examples/<theme>/questions.json` 拿到完整题干
3. LLM 按"考点"把错题聚类（如"git reset vs revert"3 题、"HTTP 状态码"2 题）
4. 每簇 LLM 产深度精讲 HTML（核心区别表 + 决策流程图 + 易错警示 + 变体训练）
5. 写到 `examples/<theme>/study/wrong-questions/cluster-NN-<slug>.html`（旧位置 `wrong-questions/` 的产物会自动识别迁移）
6. 更新 `examples/<theme>/study/wrong-questions/index.html` 错题中心主页
7. **顺产学习者档案**：LLM 同时把考点级错因（wrongReasons / advice）写进 `examples/<theme>/study/records/profile.json`（机器可读，题 id 重叠即同考点合并累积）。档案是学习者私有数据，不随 build 上站；下次跑 `mastery-report` 或 `/ai-study-kit` 探测时自动带出，让推荐理由具体到「EP-03 连错 2 次，错因：权限位组合不熟」。

### 用法

```bash
# 前提：quiz-app 后端要跑着，且你已经刷过题、答过错题
pnpm run server  # 另一个终端

pnpm run ai:grill -- --theme react-basics
pnpm run ai:grill -- --max-clusters 5                # 最多分 5 簇
pnpm run ai:grill -- --lang es                       # 精讲用西语产
pnpm run ai:grill -- --json                          # 机器可读输出（agent 消费）
SERVER=http://my-server:8787 pnpm run ai:grill       # 拉远端错题
```

### 错题毕业规则（与 quiz-app 一致）

| wrongCount | 阈值 | 含义 |
|------------|------|------|
| 1 | 答对 1 次 | 新错题，一次答对就移出 |
| 2 | 答对 2 次 | 错过 2 次，要连续答对 2 次才毕业 |
| 3+ | 答对 3 次 | 高频错题，要连续答对 3 次才毕业 |

---

## mastery-report — 考点掌握报告（无 AI）

串讲的伴生工具：从题库 + 答题进度**确定性派生**每个考点（题的 `examPoint`，EP-NN）的掌握度，不需要 LLM。人和 agent 共用——人看表格，agent 吃 `--json`（`/ai-study-kit` 探测快照的「弱考点」行就来自它）。

### 判据（四态）

| 状态 | 判据 |
|------|------|
| 掌握 | 考点下全部题已答、最近一次全对、无未毕业错题，且映射闪卡全部毕业 |
| 弱 | 有未毕业错题，或最近一次有答错 |
| 进行中 | 部分作答且无负面证据，或题已全对但映射闪卡未全部毕业 |
| 未开始 | 一题未答 |

闪卡毕业组件：`flashcards.json` 的卡可带可选 `examPoint`（EP-NN，与题库同一命名空间）；有映射的考点，掌握判据还要求这些卡在 SRS 里毕业（`phase = review`）。无映射的考点不受影响——判据自然退回纯题维度。Web app 首页「考点掌握度」面板用同一判据实时展示（`src/lib/mastery.ts`）。

报告会 join 学习者档案（`study/records/profile.json`，grill 顺产）——考点行上带出错因与建议。考点名从 MISSION.md 排布表解析。

### 口头四态（v0.14，`--json` 的 `oral` 字段）

口头答题流水（`study/records/oral-attempts.json`，聊天层逐次追加的口头问答明细）里的每个口头目标——排布表全部考点 ∪ 流水里的裸知识点（聊天新学、还没有题的概念）——都有一份**纯口头通道**的四态，判据零 LLM：

| 状态 | 判据 |
|------|------|
| 掌握 | 近期加权正确率 ≥ 0.85（近 5 次权重 0.5/0.7/0.85/0.95/1.0，按权重和归一；1、2 次封顶 0.5/0.8，天然到不了——防一次蒙对） |
| 弱 | 最近一次判错（负面证据优先），或加权分 < 0.5 |
| 进行中 | 有作答、无负面、加权分未到掌握线（如 2 次全对 = 0.8） |
| 未开始 | 无流水目标 |

`oral.weakRanked` 给 agent 点名口头弱项；与题库考点四态合流时**负面证据优先**（任一弱即弱），题通道有数据以题为准，题没刷过时口头最多推到「进行中」（验效果靠做题）。既有考点四态判据（上表）一字不动。

### 知识图投影（v0.14，`--graph` / `--write-projection`）

传 `--graph <graph.json 路径>`（或环境变量 `KNOWFLOW_GRAPH_JSON`）时，报告装载外部知识库 knowflow 的知识图，结合考点节点映射（`study/records/graph-map.json`，agent 提议、学习者确认）产出**只读投影文件**：

```bash
pnpm run mastery -- --graph /path/to/knowflow/graph/graph.json --write-projection
# → graph.json 同目录产出 mastery-projection.json：
#   { version: 1, generatedAt, source, nodes: [{ id, mastery, oral: { asked, correct } }] }
```

`--json` 的 `graph` 字段带图信号：节点四态（映射节点 = 题库四态 ∪ 口头四态合流；未映射节点 = 纯口头通道）、映射计数、投影产出结果。**无图 / 无映射 = 静默降级**为纯考点口径（`graph.loaded = false`），不是故障；graph.json 本体与知识页零改动，知识库永不回写（ADR-0005 投影桥）。

**前置关系与推荐序（`graph.weakPrereqs` / `graph.weakOrdered`）**：图边带关系标签（knowflow 关系标签器口径）时，报告把前置类关系（前置/依赖/来源/引用/依据/使用/属于/衍生）映射为「to 要先学」的学习顺序——`weakPrereqs` 给每个弱考点的前置链（含前置的掌握状态），`weakOrdered` 给尊重前置顺序的推荐序（前置先学，含传递；环与缺 relation 的边不参与排序）。推荐理由由此从「刷 EP-12」具体到「前置概念 EP-01 还弱，先补它」。无图 / 无映射 / 无前置边 → 无这些字段，静默降级。


### 用法

```bash
pnpm run mastery                                # 人类可读表格（默认 dev-intro）
pnpm run mastery -- --theme react-basics       # 指定主题（支持外部主题包路径）
pnpm run mastery -- --json                     # 机器可读（agent 探测用）
pnpm run mastery -- --progress /tmp/p.json     # 指定进度文件（默认 apps/quiz-app/progress.json；
                                               #  看线上进度先 curl -sf $SERVER/api/progress -o /tmp/p.json）
pnpm run mastery -- --panorama                  # 考点全景（v0.13）：讲/练/掌三信号按 day 分组 + 汇总行
                                               #  （讲过=学习记录∪课已学完 / 练过=答题或口头流水 / 掌握=四态判据）
                                               #  加 --json 给 agent；skill「报进度」全景卡就来自它
```

进度文件不存在 = 空进度（全部未开始），不是故障。

---

## podcast-generate — 生成复习播客

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
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html

# 控制段数和风格
pnpm run ai:podcast -- --input examples/dev-intro/questions.json \
  --segments 15 --style interview

# 只产脚本不合成音频（省 TTS 成本）
pnpm run ai:podcast -- \
  --input examples/dev-intro/study/wrong-questions/cluster-01-*.html --no-tts

# 对白用其他语言产（先 --no-tts 验证脚本，见下方「输出语言」）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --lang ru --no-tts

# 机器可读输出（agent 消费）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --no-tts --json
```

### 风格选项（`--style`）

| 值 | 风格 |
|----|------|
| `conversational`（默认） | 两人轻松对话，互相补充、提问、举例 |
| `lecture` | 一位主播主讲，另一位补充提问和总结 |
| `interview` | 一位扮演专家，另一位扮演采访者问问题 |

### TTS 配置

合成音频需要 TTS provider 配置（默认 GLM-TTS），详见 [`configuration.md`](./configuration.md)。`--no-tts` 模式只产对话脚本 + 逐字稿，不调 TTS——省成本，或后续用其他 TTS 工具（NotebookLM 等）合成。

---

## 输出语言（`--lang` / `STUDY_LANG`）

三个 CLI 都支持指定**生成内容**的输出语言：

```bash
pnpm run ai:teach   -- --theme X --lang en   # 英语课程
pnpm run ai:grill   -- --theme X --lang es   # 西语错题精讲
pnpm run ai:podcast -- --input Y --lang ru   # 俄语播客对白

# 或统一走环境变量（.env 可配）
STUDY_LANG=en pnpm run ai:teach -- --theme X
```

支持 `zh`（默认）/ `en` / `es` / `ru`。语言注册表在 [`scripts/lib/langs.mjs`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/scripts/lib/langs.mjs)，加新语言就是注册表加一项。

行为约定：

- `--lang` 只影响**生成内容**（课程正文、大纲、精讲正文、播客对白/标题）和生成 HTML 的固定文案（上一课/下一课导航、页脚说明、`<html lang>` 属性、逐字稿主播称呼）；
- CLI 自身的日志/报错仍是中文（操作者是维护者）；
- 题库原文（题干/选项）不会被翻译——精讲里的引用保持原样，这是刻意的：题目和解析必须与你刷的题一致；
- **podcast 注意**：TTS 当前只接了 GLM-TTS，非中文对白能否合成取决于 provider 的多语支持。建议先 `--lang X --no-tts` 看脚本，确认 TTS 支持后再合成音频。

前端答题站 UI 的多语言（顶栏切换中/EN/ES/RU）是另一套机制，见 README 的「多语言」章节。

---

## 不用 AI 也能用

三个 CLI 是**增量能力**，不是必需。只想用 ai-study-kit 当答题站 + 闪卡工具的话，完全可以不配 LLM、不跑 CLI，`pnpm dev` 就够用。想要课程讲解、错题深度分析、复习播客这些 AI 辅助能力，配一个 API key 就能解锁全套。

---

## 设计哲学

| 设计点 | 选择 | 理由 |
|--------|------|------|
| LLM provider | OpenAI 兼容协议 + baseURL | 一份代码覆盖 95% 国内外 provider（OpenAI/GLM/DeepSeek/Kimi/通义/豆包） |
| 配置接口 | `.env` 三项（`LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL`） | 最简，单文件管理 |
| 健壮性 | `parseJsonLoose` + 重试 3 次指数退避 + 清晰报错 | LLM 经常返"假 JSON"或限流，必须容错 |
| 测试 | 纯函数抽到 `lib/`，用 `node:test` 单测 | LLM 调用本身不可单测，但周边逻辑全测 |
| 不绑 AI 客户端 | 做成 CLI 而不是 agent skill | ZCode / Claude Code / Cursor 用户都能用，甚至 CI 也能跑 |

主题工作区的结构（`MISSION.md` / `RESOURCES.md` / `lessons/`）和部分出题纪律（选项等长、格式不给线索）源自 teach skill 工作流，特此致谢。

完整的方法论背景见 [`methodology.md`](./methodology.md)，三个 CLI 是方法论的工程落地。

---

## 常见问题

**Q: 跑 CLI 报 "LLM 配置不完整"**
A: `.env` 缺字段。复制 `.env.example` 为 `.env`，填上三项：`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`。详见 [`configuration.md`](./configuration.md)。

**Q: LLM 返回的 JSON 解析失败**
A: 已经有 `parseJsonLoose` 容错（提取 `{...}` / 去 markdown 代码块）。如果还失败，说明 LLM 输出严重跑偏——换个 model 试试（`gpt-4o-mini` / `glm-4.6` / `deepseek-chat` 都稳定）。

**Q: TTS 合成特别慢**
A: GLM-TTS 每段约 5-10 秒，12 段对话约 2 分钟。如果要快，用 `--no-tts` 只产脚本，后续用其他工具合成。

**Q: 生成的课程/精讲质量不好**
A: 调整 `course-spec.json` 的 `audience` / `depth` / `resources` 字段——越具体的受众和资源，产出质量越高。也可以改 `--segments`（podcast）或 `--lessons`（teach）控制粒度。

**Q: 想接 Claude / Gemini / 其他非 OpenAI 协议的 provider**
A: 当前抽象层只支持 OpenAI 兼容协议。Claude 和 Gemini 都有 OpenAI 兼容代理（如 LiteLLM Proxy、OpenRouter），通过代理接入即可。后续可能加原生 adapter。
