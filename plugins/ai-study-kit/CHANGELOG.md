# Changelog

本仓库的版本日志。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

**固定栏目「升级与存量影响」**（ADR-0006，自本机制合入的首个版本起每版必答）：四要素——①新文件/新契约；②老项目缺了会怎样（含静默降级点名）；③怎么补（通常是 F13 升级流程或首用时自建）；④是否破坏性。每版发版时在这一节固定回答「老项目缺什么、怎么补」。

## [0.23.0] — 2026-09-29

主题：**命令面分层与更新入口治假绿（spec #99，ADR-0010）——「谁能敲什么」定形成文，版本链补上第三只眼。** 用户命令（五个斜杠命令 + 自然语言意图）与工具链命令（agent 代跑）定名分层，纪律「**可跑不可派**」三处成文（AGENTS.md / skill 红线 / 术语词条）；版本探测补第三处「最新发布」（官网 version.json 产物）：插件本体落后不再假绿、F13 复探绝不把项目对齐到旧快照、仓库 checkout 形态（ruankao 型）说「更新」走 git pull 代跑；安装文档与 README 五语加受众分层声明——日常学习只需要五个命令。

### Added

- **三处版本探测：假绿收口（#100，ADR-0010 #104）**：kit 版本此前只比两处本地文件（用户项目 vs 插件快照 `kit-version.json`，ADR-0006）——插件**本体**落后于最新发布时两处照样相等，快照一路报绿（活例：本地插件 0.21.0、仓库已发 0.22.0）。补**第三处**「最新发布」：官网版本产物 `apps/site/public/version.json`（新脚本 `gen-version.mjs` 挂 site prebuild，从根 package.json 写、产物 gitignored 零手工同步），探测进快照 Step 1「版本」行本体信号 + F13 第 1 步**复探**（本体落后 → 停下不重拷，绝不把项目对齐到旧快照；按安装形态分叉 Route A「marketplace refresh 我代不了」/ Route B 幂等重跑安装协议）+ 体检版本行，三站之外不探。全部**软失败**：超时/解析失败注一句照报本地两态，绝不阻塞；`ASK_KIT_VERSION_URL` 环境变量可覆盖默认 URL（演练桩/内网自托管）。推荐算法插条：本体落后 → 先引导刷新插件本体，排在「项目 kit 落后 → F13」之前；F13 语义增强为「复探过才动 kit」，由演练器 `--scenario=stalled` 断言面锁死（scripts/drill，spec #55 行为级验收面先例）。**存量影响**：skill 层软契约，无落盘变化；老项目零动作，插件用户下版 marketplace refresh 才拿到第三信号（skill 文档随版本走）。
- **仓库 checkout 更新路径（#101）**：把仓库 checkout 当学习项目用的形态（ruankao 型）不再假设「与 skill 文档恒同代」（那只对贡献者成立）——该形态探 **git 落后程度**（`git fetch` + `rev-list --count HEAD..origin/main`；`behind=unknown` 同软失败协议，fetch 失败不拿旧参考算数）：N = 0 报同步、N > 0 报「落后 N 提交」并由 agent 代跑 `git pull` + 重建（工具链命令**可跑不可派**，不派给学习者手敲）。快照「版本」行两形态两套值。
- **命令面分层纪律三处成文（#102）**：**用户命令**（五个斜杠命令 + 聊天框自然语言）与**工具链命令**（pnpm/npm/git/cp 全族，agent 代跑）定名分层，纪律「可跑不可派」——AGENTS.md ⭐ 条目 + CONTEXT.md 词条 + SKILL.md/state.md/flows.md 注记三处同文，堵「agent 把 pnpm 派给学习者」的混淆。
- **README/docs 五语受众分层声明（#103）**：安装节前后各加一段——装好之后日常学习只需要五个命令（全在聊天框里敲），下文的 pnpm/clone 是开发者路线，学习者不用碰；README ×5 + `docs/ai-study-kit.md` ×5 同步。

### Changed

- **`/ask-coach` 描述收口（#103）**：SKILL.md frontmatter 与市集/plugin 元数据换短描述——「先扫学习状态（进度、错题、到期闪卡、考期、版本），再告诉你现在最该做什么、为什么……每个动作都从这进」（原为功能全枚举长句）。

### 修复

- **sync-study 剔除 plan.json 上站拷贝（#97 裁决）**：计划数据里 F10 写回的执行痕迹（status/doneDate——哪天开学/学完/搁置）与笔记、错因同属学习者私有数据，不再随 `public/study/<theme>/` 发布（此前整目录拷贝会带上）。站点计划面板/全景页消费的是 build 时 `src/data/` 的 sync 产物，上站那份无任何消费端，零功能影响。
- **断档天数口径注解对齐（#98 裁决）**：课学完撤销（墓碑）**也算接触**——断档采事件口径（来过就算来过，衡量「多久没学」），撤销只回退完成度、不抹掉接触历史；修正与实现不符的头注，行为与测试零变化。
- **brand-scan 排 `.firecrawl/` 本地爬取工件误报**：与 `.mimosa/` 同款（v0.22.0 收尾先例）——本地爬取产物是 gitignored 工件不是发布面，基线实测 9 命中全在其中。
- **描述双源对齐（独立评审）**：#103 收口时只改了 SKILL.md，`sync-plugin.mjs` 的 `DESCRIPTION` 常量与 `description_i18n` 未跟——`sync:plugin` 重跑把旧描述重新烙进市集清单 / plugin.json / 插件 README 三处 committed 产物，市集页元数据与 skill 实际描述互相矛盾。常量已对齐 SKILL.md 逐字（并在常量旁写死双源注记），重跑 sync 落三处产物。
- **发版提交触发 Pages 部署（独立评审）**：`deploy-site.yml` 的 paths 过滤器不含根 `package.json`/`CHANGELOG.md`——纯发版提交（版本号 + 插件重同步）不触发部署，线上 `version.json` 停在旧版，第三处「最新发布」探测恰在发版窗口退回 #100 要消灭的假绿（ADR-0010「push main 触发 Pages 部署」的假设不成立）。两文件已入 paths。
- **推荐算法顺序句计数（独立评审）**：插条后顺序句枚举五档「刷本体 → 升级 → 闪卡 → 冲刺 → 续站」却写「四者的紧迫度」，已改「五者」（源与插件副本同修）。

