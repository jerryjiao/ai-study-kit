# ai-study-kit — 学习教练 skill 套件

/ask-coach 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、陪练记录、考期、AI 配置、kit 版本漂移），推荐下一步该学什么、做什么——初始化、开新主题、陪练教学、考前冲刺、每日刷题、错题串讲、播客、改内容、校验、部署、升级。 Study coach for ai-study-kit: scans your learning state and tells you what to do next.

## 命令（五件）

| 命令 | 直入什么 |
|------|----------|
| `/ask-coach` | 主入口：探测学习状态 → 快照+推荐 → 带执行（其余四件都是它的直入快捷方式） |
| `/study-coach` | 陪练直入：坐下就学（F10 陪练教学） |
| `/study-doctor` | 一站式体检：四门校验 + 环境探测 |
| `/study-recap` | 错题串讲直入（F4） |
| `/study-podcast` | 播客直入（F5） |

部分宿主会给命令加插件命名空间前缀，如 zcode 下敲 `/ai-study-kit:ask-coach`（薄命令同理：`/ai-study-kit:study-coach` 等）。

## 安装 / 更新 / 文档

- 安装协议（Claude Code / zcode / Codex / 手动通用）：https://aistudykit.dev/install.md
- 官网 https://aistudykit.dev · 仓库 https://github.com/jerryjiao/ai-study-kit · 更新日志 [CHANGELOG.md](./CHANGELOG.md)
