# Changelog

本仓库的版本日志。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Fixed

- **skill 外部主题包收尾（v0.7.1）**：SKILL 硬红线与 flows 改内容纪律不再把内容源写死为 `examples/<theme>/`（外部主题包同受"只改源、不碰同步产物"约束，消除向套件仓库内误指路的歧义）；state.md §3 进度探测脚本按 theme-path.mjs 口径解析主题目录与 coursesRead 的 basename key——原脚本硬编码 `examples/` 前缀，外部主题包形态下题/卡 id 集为空、进度被误报为 0。plugin 副本已重生成。

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