## [0.22.0] — 2026-09-28

主题：**学习计划与进度对账（spec #89，ADR-0009）——进度信号第一次挂上「带日程的计划」维度。** 主题可选数据 `examples/<theme>/plan.json`（`deadline` + `units[]`，单元状态四态 planned / in-progress / done / paused）；kit 从 plan + progress **确定性派生**四组信号（无 LLM，mastery-report 同风格）：覆盖（done/total、当前单元、剩余清单）、节奏·日历对照（今天该到哪 vs 实际到哪 → 落后/富余天数）、节奏·速率外推（近 14 天完成速率 → 预计完成日 vs deadline → 富余/缺口）、断档天数（距最后一次学习接触）。落五个面：`plan-report` CLI（`--json` 供 agent）、首页「学习计划」面板、全景页轻量结合（摘要行 + day 卡状态 chip）、skill 快照「计划」行、F10 陪练按契约三维护单元状态。**无 plan.json 的主题（dev-intro）全链路现状零变化**——sync 写空计划回退、面板零 DOM、快照整行省略、CLI 出 noop。

### 升级与存量影响

- **新文件/新契约**：主题侧新增**可选**数据文件 `examples/<theme>/plan.json`（要不要排计划、粒度切多大是内容决策，kit 只在计划已存在时维护它）；仓库侧新增 `apps/quiz-app/scripts/lib/plan.mjs`（sync 契约 + 派生判据单源，头注写死四组信号口径）与 `plan.test.mjs`（31 测试，含三套 sync 夹具 plan-with / plan-none / plan-broken-malformed）、`apps/quiz-app/scripts/plan-report.mjs`（CLI）、`src/lib/plan.ts` + `plan.test.ts`（TS 移植 31 测试——脚本侧与前端侧判据同步改，mastery.ts 先例）、`src/data/plan.ts`（committed import 入口，coverage.ts 先例；`src/data/plan.json` 为 gitignored sync 产物）、`src/types.ts` 的 `PlanFile`/`PlanUnit`/`PlanUnitStatus`；UI 词典新增 26 个 plan key ×5 语；skill 层 state.md §3「学习计划」探测节、contracts.md **契约三**（plan.json 单元状态维护）、SKILL.md 快照第十一字段与「计划」行、F10 三触发点；文档侧 `docs/adr/0009` 与 CONTEXT.md 四词条（学习计划 / 计划单元 / 覆盖 / 节奏）。kit 快照随 quiz-app 与 skill 面刷新，`kit-version.json` 版本号随版走 0.22.0。
- **老项目缺了会怎样**：零影响。plan.json 是可选文件——无计划主题 sync 写空计划回退 `{units:[]}`（theme-config 的 `{}` 回退同风格，import 恒可解析），首页/全景页零 DOM、快照零行、`plan-report` 出 `status:"noop"`（reason missing/broken，exit 0——缺可选文件不是故障）；progress 契约零改动（计划不进 progress，ADR-0009：progress 是按题 id 键控、跨设备 LWW 合并的运行期信号，塞计划结构要发明一套没有消费方的合并语义，且 progress 单份全局、plan 随主题走，装载位置互相冲突）。不升级无感。
- **怎么补**：想要计划面 → 在 `examples/<theme>/plan.json` 手写或让教练排一份（`deadline` + 单元的 `plannedDate`/`day`/`topic`/`status`），重跑 sync/build 即上面板；插件用户 marketplace refresh（kit 快照含计划面），手动安装用户重跑 `pnpm run skill:install`；存量学习项目照 F13 重拷 kit 后同样只是多一个可选项。
- **是否破坏性**：非破坏。既有 sync 产物（theme.json / courses.json / theme-config.json）与探测协议向后兼容（快照 noop 输出与没有计划功能前逐字节一致）；外部主题包路径（EXAMPLE_THEME 外部形态）同一代码路径生效。

### Added

