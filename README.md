# ai-study-kit

> **EN** · A scaffold for building AI-assisted study apps. Turn any quiz set into a complete learning loop with courses, flashcards, wrong-question deep-dives, spaced repetition, and cross-device progress sync. Built on a methodology distilled from real practice: an official syllabus defines scope, reference materials build concepts, quizzes validate mastery. AI assists at every layer.
>
> **中文** · 一个 AI 辅助学习工具脚手架。把任意主题的题库变成一个完整学习闭环：课程讲解、闪卡、错题精讲、间隔重复（SRS）、跨设备进度同步。沉淀自真实学习实践的方法论——以能力大纲为纲、以参考材料建概念、以做题验效果，AI 在每一层都参与。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features · 功能特性

- **答题站（Quiz App）** — 单选/多选/判断自动判分，看题模式，错题本，按主题/日程练习，随机抽题。
- **课程讲解（Courses）** — 自包含 HTML 小站，用 [`teach` skill](docs/skills-guide.md) 产出，遵守 Tufte 式版式。
- **闪卡（Flashcards）** — Anki 兼容的 SM-2 + Anki 学习步间隔重复算法。
- **错题精讲（Wrong-Question Deep-Dive）** — 高频错点聚类展开，用 [`grill-wrong-questions` skill](docs/skills-guide.md) 产出。
- **跨设备同步** — 手机答题、电脑接着做，服务器存一份进度，无账号无同步码。
- **夜间模式** — 三态（light/dark/system）+ 防白闪 + 跨设备同步主题偏好。
- **零泄露校验** — `scripts/brand-scan.py` 自动扫所有内容文件，确保不泄露品牌名/个人语境。

---

## 🚀 Quick Start · 快速开始

```bash
# 克隆仓库
git clone <your-fork-url>
cd ai-study-kit

# 安装依赖
pnpm install

# 启动开发服务器（前端 :5173 + 后端 :8787）
pnpm run dev

# 另开一个终端运行后端（如果上面没自动起）
pnpm run server

# 浏览器打开 http://localhost:5173
```

首次启动会看到 **dev-intro 示例主题**（git + Linux 基础入门，10 道题 + 4 张闪卡 + 2 节课程 + 1 篇错题精讲）。这是工具能力的演示——fork 后你换成自己的主题即可。

### 生产部署 · Production Deploy

```bash
# 在 apps/quiz-app/ 目录下（pm2 必须从这里启动）
cd apps/quiz-app
pnpm install
pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# 改端口
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

详见 [`AGENTS.md`](AGENTS.md#部署)。

---

## 📚 Project Structure · 项目结构

```
ai-study-kit/
├── apps/quiz-app/         # 答题站 web app (React + Vite + TS + Tailwind + Hono)
├── examples/dev-intro/    # 默认示例主题 (git + Linux 基础)
├── docs/                  # 方法论文档
│   ├── methodology.md         # 学习方法论
│   ├── four-alignment.md      # 四对齐原则
│   ├── bidirectional-check.md # 自动化校验脚本
│   └── skills-guide.md        # teach/grill/podcast skill 用法
├── scripts/               # brand-scan.py + render_ascii_slide.py
├── README.md
├── AGENTS.md              # AI 协作约定
└── LICENSE                # MIT
```

---

## 🎯 Methodology · 学习方法论

本工具沉淀的核心模式：

**大纲 → 材料 → 做题**（[详细文档](docs/methodology.md)）

- **能力大纲**（唯一权威）— 定学什么、学到什么程度
- **参考材料** — 建概念体系（教材、文档、AI 讲解）
- **练习题** — 验掌握程度

四个产物围绕同一套考点对齐（[四对齐](docs/four-alignment.md)）：

| 产物 | 干什么 |
|------|--------|
| 课程 | 系统讲概念 |
| 题目 | 练习验证 |
| 闪卡 | 记忆锚点 |
| 错题精讲 | 错点深挖 |

---

## 🔧 Customizing · 换成你自己的主题

fork 后，把 dev-intro 换成你自己的主题（K8s、React、英文单词、某学科复习等）：

1. **新建主题目录**：`examples/<your-theme>/`
2. **写题库**：`examples/<your-theme>/questions.json`（schema 见 `apps/quiz-app/src/types.ts` 的 `Question` 接口）
3. **写闪卡**：`examples/<your-theme>/flashcards.json`（schema 见 `Flashcard` 接口）
4. **产课程**：用 `teach` skill 或手写 `examples/<your-theme>/lessons/*.html`（参考 `examples/dev-intro/lessons/`）
5. **改主题配置**：
   - `EXAMPLE_THEME=your-theme` 环境变量（控制 sync-examples.mjs）
   - `apps/quiz-app/src/pages/Courses.tsx` 里的 `COURSE_URL` 改成 `/study/your-theme/index.html`
   - `apps/quiz-app/src/lib/topicOrder.ts` 里的 `TOPIC_ORDER` 改成你的主题分类
6. **校验**：
   ```bash
   pnpm run scan                 # 品牌扫描必须为 0
   python3 scripts/bidirectional-check.py examples/your-theme/  # 四对齐校验
   pnpm test                     # 5 个测试必须全过
   pnpm run build                # 构建必须成功
   ```

---

## 🛠️ Development Commands · 开发命令

```bash
pnpm run dev       # 开发服务器
pnpm run build     # 构建
pnpm test          # 测试（5 个文件，130 个用例）
pnpm run scan      # 零泄露扫描
pnpm run server    # 后端
pnpm start         # build + server

# 在 apps/quiz-app/ 下：
npm run qa         # 题库质量校验
npm run sync:examples  # 手动同步 examples 到 src/data
npm run sync:study     # 手动同步 examples 到 public/study
```

---

## 🤝 Contributing · 贡献

欢迎 PR 和 issue。请遵守：

1. 跑 `pnpm run scan` 确保零泄露。
2. 跑 `pnpm test` 确保测试全过。
3. 改任何产物（课程/题/闪卡/错题），必跑 [`bidirectional-check`](docs/bidirectional-check.md) 四对齐校验。
4. commit 信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)。

---

## 📄 License

[MIT](LICENSE) © ai-study-kit contributors

---

## 🙏 Acknowledgments · 致谢

- 学习方法论基于 [Matt Pocock 的 skill 体系](https://github.com/mattpocock) 启发。
- 间隔重复算法参考 [Anki 的 SM-2 实现](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)。
- 示例主题（dev-intro）的 git 知识参考 [Pro Git Book](https://git-scm.com/book/zh/v2)（官方，免费）。
