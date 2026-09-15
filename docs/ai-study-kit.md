# Study Coach · `/ask-coach` 学习教练指令

**简体中文** · [English](ai-study-kit.en.md) · [Español](ai-study-kit.es.md) · [Русский](ai-study-kit.ru.md)

ai-study-kit 的功能多——答题站、课程、闪卡、错题串讲、播客、部署，但对学习者来说这反而成了负担：**今天到底该干嘛？** `/ask-coach` 就是回答这个问题的。它是仓库自带的主入口 skill：装一次，每次学习从它开始，由它扫状态、给推荐、带你执行，不用背工具链。

**命令名即菜单**，插件 ai-study-kit（名字终身不变）装出来共五个命令：

| 命令 | 干什么 |
|------|--------|
| `/ask-coach` | 问教练：状态快照 + 推荐 + 带执行（主入口，其余流程走路由） |
| `/study-coach` | 坐下就学：陪练直入（F10 进站/续站，开场报「今天最该练+为什么」） |
| `/study-doctor` | 一键体检：四门校验 + 环境探测，过红报告 + 修复顺序 |
| `/study-recap` | 错题串讲直入（F4，前置齐了直接深挖） |
| `/study-podcast` | 播客直入（F5，把学习素材合成男女双播音频，通勤路上听） |

---

## 安装

skill 源文件在仓库 `skills/` 下（单一事实源：`ask-coach` 主入口 + `study-coach` / `study-doctor` / `study-recap` / `study-podcast` 四个薄命令，薄命令共享主入口的 `references/`）。两条安装路径：

**① plugin 市集（zcode / Claude Code，推荐）**：仓库自带 marketplace 清单（`.claude-plugin/marketplace.json`，由 `scripts/sync-plugin.mjs` 从源生成 `plugins/ai-study-kit/`）。在客户端里添加 marketplace `https://github.com/jerryjiao/ai-study-kit`，安装 `ai-study-kit` 插件——后续 skill 更新随市集刷新到达，**无需手动重装**（版本跟仓库 release）。**插件更新后，旧项目打开 `/ask-coach` 会被报出版本差并引导 F13 升级**（保数据、补缺口，见上方流程表；kit 快照自报版本 `kit-version.json`）。**插件名终身 ai-study-kit，命令名是 ask-coach 一族**（2026-09 v0.13 由 `/ai-study-kit` 更名，市集名不可改所以插件名不动）。

**② 手动安装（任何认 `~/.agents/skills/` 的客户端）**：

```bash
# 在 ai-study-kit 仓库根目录（五个 skill 全装，薄命令依赖主入口的 references/）
pnpm run skill:install          # 复制安装到 ~/.agents/skills/{ask-coach,study-coach,study-doctor,study-recap,study-podcast}
pnpm run skill:install -- --link   # 符号链接版（随仓库 git pull 自动更新）

# 其他客户端：自定义目标目录
bash scripts/install-skill.sh --dest ~/.claude/skills

# 卸载
pnpm run skill:uninstall
```

装完重启 CLI（或开新会话），输入 `/ask-coach` 即可。不装也能用：直接让 agent 读 `skills/ask-coach/SKILL.md` 照做。

---

## 它怎么工作

每次调用固定三步：

1. **探测状态**（只读，≤1 分钟）——主题、题/卡/课/串讲库存、答题进度、未毕业错题、到期闪卡、课已学完、口头抽背弱项（答题流水派生）、陪练站与考期、AI 配置、后端在线与否、kit 版本漂移（用户项目 vs 插件快照，落后或版本未知即引导 F13 升级，见下）；传了知识图位置时还带图信号（节点掌握四态、前置关系，见 F12）。
2. **汇报 + 推荐**——一张快照表 + 一个带理由的推荐动作 + 编号菜单。
3. **带你执行**——选定后按 `skills/ask-coach/references/flows.md` 的 playbook 逐步做，做完对照「完成标志」验收。

没有明确意图时，推荐按顺序取第一个命中的（完整版见 `skills/ask-coach/SKILL.md`）。学习类头部三条的顺序是「闪卡 → 冲刺 → 续站」：复习是每天都欠的账，冲刺是考期前一周的收割窗口，续站随时能续（版本漂移这条环境项排在学习项之前——功能层先对齐，数据层不受影响）：

| 顺序 | 条件 | 推荐 |
|------|------|------|
| 1 | 仓库不存在 | **F1** 初始化项目（先把答题站跑起来） |
| 2 | 用户学习项目 kit 版本落后或版本未知 | **F13** 升级（功能层先对齐——漂移期间新功能都在静默降级；保数据，一趟几分钟） |
| 3 | 激活主题是 dev-intro 演示内容，且用户有自己想学的东西 | **F2** 开新主题（demo 的 git/Linux 题不是学习材料） |
| 4 | 到期闪卡 > 0 | **F3** 每日刷题（先清复习——记忆在衰退，新知识可以等） |
| 5 | 距 MISSION.md 的 deadline ≤ 7 天 | **F11** 考前冲刺（短窗密集重复的窗口已开；deadline 未配置则本条不命中，快照已亮 ⚠） |
| 6 | 有进行中陪练站 | **F10** 陪练教学 续站（报站名 + 待办数，**用户点头才跑**：续站是建议不是指令） |
| 7 | 未毕业错题 ≥ 3 | **F4** 错题串讲（LLM 聚类深挖） |
| 8 | 有未答题 且 课未学完 | **F3** 每日刷题（先建概念再做题——按当日课表读对应课，课要点「✓ 学完了」才计数，打开不算） |
| 9 | 有未答题 且 课已学完 | **F3** 每日刷题（概念建齐了，直接刷题验效果） |
| 10 | 题全答完 且 正确率 ≥ 80% | **F5** 做播客（转被动巩固）或 **F2** 开新主题 |
| 11 | 题全答完 且 正确率 < 80% | **F4** 错题串讲，仍不达标则 **F6** 补课（课程讲解质量不够） |

