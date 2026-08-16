---
title: 换成你的主题
description: 30 分钟把 dev-intro demo 改成你在学的主题，全程只动 examples/
---

以学 **React 基础** 为例。全程只动 `examples/` 下的文件，**不动 apps/quiz-app/ 代码**。

## Step 1 · 复制主题目录（1 分钟）

```bash
cp -r examples/dev-intro examples/react-basics
```

## Step 2 · 改题库（10 分钟）

编辑 `examples/react-basics/questions.json`——把 git/Linux 题换成你的 React 题。Schema 很简单：

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
  "analysis": "useState 返回一个二元数组：当前状态值 + 更新函数。通常用数组解构：const [count, setCount] = useState(0)。"
}
```

完整字段见 [`apps/quiz-app/src/types.ts`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/src/types.ts) 的 `Question` 接口。

## Step 3 · 改闪卡（5 分钟）

编辑 `examples/react-basics/flashcards.json`：

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
# 浏览器刷新——你的 React 题已经进答题站了
```

## Step 5 · （可选）配课程和首页分组（10 分钟）

- **课程**：把 `examples/react-basics/lessons/*.html` 改成你的（可以用 AI 帮你产，见 [AI CLI 指南](/ai-study-kit/ai/ai-cli/)）。同时改 `apps/quiz-app/src/pages/Courses.tsx` 里的 `COURSE_URL` 为 `/study/react-basics/index.html`。
- **首页分组**：改 `apps/quiz-app/src/lib/topicOrder.ts` 的 `TOPIC_ORDER`，把 `'git-basics', 'linux-commands'` 换成你的主题列表。

## Step 6 · 校验（2 分钟）

```bash
pnpm run scan       # 品牌扫描（0 hits 才算干净）
pnpm test           # 全部测试必须过
pnpm run build      # 构建必须成功
python3 scripts/bidirectional-check.py examples/react-basics/  # 四对齐校验
```

**搞定**。整个改造过程**不需要碰任何 React 代码**——只是改 JSON 和 HTML。

改完内容别忘了[四对齐校验](/ai-study-kit/maintain/bidirectional-check/)：课程、题目、闪卡、错题精讲要围绕同一套考点对齐。
