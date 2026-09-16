<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

**简体中文** · [English](README.en.md) · [Español](README.es.md) · [Русский](README.ru.md)

> 对 AI 说一句「我想学 X」，教练先和你对齐考点，再出题、产课，带你练到会——不用先准备题库。错题按考点讲透，复习自动排队，进度跨设备同步。免费开源，装个插件就能开始。
>
> *An AI coach that drills any topic until you truly know it. Say “I want to learn X” — no question bank required.*

**一句话安装**：把这句发给你的 AI（Claude Code、zcode、Cursor 等任意工具），它会照协议装好教练和建站源码——不用 clone，不用记命令：

```text
请根据 https://aistudykit.dev/install.md，安装 ai-study-kit
```

<p align="center">
  <a href="https://aistudykit.dev/"><img src="https://img.shields.io/badge/官网-online-blue" alt="官网" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="部署状态" /></a>
  <img src="https://img.shields.io/badge/i18n-%E5%9B%9B%E8%AF%AD-blue" alt="界面四语" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [官网](https://aistudykit.dev/) · ▶️ [在线 demo](https://aistudykit.dev/demo/) · 📖 [快速上手](https://aistudykit.dev/get-started/)

**一句话定位**：你只需要说出想学什么，工具把剩下的变成一个有课程、有闪卡、有错题分析的完整学习 app。

---

## 👋 这是给谁用的

| 你在做什么 | 适不适合 |
|-----------|---------|
| 🧑‍💻 **开发者学新技术**（React / K8s / Rust） | ✅ AI 把文档要点抽成题，刷题 + 闪卡巩固 |
| 📚 **学生复习**（学科 / 考研 / 资格证） | ✅ 有真题就录进去，没真题让 AI 按考点出 |
| 🎯 **面试备战**（八股文 / 系统设计） | ✅ 说一句要面什么，AI 产课产题、带你串错题 |
| 🗂️ **学任何有"考点"的东西**（合规 / 流程 / 术语） | ✅ 只要能拆成"问题 + 答案"就能学 |
| ❌ 想要一套现成题库（如"500 道 Java 题"） | ❌ 本工具不含真题——不过 AI 可以按你的考点现出一套（配你自己的 API key） |

装好之后想先跑跑看？往下走 clone 路线。

---

## 🚀 跑起来看 demo（clone 路线，开发者适用）

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm install && pnpm dev
# 浏览器打开 http://localhost:5173
```

自带一个 git + Linux 的示例主题：**答题**（单选/多选/判断，提交即判分，答错进错题本）、**闪卡**（SM-2 间隔重复，与 Anki 算法兼容）、**课程**（自包含 HTML 讲义）。这只是 demo，正式使用换成你自己的主题（见下节）。

---

## 🧭 不知道下一步学什么？`/ask-coach`

装好插件（或 `pnpm run skill:install` 装进 `~/.agents/skills/`）后，每次学习从它开始。命令面五个：`/ask-coach` 问教练该干嘛（快照 + 推荐 + 带执行）、`/study-coach` 坐下就学、`/study-doctor` 一键体检、`/study-recap` 错题串讲直入、`/study-podcast` 播客直入。

`/ask-coach` 先扫描你的学习状态（进度、到期闪卡、错题、AI 配置），推荐现在最该做的一件事，选定后带着你一步步执行——从初始化到部署，十三个流程全覆盖。详见 [`docs/ai-study-kit.md`](docs/ai-study-kit.md)。

---

## 🔧 换成你自己的主题

以学 **React 基础** 为例，全程只动 `examples/` 下的文件，不碰应用代码：

1. **复制主题目录**：`cp -r examples/dev-intro examples/react-basics`（也可以放仓库外，路径含分隔符即外部主题包，见 [`docs/adr/0004`](docs/adr/0004-external-theme-packs.md)）
2. **改题库** `questions.json`：题是纯 JSON，一条记录 = 题干 + 选项 + 答案 + 解析（完整字段见 [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts)）：

   ```json
   {
     "id": "R-001",
     "type": "single",
     "source": "react-basics",
     "topic": "react-basics",
     "question": "React 中 useState 返回什么？",
     "options": {
       "A": "当前 state 的值",
       "B": "更新 state 的函数",
       "C": "一个数组 [state, setState]",
       "D": "一个对象 { state, setState }"
     },
     "answer": ["C"],
     "analysis": "useState 返回 [state, setState] 二元数组，通常数组解构使用。"
   }
   ```

3. **改闪卡** `flashcards.json`：正面提问 + 背面展开，同样简单
4. **切换**：`EXAMPLE_THEME=react-basics pnpm dev`，刷新即生效
5. **（可选）课程与呈现**：课程走 `lessons/*.html`，首页分组/显示名等走 `theme-config.json`（见 [`docs/theming.md`](docs/theming.md)），不配置则优雅回退
6. **校验四连**：`pnpm run scan`（零泄露）+ `pnpm test` + `pnpm run build` + `python3 scripts/bidirectional-check.py examples/react-basics/`（四对齐）

**不想手写题？** 装好 `/ask-coach` 后直接说「帮我给 react-basics 产一套题库」——agent 先在考点排布表上和你对齐，确认后照表产题产卡，自动过三门质量校验才交付。手工路径永远是主路，排布表是人机之间的契约。

---

## 🤖 让 AI 产课程 / 错题精讲 / 播客

仓库内置三个 AI 命令行工具（LLM 支持任何 OpenAI 兼容协议；TTS 当前支持 GLM-TTS）：

| CLI | 干什么 | 产出 |
|-----|-------|------|
| `teach-generate.mjs` | 把主题规格结构化成多节 HTML 课程 | `lessons/*.html` |
| `grill-wrong.mjs` | 把错题按考点聚类深度展开 | `wrong-questions/*.html` + 考点错因档案 |
| `podcast-generate.mjs` | 任一学习素材合成男女双播音频 | `.wav` + 脚本 + 逐字稿 |

配置只需 `cp .env.example .env` 后填 `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL`（详见 [`docs/configuration.md`](docs/configuration.md)），跑法与参数见 [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md)。

> 💡 **不用 AI 也能用**。三个 CLI 是增量能力，只想要答题站 + 闪卡的话，不配 LLM、不跑 CLI，`pnpm dev` 就够用。

---

## 🌍 多语言 / Multi-language

本 README 四语同构（顶部语言栏切换）；**UI 界面**一键切换 中文 / English / Español / Русский，首次访问按浏览器语言选择，偏好跨设备同步；**AI 生成内容**用 `--lang zh|en|es|ru` 指定输出语言。词典与校验机制见 [`apps/quiz-app/src/i18n/`](apps/quiz-app/src/i18n/)。

---

## 🎯 为什么用这个

| 不用 ai-study-kit | 用 ai-study-kit |
|-------------------|-----------------|
| **Anki** 闪卡强，但没有答题站、没有错题精讲、没有课程 | 一个 app 里集齐 6 个学习产物，围绕同一套考点对齐 |
| **Quizlet** 有题有卡，但是闭源 SaaS，数据不在你手里 | 开源 MIT，数据本地 + 你的服务器，跨设备同步无需账号 |
| **Notion 笔记**能记但不刷题，没有间隔重复算法 | 内置 Anki 兼容 SM-2 + Anki 学习步算法 |
| **纯刷题 PDF / Word** 只能看，不能判分、不能统计正确率 | 自动判分、错题本、正确率统计、SRS 调度 |
| **AI 直接问 ChatGPT** 知识零散，没有学习路径 | AI 把零散知识结构化成系统课程 + 题库 + 闪卡 |

**核心差异化是四对齐闭环**：课程讲的考点、题考的考点、闪卡记的考点、错题精讲的考点，全部围绕同一套知识点对齐（详见 [`docs/four-alignment.md`](docs/four-alignment.md)）。

---

## 📚 文档导航

每篇文档都是四语，顶部语言栏互链（简体中文 / English / Español / Русский）。

| 文档 | 看它学什么 |
|------|-----------|
| [`docs/methodology.md`](docs/methodology.md) | 学习方法论，大纲 → 材料 → 做题 |
| [`docs/four-alignment.md`](docs/four-alignment.md) | 四对齐原则，课程 / 题 / 闪卡 / 错题怎么协同 |
| [`docs/bidirectional-check.md`](docs/bidirectional-check.md) | 自动化校验脚本（题 ↔ 课 ↔ 闪卡 互查） |
| [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) | 三个 AI CLI（teach/grill/podcast）完整用法 |
| [`docs/ai-study-kit.md`](docs/ai-study-kit.md) | `/ask-coach` 学习教练，安装、命令面、路由、扩展 |
| [`docs/configuration.md`](docs/configuration.md) | `.env` 配置（LLM provider + TTS provider） |
| [`docs/theming.md`](docs/theming.md) | 主题呈现配置，theme-config.json 字段表 |
| [`AGENTS.md`](AGENTS.md) | AI 协作约定（项目结构 / 命令 / 红线） |
| [`examples/dev-intro/`](examples/dev-intro/) | git+Linux 完整示例，题 + 闪卡 + 课程 + 错题精讲 |

---

## 🛠️ 开发与部署

```bash
pnpm install        # 装依赖
pnpm run dev        # 本地开发（前端 :5173 + 后端 :8787）
pnpm test           # 测试
pnpm run scan       # 零泄露扫描
pnpm run check:alignment  # 四对齐校验
pnpm run skill:install    # 安装学习教练指令到 ~/.agents/skills/
```

完整命令表、生产部署（pm2）、跨设备同步原理见 [`AGENTS.md`](AGENTS.md) 与[官网文档](https://aistudykit.dev/)。

---

## 🤝 贡献

欢迎 PR 和 issue，提 PR 前请做四件事。

1. 跑 `pnpm run scan` 确保零泄露
2. 跑 `pnpm test` 确保测试全过
3. 改任何产物（课程 / 题 / 闪卡 / 错题），必跑 [`bidirectional-check`](docs/bidirectional-check.md) 校验
4. commit 信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

[MIT](LICENSE) © ai-study-kit contributors

---

## 🙏 致谢

- 内容包工作区结构（MISSION → RESOURCES → lessons 的组织）与出题纪律（选项等长、格式不给线索）借鉴 [Matt Pocock 的 teach skill](https://github.com/mattpocock)，决策源流见 [`docs/adr/0001-agent-authored-questions-not-cli.md`](docs/adr/0001-agent-authored-questions-not-cli.md)
- 间隔重复算法参考 [Anki 的 SM-2 实现](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- 示例主题（dev-intro）的 git 知识参考 [Pro Git Book](https://git-scm.com/book/zh/v2)（官方，免费）
