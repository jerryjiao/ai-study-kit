<p align="center">
  <img src="assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

**简体中文** · [English](README.en.md) · [Español](README.es.md) · [Русский](README.ru.md)

> 把任意主题的题库变成一个完整学习闭环——答题 + 课程 + 闪卡 + 错题精讲 + 间隔重复，进度跨设备同步。5 分钟跑起来看 demo，30 分钟改成你自己的主题。
>
> *Turn any question set into a complete learning loop — practice + courses + flashcards + wrong-answer deep-dives + spaced repetition, with progress synced across devices.*

[![Website](https://img.shields.io/badge/官网-online-blue)](https://jerryjiao.github.io/ai-study-kit/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🌐 [官网](https://jerryjiao.github.io/ai-study-kit/) · ▶️ [在线 demo](https://jerryjiao.github.io/ai-study-kit/demo/) · 📖 [快速上手](https://jerryjiao.github.io/ai-study-kit/get-started/)

---

## 👋 这是给谁用的

| 你是 | 适不适合 |
|------|---------|
| 🧑‍💻 **开发者学新技术**（React / K8s / Rust） | ✅ 把官方文档要点抽成题，刷题 + 闪卡巩固 |
| 📚 **学生复习**（学科 / 考研 / 资格证） | ✅ 真题库 + AI 错题精讲，比单纯刷题深 |
| 🎯 **面试备战**（八股文 / 系统设计） | ✅ 自己出题 + AI 产课，配套 SRS 间隔重复 |
| 🗂️ **学任何有"考点"的东西**（合规 / 流程 / 术语） | ✅ 只要能拆成"问题 + 答案"就能学 |
| ❌ 想要现成题库（如"500 道 Java 题"） | ❌ 本工具是**脚手架**，不含任何真题——你得自己提供题或用 AI 生成 |

**一句话定位**：这是个**脚手架**，不是题库。你带题来，工具帮你把它变成一个有课程、有闪卡、有错题分析的学习 app。

---

## 🚀 5 分钟跑起来看 demo

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# 浏览器打开 http://localhost:5173
```

**启动后你能看到**（dev-intro 示例主题，git + Linux 基础）：

| 顶栏 tab | 你能看到什么 |
|---------|-------------|
| **答题** | 10 道 git/Linux 题（单选/多选/判断），点选项即判分，答错进错题本，答对显示解析 |
| **闪卡** | 4 张 SM-2 间隔重复卡，按 again / hard / good / easy 评分，算法与 Anki 兼容 |
| **课程** | 2 节自包含 HTML 课程（git 三区、Linux 目录与权限），带 ASCII 示意图、callout 提示框 |

> 这只是个 demo。**dev-intro 主题的内容你全都不会用**——你要换成的，是你自己在学的主题。

---

## 🧭 不知道下一步学什么？装 `/study-coach`

上面这些（改主题、产课、刷题、错题串讲、播客、部署……）不用记。仓库内置一个**学习教练指令**，每次学习从它开始：

```bash
pnpm run skill:install     # 装进 ~/.agents/skills/study-coach
# 重启 AI CLI（或开新会话），输入 /study-coach
```

它会先**扫描你的学习状态**（当前主题、题/卡/课库存、答题进度、到期闪卡、错题数、AI 配置），然后**推荐你现在最该做的一件事**——是开新主题、复习到期闪卡、刷题、还是把攒下的错题做成串讲——选定后**带着你一步步执行**。从初始化整个项目到部署上线，九个流程全覆盖。

详见 [`docs/study-coach.md`](docs/study-coach.md)。

---

## 🔧 30 分钟改成你自己的主题

以学 **React 基础** 为例。全程只动 `examples/` 下的文件，**不动 apps/quiz-app/ 代码**。

### Step 1 · 复制主题目录（1 分钟）

```bash
cp -r examples/dev-intro examples/react-basics
```

### Step 2 · 改题库（10 分钟）

编辑 `examples/react-basics/questions.json`——把 git/Linux 题换成你的 React 题。Schema 很简单：

```json
{
  "id": "R-001",                      // 全局唯一稳定 id（进度按它存）
  "type": "single",                    // single | multi | judge
  "source": "react-basics",            // 题源标识
  "topic": "react-basics",             // 主题分类（首页按它分组）
  "question": "React 中 useState 返回什么？",
  "options": {
    "A": "当前 state 的值",
    "B": "更新 state 的函数",
    "C": "一个数组 [state, setState]",
    "D": "一个对象 { state, setState }"
  },
  "answer": ["C"],
  "analysis": "useState 返回一个二元数组：当前状态值 + 更新函数。通常用数组解构：const [count, setCount] = useState(0)。"
}
```

完整字段见 [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts) 的 `Question` 接口。

### Step 3 · 改闪卡（5 分钟）

编辑 `examples/react-basics/flashcards.json`：

```json
{
  "id": "FC-R-01",
  "front": "useState 的返回值结构？",
  "back": "返回 [state, setState] 二元数组。\n\n用法：const [count, setCount] = useState(0)。",
  "source": "react-basics",
  "topic": "react-basics"
}
```

### Step 4 · 切换主题（1 分钟）

```bash
EXAMPLE_THEME=react-basics pnpm dev
# 浏览器刷新——你的 React 题已经进答题站了
```

### Step 5 · （可选）配课程和首页分组（10 分钟）

- **课程**：把 `examples/react-basics/lessons/*.html` 改成你的（可以用 AI 帮你产，见下文进阶）。同时改 `apps/quiz-app/src/pages/Courses.tsx` 里的 `COURSE_URL` 为 `/study/react-basics/index.html`。
- **首页分组**：改 `apps/quiz-app/src/lib/topicOrder.ts` 的 `TOPIC_ORDER`，把 `'git-basics', 'linux-commands'` 换成你的主题列表。

### Step 6 · 校验（2 分钟）

```bash
pnpm run scan       # 品牌扫描（0 hits 才算干净）
pnpm test           # 5 个测试必须全过
pnpm run build      # 构建必须成功
python3 scripts/bidirectional-check.py examples/react-basics/  # 四对齐校验
```

**搞定**。整个改造过程**不需要碰任何 React 代码**——只是改 JSON 和 HTML。

---

## 🤖 进阶：让 AI 帮你产课程 / 错题精讲 / 播客

到这里你已经有一个能刷题的 app 了。但 ai-study-kit 真正的价值在于 **AI 辅助的完整学习闭环**——你不用手写课程和错题精讲，AI 帮你产。

仓库内置三个 AI 命令行工具：

| CLI | 干什么 | 输入 | 输出 |
|-----|-------|------|------|
| **`teach-generate.mjs`** | 把主题规格结构化成多节 HTML 课程 | `examples/<theme>/course-spec.json` | `lessons/0001-*.html` 等 |
| **`grill-wrong.mjs`** | 刷完题后，把错题按考点聚类深度展开 | `/api/progress` 拉错题 | `wrong-questions/cluster-*.html` |
| **`podcast-generate.mjs`** | 把课程 / 题 / 错题合成男女双播音频 | 任一学习素材（HTML/MD/JSON） | `.wav` + 脚本 JSON + 逐字稿 MD |

**支持任何 OpenAI 兼容协议的 LLM**：智谱 GLM（国内推荐）/ OpenAI / DeepSeek / Kimi / 通义 / 豆包。TTS 当前支持 GLM-TTS。

### 配置

```bash
cp .env.example .env
# 编辑 .env，至少配 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三项
# 详见 docs/configuration.md
```

### 跑三个 CLI

```bash
# 启 quiz-app 后端（grill-wrong 需要）
pnpm run server

# 1. 生成课程
node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics

# 2. 刷完题后，生成错题精讲
node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics

# 3. 把课程做成播客
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/react-basics/lessons/0001-hooks.html
```

**典型工作流**：

```
1. 你定主题 + 找权威资源（书 / 文档 / 视频）
2. 写 course-spec.json → teach-generate 产 lessons/*.html（系统讲解）
3. 你手动出题 → questions.json（练习验证）
4. 刷题 → 错题进错题本
5. grill-wrong → 产出错题精讲 HTML
6. podcast-generate → 通勤时听播客复习
```

完整 CLI 用法、参数说明、FAQ 见 [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md)。配置细节见 [`docs/configuration.md`](docs/configuration.md)。

> 💡 **不用 AI 也能用**：三个 CLI 是增量能力。如果你只想要答题站 + 闪卡工具，完全可以不配 LLM、不跑 CLI——`pnpm dev` 就够用。

---

## 🌍 多语言 / Multi-language

**本 README**：顶部语言栏四语切换——[简体中文](README.md) / [English](README.en.md) / [Español](README.es.md) / [Русский](README.ru.md)。四份同构，改内容需四处同步（与 UI 词典同一约定）。

**UI 界面**：顶栏一键切换 **中文 / English / Español / Русский**。

- 首次访问按浏览器语言自动选择；切换后偏好跨设备同步（与主题偏好同一套 LWW 机制）；
- `<html lang>` 和页面标题跟随语言切换（读屏/翻译工具友好）；
- 词典在 [`apps/quiz-app/src/i18n/locales/`](apps/quiz-app/src/i18n/locales/)，en/es/ru 以 zh 的 key 集合做类型锚定——漏翻译直接编译报错，另有 key 完整性 + 占位符一致性测试兜底。加新语言 = 加一个词典文件 + 注册，改 UI 文案必须四处同步。

**AI 生成内容**：三个 CLI 都支持指定输出语言，给非中文学习者产课/精讲/播客：

```bash
node apps/quiz-app/scripts/teach-generate.mjs   --theme X --lang en  # 英语课程
node apps/quiz-app/scripts/grill-wrong.mjs      --theme X --lang es  # 西语错题精讲
node apps/quiz-app/scripts/podcast-generate.mjs --input Y --lang ru  # 俄语播客对白
# 或 .env 里配 STUDY_LANG=en 统一默认（支持 zh/en/es/ru）
```

`--lang` 只影响生成内容和生成 HTML 的固定文案（导航、页脚、`<html lang>`）；CLI 日志仍是中文；题库原文不会被翻译。详见 [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) 的「输出语言」章节。

> **题库/闪卡内容语言**由你的数据决定（`examples/<theme>/*.json` 里写什么就显示什么）——想让整站变成英语学习站，就用英语出题 + `--lang en` 产课，工具本身不锁语言。

---

## 🎯 为什么用这个

| 不用 ai-study-kit | 用 ai-study-kit |
|-------------------|-----------------|
| **Anki**：闪卡强，但没有答题站、没有错题精讲、没有课程 | 一个 app 里集齐 5 个学习产物，围绕同一套考点对齐 |
| **Quizlet**：有题有卡，但是闭源 SaaS，数据不在你手里 | 开源 MIT，数据本地 + 你的服务器，跨设备同步无需账号 |
| **Notion 笔记**：能记但不刷题，没有间隔重复算法 | 内置 Anki 兼容 SM-2 + Anki 学习步算法 |
| **纯刷题 PDF / Word**：只能看，不能判分、不能统计正确率 | 自动判分、错题本、正确率统计、SRS 调度 |
| **AI 直接问 ChatGPT**：知识零散，没有学习路径 | AI 把零散知识结构化成系统课程 + 题库 + 闪卡 |

**核心差异化**：**四对齐闭环**——课程讲的考点、题考的考点、闪卡记的考点、错题精讲的考点，全部围绕同一套知识点对齐（详见 [`docs/four-alignment.md`](docs/four-alignment.md)）。这一致性让你学完课立刻有题刷、做错立刻有深度展开。

---

## 📚 文档导航

| 文档 | 看它学什么 |
|------|-----------|
| [`docs/methodology.md`](docs/methodology.md) | 学习方法论：大纲 → 材料 → 做题 |
| [`docs/four-alignment.md`](docs/four-alignment.md) | 四对齐原则：课程 / 题 / 闪卡 / 错题怎么协同 |
| [`docs/bidirectional-check.md`](docs/bidirectional-check.md) | 自动化校验脚本（题 ↔ 课 ↔ 闪卡 互查） |
| [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) | 三个 AI CLI（teach/grill/podcast）完整用法 |
| [`docs/study-coach.md`](docs/study-coach.md) | `/study-coach` 学习教练：安装、路由、扩展 |
| [`docs/configuration.md`](docs/configuration.md) | `.env` 配置：LLM provider + TTS provider |
| [`AGENTS.md`](AGENTS.md) | AI 协作约定（项目结构 / 命令 / 红线） |
| [`examples/dev-intro/`](examples/dev-intro/) | git+Linux 完整示例：题 + 闪卡 + 课程 + 错题精讲 |

---

## 🛠️ 开发命令

```bash
# 仓库根目录
pnpm install          # 装依赖
pnpm run dev          # 启动（前端 :5173 + 后端 :8787）
pnpm run build        # 构建（sync:examples + sync:study + tsc + vite）
pnpm test             # 跑 5 个测试文件（130 个用例）
pnpm run scan         # 零泄露扫描
pnpm run server       # 单独起后端
pnpm start            # build + server
pnpm run skill:install    # 安装 /study-coach 学习教练指令
pnpm run check:alignment  # 四对齐校验（默认扫 dev-intro，可传主题目录）

# 在 apps/quiz-app/ 下
npm run qa            # 题库质量校验（最长即答案 / 答案分布）
npm run sync:examples # 手动同步 examples → src/data
npm run sync:study    # 手动同步 examples → public/study
```

### 生产部署

```bash
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# 改端口
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

部署细节（pm2 cwd 锁定、跨设备同步原理等）见 [`AGENTS.md`](AGENTS.md)。

---

## 🤝 贡献

欢迎 PR 和 issue。请：

1. 跑 `pnpm run scan` 确保零泄露
2. 跑 `pnpm test` 确保测试全过
3. 改任何产物（课程 / 题 / 闪卡 / 错题），必跑 [`bidirectional-check`](docs/bidirectional-check.md) 校验
4. commit 信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

[MIT](LICENSE) © ai-study-kit contributors

---

## 🙏 致谢

- 学习方法论基于 [Matt Pocock 的 skill 体系](https://github.com/mattpocock) 启发
- 间隔重复算法参考 [Anki 的 SM-2 实现](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- 示例主题（dev-intro）的 git 知识参考 [Pro Git Book](https://git-scm.com/book/zh/v2)（官方，免费）