- **`plan.json` 数据契约与 sync 链路（#90）**：`PlanFile`/`PlanUnit` 类型——`status` 四态由学习流程维护（不是从答题进度派生）、`plannedDate` 缺失只进清单不进日历对照、`day` 与 `theme.json` examDays **同一命名空间**（同源 MISSION 排布表 day 列）、`topic` 关联题库做题集直达。`syncPlan`：有则原样拷贝（byte 级不改写主题数据）、无/损坏/畸形（units 非数组）写空计划回退 + warn 不硬崩 build（theme.json 损坏同款态度）；外部主题包路径天然生效。CONTEXT.md 四词条 + `_Avoid_`（不把单元完成态写进 progress、不手编 `src/data/plan.json`、不写回派生值——双源必漂移）。
- **派生判据单源 `lib/plan.mjs` + `plan-report` CLI（#91）**：四组信号全部现算不写回。覆盖：排序真源是 `order`（缺失排最后）；current = 第一个 in-progress，无则第一个 planned（「接下来该做的」），只剩 done/paused → null；remaining 含 paused（搁置了也是没完成）。日历对照：`plannedDate` 可解析才参与（坏日期披露 invalidDateUnits 不崩）；逾期判定严格小于今天（今天到期当天不算拖）；diffDays 锚「逾期单元的最大 plannedDate」不是最早逾期的拖龄（逐单元拖龄在 `overdue[].daysOverdue`）；paused 不豁免日程。速率外推：窗口 = 含今天往前 14 自然日、分母固定窗口长不随事件间隔伸缩、ceil 整天、剩余含 paused 保守；三态诚实降级 no-units / complete / no-recent-completions（近 14 天零完成事件不硬算编数）。断档：answers / srs / 课学完三通道取最大；按本主题题/卡 id 集求交做多主题隔离（读端过滤红线）；墓碑答案算接触（提交发生过）、课学完墓碑不算；无时间戳 → no-contact（不是 0 天）。时区口径：自然日按本地时区（srs.ts 先例）。CLI 支持 `--theme`（仓库内/外部主题包两种形态）/`--progress` / `--json`（stdout 只出结果 JSON、人读日志走 stderr，mastery-report 同约定；noop 路径 exit 0）。
- **首页「学习计划」面板（#92）**：统计仪表正下方，仅当激活主题有计划（sync 产物 units 非空）才渲染——打开首页第一眼即见，无需导航。进度条 + 完成 X/Y + 剩余清单（带合法 `unit.topic` 的单元可点进对应题集，题库无此 topic 降级纯展示）+ 距 deadline 天数（未设不显示）+ 节奏双行（日历对照：落后红 / 富余绿 / 今天到期琥珀 / 日程已清；速率外推：预计完成日 ± 对 deadline 富余/缺口）+ 断档行（距上次学习 N 天）。数据不足走降级文案（无日程 / 速率不足 / 无接触），绝不显示编造数字；判据全从 `src/lib/plan.ts` 现算，数字与 `plan-report --json` 一致。
- **全景页轻量结合（#93）**：顶部汇总带加一行计划摘要（完成 X/Y + 节奏，复用 `home.plan*` 词典 key——同一派生状态两处同文防措辞漂移）；有 `day` 映射的单元在对应 day 卡头带状态 chip 四态（计划中 / 在学 / 完成 / 搁置，`panorama.planStatus*`）。只取覆盖 + 日历对照与 day→单元映射，不算断档/外推——范围受控，不展开成第二个计划面板。day 命名空间契约落地：`unit.day ≡ examDays` 的 day，首页与全景页两个呈现面同源显示，同一天两处不一致即 bug、不是呈现自由度（ADR-0009）。
- **skill 快照「计划」行 + 探测协议（#94）**：state.md §3 新增「学习计划」节——`plan-report --theme --progress --json` 一条命令自己说有无（不要先 ls 试探再决定跑不跑）；noop → 快照整行跳过（输出与没有计划功能前逐字节一致，dev-intro 即此基准）；ok → 拼「计划」行，字段全从命令实测不许编（覆盖 / 节奏 / 断档 / deadline；速率外推快照行不消费，用户追问「照这个速度来得及吗」再引用其 available/note）。SKILL.md 快照十 → 十一字段（「计划」行：完成 N/M · 当前单元 · 落后/富余 ±N 天 · 断档 N 天）；与「陪练」行考期的口径区分写死——本行 deadline 是**学习计划期限**（plan.json），陪练行「距考期」是 MISSION frontmatter deadline，两个源两个行不互替不合并（F11 冲刺的硬前置始终是后者）。
- **契约三 + F10 维护接线（#95）**：contracts.md 新增**契约三 · 计划单元状态维护**——三动作：开站（翻 `in-progress`，paused 复学也是开站）/ 收站（翻 `done` + 补当天真实 `doneDate`）/ 搁置（翻 `paused`）。写入口径：无计划文件三动作整体跳过且**不替用户发明计划**；读-改-写（与口头流水同款并发纪律）；**只许改 `status` 与 `doneDate` 两个字段**（`plannedDate`/`deadline`/`order`/`title`/`day`/`topic` 是用户的内容决策，agent 不改）；`doneDate` = 写入当天真实日历日，禁固定值禁未来日期（progress `submittedAt` 同款红线），已 done 不重写（首次完成日是真源）；幂等且单向（`done` 终态不回翻，复习性重学照常开站只是不动单元状态）；搁置只在用户明确说时做（逾期/落后是节奏事实不自动搁置）；单元 ↔ 站不强求一一对应（按 `unit.topic`/`unit.day`/用户点名对号，对不上不硬凑）；派生值永不写入（写回 = 双源漂移）+ 产物时滞注记（主题文件改完要等下次 sync/build 上 UI；`plan-report --theme` 直读主题文件立即生效）。F10 playbook 三触发点接线（第 1 步开站、第 4 步收站、用户明确暂停时搁置）+ 完成标志补计划收站 + deadline 两口径注记（计划期限不是考期，F10 不拿它催办）。
- **ADR-0009 与测试面**：分层决策两条（计划数据住主题——不进 progress；派生与展示住 kit——现算不写回）+ day 命名空间契约；Considered Options 三拒（计划进 progress / 计划写 MISSION.md 再解析——排布表的 day 是内容组织、计划是执行安排，让机器频繁改写人写的内容文件会污染 MISSION 权威性 / 派生值写回缓存）。已知边界留后续刀：有 plan.json 的主题其文件随 sync-study 全目录拷贝上 `public/study/<theme>/`，status/doneDate 是学习流程写的执行痕迹、与「学习痕迹不上站」的隐私精神有张力，是否排除单文件待裁决（dev-intro 无 plan.json 故现行发布面零变化）。测试：node:test 31（sync/readPlan 契约 6 + 覆盖 4 + 日历对照 8 + 速率外推 6 + 断档 4 + 总装/降级/脏数据 3）+ vitest 35（`plan.test.ts` 31：日期工具 / 覆盖 / 日历对照 / 速率外推 / 断档 / planUnitsByDay / 总装，本地正午锚「今天」跨时区确定；`Home.planPanel.test.ts` 2：空计划零 DOM 门控 + 有计划全要素渲染；`Panorama.plan.test.ts` 2：计划摘要行与 day 卡四态 chip + 空 plan 零 DOM）；UI 词典 26 个 plan key ×5 语（i18n.test 的 key 完整性校验覆盖）。

### Changed

- **README 五语功能面补一笔**：「换成你自己的主题」一节的可选项步骤并入 `plan.json`——带日程的学习计划（首页「学习计划」面板对账完成 X/Y、落后/富余天数、距上次学习几天），五语同步，术语随 UI 词典（study plan / plan de estudio / план обучения / 学習計画）。
- **`.gitignore`**：增 `apps/quiz-app/src/data/plan.json`（sync 产物，与 questions.json / theme-config.json 等同一族）。

## [0.21.0] — 2026-09-27

主题：**教练说人话第二刀（spec #82，ADR-0008 的 CLI 面）——三个 AI CLI 的生成 prompt 接表达纪律。** 新 `apps/quiz-app/scripts/lib/voice.mjs`（CLI 层纪律五语单源：口表语域底座压缩版 + teach 成文体 / grill 诊断体 / podcast 口播体按产物分形），teach / grill / podcast 三个 prompt builder 各嵌「## 表达纪律」节；podcast prompt 的开头 / 结尾行同步收紧，目标段数 >12 追加「中段收拢」条款。v0.19.0 落 skill 层、本版补 CLI 层，ADR-0008 两刀版本边界就此收口（原计划 v0.20.0，因日文五语化占用版本号顺延，见 0.20.0 调度注记）。

### 升级与存量影响

