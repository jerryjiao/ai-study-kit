# Changelog

本仓库的版本日志。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
