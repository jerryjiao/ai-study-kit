---
title: 快速上手
description: '按工具选一条安装路，装完对 AI 说「我想学 X」，教练带你从建站、产题到部署'
---

装个插件，对 AI 说「我想学 X」，你的学习站就开起来了。下面按工具选一条路，每条都是实测可跑的命令。

## 按工具安装

不同工具安装方式不同，多个工具要各装一份。插件自带完整答题站源码，装完不用 clone 本仓库。

**Claude Code**（两步，都要跑）

```text
/plugin marketplace add https://github.com/jerryjiao/ai-study-kit
/plugin install ai-study-kit@ai-study-kit
```

**zcode** 打开插件市集，添加仓库 `https://github.com/jerryjiao/ai-study-kit`，安装 ai-study-kit。

**Codex**（两步，都要跑）

```text
codex plugin marketplace add jerryjiao/ai-study-kit
codex plugin add ai-study-kit@ai-study-kit
```

**其他 AI CLI**（认 skills 目录的都行）用仓库自带的安装脚本

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm run skill:install   # 装到 ~/.agents/skills/
# 或装到指定目录：bash scripts/install-skill.sh --dest ~/.claude/skills
```

**Cursor、Copilot 等**经 Agent Plugins 标准清单支持，装法见各工具的插件文档。

## 装完会发生什么

对 AI 说「我想学 X」，或敲 [`/ask-coach`](/ai/ai-study-kit/)。教练先扫描学习状态（主题、进度、错题、到期闪卡、AI 配置），推荐现在最该做的一件事，然后带你执行。从初始化项目、开新主题、产题产课，到错题串讲和部署上线，十三个流程全覆盖。

学习项目（答题站 + 你的主题包）住你自己的目录，与插件升级互不干扰；插件更新后旧项目会收到版本提示，升级是一趟保数据的短流程。

项目不带现成题库，题目可以是收集的真题，也可以让 AI agent 替你产。装好 `/ask-coach` 后说一句「帮我给这个主题产一套题库」，流程见[换成你的主题](/your-theme/)的「让 AI agent 替你产题」。

不想装任何东西？可以先[在线试用 demo](/demo/)，功能完整，进度只存在你的浏览器里。

## 开发者·本地跑 demo（clone 路线）

想在本地把 demo 跑起来看代码，照下面四条命令做。

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
| **答题** | 10 道 git/Linux 题（单选/多选/判断），提交即判分，多选要全对，答错进错题本，答对显示解析 |
| **闪卡** | 4 张 SM-2 间隔重复卡，按 again / hard / good / easy 评分，算法与 Anki 兼容 |
| **课程** | 2 节自包含 HTML 课程（git 三区、Linux 目录与权限），带 ASCII 示意图和提示框 |

> 这只是个 demo。dev-intro 主题的内容你后面会全部换掉，换成你自己在学的东西，见[换成你的主题](/your-theme/)。

## 不用 AI 也能用

三个 AI CLI 是增量能力。只想要答题站和闪卡工具的话，不用配 LLM，也不用跑 CLI，`pnpm dev` 就够用。

想再进一步，可以看这几篇。

- [换成你的主题](/your-theme/)，30 分钟把 demo 变成你在学的东西
- [学习方法论](/method/methodology/)，讲为什么是「大纲 → 材料 → 做题」
- [AI CLI 指南](/ai/ai-cli/)，让 AI 帮你产课程、错题精讲和播客