- **新文件/新契约**：`apps/quiz-app/scripts/lib/voice.mjs`（表达纪律五语单源 + `voiceBlock` 组装器）与 `voice.test.mjs`（13 测试，其中 kit 快照门禁 2 断言——新文件先 `git add` 再重跑 `pnpm run sync:plugin` 才转绿，防未跟踪新文件零警告漏出 kit 快照）；三个 builder 的 system prompt 新增「## 表达纪律」节（软契约，只影响新生成产物的行文）。kit 快照随 quiz-app scripts 面刷新，`kit-version.json` 版本号随版走 0.21.0。
- **老项目缺了会怎样**：存量课程 / 精讲 / 播客产物与进度零影响——纪律只作用于**新生成**的 prompt；老项目用旧 kit 重跑 CLI 只是产物行文维持旧腔调，无落盘契约变化、无数据迁移、探测协议零改动，不升级无感。
- **怎么补**：插件用户 marketplace refresh（kit 快照含 voice.mjs），手动安装用户重跑 `pnpm run skill:install`（同时刷新 skill 与 kit）；存量学习项目无需动作，想要新行文风格重跑对应 CLI 覆盖旧产物即可。
- **是否破坏性**：非破坏。`--lang` / `--json` / `{n}` 占位符 / langs.mjs 词典 / teach 出处回链 / podcast `--style` 三态与段数 ±3 契约全部不动；grill 的 800-1500 字数契约保留。

### Added

- **`voice.mjs` CLI 表达纪律单源（五语）**：`VOICE_BASE` = voice.md §1 的 prompt 尺寸压缩（五条最小集：开门即入题 / 词落到实物 / 判断钉在依据上 / 分寸跟着判断走 / 先删后改；「立场先亮」「先接话头」不入底座——前者是快照推荐行场景、后者归 podcast 口播体分形，取舍注记写在常量注释）；`VOICE_KIND` 三产物分形——teach 成文体（首行给落点 / 行序跟依赖走 / 反讲义腔）、grill 诊断体（开头点破错根 / 警示指到题 id 实际错选错次 / 只引用输入记录防编造）、podcast 口播体 `{ base, recap }` 两段结构（接话头 / 预答下一问 / 话题回环 / 密度气口 / 口语真实性尺度 / 写给耳朵）；`RECAP_THRESHOLD=12`（源流是 cida podcast 适配器「每 10-15 分钟收拢一次」，重标定为段数粒度的代码条件）；`voiceBlock(kind, lang, opts)` 未知 kind 抛错、未知 lang 兜底 zh（同 langs.mjs langConf 防御路径）。模块头防漂移双注记：指向 voice.md 母本、cida 源流（MIT、重写非照抄）、不能物理单源两条理由（kit 自包含 / 五语指令）、排除清单（文体参数值 / 时长原值 / `--style` 已覆盖 / 其余平台适配器）、recap 按意图段数注入的 ±3 浮动注记。
- **`voice.test.mjs` 四组 13 测试**：①结构（五语非空 ×3 形态、未知 kind 抛错、未知 lang 兜底、组装底座在前）；②三 builder 接线（system prompt 原样含 voiceBlock 输出，五语全轮 + 旧腔调行已删锚定 + 800-1500 字契约保留）；③收拢分支（18 段含 recap / 缺省与 =12 不含 / 非数值 NaN 安全，五语全轮 + buildPodcastPrompt 布线级复测 20 含 12 不含）；④kit 快照门禁（voice.mjs / voice.test.mjs 进 kit 快照且与源字节相等，报错点名「先 git add 再重跑 sync:plugin」——sync 只收 git 跟踪面且不警告未跟踪新文件）。
- **voice.md CLI 注记**：`skills/references/voice.md` 头部补防漂移双注记的 skill 侧——点名 CLI 面落点 `voice.mjs` 与双侧同步纪律（与该文件头的 ⭐ 双注记互为呼应）。
- **docs/ai-cli-guide 五语**：新增「表达纪律」节（三 CLI prompt 内嵌纪律、底座 + 三分形要点表、podcast 中段收拢触发条件、五语单源路径与 voice.md 母本关系），中文 + en / es / ru / ja 四译本同步。

### Changed

- **三 builder prompt 接线**：teach `buildLessonPrompt` 删「风格：口语化、有具体例子、避免空洞术语堆砌」行（不留双口径）、在内容要求与风格参考之间加「## 表达纪律」节（长度 800-1500 字与 SVG / quiz-anchor / callout 结构要求一字未动；`buildOutlinePrompt` 未接——结构任务）；grill `buildClusterGrillPrompt` 风格行改「长度：800-1500 字」保留字数契约、加表达纪律节（聚类与档案 prompt 未接——档案既有「不写粗心」条款判定已合规）；podcast `buildPodcastPrompt` 开头 / 结尾行收紧（开头简短欢迎引入后立刻进主题、结尾把主线总结收拢后再道别）、加表达纪律节（`--style` 三态、speaker 交替、不照念原文、角色标签契约不动）。
- **AGENTS.md AI CLI 节**：补「全部生成 prompt 内嵌表达纪律」条目（五语单源 `scripts/lib/voice.mjs`、母本 voice.md、双侧同步维护）。
- **CONTEXT.md**：「口表语域」词条补 CLI 生成 prompt 面落点一句。

## [0.20.0] — 2026-09-22

主题：**日文（ja）五语化——工具、README、docs、官网全链路加入第五语言。** 工具 UI 词典 `ja.ts`（185 key 全译）与语言切换器、AI CLI `--lang ja`（teach/grill/podcast 生成内容日文化）；新 `README.ja.md` 与五份 README 语言栏互通；docs 七篇日文译本 + 28 个存量语言栏更新；官网 `/ja/` 全站（locales/侧栏/手写页/生成页/浏览器语言映射）。**版本号调度注记**：原预留给教练说话第二刀（CLI 产物 prompt 腔调接线）的 v0.20.0 由本版先落地使用，第二刀顺延 v0.21.0。

### 升级与存量影响

