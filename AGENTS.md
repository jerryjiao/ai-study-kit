# AGENTS.md — ai-study-kit

> 给 AI 协作 agent 读的项目说明。约定结构、命令、红线、工作流。

## 项目总目标

ai-study-kit 是一个**开源学习工具脚手架**——把任意主题的题库变成一个有课程讲解、闪卡、错题精讲、跨设备进度同步的完整学习闭环 web app。

设计哲学：**AI 辅助的「能力大纲为纲 → 参考材料建概念 → 做题验效果」学习闭环**。详见 [`docs/methodology.md`](./docs/methodology.md)。

### 学习指导原则（一切活动的优先级）

1. **以能力大纲为纲**：先定考点和深度，不要无脑刷题。大纲是<strong>唯一权威</strong>。
2. **以参考材料建概念**：概念/定义/方法论的来源是高质量材料（官方文档、经典教材、AI 老师的讲解），优先级高于凭空推测。
3. **以做对题为目的**：学习不是把课讲完，是让学习者考场/面试/实操上做对。课件讲得再透，对应题还错=学习无效。

**三者关系**：**大纲定考什么 → 材料讲概念 → 做题验效果。** 任何一环脱节都要停下来纠偏。

## 行为准则

- **一切基于事实**：回答和操作前必须先核实实际情况（读代码、跑命令、查文件、看 git 状态等），不得凭记忆、猜测或想当然。说"我不知道"或"我需要先确认"比编造答案更可取。涉及状态判断（如"是否已部署""文件是否存在""测试是否通过"）必须实际验证，不要假定。

## 项目结构

pnpm workspace 仓库。

```
ai-study-kit/
├── apps/
│   └── quiz-app/              # 答题站 web app（React + Vite + TS + Tailwind 前端 + Hono 后端）
│       ├── src/               # React 前端源码
│       │   └── i18n/          # UI 多语言（中/EN/ES/RU 词典 + I18nProvider）
│       ├── server/            # Hono 后端（进度 API + 静态托管）
│       ├── scripts/           # 数据同步、QA 校验脚本
│       │   └── lib/langs.mjs  # AI CLI 输出语言注册表（--lang）
│       ├── public/study/      # 课程 HTML 同步产物（gitignored，build 时重建）
│       └── ecosystem.config.cjs  # pm2 部署配置
├── examples/
│   └── dev-intro/             # 默认示例主题（git + Linux 基础入门）
│       ├── questions.json     # 题库（schema 见 types.ts）
│       ├── flashcards.json    # 闪卡
│       ├── lessons/*.html     # teach 产出的课程
│       ├── wrong-questions/   # 错题精讲
│       ├── assets/styles.css  # 共享样式表
│       └── MISSION.md / RESOURCES.md
├── docs/                      # 方法论文档
│   ├── methodology.md         # 学习方法论
│   ├── four-alignment.md      # 四对齐原则
│   ├── bidirectional-check.md # 自动化校验脚本说明
│   ├── ai-cli-guide.md        # teach/grill/podcast 三个 AI CLI 用法
│   ├── study-coach.md         # /study-coach 学习教练指令
│   └── configuration.md       # .env 配置（LLM/TTS provider）
├── skills/
│   └── study-coach/           # 学习教练 skill（探测状态 → 推荐 → 带执行）
│       ├── SKILL.md           # 路由指令本体
│       └── references/        # state.md 探测协议 + flows.md 九流程 playbook
├── scripts/
│   ├── brand-scan.py          # 零泄露扫描（品牌 + 个人语境）
│   ├── bidirectional-check.py # 四对齐校验（题→课、闪卡覆盖）
│   ├── install-skill.sh       # /study-coach 安装器（→ ~/.agents/skills/）
│   └── render_ascii_slide.py  # ASCII → PNG 渲染（给示例画图用）
├── README.md                  # 项目主页（双语）
├── CHANGELOG.md               # 版本日志
├── LICENSE                    # MIT
└── AGENTS.md                  # 本文件
```

## 常用命令

```bash
# 在仓库根目录执行，转发到 apps/quiz-app/：
pnpm install               # 安装依赖（首次或 lockfile 变化）
pnpm run dev               # 前端开发服务器 :5173（/api 代理到 :8787）
pnpm run server            # 后端 + 托管 dist :8787
pnpm run build             # sync:examples && sync:study && tsc -b && vite build → apps/quiz-app/dist/
pnpm test                  # vitest（grade/progress/progressStore/srs/reviewQueue）+ node:test（scripts/lib/*.test.mjs）
pnpm run scan              # brand-scan.py（零泄露校验）
pnpm run check:alignment   # bidirectional-check.py 四对齐校验（默认 dev-intro，可传主题目录）
pnpm run skill:install     # 把 /study-coach skill 装进 ~/.agents/skills/
pnpm start                 # build && server（本地一键）

# 直接在 apps/quiz-app/ 执行：
cd apps/quiz-app
npm run sync:examples      # 把 examples/<theme>/*.json 同步到 src/data/
npm run sync:study         # 把 examples/<theme>/ 同步到 public/study/<theme>/
npm run qa                 # 题库质量校验（最长即答案/答案分布/选项长度）
EXAMPLE_THEME=dev-intro npm run sync:examples  # 切换示例主题
```

