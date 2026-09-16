# 统一安装入口：一份 install.md 服务所有工具，长尾也全量装

2026-09-16 grill 定案。背景：v0.16 的安装面是「四清单两步命令」——plugin 三家（Claude Code / zcode / Codex）原生最短，但长尾工具（Cursor / Gemini CLI 等无插件机制）只剩「clone 整个仓库 + pnpm run skill:install」的重路径，为装 128K 的 8 个教练指令文件要拉全仓库；且入口分散在各工具文档里，没有一句话能说清「怎么装」。参考 skillhub 的 install.md 形态（技能页给一句「请根据 <install.md 链接>，安装 X」，agent 抓协议自动装），拍板做统一安装入口。

六个决策（grill 共识）：

1. **统一入口**：一份 `apps/site/public/install.md`（发布为 `https://aistudykit.dev/install.md`）服务**所有工具**；用户把一句话发给任意 agent 即完成安装。入口放官网首页最上面（hero 后第一节）+ README ×4 tagline 下方。
2. **长尾也全量装**：协议对无插件机制的工具也装完整能力——5 个教练 skill + kit 建站快照（~1.3M），零 clone 建站对任何 agent 成立。残余差别只剩更新方式（plugin 刷新市场 vs 重发一次 prompt，协议写成幂等重跑）。
3. **kit 落位布局**：skills 装 agent 的 skills 目录、`kit/` 放 skills 目录**同级**——F1「从 skill 文件向上三级找 kit」的反推逻辑天然成立，零改 skill 源码。
4. **md 单份英文**：读者是全世界的 agent，英文是最大公约数；人读面（首页卡、README 块）照四语铁律四语，复制句跟载体语言。
5. **首页只留一键卡**：手动四清单矩阵撤出首页，只留文档层（README 安装章节 + get-started）。
6. **源直放 public/ 不进 sync**：`apps/site/public/install.md` 是官网静态资产，有意不进 docs 四语体系、不进 sync 产物（AGENTS.md 标注其身份）。

> URL 一经传播不可撤回：`aistudykit.dev` 域名续期即续这个入口的命（域名 2027-09-15 到期，见官网域名事项）。

## Considered Options

- **md 只做长尾兜底，plugin 三家保持原叙事**——拒：入口仍然分裂，「怎么装」没有一句话答案；统一入口的价值正是「同一句话发给任何工具都成立」。
- **长尾只装教练指令（等价 skill:install 现状），建站时再 clone**——拒：1.3M 快照的下载成本可忽略，换来任何 agent 装完能力零差别；否则「同一句话装出两种深度」，文档还得解释差别在哪。
- **md 做成四语四份**——拒：读者是 agent 不是人，四份只带来维护漂移负担（改了中文忘了改 ru）；四语铁律管人读面，机器协议单份英文。
- **源放 docs/ 进四语 sync 体系**——拒：docs/*.md 均有四份译本约定，单语 agent 协议混进去破坏体系，还得为它加 sync 特例；public/ 直放 + raw 直链天然有 GitHub 备份。

## Consequences

- 协议内容自包含：检测工具 → plugin 三家引导原生两步（Claude Code 斜杠命令 agent 不能代敲、打印给用户）/ 其余全量下载落位 → 校验（文件数 + kit-version.json）→ 指引敲 /ask-coach → 幂等更新（先报版本差再覆盖，禁止嵌套拷贝）→ 卸载指引。
- 下载源双保险：GitHub codeload tarball 主源 + jsDelivr 逐文件备源（墙内可达，文件清单走 data.jsdelivr API）；raw.githubusercontent 直链作 md 本体的备份入口。
- install.md 更新节奏与发版解耦：内容从 `main` 拉（滚动最新），协议里引用的文件数/目录名变动时要同步核对（skills 增删、kit 布局变更时必查 install.md）。
- 官网首页安装叙事从「两条命令」变「一句话」，三步 ask-steps 区块与其 CSS 一并移除；get-started / README 的手动矩阵保留降级为参考层。
- kit 落位约定成为跨工具兼容契约：未来任何安装形态（plugin、install.md、手动）都必须保证「skill 向上三级 = kit 同级父目录」这一反推成立，改动需过 F1 定位逻辑回归。