- **新文件/新契约**：前端词典 `apps/quiz-app/src/i18n/locales/ja.ts`（`Record<TKey, string>` 锚定 zh 的 key 集，漏译编译报错）与 `UiLang` 联合扩展；CLI 注册表 `SUPPORTED_LANGS.ja`；docs `*.ja.md` ×7；官网 `src/content/docs/ja/`（手写层 index/get-started + sync 生成页）。kit 快照随 quiz-app i18n 与 langs 面改动刷新，`kit-version.json` 版本号随版走 0.20.0。
- **老项目缺了会怎样**：零影响——纯增量语言项，默认语言（zh）与既有四语行为不变；题库/进度/课程不含语言假设，不升级无感。
- **怎么补**：想要日文界面的用户升级工具即可——插件用户 marketplace refresh（kit 快照含新词典），手动安装用户重跑 `pnpm run skill:install`；存量学习项目无需任何动作。
- **是否破坏性**：非破坏。

### Added

- **工具 UI 日文化**：`ja.ts` 全量词典（です・ます調，占位符逐一保留）；注册点全量打通——`UiLang` 联合、语言切换器「日本語」选项、`detectLang`/`HTML_LANG`、i18n.test.ts 与 langs.test.mjs 的语言枚举。
- **AI CLI `--lang ja`**：`langs.mjs` 加 ja 条目（directive 日文指令 + teach/grill/podcast 的 ui 固定文案日文化，`{n}` 占位符保留）；三个 CLI 用法注释的枚举同步。
- **README 五语**：新 `README.ja.md`（以中文基准为内容源、结构对齐 en 版；不带 zh 独有的英文 tagline 不对称项）；README.md/en/es/ru 语言栏各加日本語；五份语言数量声明更新五语口径。
- **docs 五语**：七篇 `.ja.md` 完整译本（交叉链接指向同语言版本）；28 个存量文件语言栏加日本語；`--lang zh|en|es|ru` 枚举全部加 ja（四个语言版本同步）。
- **官网 `/ja/` 全站**：astro locales 与侧栏 translations、sync-docs 的 LANGS/DESCRIPTIONS、ja 手写层（index/get-started）、patch-404 五语 fallback（ja 内容齐整，无 noindex 回退页）、Header/SiteFooter 语言清单、浏览器语言自适应含 ja。
- **AGENTS.md**：语言体系提法（README/docs/UI/CLI/官网）由四语更新为五语。

### Changed

- 全仓语言数量声明由四语口径更新为五语（README ×5、docs ×35、官网首页 FAQ JSON-LD 与正文、CLI 用法注释、patch-404 日志）；「四对齐」为方法论术语，不受影响。

## [0.19.0] — 2026-09-21

主题：**教练声音纪律单源化（spec #82，ADR-0008）——外部表达引擎 skill「辞达（cida）」蒸馏重写进仓，落五 skill 共享的 `skills/references/voice.md`（五节：语域底座 / 快照措辞 / 对话增补 / 产物成文 / 排除边界），教练的三张嘴（陪练对话、快照推荐行、手写产物）全部接线到单源；「吸收外部 skill 一律蒸馏重写、不做运行时依赖」定案为 ADR-0008。CLI 产物 prompt（错题精讲 / 播客稿 / 课程 HTML）的腔调接线留 v0.20.0 第二刀。**

### 升级与存量影响

- **新文件/新契约**：skill 共享层新增 `skills/references/voice.md`（五节声音纪律，sync 后随共享层落产物侧 `plugins/ai-study-kit/references/`）；文档侧新增 `docs/adr/0008-distill-rewrite-not-runtime-dep.md` 与 CONTEXT.md 五词条（口表语域 / 推荐行措辞 / 读者预期 / 话语标记判真 / 口述成文）。**kit 快照内容零变化**——仅 `kit-version.json` 版本号随版走 0.19.0。
- **老项目缺了会怎样**：用户项目零影响——声音纪律是 skill 层的腔调约束，不新增落盘契约、不动探测协议；已装旧版 skill 自洽照常工作（旧版 coach.md §3.5 条款完整可独立执行），不升级无感。
- **怎么补**：zcode / Claude Code 用户 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`（voice.md 在共享层 references/ 里，安装器随共享层一起带上）；存量学习项目无需动作（kit 内容无变化，重拷无损）。
- **是否破坏性**：非破坏。

### Added

- **`skills/references/voice.md` 声音纪律单源**（#82，ADR-0008）：五个教练 skill 开口输出的口吻纪律在此定义一次、各处引用不复写。五节——§1 通用口表语域底座（像当面说话不像伏案写作的中间档：六条正行为 + 「先删后改」总闸 + 念出声检验法）；§2 快照与推荐措辞（动作先行 / 依据可指认 / 禁空话三条硬规则，「结构不算话」——模板行结构 / emoji / 菜单分组不受辖）；§3 对话层增补（预答下一问 / 关节词判真四问 / 长短句跟着意思走）；§4 产物成文（口述成文整理法：首行给落点 / 行序跟着依赖走 / 分寸落进产物 / 语域抬半档不抬到讲义腔）；§5 排除边界（源项目的结构手术、金句稀缺、文体参数化、平台适配、个人风格校准五项写死不进，防顺手搬入）。方法骨架重写自 cida（MIT License，作者「谁是专家」mizzlelover），不照抄原文、不搬其运行时流程与内部命名，文件头保留源流注记。
- **ADR-0008 蒸馏不依赖**：吸收外部 skill 的方法进仓库，一律「蒸馏重写进仓 + 源流注记 + ADR 记录」——不检测外部 skill 是否存在、不做运行时依赖、不照抄原文。三条动机：插件即发行形态（装插件不该被要求「再装一个 cida 才有人话」）、教练声音须确定性（无装机分裂、可复现可修）、MIT 许可与「重写而非删名」先例（0001 teach skill / 0005 DeepTutor）使重写可行。运行时探测与双层增强两方案明拒；skill 层（本版）与 CLI 产物 prompt 层（v0.20.0）两刀版本边界在本 ADR 定死。
- **README ×4 致谢**：四语「借鉴与致谢」各加一条——教练声音纪律蒸馏重写自辞达（cida），点名作者与 MIT License、链接 ADR-0008，与 0001 / 0005 两条既有致谢同构。

### Changed

- **三嘴接线到单源**：①**快照嘴**——ask-coach SKILL.md 推荐算法上方新增「推荐行措辞纪律」段（voice.md §2）：推荐第一要素是可执行入口不是态度，「错题较多建议复习」式空话不许出现；②**对话嘴**——coach.md §3.5 重写：说话通用底色（八条）上收 voice.md §1 不再复写，本节只留教学场景专属收紧——禁模板套话（= §3「关节词判真」四问在教学场景的便宜近似，非另一套规则）、语气词限量（只管对话回合）、正文自然段（快照行与产物的列表 / 成文形态恰是正确形态，归 §2/§4）；③**产物嘴**——coach.md §6.7 案例范式卡与 §8 阶段产出补成文法引用（voice.md §4：组织过的理解，不是讲义换个格式抄一遍）。

## [0.18.1] — 2026-09-20

主题：**skill 打包布局契约对齐（三路审查 #12/#18 收口）——state.md/contracts.md 迁五 skill 共享层 `skills/references/`，产物侧按官方 Codex 摄取契约落插件根 `references/`，sync-plugin 对产物做确定性路径改写；五 skill 各配 `agents/openai.yaml` 关闭 Codex 隐式触发；`allowed-tools` 调研定案不实施。**

### 升级与存量影响

- **新文件/新契约**：源侧新增 `skills/references/` 共享协议层（state.md 探测协议 + contracts.md 落盘契约，原在 `skills/ask-coach/references/`）与 5 份 `skills/<skill>/agents/openai.yaml`（Codex 侧 policy 元数据）；产物侧新增插件根 `plugins/ai-study-kit/references/`（官方 Codex 摄取契约要求 skills/ 下目录必须含 SKILL.md，共享层不能塞进 skill 目录）。**kit 快照内容零变化**——仅 `kit-version.json` 版本号随版走 0.18.1。
- **老项目缺了会怎样**：用户项目零影响；已装旧版 skill 自洽照常工作（旧布局内部引用完整），不升级无感。
- **怎么补**：zcode / Claude Code 用户 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`（会同时带 references 共享层与 openai.yaml）；存量学习项目无需动作（kit 内容无变化，重拷无损）。
- **是否破坏性**：非破坏。

