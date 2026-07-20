# Mission: dev-intro 示例学习包

> 这是 ai-study-kit 的一个**虚构示例**，目的是让 fork 仓库的人 5 分钟内看懂：
> 用 AI 辅助学习工具完整闭环（课程讲解 + 闪卡 + 刷题 + 错题精讲）长什么样。

## 学习主题

**git + Linux 基础入门**——开发者每天都用的工具。选这个主题有三个原因：

1. **任何 fork 这个仓库的人都能看懂**——不依赖特定领域知识。
2. **与任何特定专业领域零耦合**——纯通用工具，保证示例本身不暗示任何具体学习领域，方便所有读者复用。
3. **难度入门**——`git init`/`git add`/`ls -l`/`chmod 755` 这种基础程度，演示价值最高。

## 学习闭环（四对齐示例）

这个示例同时演示了 ai-study-kit 的**四对齐原则**——同一个知识点，在四个产物里都覆盖到：

| 产物 | 文件 | 演示知识点 |
|------|------|-----------|
| 课程 (lessons/) | `git-basics.html`、`linux-basics.html` | 三区流转、目录树、chmod 三位权限 |
| 题 (questions.json) | 10 道（GIT-001~007、LNX-001~003） | 与课程内容一一对齐 |
| 闪卡 (flashcards.json) | 4 张 FC-DEV-01~04 | git 三区、chmod 数字、绝对/相对路径 |
| 错题精讲 (wrong-questions/) | 1 簇（`git reset` vs `git revert`） | 易混点深度展开 |

## 给 fork 者的话

看完这个示例，你应该能回答：
- ai-study-kit 的"课/题/卡/错题"四个产物分别长什么样？
- 它们怎么围绕同一个知识点对齐？
- 我要换成自己的主题（比如 K8s、React、英文单词、考研政治），需要改哪些文件？

答案在仓库根 `docs/methodology.md` 和 `docs/four-alignment.md`。
