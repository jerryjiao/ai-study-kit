# Four-Alignment Principle · 四对齐原则

> **EN**: When learning any topic, four artifacts must stay aligned around the same knowledge points: the course (explanation), the quiz (practice), the flashcards (memory anchors), and the wrong-question record (deep-dive on mistakes). Any drift between them creates silent learning gaps.
>
> **中文**：学任何主题，下面四个产物必须围绕<strong>同一套知识点</strong>对齐——课程（讲解）、题目（练习）、闪卡（记忆锚点）、错题精讲（错点深挖）。任何一个产物跟其他三个漂移，都会产生隐性学习漏洞。

---

## 四个产物分别是什么

| # | 产物 | 文件位置 | 干什么 |
|---|------|---------|--------|
| 1 | **课程** | `examples/<theme>/lessons/*.html` | 系统讲概念，建立心智模型 |
| 2 | **题目** | `examples/<theme>/questions.json` | 练习验证，判分收集错题 |
| 3 | **闪卡** | `examples/<theme>/flashcards.json` | 核心概念做间隔重复记忆锚 |
| 4 | **错题精讲** | `examples/<theme>/wrong-questions/cluster-*.html` | 高频错点深度展开 |

四个产物不是孤立的——它们围绕<strong>同一套考点</strong>协同。课程讲一个概念，题考这个概念，闪卡帮记这个概念，错题精讲在你做错时把这个概念的易混点深挖。

---

## 为什么必须对齐（踩过的两个坑）

这套原则源自真实踩坑，不是理论上的洁癖：

### 坑 1：题有课没讲（题 → 课 漏洞）

某天题目里有 20 道考"半加器"的题，但对应课程完全没讲这个概念（只一笔带过）。用户刷到这种题一脸懵，根本不知道在考什么。

**根因**：题按"模块"机械分配到某天，没核查课程内容是否覆盖。
**修复**：课程补讲缺失概念，并加双向校验（见下）。

### 坑 2：课讲完没题刷（课 → 题 漏洞）

某天课程讲了一个核心方法论，但所有相关题都被分到另一天。学完没题刷、或刷到没学过的题。

**根因**：题的"day 标签"没按课程拆。
**修复**：题的 day 标签必须按课程内容拆，加双向校验。

---

## 三个方向的对齐校验

**对齐不是单方向，是双向 + 覆盖三层**：

### 方向 1：题 → 课（题排到这天，课必须讲）

提取某天所有题的高频考点词（出现 ≥3 次的概念），逐个核查对应课程 HTML 里覆盖度：

- **覆盖度 = 课程原文命中次数**（去空格后）
- **≥3 次**：✓ 覆盖
- **1-2 次**：△ 略提，要补讲
- **0 次**：✗ 未讲，必须补

### 方向 2：课 → 题（课讲的考点，题必须排到这天）

提取课程 HTML 里的核心概念，核查该概念是否出现在该天的题里：

- 课里重点讲但该天题数 = 0 → 题排错天，去 moduleMap / day 标签查
- 课里讲但相关题散落别的天 → 考虑迁移题或加交叉链接

### 方向 3：闪卡覆盖

该天课程的核心概念（≥3 次的考点词），每个应有 ≥1 张闪卡覆盖（闪卡 front / back 命中）：

- 课程讲的概念没闪卡 → 记忆锚点缺失
- 闪卡讲的概念课程没提 → 闪卡脱节，要么补课要么删卡

---

## 什么时候跑校验

任何一处产物变动后必跑：

1. **生成新课程后**——课程覆盖了哪些考点？这些考点题排到对应 day 了吗？闪卡有覆盖吗？
2. **改 moduleMap / day 标签后**——题的 day 重新分配，可能造成课程与题脱节。
3. **改 flashcards.json 后**——闪卡增删，可能造成与课程脱节。
4. **用 grill-wrong-questions skill 跑完一批错题学习后**——错题考点必须能追溯到对应 day 的课程（错题 → 课 反向验证）。

---

## dev-intro 示例的四对齐

打开 `examples/dev-intro/` 看一个完整的四对齐示例：

| 知识点 | 课程 | 题 | 闪卡 | 错题精讲 |
|--------|------|-----|------|----------|
| **git 三区** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git reset vs revert** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `wrong-questions/cluster-01-git-reset-vs-revert.html` |
| **chmod 权限** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | — |
| **相对路径 `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

注意：不是每个知识点都必须四个产物全覆盖。但<strong>高频错点</strong>必须四产物齐全（如 git reset vs revert），这是 grill-wrong-questions skill 的核心产出。

---

## 进一步阅读

- [`bidirectional-check.md`](./bidirectional-check.md) —— 自动化校验脚本，把上面三个方向写成 Python 代码
- [`methodology.md`](./methodology.md) —— 完整方法论框架
- [`ai-cli-guide.md`](./ai-cli-guide.md) —— 如何用 teach / grill CLI 产出对齐内容