### Added

- **五 skill 共享协议层 `skills/references/`**（#12）：state.md（探测协议）与 contracts.md（落盘契约）从 `skills/ask-coach/references/` 迁出，成为五 skill 共享的单源层（无 SKILL.md 不算 skill）；sync-plugin 对共享层缺失硬失败（缺源即红，不再静默出残包）；安装器 install/uninstall 对称处理共享层（装/卸都带上）。
- **`agents/openai.yaml` ×5**（#18）：每个 skill 各一份——interface 显示元数据 + `policy.allow_implicit_invocation: false`，Codex 侧隐式触发关闭（编排型主入口只走显式命令）；zcode / Claude Code 侧为惰性文件不受影响。plugin.json **不加** policy 字段——官方摄取契约 allowed_keys 不含，已实证会拒；顺带补 `interface.longDescription` / `interface.defaultPrompt` 官方必填字段。
- **文档注记**：`apps/site/public/install.md` Route B 补 references 共享层的拷贝 / Verify / Uninstall 三处指引（此前手动路线只讲 skill 目录会漏装共享层）；`docs/ai-study-kit.md` 四语 L56 断链路径同步；AGENTS.md 结构树与 CONTEXT.md skill 词条同步迁移后事实。

### Changed

- **产物侧确定性路径改写与插件根落位**（#12）：共享层源侧住 `skills/references/`、产物侧落 `plugins/ai-study-kit/references/`，两侧相对路径不同（源 `../references/` ↔ 产物 `../../references/`）——sync-plugin 对产物 skill 文件按固定规则做确定性改写，逐字节可对拍（规则固定、无启发式）。这是**插件产物面的行为变化**：升级后插件包内 skill 引用路径与旧版不同，安装后用户视角零差异。官方 validate_plugin.py 报错 8→5；残量 5 条为 disable-model-invocation: true 与 Codex 契约的有意双宿主取舍，非缺陷。

### 调研定案（不实施）

- **`allowed-tools` 不加**（#13）：zcode 官方文档明确 skill frontmatter 识别键仅 name / description / when_to_use / license / metadata——allowed-tools 在 skill 上是被静默忽略的死字段；Claude Code 上该字段语义是「调用轮免确认预授予」而非限制白名单，与 ask-coach 编排型多阶段工具面（pnpm×24 / bash×15 等）不匹配，加了反而误导。五件 SKILL.md 的 frontmatter 均未新增 allowed-tools 字段（本版 SKILL.md 其余改动来自 #12 路径迁移）。

## [0.18.0] — 2026-09-20

主题：**三路审查 15 项修复——分发与安装链路加固（安装器补装 kit、CI 同步产物零漂移门禁、缺文件硬拦、插件包补 README/CHANGELOG、vite 产物 untrack、install.md 三处修）+ skill 上下文经济学（flows.md 720→436 拆分、契约一/二单源化、--lang 全链落位、插件自足化、出站路由归一）+ docs 四语三表瘦身。**（三路审查 #1-#11、#14-#17）

### 升级与存量影响