## 十三个流程

| # | 流程 | 什么时候用 | 关键命令 |
|---|------|-----------|---------|
| F1 | 初始化项目 | 从零跑起 demo | `pnpm install && pnpm dev` |
| F2 | 开新主题 | 把想学的东西变成完整闭环 | 大纲+考点排布表 → 材料 → `teach-generate` → 照表产题/卡 → 切主题 → 校验 |
| F3 | 每日刷题 | 「今天学什么」 | 到期闪卡 → 学课 → 刷题 → 错题重练 |
| F4 | 错题串讲 | 错题攒 ≥3 道 | `pnpm run ai:grill -- --theme <t>` |
| F5 | 做播客 | 通勤/运动巩固 | `pnpm run ai:podcast -- --input <file>` |
| F6 | 产课/加课 | 新增课程讲解 | `pnpm run ai:teach -- --theme <t>` |
| F7 | 改内容 | 改题/课/卡/日程 | 四对齐操作链 + 校验 |
| F8 | 校验发布 | 发布前质量门 | `pnpm run scan` / `test` / `build` + `scripts/bidirectional-check.py` |
| F9 | 部署 | 上线云服务器 | pm2（从 `apps/quiz-app/` 启动） |
| F10 | 陪练教学 | 对话式逐考点教懂 + 当场考 + 跨天续站 | 排布表圈最少必要考点 → 三段式讲透 + 锚点金句 → 按模式考 → 逐考点落盘 `study/records/`（口头问答进 oral-attempts.json 流水）→ 交棒 F3 |
| F11 | 考前冲刺 | 距考期 ≤ 7 天，或用户喊「冲刺/考前/突击」 | 收割 records 金句 + 错题档案 → 冲刺包四件套 + 打印版落 `study/sprint/` → 交棒 F3 模考 |
| F12 | 知识图谱投影 | 有 knowflow 知识库（graph.json），想在图上看见掌握着色与考点连线 | 建/认考点节点映射（`study/records/graph-map.json`，agent 提议、学习者逐条确认）→ `pnpm run mastery -- --graph <graph.json> --write-projection` 产只读投影；无图无映射静默降级，绝不回写知识页 |
| F13 | 升级 | 插件更新后项目落后（版本漂移 / 版本未知） | 备份 progress → 重拷 kit（保 progress）→ 补缺失文件模板 → 契约缺口逐项引导（排布表 / examPoint / 闪卡映射，只引导不代写）→ 体检收口 |

外加**体检**（`/study-doctor`，四门校验 + 环境探测的一站式编排）与**诊断**两个运维入口：前者出过红报告与修复顺序，后者是进度不同步、课程 404、CLI 报配置错、scan 命中……症状 → 根因 → 处置的速查表。

---

## 设计说明

- **路由式 skill，不是又一个 CLI**：它不引入新运行时，只是把「读状态 → 推荐 → 执行已有命令/流程」编码成 agent 可循的指令。所有底层能力都是仓库既有的（三个 AI CLI、同步脚本、校验门）。
- **状态先于建议**：教练禁止凭感觉推荐——每个快照字段都有探测命令（`skills/ask-coach/references/state.md`），进度统计口径与 `apps/quiz-app/src/lib/progress.ts` 完全一致（墓碑过滤、随机沙盒不进主进度、错题毕业阈值、SRS 到期）。
- **方法论内嵌**：推荐算法的顺序就是 [`methodology.md`](./methodology.md) 的「大纲 → 材料 → 做题」落地；F2 流程强制先写 MISSION（含考点排布表）/RESOURCES 再允许产课产题——产题不是裸写 JSON，是照排布表逐考点直产 + 三门（qa/scan/四对齐）全绿收口。

## 扩展

加一个新流程：在 `skills/ask-coach/references/flows.md` 加一节 playbook（目的/前置/步骤/完成标志），并在 `SKILL.md` 的菜单和意图路由表里加一行。改完 `pnpm run sync:plugin` 重新生成 plugin 产物（手动安装用户另跑 `pnpm run skill:install` 重新分发）。加一个薄命令：在 `skills/` 下建新目录写薄 SKILL.md（十几行、共享 `../ask-coach/references/`），sync-plugin 自动带进产物。

## FAQ

**Q: 必须装吗？**
A: 不装也行，但每次都要自己想「下一步干嘛」。装了就是一句话入口。

**Q: 会不会动我的数据？**
A: Step 1/2 纯只读。Step 3 执行你选定的流程才会写文件/跑命令，且 playbook 里标注了红线（同步产物禁手编、进度文件禁手编）。

**Q: 换了 AI CLI 还能用吗？**
A: 能。skill 就是 markdown 指令 + 参考文档，任何支持 skills 目录约定的客户端都能装（`--dest` 指过去）。
