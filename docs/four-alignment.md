# Four-Alignment Principle · 四对齐原则

> **EN**: When learning any topic, four artifacts must stay aligned around the same knowledge points: the course (explanation), the quiz (practice), the flashcards (memory anchors), and the wrong-question deep-dive (mistake forensics). Any drift between them creates silent learning gaps.

学任何主题，四个产物必须围绕**同一套知识点**对齐：课程（讲解）、题目（练习）、闪卡（记忆锚点）、错题精讲（错点深挖）。它们是仓库里四份独立的文件，改任何一份，另外三份不会跟着动——不对齐不会报错，只会留下隐性学习漏洞：刷到没学过的题、学完没题练、该记的概念没有卡。

---

## 四个产物分别是什么

| # | 产物 | 文件位置 | 干什么 |
|---|------|---------|--------|
| 1 | **课程** | `examples/<theme>/lessons/*.html` | 系统讲概念，建立心智模型 |
| 2 | **题目** | `examples/<theme>/questions.json` | 练习验证，判分收集错题 |
| 3 | **闪卡** | `examples/<theme>/flashcards.json` | 核心概念做间隔重复记忆锚 |
| 4 | **错题精讲** | `examples/<theme>/wrong-questions/cluster-*.html` | 高频错点深度展开 |

四个产物不是孤立的，围绕同一套考点协同：课程讲一个概念，题考这个概念，闪卡帮记这个概念，错题精讲在你做错时把这个概念的易混点深挖。

---

## 为什么必须对齐（踩过的两个坑）

这套原则源自真实踩坑，不是理论上的洁癖。

### 坑 1：题有课没讲（题 → 课 漏洞）

某次题库里 20 道考"半加器"的题，对应课程却完全没讲这个概念。刷到这种题一脸懵，根本不知道在考什么。

- **根因**：题按模块机械分组，没核查课程是否覆盖。
- **修复**：课程补讲缺失概念，并加自动化校验（见下）。

### 坑 2：课讲完没题刷（课 → 题 漏洞）

课程重点讲了一个核心方法论，相关题却没跟上——学完没题练，做题的又没学过。

- **根因**：题的分组标签没按课程内容拆。
- **修复**：题的 `topic` 分组（及可选的 `day` 日程标签）跟课程对齐，加双向校验。

---

## 三个方向的对齐校验

对齐要双向核对，外加一层闪卡覆盖。

### 方向 1：题 → 课（题考的考点，课程必须讲）

提取题干里的高频考点词（出现 ≥3 次的概念），逐个核查课程 HTML 的覆盖度（去空格后的原文命中次数）：

- **≥3 次**：✓ 覆盖
- **1-2 次**：△ 略提，要补讲
- **0 次**：✗ 未讲，必须补

### 方向 2：课 → 题（课讲的考点，题必须练到）

提取课程 HTML 里的核心概念，核查题库里有没有对应练习：

- 课里重点讲、题库里 0 道相关题 → 缺练习，按考点补题
- 相关题散落在别的分组 → 调整题的 `topic`（或 `day` 标签），让学与练在同一分组内闭合

### 方向 3：闪卡覆盖

课程核心概念（≥3 次的考点词）每个应有 ≥1 张闪卡覆盖（闪卡 front / back 命中）：

- 课程讲的概念没闪卡 → 记忆锚点缺失
- 闪卡讲的概念课程没提 → 闪卡脱节，要么补课要么删卡

---

## 什么时候跑校验

任何一处产物变动后必跑：

1. **生成新课程后**——课程覆盖了哪些考点？这些考点有题吗？闪卡覆盖了吗？
2. **改题的 topic / day 分组后**——重新分组可能造成课程与题脱节。
3. **改 flashcards.json 后**——闪卡增删，可能造成与课程脱节。
4. **grill CLI 跑完一批错题精讲后**——错题考点必须能追溯到对应课程（错题 → 课 反向验证）。

---

## dev-intro 示例的四对齐

打开 `examples/dev-intro/` 看一个完整的四对齐示例：

| 知识点 | 课程 | 题 | 闪卡 | 错题精讲 |
|--------|------|-----|------|----------|
| **git 三区** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git reset vs revert** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `wrong-questions/cluster-01-git-reset-vs-revert.html` |
| **chmod 权限** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | — |
| **相对路径 `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

不是每个知识点都必须四个产物全覆盖，但**高频错点**必须四产物齐全（如 git reset vs revert）——这是 grill CLI 的核心产出场景。

---

## 进一步阅读

- [`bidirectional-check.md`](./bidirectional-check.md) —— 自动化校验脚本，把上面两个方向写成 Python 代码
- [`methodology.md`](./methodology.md) —— 完整方法论框架
- [`ai-cli-guide.md`](./ai-cli-guide.md) —— 如何用 teach / grill CLI 产出对齐内容