- **新文件/新契约**：发行物侧新增 `plugins/ai-study-kit/README.md` 与 `plugins/ai-study-kit/CHANGELOG.md`（sync-plugin 顺产，不进 kit 快照，用户项目零新增）；CI 新增 `.github/workflows/check-sync-products.yml`；`apps/quiz-app/vite.config.js` / `vite.config.d.ts` 自本版起 untrack（tsc 编译产物，本地 build 重新生成，不再随 kit 分发；手写声明 `src/vite-env.d.ts` 保留不动）；插件 skill 侧新增 `references/flows/`（F4/F5/F6/F10/F11 五个独立 playbook）与 `references/contracts.md`（契约一/二单源）——均在插件包内，用户项目零新增。
- **老项目缺了会怎样**：用户项目零影响——全部改动在发行侧与仓库侧。已装用户不重装无感；唯一的存量改善点：升级前只用旧版 `skill:install` 装过的手动用户，其 `~/.agents/kit/` 缺失问题自本版起由安装器自动补齐（见 Fixed 首条）。
- **怎么补**：zcode / Claude Code 用户 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`——新版安装器**会同时刷新 skill 与 kit**（kit 落在 skills 目录的父目录，如 `~/.agents/kit/`）；存量项目照 F13 升级流程重拷 kit。
- **是否破坏性**：非破坏。唯一新行为是 `--uninstall` 顺带清理 kit（对称清理，删的只是安装器自己装的目录）。

### Added

- **CI 同步产物门禁**（#2）：新增 `check-sync-products.yml`，push main 与 pull_request 触发——装依赖 → 重放 `node scripts/sync-plugin.mjs` → 对 `plugins/` `.claude-plugin/` `.agents/` 做 `git status --porcelain` 零漂移检查，输出非空即红。untracked 也算，比 `git diff --exit-code` 严：同时拦「改源忘重跑 sync」与「产物漏 add」两类事故（后者 v0.17.0 实际发生过，6013e26 补救）。
- **插件包 README + CHANGELOG**（#8/#9）：sync-plugin 顺产 `plugins/ai-study-kit/README.md`（与 DESCRIPTION 常量同源：一句话定位、五命令清单含宿主命名空间前缀提示（如 zcode 下 `/ai-study-kit:ask-coach`）、官网 install.md 入口 https://aistudykit.dev/install.md）与 `plugins/ai-study-kit/CHANGELOG.md`（根 CHANGELOG 全文拷贝，每版重生成）——F13「落后 N 版」要数 CHANGELOG，发行物里此前没有。

### Fixed

- **install-skill.sh 补装 kit 快照**（#1）：此前只循环拷 skills 五目录，kit 只能靠 install.md B3 手工建——而 skill 的 F1 流靠「向上三级找 kit」（references/flows.md），手动装的用户实际拿不到零 clone 建站能力。现拷完 skills 后自动把 `plugins/ai-study-kit/kit` 装到 skills 目录的父目录（`--dest` 同理取父目录；`--link` 对 kit 同样 link；`--uninstall` 对称清理）。CHANGELOG 0.16.0/0.17.0 两处「重跑 `pnpm run skill:install`」的升级指引同步补注「会同时刷新 skill 与 kit」。
- **sync-plugin 快照缺文件由警告改硬拦**（#6）：工作树缺跟踪文件（删除未 staged）此前仅 `console.warn` 继续出包，快照静默缺文件。现默认 exit 1，加 `--allow-missing` 逃生门（使用时在输出打印醒目提示，仅限明确知道自己在删文件的场景）。
- **vite.config.js / vite.config.d.ts untrack**（#7）：两份 tsc -b 编译产物（源 `vite.config.ts`）此前被 git 跟踪并随 kit 快照分发。加进 .gitignore 并 `git rm --cached`（工作树文件保留，本地 build 会重新生成）；sync-plugin 本就整目录清重建（`rmSync` 插件目录后按 `git ls-files` 重拷），untrack 后两文件自动退出 kit 发行面。
- **install.md 三处修复**（#16/#17）：① jsDelivr fallback 脚本补 `TMP=$(mktemp -d)` 首行——原实现依赖 preferred 块定义的 `$TMP`，单独直抄 fallback 时会向根目录写而失败；② 「~1.3 MB, 155 files」改为不随发版漂移的表述（「每份 git 跟踪文件、体量随版本变化」）；③ 新增「Already installed via the other route?」节——双路由并装会有两份 skill 两份 kit，指明各自落点（Route A 在宿主插件目录 `<plugin-root>/kit/`、Route B 在 `ROOT/kit/`），引导换路由前先按 Uninstall 节卸旧。

### Changed

- **flows.md 拆分：720→436 行**（#3）：F4/F5/F6/F10/F11 五个高频大节拆为 `references/flows/` 独立 playbook（薄命令每次命中不再全量载入 720 行），flows.md 保留「流程→文件」目录（只写节名+文件、不写行号）+ 公共约定 + 低频流程；SKILL.md 与四薄命令引用改直链。`git show HEAD` 逐节对拍零内容丢失（七个保留节逐字节一致）。
- **契约一/二单源化 + 伪标题治理**（#10/#14）：契约块逐字迁出为 `references/contracts.md`，F10/F11/state.md §7/coach.md 五处消费方改引用（F11 金句抽取显式认单源）；flows.md 代码块内的顶格 `##` 伪标题随抽取整体离开，`grep '^## '` 现只命中真章节。注意 `records.mjs` 按顶格 `##` 切契约二记录的节，contracts.md 模板保持顶格并在文件头注明勿降档。
- **`--lang` 全链落位**（#4）：F4/F5/F6 CLI 命令块补 `--lang zh|en|es|ru`（缺省跟 STUDY_LANG 再缺省中文，CLI 日志始终中文）；agent 直产路径补「生成内容语言跟随用户对话语言」；state.md §4 加 STUDY_LANG 探测行。
- **skill 插件自足化**（#5）：对仓库 AGENTS.md / docs/theming.md / docs/configuration.md 的六处引用改自足或内联要点（插件用户项目里没有这些文件）；三处「落后 N 版」改「优先读随插件分发的 CHANGELOG.md，取不到降级只报版本号」。
- **study-doctor 补出站路由句**（#15）：与 study-coach/study-recap/study-podcast 同构，四薄命令收尾归一。
- **docs/ai-study-kit.md 四语三表瘦身**（#11）：五命令 / 推荐算法 / 十三流程三张表瘦身为摘要行 + 指向 `skills/ask-coach/` 的链接，四语同步（+28/-172）——消除与 SKILL.md 的双份维护漂移面。

## [0.17.1] — 2026-09-18

主题：**官网 SEO 修复——首页语言自适应跳转加爬虫豁免，解掉 GSC 把 `/` 判「网页有重定向」不进索引的根因（sitemap 34 提交 0 索引实测）。**

### 升级与存量影响

- **新文件/新契约**：无。site 侧 `Header.astro` 一处内联脚本的行为分支，不新增文件、不动 kit 快照。
- **老项目缺了会怎样**：无影响。官网是发行侧，不进 kit 快照与用户项目；quiz-app、skill、CLI 全零变化。
- **怎么补**：无需补——纯官网层修复，push main 由 Pages 自动发布，插件/kit/skill 不涉及。
- **是否破坏性**：非破坏。真人浏览器行为逐字节不变；仅渲染 JS 的爬虫不再被跳转。

### Fixed

- **首页语言自适应脚本加爬虫豁免**（GSC「网页有重定向」根因）：Googlebot 渲染环境语言是 en-US，根路径 JS 跳转会把它送去 `/en/`，Google 对 JS 跳转同样按 redirect 处理——`/`（canonical 自指、权重最高的入口页）被分类为跳转页不进索引，且与 `/en/` 互相打架。UA 含 `bot|crawl|spider|slurp|inspection` 一律不跳，爬虫留在 `/` 吃中文首页；真人浏览器（含已选语言偏好）行为不变。vm 分支模拟：Googlebot / Google-InspectionTool / bingbot 均不跳，英文浏览器照常 `/en/`，深链不劫持。

