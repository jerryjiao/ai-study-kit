# Study Coach · `/study-coach` 学习教练指令

ai-study-kit 的功能多——答题站、课程、闪卡、错题串讲、播客、部署，但对学习者来说这反而成了负担：**今天到底该干嘛？** `/study-coach` 就是回答这个问题的。它是仓库自带的路由 skill：装一次，每次学习从它开始，由它扫状态、给推荐、带你执行，不用背工具链。

---

## 安装

skill 源文件在仓库 `skills/study-coach/`。装进你的 AI CLI（zcode / 任何认 `~/.agents/skills/` 的客户端）：

```bash
# 在 ai-study-kit 仓库根目录
pnpm run skill:install          # 复制安装到 ~/.agents/skills/study-coach
pnpm run skill:install -- --link   # 符号链接版（随仓库 git pull 自动更新）

# 其他客户端：自定义目标目录
bash scripts/install-skill.sh --dest ~/.claude/skills

# 卸载
pnpm run skill:uninstall
```

装完重启 CLI（或开新会话），输入 `/study-coach` 即可。不装也能用：直接让 agent 读 `skills/study-coach/SKILL.md` 照做。

---

## 它怎么工作

每次调用固定三步：

1. **探测状态**（只读，≤1 分钟）——主题、题/卡/课/串讲库存、答题进度、未毕业错题、到期闪卡、AI 配置、后端在线与否。
2. **汇报 + 推荐**——一张快照表 + 一个带理由的推荐动作 + 编号菜单。
3. **带你执行**——选定后按 `skills/study-coach/references/flows.md` 的 playbook 逐步做，做完对照「完成标志」验收。

没有明确意图时，推荐按这个优先级（即项目方法论「先复习 → 再建概念 → 后做题 → 深挖错题」的执行化）：

| 顺序 | 条件 | 推荐 |
|------|------|------|
| 1 | 仓库还没有 | 初始化项目 |
| 2 | 还在用 dev-intro 演示主题 | 开你自己的新主题 |
| 3 | 有到期闪卡 | 先复习（记忆在衰退） |
| 4 | 未毕业错题 ≥ 3 | 错题串讲（LLM 聚类深挖） |
| 5 | 有没学过的课 + 未答题 | 先学课再刷对应题 |
| 6 | 题全答完、正确率高 | 做播客被动巩固 / 开新主题 |
| 7 | 题全答完、正确率低 | 串讲 + 补课 |

## 九个流程

| # | 流程 | 什么时候用 | 关键命令 |
|---|------|-----------|---------|
| F1 | 初始化项目 | 从零跑起 demo | `pnpm install && pnpm dev` |
| F2 | 开新主题 | 把想学的东西变成完整闭环 | 大纲+考点排布表 → 材料 → `teach-generate` → 照表产题/卡 → 切主题 → 校验 |
| F3 | 每日学习 | 「今天学什么」 | 到期闪卡 → 学课 → 刷题 → 错题重练 |
| F4 | 错题串讲 | 错题攒 ≥3 道 | `pnpm run ai:grill -- --theme <t>` |
| F5 | 做播客 | 通勤/运动巩固 | `pnpm run ai:podcast -- --input <file>` |
| F6 | 产课/加课 | 新增课程讲解 | `pnpm run ai:teach -- --theme <t>` |
| F7 | 改内容 | 改题/课/卡/日程 | 四对齐操作链 + 校验 |
| F8 | 校验发布 | 发布前质量门 | `pnpm run scan` / `test` / `build` + `scripts/bidirectional-check.py` |
| F9 | 部署 | 上线云服务器 | pm2（从 `apps/quiz-app/` 启动） |

外加**诊断**入口：进度不同步、课程 404、CLI 报配置错、scan 命中……症状 → 根因 → 处置的速查表。

---

## 设计说明

- **路由式 skill，不是又一个 CLI**：它不引入新运行时，只是把「读状态 → 推荐 → 执行已有命令/流程」编码成 agent 可循的指令。所有底层能力都是仓库既有的（三个 AI CLI、同步脚本、校验门）。
- **状态先于建议**：教练禁止凭感觉推荐——每个快照字段都有探测命令（`skills/study-coach/references/state.md`），进度统计口径与 `apps/quiz-app/src/lib/progress.ts` 完全一致（墓碑过滤、随机沙盒不进主进度、错题毕业阈值、SRS 到期）。
- **方法论内嵌**：推荐算法的顺序就是 [`methodology.md`](./methodology.md) 的「大纲 → 材料 → 做题」落地；F2 流程强制先写 MISSION（含考点排布表）/RESOURCES 再允许产课产题——产题不是裸写 JSON，是照排布表逐考点直产 + 三门（qa/scan/四对齐）全绿收口。

## 扩展

加一个新流程：在 `skills/study-coach/references/flows.md` 加一节 playbook（目的/前置/步骤/完成标志），并在 `SKILL.md` 的菜单和意图路由表里加一行。改完 `pnpm run skill:install` 重新分发。

## FAQ

**Q: 必须装吗？**
A: 不装也行，但每次都要自己想「下一步干嘛」。装了就是一句话入口。

**Q: 会不会动我的数据？**
A: Step 1/2 纯只读。Step 3 执行你选定的流程才会写文件/跑命令，且 playbook 里标注了红线（同步产物禁手编、进度文件禁手编）。

**Q: 换了 AI CLI 还能用吗？**
A: 能。skill 就是 markdown 指令 + 参考文档，任何支持 skills 目录约定的客户端都能装（`--dest` 指过去）。
