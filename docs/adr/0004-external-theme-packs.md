# 0004 · 外部主题包（主题目录可住仓库外）

日期：2026-08-25
状态：已接受

## 背景

ADR 0002 让个人学习主题退出公开仓库跟踪（untracked + gitignore），但主题目录**物理上仍住在仓库内** `examples/<theme>/`——当时的理由是"sync-examples、部署构建、课程管线全部以 `examples/<theme>/` 为路径契约"。这留下三个问题：消费者目录与套件仓库纠缠（换机器/分享主题要连仓库一起搬）、`EXAMPLE_THEME` 只认仓内名、kit 作为"脚手架"实际要求用户把内容放进自己的 clone 里。

## 决策

把"路径契约"泛化掉：`EXAMPLE_THEME` / `--theme` 的值支持两种形态——

1. **仓库内主题名**（`dev-intro`，不含分隔符）→ `<repoRoot>/examples/<name>/`（现状不变）；
2. **外部主题包路径**（含 `/` 或 `\`，绝对或相对，msys 的 `/d/...` 也能识别）→ 该目录本身，主题名取 basename。

解析逻辑统一在 `apps/quiz-app/scripts/lib/theme-path.mjs`，四个消费方（sync-examples / sync-study / teach-generate / grill-wrong）共用。`src/data/theme.json` 从 `{theme}` 扩为 `{theme, dir?}`——外部形态额外记源目录绝对路径，detectTheme 的粘滞回退靠它（只记 basename 会在 examples/ 里找不到而误回落 dev-intro）。`public/study/<name>/`、coursesRead 的 `<name>/<file>` key 都用 basename，与仓库内同名主题完全等价。

## 备选方案

- **维持只认仓内路径**（ADR 0002 现状）：主题永远寄生在套件仓库目录里——被本决策取代。
- **npm 包形态**（kit 打包成可安装库、主题包作为依赖）：终极形态，但 quiz-app 是应用不是库，需要完整打包工程；在只有一个消费者的现阶段是过度工程。等出现第二个消费者再评估。
- **配置文件注册外部路径**（theme-registry.json 之类）：多一层间接，环境变量直给路径已够用。

## 后果

- 消费者可以把主题内容放在自己的项目目录，kit 作为纯工具被引用（clone 更新互不干扰）。
- 部署侧：服务器上主题目录与套件目录分居两处，`EXAMPLE_THEME=/abs/path` 构建即可；pm2 的 env 注入同理。
- 主题包的"名字"由目录名决定——外部包与仓库内 `examples/<name>/` 撞名时行为一致（同一 name 的 study URL / coursesRead key 同构），不算冲突但应避免混用。
- `bidirectional-check.py` 本就接受任意目录参数，无需改动。
