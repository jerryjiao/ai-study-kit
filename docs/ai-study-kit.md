# Study Coach · `/ask-coach` 学习教练指令

**简体中文** · [English](ai-study-kit.en.md) · [Español](ai-study-kit.es.md) · [Русский](ai-study-kit.ru.md)

ai-study-kit 的功能多——答题站、课程、闪卡、错题串讲、播客、部署，但对学习者来说这反而成了负担：**今天到底该干嘛？** `/ask-coach` 就是回答这个问题的。它是仓库自带的主入口 skill：装一次，每次学习从它开始，由它扫状态、给推荐、带你执行，不用背工具链。

**命令名即菜单**，插件 ai-study-kit（名字终身不变）装出来共五个命令：`/ask-coach` 是主入口（状态快照 + 推荐 + 带执行，其余流程走路由），另有四个直入薄命令——`/study-coach` 陪练教学（F10）、`/study-doctor` 一键体检、`/study-recap` 错题串讲（F4）、`/study-podcast` 播客（F5）。完整命令面与意图路由表见 `skills/ask-coach/SKILL.md`。

---

## 安装

skill 源文件在仓库 `skills/` 下（单一事实源：`ask-coach` 主入口 + `study-coach` / `study-doctor` / `study-recap` / `study-podcast` 四个薄命令，薄命令共享主入口的 `references/`）。两条安装路径：

**① plugin 市集（zcode / Claude Code，推荐）**：仓库自带 marketplace 清单（`.claude-plugin/marketplace.json`，由 `scripts/sync-plugin.mjs` 从源生成 `plugins/ai-study-kit/`）。在客户端里添加 marketplace `https://github.com/jerryjiao/ai-study-kit`，安装 `ai-study-kit` 插件——后续 skill 更新随市集刷新到达，**无需手动重装**（版本跟仓库 release）。**插件更新后，旧项目打开 `/ask-coach` 会被报出版本差并引导 F13 升级**（保数据、补缺口，见 F13；kit 快照自报版本 `kit-version.json`）。**插件名终身 ai-study-kit，命令名是 ask-coach 一族**（2026-09 v0.13 由 `/ai-study-kit` 更名，市集名不可改所以插件名不动）。

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
3. **带你执行**——选定后按 `skills/ask-coach/references/` 里对应流程的 playbook 逐步做，做完对照「完成标志」验收。

没有明确意图时，推荐按顺序取第一个命中的：环境项（版本漂移）排在学习项之前——功能层先对齐，数据层不受影响；学习类头部是「闪卡 → 冲刺 → 续站」，复习是每天都欠的账，冲刺是考期前一周的收割窗口，续站随时能续。完整 11 条判据与逐条理由见 `skills/ask-coach/SKILL.md` 的「推荐算法」。

## 十三个流程

十三个流程按四条线分组，编号即菜单：**教学线** F10 陪练教学 · F11 考前冲刺 · F12 知识图谱投影；**应试线** F3 每日刷题 · F4 错题串讲 · F5 做播客；**内容线** F2 开新主题 · F6 产课/加课 · F7 改内容；**运维线** F1 初始化项目 · F13 升级 · F8 校验发布 · F9 部署。每个流程的 playbook（目的 / 前置 / 步骤 / 完成标志）在 `skills/ask-coach/references/`——F1–F13 的细则以那里为单一事实源，本文只作导览不复制。

外加**体检**（`/study-doctor`，四门校验 + 环境探测的一站式编排）与**诊断**两个运维入口：前者出过红报告与修复顺序，后者是进度不同步、课程 404、CLI 报配置错、scan 命中……症状 → 根因 → 处置的速查表。

---

## 设计说明

- **路由式 skill，不是又一个 CLI**：它不引入新运行时，只是把「读状态 → 推荐 → 执行已有命令/流程」编码成 agent 可循的指令。所有底层能力都是仓库既有的（三个 AI CLI、同步脚本、校验门）。
- **状态先于建议**：教练禁止凭感觉推荐——每个快照字段都有探测命令（`skills/ask-coach/references/state.md`），进度统计口径与 `apps/quiz-app/src/lib/progress.ts` 完全一致（墓碑过滤、随机沙盒不进主进度、错题毕业阈值、SRS 到期）。
- **方法论内嵌**：推荐算法的顺序就是 [`methodology.md`](./methodology.md) 的「大纲 → 材料 → 做题」落地；F2 流程强制先写 MISSION（含考点排布表）/RESOURCES 再允许产课产题——产题不是裸写 JSON，是照排布表逐考点直产 + 三门（qa/scan/四对齐）全绿收口。

## 扩展

加一个新流程：在 `skills/ask-coach/references/` 的流程 playbook 里加一节（目的/前置/步骤/完成标志），并在 `SKILL.md` 的菜单和意图路由表里加一行。改完 `pnpm run sync:plugin` 重新生成 plugin 产物（手动安装用户另跑 `pnpm run skill:install` 重新分发）。加一个薄命令：在 `skills/` 下建新目录写薄 SKILL.md（十几行、共享 `../ask-coach/references/`），sync-plugin 自动带进产物。

## FAQ

**Q: 必须装吗？**
A: 不装也行，但每次都要自己想「下一步干嘛」。装了就是一句话入口。

**Q: 会不会动我的数据？**
A: Step 1/2 纯只读。Step 3 执行你选定的流程才会写文件/跑命令，且 playbook 里标注了红线（同步产物禁手编、进度文件禁手编）。

**Q: 换了 AI CLI 还能用吗？**
A: 能。skill 就是 markdown 指令 + 参考文档，任何支持 skills 目录约定的客户端都能装（`--dest` 指过去）。
