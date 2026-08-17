---
title: 快速上手
description: 五分钟把 demo 跑起来，看到答题、闪卡、课程分别长什么样
---

## 这是给谁用的

| 你在做什么 | 合不合适 |
|------|---------|
| 🧑‍💻 开发者学新技术，React、K8s、Rust 这类 | ✅ 把官方文档要点抽成题，刷题加闪卡巩固 |
| 📚 学生复习，考研或资格证 | ✅ 真题库加 AI 错题精讲 |
| 🎯 准备面试 | ✅ 自己出题，AI 帮你产课和错题串讲 |
| 🗂️ 学任何有考点的东西，合规、流程、术语 | ✅ 能拆成问答就能学 |
| ❌ 只想要一套现成题库 | ❌ 项目是脚手架，不含真题，题目自己出或用 AI 生成 |

项目不带现成题库，题目可以是收集的真题，也可以让 AI 出。有了题目，课程、闪卡、错题本和复习调度由它补齐。

不想 clone，可以先[在线试玩 demo](/ai-study-kit/demo/)，功能完整，进度只存在你的浏览器里。

## 5 分钟跑起来看 demo

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# 浏览器打开 http://localhost:5173
```

启动后看到的是 dev-intro 示例主题，git 和 Linux 基础，三个 tab 分别如下。

| 顶栏 tab | 你能看到什么 |
|---------|-------------|
| **答题** | 10 道 git/Linux 题（单选/多选/判断），点选项即判分，答错进错题本，答对显示解析 |
| **闪卡** | 4 张 SM-2 间隔重复卡，按 again / hard / good / easy 评分，算法与 Anki 兼容 |
| **课程** | 2 节自包含 HTML 课程（git 三区、Linux 目录与权限），带 ASCII 示意图和提示框 |

> 这只是个 demo。dev-intro 主题的内容你后面会全部换掉，换成你自己在学的东西，见[换成你的主题](/ai-study-kit/your-theme/)。

## 不用 AI 也能用

三个 AI CLI 是增量能力。只想要答题站和闪卡工具的话，不用配 LLM，也不用跑 CLI，`pnpm dev` 就够用。

想再进一步，可以看这几篇。

- [换成你的主题](/ai-study-kit/your-theme/)，30 分钟把 demo 变成你在学的东西
- [学习方法论](/ai-study-kit/method/methodology/)，讲为什么是「大纲 → 材料 → 做题」
- [AI CLI 指南](/ai-study-kit/ai/ai-cli/)，让 AI 帮你产课程、错题精讲和播客
