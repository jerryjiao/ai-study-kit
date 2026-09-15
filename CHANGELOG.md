# Changelog

本仓库的版本日志。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

**固定栏目「升级与存量影响」**（ADR-0006，自本机制合入的首个版本起每版必答）：四要素——①新文件/新契约；②老项目缺了会怎样（含静默降级点名）；③怎么补（通常是 F13 升级流程或首用时自建）；④是否破坏性。每版发版时在这一节固定回答「老项目缺什么、怎么补」。

## [0.16.0] — 2026-09-15

主题：**命令面五件化 + 多生态一键分发——`/study-podcast` 播客直入、`/coach` 改名 `/study-coach` 统一 study- 家族前缀；插件多出 Codex 与 Agent Plugins 1.0 标准清单，任何生态一条命令装全套；官网与 README 按工具安装矩阵重讲安装故事，首页六卡补上播客并新增 agent 支持墙。**

### 升级与存量影响

- **新文件/新契约**：三份新清单（`plugins/ai-study-kit/.codex-plugin/plugin.json`、`plugins/ai-study-kit/plugin.json`、仓库根 `.agents/plugins/marketplace.json`）全在发行物侧，**不进 kit 快照**，用户项目零新增文件。skill 侧新增 `skills/study-podcast/` 目录（随插件分发）；新增测试 `command-surface.test.mjs`（随 kit 分发，无运行依赖）。
- **老项目缺了会怎样**：无影响。命令面与清单都在插件/发行侧；用户项目的 kit 数据层（progress / srs / coursesRead / 学习者档案）格式未动。唯一行为变化：`/coach` 改名 `/study-coach` 后旧命令不存在了（见 Changed）。
- **怎么补**：升级插件即可拿到新命令面——zcode / Claude Code 用户在客户端 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`。装完敲 `/ask-coach`，存量项目会照常被报版本差并引导 F13 升级。
- **是否破坏性**：`/coach` → `/study-coach` 是**干净切、不留旧别名**（命名史见下），属预期行为变化；其余全部向后兼容。

### Added

- **`/study-podcast` 播客直入薄命令**：先只读探测（AI 配置必须、TTS 可缺提示 `--no-tts` 只出逐字稿、素材存在）再进 F5 做播客，素材选择作为 playbook 选择点问用户（默认按 F5 优先级推荐）。命令面从四件扩为五件，主入口路由不变（直入只是快捷方式）。
- **插件多生态清单（一份内容、多清单）**：sync-plugin 顺产三份新清单——Codex 插件清单（`.codex-plugin/plugin.json`，interface 展示元数据）+ Codex 市集清单（仓库根 `.agents/plugins/marketplace.json`）+ Agent Plugins 1.0 标准清单（插件根 `plugin.json`），布局逐字段对齐 openai/role-specific-plugins 与 agent-plugins.org schema。**本机 codex CLI 实测**：`codex plugin marketplace add jerryjiao/ai-study-kit` → `plugin add ai-study-kit@ai-study-kit` 装出五个 skill + kit 快照全链路通过。Codex 用户从此与 zcode / Claude Code 用户同享「装插件零 clone 建站」。
- **命令面一致性测试**（`command-surface.test.mjs`）：断言 skills/ 目录名集合 = 主入口直入命令清单 = CONTEXT.md 词条计数 = AGENTS.md 命令面提法，加/改/删命令任何一处提法没跟上即红（变异验证实测改名全红）；kit-version 测试扩为四清单版本一致断言（发版纪律看住多清单面）。
- **官网首页六卡露出播客**：产物格五卡扩六卡（🎧 播客），区块标题松绑「一个工具包，六个学习产物」，FAQ 与 JSON-LD FAQPage 各搭一条播客问答；网格 5 列改 3 列（桌面 3×2、窄屏 2×3），四语同步。
- **首页 agent 支持墙**：「支持哪些 AI CLI」——实测三家（Claude Code、zcode 文字标、Codex）+ Agent Plugins 1.0 签署方五家（Cursor、Vercel、GitHub、AWS、Microsoft，带「标准兼容」徽标），单色灰 logo hover 恢复品牌色（MS 四色/AWS 橙经 CSS 变量），官方 SVG 入库 `public/agents/` 站内自持，四语同步、亮暗主题与 390px 移动端实测可读。
- **README/官网按工具安装矩阵**：不同工具安装方式不同、多个工具各装一份——Claude Code 两步（marketplace add + plugin install，此前只写一步半用户会卡）、zcode 市集 UI、Codex 两步、其他 CLI 走仓库安装脚本（支持自定义目标目录）、Cursor/Copilot 一句「见各工具插件文档」不编命令；README 四语与官网 get-started 四语逐字一致，clone 路线降为开发者段。

### Changed

- **`/coach` 改名 `/study-coach`（git mv 保留历史）**：薄命令统一 study- 家族前缀（`/study-coach` `/study-doctor` `/study-recap` `/study-podcast`），命名规则从 v0.13 的「避 Claude Code 内置撞名才加前缀」改为「薄命令一律 study- 前缀」——敲前缀就能联想全家。**干净切、不留旧别名**，`/coach` 用户请更新肌肉记忆；升级路径见上。v0.13 记录的「/coach 经查无撞名不动」是当时事实，留档不改。
- **README 四语全文按 hero 标准返工**：主张句开头（「AI 教练帮你把任何要考的东西练到会」）、无 jargon 开场；check_prose 硬禁令清零（35 处冒号 + 41 处破折号逐一改写）。
- **官网手工层返工**：get-started ×4 改「按工具安装 → 装完说『我想学 X』→ 开发者 clone 段」叙事；your-theme Step 5 纠正过时指引（手改 Courses.tsx / topicOrder.ts 的教法在 2026-08 配置化后已失效，改为课程入口自动跟随 + theme-config.json）。

### Fixed

- **F13 第 3 步补运行期文件保全（实测发现）**：真实项目带跑暴露的缺口——快照只含 git 跟踪面，kit 里的粘滞主题记录（`src/data/theme.json`）与 AI 配置（`.env`）不在快照内，裸重拷会静默丢：前者丢了升级后首次裸 build 回落 dev-intro，后者丢了 LLM 配置。playbook 改为重拷前挪出 progress + theme.json + .env 三件、拷回后 `npm install`（node_modules 不在快照）。升级与存量影响：无新文件新契约；老项目走 F13 不再丢粘滞主题/AI 配置；无需补动作；非破坏性。

## [0.15.0] — 2026-09-14

主题：**存量项目升级兼容机制（ADR-0006 / spec #55）——kit 自报版本 + F13 升级流程 + 体检两探测项，兼容承诺从「不崩不丢」升到「全功能对齐：降级必告知、给补齐路径」；另修三个静默错误类审计 bug。**

### 升级与存量影响

- **新文件**：`kit/kit-version.json`（kit 快照版本标记，sync-plugin 打包写入，随插件/F1 拷贝自然进入用户项目）。**新契约**：skill 探测协议新增「版本」字段（用户项目与插件快照两处版本 diff）；体检新增「版本漂移」「契约完整性」两探测项；F1 新增第 0 步探测分支。
- **老项目缺了会怎样**：无 kit-version.json = 版本未知（按最老处理）；kit 代码落后于插件快照 = 功能层静默降级（考点掌握度退化纯题维度、考点全景口头信号恒为零、推荐引不出错因），数据层不受影响（进度/闪卡/课已学完分毫不动）；误被路由进 F1 时不再嵌套拷出 `kit/kit`（此前是未定义行为）。
- **怎么补**：更新插件后敲 `/ask-coach`——快照会报版本差并引导 **F13 升级**（备份 progress → 重拷 kit → 补缺失文件模板 → 契约缺口逐项引导，只引导不代写内容）；日常 `/study-doctor` 也能发现漂移与缺口。v0.14 新数据文件（oral-attempts.json / graph-map.json）无需补，首用时自建。
- **是否破坏性**：否。progress 格式未变；主题包（kit 外）不被升级触碰；干净目录的 F1 从零初始化行为与从前一致。三个 bug 修复均为「静默错误改显式告知」：sync-study 裸跑现在跟随粘滞主题（此前静默把 dev-intro 课程站同步上去）、theme.json 损坏现在打 warn（此前静默切回 dev-intro）、远端 progress 旧快照缺 answers 现在显式 banner 告知「已忽略」（此前静默降级本地模式）。

### Added

- **kit-version.json（kit 自报版本）**：`scripts/sync-plugin.mjs` 打包 kit 快照时从根 package.json 写入版本号；打包断言 `apps/quiz-app/scripts/lib/kit-version.test.mjs`（node:test 带：产物必含该文件且版本一致——版本号与产物漂移即红，发版连带 sync:plugin 从纪律变测试）。
- **F13 升级流程（ADR-0006 落地；ADR 定稿拟名 F12，同日 v0.14 已把 F12 给了知识图谱投影且随插件发出，编号顺延为 F13，附注在 ADR 内）**：存量项目一趟到全功能对齐——读两处版本报漂移 → 备份 progress（全程不解析不改写）→ 重拷 kit（保 progress 拷回，验无嵌套）→ 对照快照补缺失新文件模板（v0.14 新数据文件不补，首用自建）→ 契约缺口（排布表缺失 / 题缺 examPoint / 闪卡缺映射）逐项引导、只点名给补法绝不代写 → 体检收口（版本已对齐 + 无未告知缺口）。
- **探测协议「版本」字段（state.md §8）**：快照新增「版本」行——已对齐 / 落后 N 版 / 版本未知按最老 / 仓库本体；推荐算法第 2 条命中漂移即推荐 F13（功能层先对齐再谈学什么）。
- **体检两探测项（flows.md 体检节 / `/study-doctor`）**：版本漂移（用户项目 kit 版本 vs 插件快照，三态报告）+ 契约完整性（排布表 / 题库 examPoint 标记率 / 闪卡映射率，缺什么怎么补）；只读只报事实，修复顺序插在「校验门红」与「.env 缺项」之间。

### Fixed

- **sync-study 裸跑不读粘滞主题（#52）**：裸跑 `npm run sync:study` 此前固定 `EXAMPLE_THEME || 'dev-intro'`，把 dev-intro 课程站静默同步到别的主题的数据层上；现与 sync-examples 同口径（粘滞主题解析提为 `lib/theme-path.mjs` 的 `detectStickyTheme` 共享，env > theme.json 粘滞 > dev-intro），有单测。
- **远端 progress 旧快照静默降级本地模式（#53）**：服务器 progress.json 缺 `answers` 时，前端 `as` 断言直接 merge 抛 TypeError 被吞 → 假「网络不可达」锁死本地模式，用户以为进度丢了。现在远端快照过与本地同构的形状校验，不合格 → 忽略这份快照 + 琥珀色 banner 显式告知「服务器数据格式旧，已忽略——下次保存自动修复」，不锁本地模式（后续 POST 照常，服务器 read-merge-write 自愈）；`SyncStatus` 新增 `'remote-invalid'`，i18n 四语同步。
- **theme.json 损坏静默切回 dev-intro（#54）**：detectStickyTheme 的损坏分支此前无日志，现在打 warn（「theme.json 损坏，已回退 dev-intro——如非预期请检查该文件」），有单测断言 warn 必出。

## [0.14.0] — 2026-09-14

主题：**知识图谱投影桥（ADR-0005 落地）——口头答题流水 / 口头掌握四态 / knowflow 图着色 / 前置关系推荐 / 全景连线，聊天新学的无题知识也有可信的掌握信号，知识结构连成图看见。**

### Added

- **口头答题流水（`study/records/oral-attempts.json`，唯一真源）**：聊天陪练的每次口头问答记一条明细（目标引用 / 对错布尔 / 真实 `Date.now()` 时间戳 / 来源三值 recall 抽背 · recite 复述 · case 案例评分点）。追加式 + 写前重读写回 + 消费端按时间戳取信去重，多会话并发安全；契约二「口头题计数」节 v0.14 起停写（总数从流水派生，解析器兼容旧记录照读合并，历史不丢）；全景「练过/口头」信号切到流水。`lib/oral.mjs` 纯函数（宽容解析 / 四元组去重合并 / 目标解析三级优先 EP 前缀→映射反查→图节点直引→裸考点名，聚合 EP 优先单主桶两视图不重复计）。
- **口头掌握四态（无题知识点也可判掌握）**：近期加权正确率（近 5 次权重 0.5/0.7/0.85/0.95/1.0 按权重和归一）+ 置信度封顶（1 次封 0.5、2 次封 0.8，防一次蒙对）；四态与既有词汇对齐（空流水=未开始 / 最近判错或加权 <0.5=弱 / 加权 ≥0.85=掌握 / 其余进行中）。`mastery-report --json` 增 `oral` 字段：排布表全部考点 ∪ 流水裸知识点的四态与「问 N 对 M」统计 + `oral.weakRanked` 口头弱项点名；既有考点四态判据 v1.1 一字不动，两通道合流负面证据优先（任一弱即弱；题没刷过口头最多推到进行中——验效果靠做题）。
- **考点节点映射 + 投影文件（唯一跨仓契约）**：`study/records/graph-map.json`（knowflow 节点 ↔ EP 的个人映射，agent 提议、学习者逐条确认，守 ADR-0002 不上站不提交）；`lib/graph-bridge.mjs` 装载图与映射、构建只读投影（`{version:1, generatedAt, source, nodes:[{id, mastery, oral}]}`）；`mastery-report --graph <path> --write-projection` 产出投影到 graph.json 同目录（位置参数 / `KNOWFLOW_GRAPH_JSON` 环境变量，同进度文件模式），无图无映射静默降级绝不报错。跨仓契约基物 `lib/fixtures/mastery-projection.fixture.json` 入库且测试断言可由判据原样重建（防漂移），knowflow 仓直接消费双向验证。skill 新增 F12 图谱投影流程（找图→映射提议确认→产出投影，绝不回写知识页）。
- **knowflow 图着色（跨仓，knowflow 0.6.0）**：`knowflow graph` 检测投影文件（graph.json 同目录或 `KNOWFLOW_MASTERY_PROJECTION`）后按掌握四态给节点着色（绿=掌握 / 琥珀=进行中 / 红=弱 / 灰=未开始）+ 注入「🎯 Mastery」图例——叠加只改 graph.html 渲染数据，graph.json 逐字节不变（其他消费方零感知）、知识页零回写；无投影 / version 无法识别（中性色降级）= 现状行为。标签器补「前置」语境词（前置/先学/依赖 → relation「前置」）。
- **前置关系推荐**：图边关系标签 → 学习语义映射（前置/依赖/来源/引用/依据/使用/属于/衍生 = 「to 要先学」；缺 relation 只算关联不排序）；`graph.weakPrereqs` 给每个弱考点的前置链（含前置掌握状态）、`graph.weakOrdered` 给尊重前置顺序的推荐序（稳定拓扑含传递，环安全）。推荐理由从「刷 EP-12」具体到「前置概念 EP-01 还弱，先补它」——依赖顺序优先于清单顺序（F10 开场纪律 + coach.md 讲前查前置链）。
- **web 全景连线可视化**：覆盖快照扩展 `graph.edges`（图边投成 EP 级连线，仍是派生布尔面隐私边界不变）；首页全景面板自绘 SVG 叠加连线（零新依赖，沿 day 分组布局，实线箭头=前置、虚线=关联、近同列侧向弓弯防重叠）+ 节点掌握四态圆点；`shouldRenderGraph` 可读阈值（无图/空边/超 200 边/超 80 考点回退现有分组清单）——没装 knowflow 的用户看不到任何变化。i18n 四语同步。

### Changed

- **文档同步（四语）**：`docs/ai-cli-guide` 四语补口头四态判据表、知识图投影与前置推荐章节、全景口径改口头流水；skill 三参考（flows.md 契约二停写条款 + F12、coach.md §3.4/§6.7、state.md 口头弱项与图信号）；CONTEXT.md 考点全景词条补连线层；AGENTS.md 数据闭环与流程面（F1-F12）。
- **发版随带**：plugin 双 manifest 与市集清单随版（sync:plugin，kit 快照字节契约复验）。

## [0.13.1] — 2026-09-14

主题：**命令改名避撞——薄命令 `/doctor`、`/recap` 与 Claude Code 内置命令硬撞名（内置优先于插件 skill），加 `study-` 前缀成为 `/study-doctor`、`/study-recap`；命令面其余不动（/ask-coach /coach 经查无撞名）。**

### Changed

- **薄命令改名**：`skills/doctor` → `skills/study-doctor`、`skills/recap` → `skills/study-recap`（git mv 保留历史）。撞名依据：Claude Code 官方命令表内置 `/doctor`（安装/配置体检，带自动修复）与 `/recap`（会话回顾，输出限 400 字符）——插件发行目标明确含 Claude Code，内置命令优先，同名插件 skill 会被遮蔽且语义混淆。`study-` 前缀撞名面为零（内置无 /study-*、社区市集无同名）。当初选 doctor 的理由「npm/brew doctor 惯例」恰是 Claude Code 也用它命名的原因，理由反噬故弃。
- **全链路同步**：主 skill 开篇菜单、coach 薄命令分流、flows.md 体检节标题、sync-plugin 注释与市集描述、安装脚本注释、README 四语命令清单、docs/ai-study-kit 四语命令表与安装示例、CONTEXT.md skill 词条、AGENTS.md——`/coach` 与 `/ask-coach` 未动（无内置撞名、无社区同名热门）。

## [0.13.0] — 2026-09-14

主题：**聊天层优先——把主学习方式（跟 agent 聊天陪练）撑成一等公民：教练纪律 / 考点全景图（讲·练·掌三信号）/ 案例大题陪练 / 命令面收敛四件（/ask-coach + /coach /doctor /recap），外加 teach 抓参考正文与冲刺包打印版。**

### Added

- **教练开场纪律三条（F10 第 0 步）**：①开场先跑全景报告浓缩版报「今天最该练 + 为什么」——建议基于数据不基于印象（推荐算法 10 条链不推翻，只把执行时机提前到陪练开场）；②弱考点没清**软坚持**先清再讲新内容，不硬锁——用户执意跳过则在当站记录留痕「跳过未清：<EP>（原因）——下一站开场再清」；③`srsDue > 0` 先口头抽背 2-3 张到期卡（答错记错点+排待办）。倒计时只消费 MISSION 声明的 deadline，不自设催办节奏。
- **考点全景图（讲 / 练 / 掌三信号）**：每考点**讲过**（契约二学习记录覆盖 ∪ 课已学完——全部课读完才点亮课程通道，部分读完不归因宁少报不虚报）、**练过**（有答题记录，口头题计数作弱信号）、**掌握**（四态判据不变），按 MISSION 排布表 day 列分学程块 + 组头汇总行（已讲 X/N · 已练 Y/N · 已掌握 Z/N）。数据层 `lib/panorama.mjs`（`mastery-report --panorama [--json]`，聊天层永远现算）；skill 加「报进度」意图入口 + 全景卡模板（state.md §3）。web 首页面板升级为全景（TS 移植 `src/lib/panorama.ts` 同口径，双实现纪律沿掌握度先例）：「讲过/口头」信号走 build 时产出的**内容无关覆盖快照** `src/data/coverage.json`（sync-examples 产，只含考点 id/三信号布尔/计数——个人叙述不出本地，内容断言测试有金句/错点原文即红）；面板新鲜度 = 上次 build，聊天层现算，两端口径一致。
- **契约二口头题计数**：学习记录（`study/records/*.md`）新增「## 口头题计数」节——每站按考点记「问 N 对 M」（考点名可带 EP 前缀，同名行改数字不堆历史行）。解析器 `lib/records.mjs` 的 `parseSessionRecord` 纯函数：frontmatter + 已过考点/错的点/待办/口头题计数四节，旧格式无计数节、无 frontmatter、frontmatter 残缺均不抛错字段缺省（沿「只报事实、不要求补格式」兼容原则）。
- **案例大题陪练（coach.md §6.7）**：对排布表里的案例型考点（DFD/ER/UML/算法/设计模式一类）出**真题风格原创大题**（品牌中性化与题库同规），按**解题范式四步**带练（读题拆问题 → 定方法 → 逐步作答 → 对照评分点），评分点全中才过（补答后全中也算），判定进契约二口头题计数；解题范式卡沉淀 `study/notes/`（随 build 上站）。案例题**不进 questions.json**、不扰动客观题库与四对齐校验。
- **体检（`/doctor` + skill 意图入口）**：一句话聚合串跑既有四门校验（品牌扫描/题库 QA/单测/四对齐）+ 环境探测（.env LLM 三项、TTS、`:8787` 后端、EXAMPLE_THEME 解析、sync 产物新鲜度），输出过/红汇总报告 + 固定修复顺序（sync 不新鲜最前——先排除假信号）。零新校验逻辑，只做编排聚合；与 F8 分工：体检是诊断视图不跑 build。
- **命令面收敛为四件**：主 skill 更名 **ask-coach**（`/ask-coach`，SKILL 开篇哲学「**命令名即菜单**」；原命令名 /ai-study-kit，插件名 ai-study-kit 终身不变——市集名不可改）；薄命令三件 `/coach`（陪练直入 F10）/`/doctor`（体检）/`/recap`（错题串讲 F4，命名避开与已装生态撞名的 grill/teach/learn），各自十几行 SKILL.md、共享主入口 references/、先探测再进流程。基建：`sync-plugin.mjs` 多 skill 化（循环 skills/ 目录打包）、安装脚本多 skill 安装/卸载（bash 3.2 兼容）。
- **teach 抓参考正文进备课上下文**：产课时把 RESOURCES.md 与 course-spec resources 的链接**页面正文**抓进 LLM 备课 prompt（「以参考材料建概念」从引用层落到内容层，备课第一依据）。`lib/resource-fetch.mjs` 的 `fetchResources`：本地缓存按 URL 去重（`node_modules/.cache/teach-resources/`）重跑不重抓；单源失败降级回 URL 清单引用，产课不中断；prompt 构建抽 `teach-utils.buildLessonPrompt` 纯函数（dry-run 单测断言参考正文进 prompt）。
- **冲刺包打印版（F11 第 5 件）**：产包时附带单文件 `study/sprint/print.html`——四件套按「金句 → 警示 → 必背 → checklist」合并，自包含内联 CSS、无导航外链，`@media print` 去背景 11-12pt 衬线字号、章节连续排版只防行内截断、checklist ☐ 勾选形态；浏览器 Ctrl/Cmd+P 即存 PDF 或打印，**不引入 PDF 生成依赖**。

### Changed

- **文档同步（四语）**：README 命令入口改 `/ask-coach` + 四命令清单（「命令名即菜单」）；`docs/ai-study-kit` 四语更新安装路径（skills/ask-coach + 多 skill 安装）、命令面表、更名史、体检/打印版入流程表；`docs/ai-cli-guide` 四语补 teach 参考正文抓取行为；CONTEXT.md skill 词条改四命令面 + 新增「考点全景」词条；AGENTS.md 结构树/约定/分发段同步。
- **修复**：teach-generate 调用 `wrapLessonHTML` 处 `sources` 未定义（ReferenceError，v0.12 引入的回归）；dotenv 17 的 tip 横幅打进 stdout 污染三个 CLI 的 `--json` 约定（`quiet: true`）。
- **装载器去重**：`mastery-report --panorama` 与 sync-examples 的覆盖快照共用 `lib/coverage.mjs` 的 `readSessionRecords` / `lessonsReadState`（课已学完口径与 progress.ts isCourseRead 同构）。

## [0.12.0] — 2026-09-13

主题：**掌握度补完——DeepTutor 对标遗留清单四项落地（课程出处回链 / 三 CLI `--json` / 闪卡 EP 映射 / 掌握度进 UI），数据闭环从命令行走进答题站。**

### Added

- **闪卡 examPoint 映射 + 掌握度判据 v1.1（题 + 闪卡双通道）**：`flashcards.json` 的卡可带可选 `examPoint`（EP-NN，与题库同一命名空间），`types.ts` 的 `Flashcard` 同步扩字段。有映射的考点，mastered 判据还要求映射闪卡全部毕业（SRS `phase = review`，墓碑=已重置算未毕业）——只差闪卡时是「进行中」不是「弱」（不掩盖负面证据，也不虚报掌握）。无映射考点判据自然退回纯题维度，不硬凑。判据两侧实现（`scripts/lib/mastery.mjs` + TS 移植 `src/lib/mastery.ts`，复用 progress.ts 的 streakToPass）注释互指、必须同步改；单测两侧都有（node:test + vitest）。mastery-report 文本行带「闪卡未毕业 N（ids）」、`--json` 的 points 带 `flashMapped/flashGraduated/flashOpenIds`。
- **掌握度进 web app（首页「考点掌握度」面板）**：首页新增折叠面板——按考点列四态 chip + 对题进度 + 「闪卡未毕业 N」徽标；考点显示名由 sync-examples.mjs 从 MISSION 排布表解析产进 `src/data/theme.json` 的 `examPoints`（UI 不重复解析 markdown）。与 mastery-report / skill 探测同判据同口径，多主题读端过滤照旧。无考点标记的主题优雅降级为提示行。i18n 四语词典同步。
- **三 AI CLI 加 `--json`（agent 管道消费）**：teach / grill / podcast 全部支持机器可读输出——人读日志降级 stderr，stdout 只出一份结果 JSON（产物路径清单；grill 无错题等 noop 路径出 `status: "noop"`），与 mastery-report `--json` 同约定（DeepTutor CLI 的 `--format json` 同构先例）。
- **teach 出处回链（「以参考材料建概念」的产物面）**：主题目录有 `RESOURCES.md` 时解析其链接（`**标题**（说明）：URL` 与 markdown 链接两种形态，纯函数 `parseResourcesMd`/`mergeResources` 有单测），与 course-spec.resources 按 URL 去重合并——既进 LLM 备课参考，也进每课页尾「📚 出处」块（四语文案进 langs.mjs `ui.sources`，`.sources` 样式进共享 styles.css）。dev-intro 两课已手工注入同款块（与模板输出逐字节一致）。

### Changed

- **文档同步（docs/，四语）**：`ai-cli-guide.md` teach 输出结构补出处回链条目、三 CLI 用法补 `--json`、mastery 判据表更新为双通道口径并注明 Web 面板同判据；en/es/ru 译本同步。
- **口径文档与 skill 源**：CONTEXT.md「考点掌握度」词条改判据 v1.1（双实现互指）；AGENTS.md 数据闭环条目与 AI CLI 条目（`--json` 约定、RESOURCES 合并）同步；skill `state.md` §3 判据行更新、`flashOpenIds` 进输出消费说明。skill 源已改，`sync:plugin` 随发版重跑。

## [0.11.0] — 2026-09-13

主题：**数据闭环——串讲与推荐之间补上机器层（借鉴 DeepTutor「tutoring as a data loop」论点：交互痕迹 → 学习者事实 → 反哺推荐），推荐理由从「错题多」具体到「EP-03 连错 2 次，错因：权限位组合不熟」。**

### Added

- **学习者档案（`study/records/profile.json`）**：grill-wrong 串讲顺产的机器可读错因档案——LLM 在聚类精讲之外多一次小调用，把考点级 wrongReasons / advice / 串讲次数落盘。合并语义：新旧考点有任意题 id 重叠即同一考点（簇名漂移不影响累积），timesGrilled 递增、错因去重合并、题 id 取并集（`lib/grill-utils.mjs` 的 `mergeProfile`，纯函数有单测）。**学习者私有**：随 `study/records/` 被 sync-study 排除不上站，新增 .gitignore 条目不提交。agent 直产路径（F4 主推）在 flows.md 档案契约里同语义手写。
- **考点掌握度（`lib/mastery.mjs` + `mastery-report.mjs`，`pnpm run mastery`）**：确定性派生、零 LLM——考点（题 `examPoint` EP-NN）四态：掌握（题全答对且无未毕业错题）/ 弱 / 进行中 / 未开始；判据与 progress.ts 的 streakToPass 毕业口径一致，考点名从 MISSION 排布表解析。`--json` 给 agent 消费，人类读表格；报告自动 join 学习者档案带出错因。刻意不含闪卡毕业（闪卡与考点无映射，硬凑是假判据，边界写进 CONTEXT 词条）。判据 13 个单测（node:test，随 pnpm test 跑）。
- **skill 数据闭环消费（SKILL.md / state.md / flows.md）**：探测协议八字段扩为九——新增「弱考点」（mastery-report 派生 + 档案错因）；快照模板加弱考点行；推荐算法第 6 条点名最弱考点并引用档案错因；意图路由新增「掌握度 / 弱考点 / 哪里最弱 / 考点报告」入口；F4 双路径都覆盖档案产出（CLI 自动顺产 + agent 直产照契约手写），串讲完下次探测自动衔接。AI 配置探测升级为分项就绪矩阵（teach=LLM；grill=LLM+后端；podcast=LLM+TTS 可选）。
- **文档**：`docs/ai-cli-guide.md` 四语——grill 流程补档案产出条目 + 新增 mastery-report 章节（无 AI 伴生工具）；CONTEXT.md 新增「考点掌握度」「学习者档案」词条。

### Changed

- **文档同步（docs/，四语）**：`ai-cli-guide.md` teach-generate 输出结构补「核心机制示意图（每课 ≥1 张内联 SVG，图大字少、只画机制）」条目——0.10.0 产课视觉条款的文档面；en/es/ru 译本同步。
- **各处 description 统一中文为主（默认语言收口）**：GitHub About、根 `package.json`、市集清单（`marketplace.json` + 双 manifest）与 SKILL frontmatter 的 description 从英文/英文为主改为中文为主（英文降为尾缀一句，沿用 README tagline 的不对称先例；manifest 全文双语仍走 `description_i18n` 不变）——与 README/官网 root/docs 的中文基准对齐。源：`scripts/sync-plugin.mjs` DESCRIPTION 常量 + `skills/ai-study-kit/SKILL.md`，已重跑 sync:plugin。

## [0.10.0] — 2026-09-06

主题：**图解降维重讲——教学链补上视觉通道（社区流行的 ELI5 skill「零基础假设 + 大图少字」纪律吸收进 coach.md，teach 产课加视觉条款）。**

### Added

- **图解降维重讲（coach.md 新增 §3.10）**：讲解升级梯补上最后一格——§3.8 换说法两轮仍讲不通（变体仍错 / 复述反复丢同一属性 / 用户直说文字看不懂），或机制天然是图（流向/层次/包含/对比，如 git 三区、网络分层），换媒介不换措辞：零基础假设 + 一张大图 + 极少文字把机制画出来。一图一机制（图承八成信息，节点/箭头/相对位置即语义——把段落塞进方框是排版不是图解）；终端对话 ASCII 图内嵌即时画，复杂机制产自包含 HTML 图解卡落 `study/notes/` 随 build 上站（`study/` 四分法说明同步）；纪律不变——深度仍按排布表、自造图解标注「教练自造」、**画懂不算过**（回考/复述验证才算过）。词汇速览与 F10 第 3 步同步挂接。
- **意图路由新增图解入口（SKILL.md）**：「大白话讲 X / 画个图 / 文字看不懂」直达 F10 图解降维重讲——用户不必知道教学法词汇，说人话就触发。
- **产课视觉条款（teach-generate.mjs）**：system prompt 内容要求新增「核心机制示意图」——每课至少 1 张内联 SVG（viewBox + 宽 100% 自适应），节点+箭头表达流转/层次/对比，图大字少、只画机制不画装饰，图内文字跟随课程输出语言，禁止外链图片与 emoji 拼贴。此前课程产物纯文字（示例课唯一的图是手工渲染的 ASCII PNG），此后课程自带机制图。

### Changed

- **文档全面重写（docs/，v0.9.0 对齐）**：七篇中文文档重写——修正 v0.9.0 后的过时路径（错题精讲 `wrong-questions/` → `study/wrong-questions/`，示例表换新文件名）；方法论补入教练线（F10 陪练教学 / F11 考前冲刺）与学习痕迹 `study/` 伞目录（含隐私边界表）；theming.md 重构为字段表 + 最小示例的易读结构；移除 methodology / four-alignment 文首的英文摘要引用块 hack（四语全版取代）。
- **文档四语化（zh/en/es/ru）**：新增 21 篇译本 `docs/<name>.en/.es/.ru.md`（README 同构：顶部语言栏互链、交叉链接走同语言版本）；AGENTS.md / README 四语的文档导航与「仓库文档是中文的」说明同步更新，译本 README 的文档链接改指各语言版本。
- **官网四语同步（sync-docs.mjs 升级）**：中文挂站根、`docs/<name>.<lang>.md` 译本自动挂 `/<lang>/` 对应路径（缺篇跳过、Starlight 回退中文 + 提示条）；站内自动剥离 GitHub 语言栏、`./xxx.<lang>.md` 与裸 `.md` 交叉链接均重写为同语言站内路径；`en/es/ru` 的 method 手工译本层转正为 sync 产物（真源移至 `docs/`，gitignore + 解除跟踪）。官网文档页从「中文 7 页 + 2 篇英西俄」扩为四语各 7 页。

## [0.9.2] — 2026-09-05

主题：**讲解结构外显——全家福概览 + 拆解块可见标签，把「先总览后拆解」写进默认纪律。**

### Added

- **讲解结构外显（coach.md §3.6 强化 + 新增 §3.9）**：①先地图后路程升级——成员多于一两个的考点（如存储体系），概览先给「全家福」（各是什么/什么关系/干什么用/量级对比），塔立住才拆零件；亲戚概念（如 SRAM/DRAM）不得「顺带」塞概念半路，进全家福或独立成块。②新增 §3.9 拆解块贴可见标签：是什么/为什么/怎么用（怎么考）写在段首——三段式是心里的骨架，标签是写在脸上的骨架，标签一丢体感就是「乱七八糟」。词汇速览与 F10 第 3 步同步挂接 §3.5-3.9；plugins/ 副本经 `sync:plugin` 重生成。源于实战反馈：结构与格式纪律齐备、唯独全家福与标签丢失的一讲，仍被用户判「讲得乱七八糟、不是先概览后拆解」。

## [0.9.1] — 2026-09-03

主题：**coach.md 讲解口吻与台阶纪律补章（§3.5-3.8）——管住三段式管不住的「腔调」与「颗粒度」。**

### Added

- **讲解口吻与台阶纪律（coach.md §3.5-3.8，v0.9.1）**：三段式管结构，新增四节管腔调与颗粒度——§3.5 说话腔不是写作腔（短句口语直接称「你」、禁模板套话、先接话再推进、正文自然段列表只留给题与步骤）；§3.6 先地图后路程（开讲先给两三句大白话全景、零件讲完拼回整图——治「每步都对、整体拼不起来」）；§3.7 一次只上一个新东西（符号最后出场：具体例子 → 挂用户已懂的旧概念 → 才上符号公式；一句只装一件事——治台阶过大用户沉默跟丢）；§3.8 停一拍与换说法（每讲完一小块停下确认、第二遍讲必须换角度换比方）。F10 第 3 步讲解纪律行挂接 §3.5-3.8，词汇速览新增「口吻与台阶」。源于实战反馈：格式纪律（选项分行、一次一题）齐备而用户仍报「AI 味浓、不像老师在跟我说话、没讲清楚」——结构全对、腔调是讲义腔，体感仍是讲义。

## [0.9.0] — 2026-09-01

主题：**教学主线成体——F10 陪练教学重写（coach.md 教学法单一事实源 + 五模式考法）+ F11 考前冲刺新增 + study/ 学习痕迹伞目录 + 课已学完显式确认制。**

### Added

- **F10 陪练教学（coach flow 重写，v0.9.0）**：由 v0.8.0 的现场串讲升级为完整陪练教学流程。教学法收敛为单一事实源 `references/coach.md`——三段式讲透（是什么/为什么/什么时候用）、五模式考法（quick·deep·two-step·adaptive·custom）、每考点一锚点金句、定义零容忍、诊断纠偏表；COACH.md（主题侧教纲）与 `study/records/`（学习者侧记录）双契约；逐考点增量落盘、跨天续站、旧目录 learning-records/ 兼容识别（迁移自愿）；「我哪没懂」诊断纠偏入口；阶段笔记 `study/notes/` 主动生成并交棒 F3 刷对应题集。
- **F11 考前冲刺（新增，v0.9.0）**：距 MISSION.md 的 deadline ≤ 7 天，或用户明说「冲刺/考前/突击」触发；deadline 是硬前置（缺失先引导补，绝不瞎猜倒计时）。冲刺包四件套——金句速记表 / 易错警示 / 必背清单 / 考前 checklist——产 `study/sprint/`；只收割不补课（收割 records 金句与错题档案），背熟交棒 F3 模考。
- **学习痕迹 study/ 伞目录（v0.9.0）**：主题包内学习产物四分法——records（进度档案，本地私有）/ notes（阶段笔记）/ wrong-questions（错题串讲）/ sprint（冲刺包）统一住 `study/` 下；F4 生成脚本输出由 `wrong-questions/` 迁至 `study/wrong-questions/`；sync-study 排除私有目录（study/records、learning-records、.mimosa 工具状态），学习者痕迹永不随静态站发布。
- **课已学完显式确认制（quiz-app，v0.9.0）**：课程页新增「✓ 学完了」按钮——点击记入、再点撤销、打开零写入（替代旧「iframe 加载即自动记已读」的失真口径）；撤销墓碑 coursesReadTombstones 跨设备合并不复活；确认后按钮位变「去刷这课的题」直达题集（theme-config `lessonTopics` 映射，无配置走文件名同名约定，解析不出则不渲染）；指标与文案「课程已读」全面更名「课已学完」（四语词典同步）。
- **探测与推荐升级（v0.9.0）**：快照新增第 8 行陪练（进行中站三形态判定 + 距考期倒计时，deadline 缺失亮 ⚠）；推荐算法扩为 10 条（新增考前冲刺与续站档位，头部顺序「闪卡 → 冲刺 → 续站」，续站需用户点头才跑）；菜单按教学/应试/内容/运维四条线分组；意图路由新增「继续学习/陪我练」→F10、「冲刺/考前」→F11。
- **测试与工具（v0.9.0）**：课已学完三断言（点击记入 / 再点撤销含合并后不复活 / 仅打开零变化）与「去刷这课的题」题集解析入 `courseProgress.test.ts`；LLM 配置用例密封性修复（缺失项显式传空串，开发机真实 .env 不再注入用例）；sync-plugin 快照遇「已跟踪但删除未 staged」文件跳过并记名（此前 wrong-questions 迁移期间 ENOENT 会崩掉整个 sync）。

## [0.8.0] — 2026-08-28

主题：**skill 教学流程补全——F10 现场串讲（对话式入门新主题）+ 外部主题包探测收尾。纯 skill 版本，答题站与 kit 快照无改动。**

### Fixed

- **skill 外部主题包收尾（v0.7.1）**：SKILL 硬红线与 flows 改内容纪律不再把内容源写死为 `examples/<theme>/`（外部主题包同受"只改源、不碰同步产物"约束，消除向套件仓库内误指路的歧义）；state.md §3 进度探测脚本按 theme-path.mjs 口径解析主题目录与 coursesRead 的 basename key——原脚本硬编码 `examples/` 前缀，外部主题包形态下题/卡 id 集为空、进度被误报为 0。plugin 副本已重生成。

### Added

- **F10 现场串讲（walkthrough）flow（v0.8.0）**：对话式入门新主题的教学流程——「知识点一块一块讲、题一道一道答」，区别于 F6 产课（持久 HTML）与 F4 错题串讲。事实核查走 kit 通用概念（MISSION 考点排布表定深度、questions.json 词频定考点、lessons/RESOURCES 做概念权威、/api/progress 看用户状态）；教学纪律为实战提炼：每主题 6-12 考点、一考点一锚点金句、类比+助记标配、每考点 2-3 题一道一道提交、出题零提示、即时判定、变体验证、结束同回合主动固化（learning-records + wrong-questions 页 + 诚实定位覆盖缺口）。SKILL 意图路由与 docs 流程表同步。

## [0.7.0] — 2026-08-28

主题：**插件=发行形态（零 clone 建站）+ 更名终名 ai-study-kit + GitHub 站内增长启动（wayfinder 图谱 #24：0★ → 30★；本版含 F1 dogfood 实测零修复走通）。**

### Added

- **插件图标**：marketplace 清单 `icon` 字段（jsDelivr 绝对 URL → 仓库根 `assets/logo.png`，zcode 官方源同款做法；raw.githubusercontent 直连会撞 429/墙）+ 插件包根 `icon.png` 实体文件（对照 cloudflare 插件带 logo.svg）。图标与 quiz-app/官网三端同源（256×256），生成逻辑入 `sync-plugin.mjs`，重跑 `sync:plugin` 跟随。
- **插件/skill 更名 study-coach → ai-study-kit（v0.7.0，全位置一致）**：市集插件名发布后终身不可改，趁零用户窗口定终名（与仓库名一致、可搜索）。skills/ 与 plugins/ 目录、docs 文档页（原 docs/study-coach.md）、安装脚本、marketplace 清单、README 四语、官网侧栏与手写页全部同步；旧名仅存于本 CHANGELOG 历史条目。
- **插件=发行形态（装插件零 clone 建站）**：`plugins/ai-study-kit/kit/` 新增迷你仓库快照（apps/quiz-app + examples/dev-intro 的 git 跟踪面）——用户装 ai-study-kit 插件即得完整可构建答题站，skill F1 流从快照拷进用户目录（`~/study-kit/`），全程不碰 GitHub。学习项目与插件升级互不干扰（主题包住 kit 外、进度按题 id 存）。README 四语主入口反转为"装插件开始"，clone 降为开发者路线。版本 0.6.0。
- **外部主题包（主题目录可住仓库外，ADR 0004）**：`EXAMPLE_THEME` / `--theme` 支持路径形态（含分隔符即外部包，主题名取 basename）——sync-examples / sync-study / teach-generate / grill-wrong 四脚本统一走 `scripts/lib/theme-path.mjs` 解析；`theme.json` 扩为 `{theme, dir?}`（外部形态记源目录，detectTheme 粘滞回退靠它）。消费者可把学习内容放自己的项目目录，套件仓库只当工具。README 四语 make-it-yours 补外部包选项；skill 的状态探测/部署注记同步（plugin 副本已重生成）。
- **修复 sync-plugin.mjs 在受限 Windows 下静默半途而废**：cpSync 目录递归被安全策略直接终止进程（rmSync 已执行 → plugin 目录被清空），改逐文件 copyTree（与 sync-study.mjs 同款修复）。
- **主题显示配置机制（theme-config.json）**：题站呈现层全面配置化——首页排序（`topicOrder`）、主题显示名（`topicLabels`）、考点子主题展开（`subtopics`）、来源徽标（`sourceLabels`）、核心/拓展层（`sourceLayers` + `layerTopics`）、考点深度徽标（`epDepth`）、卡片配色与图标（`topicStyles`）全部住在 `examples/<theme>/theme-config.json`（sync-examples 拷到 `src/data/`，缺省写 `{}`），**换主题不再改任何应用代码**。全字段可选、缺什么回退什么（原始 id / 字母序 / 不展开 / 无层=全计划内 / 默认样式）。字段表与示例见 `docs/theming.md`；dev-intro 带最小示范配置。机制测试（回退语义/中文序号排序/层派生）+ settings LWW 合并测试入列，`pnpm test` 170 项。
- **题目配图渲染**：`Question.imageRef` 在答题卡渲染 `examples/<theme>/assets/` 的配图（sync:study 已同步到 `public/study/<theme>/assets/`），BASE_URL 前缀拼根绝对路径防二级路由 404；alt 文案四语词典（`q.imageAlt`）。
- **层筛选 chips（拓展加练开着时）**：练习页全部/核心/拓展三档切换 + URL `&layer=` 直达（首页纯拓展块、上次答到拓展题的链接携带）；开关关着时层概念整体不存在。层作用域由 `layerTopics` 配置，无配置无层。
- **计划内口径（主进度）**：`computeStats`/`readCount`/首页计数/随机 20 沙盒统一为计划内题（`isPlanned = source 层 ≠ 拓展`，无层来源自动全算），拓展层答题不推主进度但错题照进错题本。

### Fixed

- **skill 外部主题包收尾（v0.7.1）**：SKILL 硬红线与 flows 改内容纪律不再把内容源写死为 `examples/<theme>/`（外部主题包同受"只改源、不碰同步产物"约束，消除向套件仓库内误指路的歧义）；state.md §3 进度探测脚本按 theme-path.mjs 口径解析主题目录与 coursesRead 的 basename key——原脚本硬编码 `examples/` 前缀，外部主题包形态下题/卡 id 集为空、进度被误报为 0。plugin 副本已重生成。

### Changed

- **设置面板措辞**：三项偏好改为「默认值先行」表述（拓展加练：默认关…；答对自动跳题：默认开…；每日新卡配额与闪卡页同步），移除未使用的 `settings.open` 词典键（四语同步）。
- **本地模式横幅关一次永久关**：localStorage 记忆（此前每次刷新重现）；同步 error 横幅保持会话级——出错每次都该看到能重试。
- **子主题前缀剥离通用化**：`(BA|IA|指标|CN)·` 岁月正则退役，统一 `stripSubtopicPrefix`（ASCII 标识符前缀 + `·`/`:`/`-` 分隔）。

## [0.5.0] — 2026-08-23

主题：**进度模型扩展（多主题隔离 + 课程已读）+ study-coach plugin 分发 + 认证内容包实战验证。**（图谱周期 #16「v0.4」；因 v0.4.0 已于 2026-08-17 割出，按 SemVer 本版发 0.5.0。）

### Added

- **多主题进度隔离（#18，读端过滤）**：切主题后旧主题的到期卡/错题不再混入学习流——进度派生视图（统计/错题本/闪卡队列/nextDue/上次答到/study-coach 探测）一律先与激活主题的题/卡 id 集求交；`resetWrong/resetRead/resetSrs` 支持可选 `ids` 主题限定，不再误伤其他主题进度；存储与合并零变更、老 progress.json 零迁移。每日新卡配额有意保持跨主题全局。
- **课程已读记录（#19）**：`progress.coursesRead`（key=`<theme>/<lesson文件名>`，per-key max LWW 合并）；`sync-examples.mjs` 产课程清单 `src/data/courses.json`；课程页课程目录栏点击定位 + iframe 每次加载（含课站内部互链）自动标记已读，「课全读」完成边界在 UI/skill/CLI 三处统一可机读；study-coach 快照新增 `lessonsRead` 并驱动「先读课 vs 直接刷题」分流。
- **study-coach plugin 分发（#22）**：仓库自带 marketplace（`.claude-plugin/marketplace.json`）+ `plugins/study-coach/`（`scripts/sync-plugin.mjs` 从 `skills/study-coach/` 单一事实源生成，版本跟根 package.json）；zcode / Claude Code 添加 marketplace 装 study-coach，更新随市集刷新免手动重装；`pnpm run skill:install` 老路径保留（双路径）。
- **软件设计师认证内容包（#5）**：`examples/software-designer/` 300 题 + 60 卡 + 10 课，agent 直产全链验证（排布表契约 → 照表产题产卡 → 四对齐校验绿）。
- **首轮 agent 直产错题串讲 + 播客逐字稿（#7）**：真实学习闭环全流程跑通（300/300 全答、错题全毕业、3 簇串讲、播客稿），课程修复 9 节；产线编排实证 ≤5 并发分批 + 死 agent 捡产出 + 主会话兜底有效。
- **产题走 agent 直产 + 考点排布表契约化（#15）**：MISSION.md 新增「## 考点排布表」节（`考点id(EP-NN) | 考点 | 深度 | 题型×题量 | day | 闪卡数`）作为机器可校验契约；`bidirectional-check.py` 读表做三向校验——题→课覆盖、大纲→题对账（题量/题型/day/闪卡数，漏标 examPoint 只 △ 提醒）、闪卡覆盖（声明 0 卡 = 了解级跳过）；无表主题回退高频词模式 + ⚠ 告警不报错，**换主题不再改脚本**。质量门硬化：✗ → exit 1（原先校验失败也退出 0）、△ 警告不拦截、目录不存在 exit 2。契约黑盒测试（CLI 边界 + 三套 fixture：带表对账 / 无表回退 / 对账不符拦截）挂进既有 node:test 层，`pnpm test` 自动跑到。
- **dev-intro 活示例**：MISSION 补排布表（4 考点），10 题补 `day` / `examPoint` 标注，四对齐复验契约模式全绿。
- **study-coach F2 产题纪律化**：新增「排考点」用户确认点（先对齐排布表再动笔）；产题步骤升级为照表逐考点直产 + 出题纪律清单（id 稳定、examPoint/day 对齐表、选项等长不给线索、多选无半对歧义）+ 参考配比（single:multi:judge ≈ 5:3:2、难度 易:中:难 ≈ 3:5:2）；产卡照表配卡。F8 去掉「手改 keywords」提醒；`docs/study-coach.md` 摘要同步；skill 已重新分发。
- **README 四语 + 官网「让 AI agent 替你产题」**：四语 README 教程加 agent 产题小节（手工路径为主，排布表是人机契约）；官网 get-started 四语修「用 AI 生成」空许诺断链（给 `/study-coach` 真实入口与流程指引），your-theme 页加产题流程节（en/es/ru 为中文 fallback 页，一处修改全语生效）；README 致谢改具体——点名 teach skill 的工作区结构与选项等长纪律两处借用。
- **CONTEXT.md 术语表**收编「考点排布表」「skill（vs CLI）」「主题（theme）」三词条。
- **site 官网四语**：Starlight locales 加 `es` / `ru`（挂 `/es/`、`/ru/`，未翻页走中文 fallback + 提示条，与 en 同分层策略）；新增 8 页翻译（es/ru 各 index / get-started / methodology / four-alignment，术语对齐 quiz-app UI 词典）；页头 `Header.astro` 的双语布尔判断改四语 label 表，「文档」链接按语言取路径前缀；README en/es/ru 的官网语言描述与文档导航链接同步（es/ru 读者直达本语言页，顶部快速上手链接此前指向中文根路径）。
- **site 语言自适应**：首访根路径按浏览器语言（`navigator.languages` 按序取首个命中 en/es/ru）跳对应语言站；`localStorage ask-site-lang` 记用户最后浏览的语言，语言切换器的手动选择自然被记住（与 quiz-app 的 `ask-lang` 同思路）；仅根路径跳转、深链不劫持。GitHub Pages 纯静态托管做不了服务端跳转，脚本内联在 `Header.astro` 同步执行。
- **site 页头常驻入口**：自定义 Starlight `Header.astro`——页头右上角常驻「文档 / 在线试玩」两个入口（默认页头没有外链位）；初版「文档」入口被 Starlight 内置样式永久隐藏，同批修复并重排右上角分组。
- **README badge 扩容**：两枚扩六枚居中——新增 deploy 状态 / 界面四语 / PRs welcome / last commit；brand-scan 放行 shields 动态 badge 的 owner URL；README 四语同步。
- **ADR-0001 决策入库**：产题走 agent 直产、不建第四个 CLI——调研归 agent、纪律与质量门归既有脚本，升级触发条件与备选方案见 `docs/adr/0001-agent-authored-questions-not-cli.md`；措辞对齐 issue #5 用「认证内容包」（初稿措辞撞个人词红线，deploy CI 曾被挂）。
- **中文 README tagline 补一行英文一句话简介**：给国际读者的可发现性，默认语言不变；该行有意不对称、不参与四语同步（约定写入 AGENTS.md）。

### Changed

- **study-coach F4/F6 双路径口径（#8 复盘拍板）**：错题串讲与产课默认走 agent 会话直产（主推），无 agent 环境配 `.env` 走 CLI（podcast 音频合成仅 CLI 可干）；skill 已重新分发。
- `docs/bidirectional-check.md` 重写为契约模式文档（退出码语义、方向 2 对账规则、0 卡声明、回退模式与告警）。
- **docs 六篇全量优化**（官网 en/method 两篇译文同步）：术语统一——teach/grill/podcast 一律称 CLI、skill 仅指 /study-coach；事实修正——删不存在的 moduleMap、题库分组按 topic（day 为可选日程标签）、teach 输入为 course-spec.json、configuration 音色默认 male/female；bidirectional-check.md 去掉与实际脚本漂移的内嵌源码、补 `pnpm run check:alignment` 入口；ai-cli-guide 主推 `pnpm run ai:*` 短命令并补 teach skill 源流致谢；引言统一中文导语。

### Fixed

- **自托管后端根级静态文件裂图（e347235）**：logo.png/favicon.png 掉进 Hono SPA fallback 被当 index.html 返回（仅 pm2 部署可见，vite dev / Pages 正常），fallback 前加 serveStatic 兜底。
- **课程 URL 跟随激活主题（4612fe9）**：sync-examples 产 `src/data/theme.json`，`Courses.tsx` 读之自动跟随，切主题收敛为只改 `EXAMPLE_THEME` 一处。
- **README logo 直链三连修**：相对路径在 GitHub 渲染依赖 `/raw/` 重定向端点全站 404 → 换绝对 raw URL 又遇 CDN 429 / 墙内不可达 → 最终改 jsDelivr 外部域，浏览器只对话 GitHub camo 代理；四语 README 同步，brand-scan 白名单补 raw.githubusercontent 与 cdn.jsdelivr.net 资产 URL（直链含 owner 用户名，扫描门曾挂）。
- **sync-docs 吞文**：stripEn 正则 `[^>]` 跨行吞正文（EN 行后接正文时吃掉 2/3 篇幅），改 `[^>\n]`。
- **site favicon 换真 logo**：手绘 SVG 近似版与定稿 logo 不一致，favicon.png 同源拷贝 + Starlight favicon 配置指向；换文件名顺带绕开旧 svg 强缓存。
- **site 首页 hero 收尾**：右侧补 app 窗口视觉（经 `hero.image.html` 入栏）；hero 下两段灰字压成一行规格条（中点分隔三事实，去掉与 hero/CTA/方法论区块的重复内容），中英同步。
- **site 两节对比表视觉居中**：`fit-content` 收缩 + 能力矩阵格子居中。
- **site dev 热更新**：拦掉 `src/content` 抢先 HMR（astro#17335），markdown 改动 1s 内生效（仅本地开发体验，不影响构建产物）。
- **GSC 验证 token 纠偏**：账号级 token 对 github.io 子路径无效，换 UI 下发的 property 级串。

## [0.4.0] — 2026-08-17

主题：**多语言四语 + 一轮真实用户走查（浏览器全流程实测）修复三处体验/数据 bug。**

### Added

- **多语言支持（中文 / English / Español / Русский）**：
  - **前端 UI 多语言**：`apps/quiz-app/src/i18n/`——`I18nProvider` + `useI18n()` + 四份词典（自建轻量实现，零新依赖）。顶栏新增 `LangToggle`（选项用语言自称名显示，不随界面语言翻译）；首次访问按浏览器语言探测；偏好存 `ask-lang` 并经 `progress.lang/langUpdatedAt` 跨设备同步（与 theme 同一套 LWW 仲裁）。`<html lang>` 与 `document.title` 跟随切换。`i18n.test.ts` 校验四语 key 完整性 + 占位符一致性（en/es/ru 另有 `Record<TKey, string>` 编译期锚定）。
  - **AI CLI 输出语言**：teach / grill / podcast 三个 CLI 新增 `--lang zh|en|es|ru`（或 `STUDY_LANG` 环境变量）。`scripts/lib/langs.mjs` 语言注册表统一承载 `<html lang>`、LLM prompt 语言指令、wrap 模板固定文案（上一课/下一课、页脚、错题中心、逐字稿主播称呼）。只影响生成内容与生成 HTML 的固定文案；CLI 日志仍中文；题库原文不翻译。`langs.test.mjs` 15 用例覆盖注册表/解析优先级/四语模板/prompt 指令。
  - `README.md` 新增「🌍 多语言」章节；`docs/ai-cli-guide.md` 新增「输出语言」章节；`docs/configuration.md` 与 `.env.example` 补 `STUDY_LANG`。
- **README 四语化**：`README.md` 顶部语言切换栏 + 新增 `README.en.md` / `README.es.md` / `README.ru.md` 三份完整译本（结构与中文版同构；es/ru 术语对齐 UI 词典——tab 名/功能名与 locale 文件一致）；README 顶部补官网 / 在线 demo / 快速上手三个在线入口（en 版文档导航直链官网已英译页）；`AGENTS.md` 补「README 四份同步改」约定。
- **i18n 相关重构**：Home 的「其他/未分类」桶从字符串比较改为 `isOther` flag + 空串 topic——多语言下排序不再随语言漂移；ConfirmDialog 危险操作启发式 regex 扩到四语。
- **site**：官网首页新增 `/study-coach` 小节（特色功能此前无首页入口）；`robots.txt` 声明 sitemap、head 注入 GSC 验证 token（发布前置）。

### Changed

- `Progress` 接口新增可选 `lang` / `langUpdatedAt`（向后兼容老 progress.json）；`useProgress` 新增 `setLang`（写 progress 走 dirty effect 同步服务器）。
- 三个 CLI 的用法注释/参数帮助补 `--lang`。

### Fixed

- **quiz-app**：完成流死点击——Practice 头部「已答 n/n」把随机沙盒（fromRandom）记录算已答，而 `canFinish` 用的 `computeStats` 排除它们：题集里混有沙盒答错记录时头部显示全答完、「完成答题」却点不出总结（`gotoFirstUnanswered` 也找不到"未答"）。新增 `computeListStats`（列表口径：非墓碑记录全计，含 fromRandom），Practice 的 `canFinish`/完成总结/头部分子统一走它；首页主进度仍用 `computeStats`（沙盒不污染，原口径不变）。附 2 个单测（列表口径计入沙盒、墓碑仍视为未答）。浏览器实测：同一进度从"点了没反应"变为正常弹出 71% 总结。
- **quiz-app**：「随机 20 题」按钮题数动态化——按 `min(20, 全库题数)` 显示（四语词典改 `{n}` 占位符，i18n 完整性校验同步过）。小题库下不再"承诺 20 只给 10"。
- **quiz-app**：看题模式启动竞态丢已看标记——mount 时 `markRead` 赶在 `loadProgress()` 的 GET 返回前触发，其乐观写入会被稍后 `writeLocal(merge(旧快照, remote))` 清掉，出现「UI 显示已看、本地/服务器却没记」。双保险修复：① markRead effect 门控 `loaded`（权威进度没加载完不写）；② `loadProgress` 在 merge 时**重读**本地快照（GET 期间的乐观写入不再被旧快照回写覆盖，整类竞态一并堵住）。
- **server**：`POST /api/progress` 收到非法 JSON 时返回 400——原先 `c.req.json()` 在 try 块外，解析错误会以 500 泄出。已实测验证（非法体 500→400，合法写入不受影响）。
- **examples(dev-intro)**：题库首次通过 `npm run qa` 全部硬约束——GIT-001 选项重排使答案键分布均衡（B 42%→33%，单项阈值 ≤40%）；GIT-003/GIT-004 加长干扰项，消除「正确答案即最长选项」的应试线索（最长即答案 40%→0%）；GIT-007 缩短正确项与干扰项的长度差。题 id 均不变，不影响已有进度。

## [0.3.0] — 2026-08-16

主题：**`/study-coach` 学习教练——一句话入口，不用记工具链。**

### Added

- **`/study-coach` 学习教练 skill**（`skills/study-coach/`）：路由式指令，对标"ask 型"教练。每次调用固定三步——①只读探测学习状态（主题、题/卡/课/串讲库存、答题进度、未毕业错题、到期闪卡、AI 配置、后端在线）；②汇报快照 + 带理由的推荐 + 编号菜单；③按 playbook 带执行。推荐优先级是方法论的执行化：先复习 → 再建概念 → 后做题 → 深挖错题 → 被动巩固。
  - `references/state.md`：状态探测协议，进度统计口径与 `progress.ts` 完全一致（墓碑过滤、随机沙盒不进主进度、错题毕业阈值、SRS 到期）。
  - `references/flows.md`：九个流程 playbook（初始化项目 / 开新主题 / 每日学习 / 错题串讲 / 播客 / 产课 / 改内容 / 校验发布 / 部署）+ 诊断速查表（8 类常见症状）。
- **`scripts/install-skill.sh` 安装器** + `pnpm run skill:install` / `skill:uninstall`：一键把 skill 装进 `~/.agents/skills/`（支持 `--dest` 装给其他 AI CLI、`--link` 符号链接版）。
- **`scripts/bidirectional-check.py` 落地**：此前 README 引用但仓库缺失的四对齐校验脚本，按 `docs/bidirectional-check.md` 契约实现（题→课覆盖度、闪卡覆盖两个方向），dev-intro 示例全绿。新增 `pnpm run check:alignment`。
- `docs/study-coach.md`：教练指令的安装、工作原理、推荐算法、扩展方式。
- `CHANGELOG.md`：本文件，并回溯补记两个历史版本。

### Changed

- `README.md` 新增「装 `/study-coach`」章节（新手入口提到 5 分钟 demo 之后）与文档导航、开发命令更新。
- `AGENTS.md` 更新项目结构、常用命令、agent 资料访问方式（新增「被问接下来学什么 → 读 study-coach」路由）。

## [0.2.0] — 2026-07-22

主题：**内置 AI CLI——从「答题站」升级为「AI 辅助学习闭环」。**

### Added

- `apps/quiz-app/scripts/lib/`：LLM/TTS 抽象层（OpenAI 兼容协议 + 容错重试 + 配置校验），纯函数全部带 node:test 单测。
- `teach-generate.mjs`：从 `course-spec.json` 产多节自包含课程 HTML。
- `grill-wrong.mjs`：从 `/api/progress` 拉错题，LLM 按考点聚类，产错题深度精讲 HTML。
- `podcast-generate.mjs`：任一学习素材 → 男女双播播客（脚本 JSON + 逐字稿 MD + WAV 合成，支持 `--no-tts`）。
- `.env.example` + `docs/configuration.md`：LLM/TTS provider 配置（OpenAI 兼容协议全覆盖）。
- `docs/ai-cli-guide.md`：三个 CLI 的完整用法、参数、FAQ。

## [0.1.0] — 2026-07-21

主题：**首个可用版本——脚手架 + demo 主题。**

### Added

- pnpm workspace 结构：`apps/quiz-app/`（React + Vite + TS + Tailwind 前端，Hono 后端）+ `examples/`。
- 答题站核心：单选/多选/判断判分（多选全对才算对）、错题本（按历史错次自适应毕业阈值）、看题模式、随机沙盒。
- 闪卡 SRS：SM-2 + Anki 学习步算法，again/hard/good/easy 四档评分，会话内循环调度。
- 跨设备进度同步：单用户服务器一份进度，按时间戳合并，无账号无同步码。
- `examples/dev-intro/`：git + Linux 基础示例主题（10 题 / 4 卡 / 2 课 / 1 错题串讲）。
- 方法论文档群：`methodology.md`（大纲→材料→做题）、`four-alignment.md`（四对齐）、`bidirectional-check.md`（校验脚本说明）。
- `scripts/brand-scan.py` 零泄露扫描门 + 双语 README + MIT LICENSE。