## [0.17.0] — 2026-09-17

主题：**考点全景独立页 `/panorama`——43 考点不再挤在首页：顶栏「全景」入口、四态汇总带、day 卡片放宽考点行、全部/弱项/未掌握三档筛选 + `?filter=` 深链（聊天层推荐可直达）、知识图谱连线层原样迁入；另收录统一安装入口 install.md（ADR-0007）与首页/README「零准备」叙事翻转。**

### 升级与存量影响

- **新文件/新契约**：kit 新增页面 `src/pages/Panorama.tsx` 与 lib 纯函数 `filterPanoramaGroups` / `parsePanoramaFilter`（`src/lib/panorama.ts`，筛选语义不进 CLI 侧双实现）；i18n 词条整体搬家 `home.panorama*` → `panorama.*`（含 `home.masteryNoEp` → `panorama.noEp`）并新增 `nav.panorama`。site 侧新增 `public/install.md`（agent 安装协议，ADR-0007，有意不进四语体系）。
- **老项目缺了会怎样**：不升级插件的老用户拿不到新页面，功能无损（全景还在其首页面板里）；升级后若不跑 F13 重拷，kit 还是旧快照——全景页与 i18n 新前缀都不会出现，且**直接手改过 Home.tsx 的项目**重拷会覆盖（此前版本同此边界，非新增强）。skill 探测走 CLI（`mastery-report --panorama`）不受页面迁移影响，聊天层口径零变化。
- **怎么补**：zcode / Claude Code 用户 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`（新版安装器会同时刷新 skill 与 kit）；存量项目按 F13 升级流程重拷 kit（会自报版本差引导）。
- **是否破坏性**：非破坏性。首页「考点全景」面板移除、入口移到顶栏「全景」是唯一可见变化（UI 位置迁移，数据与判据零改动：三信号/四态判据与 `scripts/lib/panorama.mjs` 双实现同步纪律不变）；旧 `home.panorama*` i18n key 不再存在，仅影响手改过词典的项目。

### Added

- **考点全景独立页 `/panorama`**（#76-#81）：顶栏四入口（答题/闪卡/课程/全景）；页头汇总带 = 三信号全局数字 + 掌握/弱/进行中/未开始四态图例；每学程 day 一张卡片，考点行放宽（四态圆点 + 讲/练/掌 chip + EP 编号名称 + 答 x/y + 口头 x/y + 未毕业徽标），真实体量（43 考点 × 10 day）不再是一面小字墙。无考点标记主题优雅降级提示行；demo 深链 `/panorama` 经站根 404 兜底直达。
- **三档筛选 + `?filter=` 深链**（#78/#80）：筛选语义收敛为 lib 纯函数——`filterPanoramaGroups`（弱项 = 仅 weak、未掌握 = 非 mastered、空 day 组整组隐藏、组内汇总按可见行重算）与 `parsePanoramaFilter`（非法/缺失回退「全部」），`panorama.test.ts` 并入 6 断言；筛选不写 localStorage（查看层会话状态），汇总带在筛选下保持全局口径。深链为聊天层「弱项在哪」类推荐直达预留入口。
- **统一安装入口 install.md**（#71-#74，ADR-0007）：`aistudykit.dev/install.md` 一份 agent 可执行的安装协议，所有工具（Claude Code / zcode / Codex / 手动）走它统一安装；skill 向上三级定位 kit 的硬契约写死，首页与 README ×4 最顶部挂入口。
- **首页/README「零准备」叙事翻转**（#75）：官网首页 ×4 漏斗重排（先讲「你只需说想学什么」再讲安装）、hero 换真实对话签名、样式精修；README ×4 首屏重组瘦身，四清单章节降级为手动安装路径。

### Changed

- **首页考点全景面板整块移除**：含 Home 内全景派生 useMemo 与 coverage/flashcards 依赖，不残留入口；其余首页区块（统计/继续上次/错题重练/按主题练习/进度管理）不受影响。CONTEXT.md「考点全景」词条同步为独立页事实，agent 推荐措辞不再指向首页面板。
- **i18n 词条搬家**：`home.panorama*` 15 条迁 `panorama.*` 前缀（四份词典 key 集一致，`i18n.test.ts` 把关），新增 `nav.panorama` 四语（全景/Panorama/Panorama/Панорама）。
- **顶栏移动端适配**：四 tab 后 390px 视口横向溢出（目验实测 scrollWidth 426>390），修复为 tab 禁折行 + 齿轮/主题/语言小屏收内距 + 420px 以下品牌只留图标；桌面（sm+）渲染逐像素不变。

## [0.16.0] — 2026-09-15

主题：**命令面五件化 + 多生态一键分发——`/study-podcast` 播客直入、`/coach` 改名 `/study-coach` 统一 study- 家族前缀；插件多出 Codex 与 Agent Plugins 1.0 标准清单，任何生态一条命令装全套；官网与 README 按工具安装矩阵重讲安装故事，首页六卡补上播客并新增 agent 支持墙。**

### 升级与存量影响

- **新文件/新契约**：三份新清单（`plugins/ai-study-kit/.codex-plugin/plugin.json`、`plugins/ai-study-kit/plugin.json`、仓库根 `.agents/plugins/marketplace.json`）全在发行物侧，**不进 kit 快照**，用户项目零新增文件。skill 侧新增 `skills/study-podcast/` 目录（随插件分发）；新增测试 `command-surface.test.mjs`（随 kit 分发，无运行依赖）。
- **老项目缺了会怎样**：无影响。命令面与清单都在插件/发行侧；用户项目的 kit 数据层（progress / srs / coursesRead / 学习者档案）格式未动。唯一行为变化：`/coach` 改名 `/study-coach` 后旧命令不存在了（见 Changed）。
- **怎么补**：升级插件即可拿到新命令面——zcode / Claude Code 用户在客户端 marketplace refresh，Codex 用户重跑 `codex plugin marketplace add jerryjiao/ai-study-kit`，手动安装用户重跑 `pnpm run skill:install`（新版安装器会同时刷新 skill 与 kit）。装完敲 `/ask-coach`，存量项目会照常被报版本差并引导 F13 升级。
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