## 部署

**"部署"= 部署到云服务器，不是本地。** 本地 `pnpm run server` 只是联调。

推荐方式：pm2 守护进程（在 `apps/quiz-app/` 目录运行）：

```bash
# 一键部署
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# 改端口：前缀 PORT 环境变量
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

**关键**：pm2 必须从 `apps/quiz-app/` 目录启动（`ecosystem.config.cjs` 用 `cwd: __dirname` 锁定工作目录），不能从仓库根启动。

## 红线 / 硬边界（违反会出错）

- **`apps/quiz-app/src/data/questions.json` 和 `flashcards.json` 是同步产物，禁止手编**。它们由 `scripts/sync-examples.mjs` 从 `examples/<theme>/` 同步而来（`pnpm run dev/build/test` 自动跑）。手编的改动下次 sync 会被覆盖。改题源请走 `examples/<theme>/questions.json`。
- **`apps/quiz-app/progress.json` 是运行期数据，禁止提交、禁止手编**（已在 .gitignore）。已写坏会被 server 当作空进度重置。
  - ⭐ **写 progress.json 的 `submittedAt`/`updatedAt` 必须用真实 `Date.now()`，绝不能用任意固定值或未来时间戳**。`mergeProgress`（progress.ts）按时间戳取新来合并多端写入——未来时间戳会永久压制所有真实时间的写入。
- **`apps/quiz-app/public/study/` 是 sync 产物**（gitignored），由 `scripts/sync-study.mjs` 从 `examples/<theme>/` 同步，build 时自动重建。改课程请走 `examples/<theme>/lessons/*.html`，别手编 `public/study/`。
- **⭐ 切换示例主题必须改两处**：`EXAMPLE_THEME` 环境变量（默认 `dev-intro`）+ `apps/quiz-app/src/pages/Courses.tsx` 里的 `COURSE_URL` 路径。只改一处会脱节。
- **⭐ 任何发布内容禁止出现真实品牌/企业名**（课程 HTML、闪卡、公开 md 等所有同步到 `apps/quiz-app/public/study/` 的文件）。这是开源协议 MIT 之外的<strong>额外中性化要求</strong>——避免把任何具体企业的商标/品牌带入开源工具。校验用 `pnpm run scan`，命中数必须为 0 才能发布。
  - 必须中性化的词列表见 `scripts/brand-scan.py` 的 `BRAND_PATTERNS` 常量（持续补充）。常见类别：车企、互联网大厂、能源/电信央企、EV 新势力。技术专名（如 Spring Cloud Alibaba 等开源技术栈）作为技术术语保留，扫描时人工确认即可。
  - **校验**：`python3 scripts/brand-scan.py` 扫所有 .html/.md/.json/.ts/.tsx/.py/.mjs，命中即 exit 1。
- **Git 历史敏感**：本仓库的 git 历史不含任何个人信息（commit author 用 noreply 邮箱）。如果未来 fork 或接收 PR，注意不要合并含敏感信息的提交。

## ⭐ 四对齐原则（改任何产物必跑校验）

**课程(讲义) + 题目 + 闪卡 + 错题记录 四者必须围绕同一套考点对齐**。任一处变动后必须双向校验。详见 [`docs/four-alignment.md`](./docs/four-alignment.md)。

三个校验方向：
1. **题 → 课**：题排到的考点，课程必须讲。
2. **课 → 题**：课讲的考点，题必须排到对应日程。
3. **闪卡覆盖**：课程核心概念，每个应有 ≥1 张闪卡覆盖。

自动化校验脚本：[`docs/bidirectional-check.md`](./docs/bidirectional-check.md)（Python 骨架）。

**改课表的操作链**：改 `MISSION.md` 学习目标 → 改 `examples/<theme>/lessons/*.html` → 改 `examples/<theme>/questions.json`（同步 day 标签）→ 改 `examples/<theme>/flashcards.json` → 跑 `pnpm run scan` + bidirectional-check 校验。注意：进度按题 id 存不按 day，重分配 day 不影响已答进度。

## 关键约定

- **进度跨设备同步**：单用户，服务器存一份 `apps/quiz-app/progress.json`，无账号无同步码。权威源是服务器，localStorage 仅乐观缓存。改进度逻辑见 `apps/quiz-app/src/lib/progress.ts`（mergeProgress 按 submittedAt 取新）。**saveProgress 已串行化**（progressClient.ts 的 saveChain），连续提交按调用顺序排队写服务器，否则并发 POST 会丢记录。
- **判分规则**：多选必须**全对才算对**（少选/多选/错选均错），见 `apps/quiz-app/src/lib/grade.ts`。
- **题 id 全局唯一且稳定**：如 `GIT-001`、`LNX-002`、`FC-DEV-01` 等。进度按 id 存，改题源时尽量保留旧 id 以免进度错位。
- **闪卡 SRS = Anki 兼容算法**：`apps/quiz-app/src/lib/srs.ts` 实现 SM-2 + Anki 学习步（新卡 `[1m,10m]` 两步毕业，重学步 `[10m]`，lapse 后 interval×0.5）。会话调度见 `reviewQueue.ts`（again/学习步未毕业 → 卡排队尾循环）。改算法要同时更新 `srs.test.ts`。
- **进度重置能力**（`progress.ts`）：`resetWrong`（清错题）、`resetRead`（清看题）、`resetAnswersByIds`（按题 id 集合清，用于练习页"重做本题集"）、`resetSrs`（清闪卡）。UI 入口在各页面顶部。重置会同步写服务器。
- **AI CLI（三个）**：内置在仓库的 `apps/quiz-app/scripts/` 下：
  - `teach-generate.mjs`：从 `examples/<theme>/course-spec.json` 产课程 HTML
  - `grill-wrong.mjs`：从 `/api/progress` 拉错题 + LLM 聚类 + 产错题精讲 HTML
  - `podcast-generate.mjs`：从任一学习素材产男女双播播客（脚本 + 逐字稿 + WAV）
  - 全部支持 `--lang zh|en|es|ru`（或 `STUDY_LANG` 环境变量）指定**生成内容**语言；注册表在 `scripts/lib/langs.mjs`，CLI 日志始终中文。
  - 全部需要 `.env` 配 LLM/TTS provider。详见 [`docs/ai-cli-guide.md`](./docs/ai-cli-guide.md) + [`docs/configuration.md`](./docs/configuration.md)。
- **⭐ UI 多语言（中/EN/ES/RU）**：词典在 `apps/quiz-app/src/i18n/locales/`（zh 是基准，en/es/ru 以 `Record<TKey, string>` 锚定 key 集）。改/加 UI 文案必须四份词典同步改，`i18n.test.ts` 会校验 key 完整性 + 占位符一致性。**禁止在组件里写死用户可见文案**（题库/闪卡内容除外——那是数据）。语言偏好持久化与 theme 同构：localStorage `ask-lang` + `progress.lang/langUpdatedAt`（LWW）。逻辑里不要用展示文案做比较（如"其他"桶用 `isOther` flag，别比字符串）。
- **学习教练 skill（`/study-coach`）**：仓库自带的用户入口指令，装进 `~/.agents/skills/` 后输入 `/study-coach` 触发。协议：只读探测学习状态 → 快照+推荐+菜单 → 按 `skills/study-coach/references/flows.md` 的 playbook 带执行（初始化/新主题/每日学习/错题串讲/播客/产课/改内容/校验/部署）。源文件在 `skills/study-coach/`，安装用 `pnpm run skill:install`。

## zcode / AI agent 访问资料的方式

- **被问学习方法论时**：读 [`docs/methodology.md`](./docs/methodology.md)。
- **被问四对齐时**：读 [`docs/four-alignment.md`](./docs/four-alignment.md)。
- **被问「接下来学什么 / 怎么开始 / 装 skill」时**：读 [`skills/study-coach/SKILL.md`](./skills/study-coach/SKILL.md)，按它的三步协议执行（探测→推荐→带执行）。
- **被问多语言/i18n 时**：UI 看 `apps/quiz-app/src/i18n/`（词典 + Provider），AI CLI 输出语言看 `scripts/lib/langs.mjs` + `docs/ai-cli-guide.md` 的「输出语言」章节。
- **被问 AI CLI 用法时**：读 [`docs/ai-cli-guide.md`](./docs/ai-cli-guide.md)。
- **被问 .env 配置时**：读 [`docs/configuration.md`](./docs/configuration.md)。
- **被问代码结构时**：读 `apps/quiz-app/src/`（components/pages/lib/hooks/api）+ `server/`（Hono 后端）。
- **被问题目/闪卡 schema 时**：读 `apps/quiz-app/src/types.ts`（Question/Flashcard/Progress 等接口）。
- **做题遇不会的概念**：来 `examples/<theme>/lessons/*.html` 查对应课程。

## 深入文档

- 方法论：[`docs/methodology.md`](./docs/methodology.md)
- 四对齐：[`docs/four-alignment.md`](./docs/four-alignment.md)
- 双向校验：[`docs/bidirectional-check.md`](./docs/bidirectional-check.md)
- 学习教练指令：[`docs/study-coach.md`](./docs/study-coach.md)
- AI CLI 指南：[`docs/ai-cli-guide.md`](./docs/ai-cli-guide.md)
- 配置指南：[`docs/configuration.md`](./docs/configuration.md)
- 部署与跨设备同步原理：[`README.md`](./README.md)
- 示例主题：`examples/dev-intro/`（git + Linux 基础入门）

## Agent skills

### Issue tracker

Issues 走 GitHub Issues（`gh` CLI，repo 由 git remote 推断）。见 [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md)。

### Triage labels

五个默认 triage 角色标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。见 [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md)。

### Domain docs

Single-context：仓库根 `CONTEXT.md` + `docs/adr/`（按需懒创建，现均不存在）。见 [`docs/agents/domain.md`](./docs/agents/domain.md)。
