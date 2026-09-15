---
title: 换成你的主题
description: 30 分钟把 dev-intro demo 改成你在学的主题，核心只动 examples/
---

以学 **React 基础** 为例。核心流程（第 1 到第 4 步）只动 `examples/` 下的文件加一个环境变量；可选的 Step 5 也是改主题目录里的文件，全程不用写组件逻辑。

## Step 1 · 复制主题目录（1 分钟）

```bash
cp -r examples/dev-intro examples/react-basics
```

## Step 2 · 改题库（10 分钟）

编辑 `examples/react-basics/questions.json`，把 git/Linux 题换成你的 React 题。一道题的结构如下。不想手写 JSON？拉到本页末尾看[「让 AI agent 替你产题」](#让-ai-agent-替你产题可选)。

```json
{
  "id": "R-001",                      // 全局唯一稳定 id（进度按它存）
  "type": "single",                    // single | multi | judge
  "source": "react-basics",            // 题源标识
  "topic": "react-basics",             // 主题分类（首页按它分组）
  "question": "React 中 useState 返回什么？",
  "options": {
    "A": "当前 state 的值",
    "B": "更新 state 的函数",
    "C": "一个数组 [state, setState]",
    "D": "一个对象 { state, setState }"
  },
  "answer": ["C"],
  "analysis": "useState 返回一个二元数组，当前状态值加更新函数，通常用数组解构 const [count, setCount] = useState(0)。"
}
```

完整字段见 [`apps/quiz-app/src/types.ts`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/src/types.ts) 的 `Question` 接口。

## Step 3 · 改闪卡（5 分钟）

编辑 `examples/react-basics/flashcards.json`，一张卡的结构如下。

```json
{
  "id": "FC-R-01",
  "front": "useState 的返回值结构？",
  "back": "返回 [state, setState] 二元数组。\n\n用法：const [count, setCount] = useState(0)。",
  "source": "react-basics",
  "topic": "react-basics"
}
```

## Step 4 · 切换主题（1 分钟）

```bash
EXAMPLE_THEME=react-basics pnpm dev
# 浏览器刷新，你的 React 题已经进答题站了
```

## Step 5 · 配课程和首页呈现（可选，10 分钟）

- **课程**。把 `examples/react-basics/lessons/*.html` 改成你的，可以用 AI 帮你产，见 [AI CLI 指南](/ai/ai-cli/)。课程入口自动跟随激活主题（`EXAMPLE_THEME`），无需改代码。
- **首页呈现**。编辑 `examples/react-basics/theme-config.json`（可选文件），控制首页分组顺序（`topicOrder`）、主题中文显示名（`topicLabels`）、考点子主题展开（`subtopics`）等。不配置则优雅回退，显示原始 topic id、按字母序、不展开子主题。完整字段表见 [主题呈现配置](https://github.com/jerryjiao/ai-study-kit/blob/main/docs/theming.md)。

## Step 6 · 校验（2 分钟）

```bash
pnpm run scan       # 品牌扫描（0 hits 才算干净）
pnpm test           # 全部测试必须过
pnpm run build      # 构建必须成功
python3 scripts/bidirectional-check.py examples/react-basics/  # 四对齐校验（读 MISSION 考点排布表对账）
```

到这里就完成了。整个过程不用写 React 组件代码，改的是 JSON 和 HTML（可选步骤加一个主题配置文件）。

## 让 AI agent 替你产题（可选）

Steps 2-3 的题和卡可以不手写。装好 [`/ask-coach`](/ai/ai-study-kit/) 后直接说「帮我给 react-basics 产一套题库」，agent 走三步。

1. 先在 MISSION.md 的**考点排布表**和你对齐（考什么、考多深、每种题型几道、配几张卡）；
2. 你确认后照表逐考点产题、产卡（题目带 `examPoint` 考点标注和 `day` 日程标签）；
3. 自动跑 `qa` / `scan` / 四对齐三门质量校验，全绿才交付。

手工路径（本页 Steps 1-6）永远是主路；两条路的产物同构，排布表就是人机之间的契约。

改完内容记得跑[四对齐校验](/maintain/bidirectional-check/)，课程、题目、闪卡、错题精讲要围绕同一套考点对齐。
