# 0003 · 主题呈现配置化（theme-config.json）

日期：2026-08-25
状态：已接受

## 背景

v0.5 前，题站的呈现层定制散在应用代码里：`src/lib/topicOrder.ts` 硬编码大类顺序与子主题表、`Home.tsx` 硬编码各主题的配色与图标。换主题 = 改源码再构建（AGENTS.md 旧说法：「首页分组可选改 topicOrder.ts」）。对单人自用尚可，但与「examples/<theme>/ 是主题单一事实来源」的架构承诺冲突——主题定制一半在数据、一半在代码，无法整体迁移或分享。

## 决策

主题包内新增**可选**的 `theme-config.json`，承载全部呈现层定制：`topicLabels`（显示名）、`topicOrder`（顺序）、`subtopics`（子主题展开）、`sourceLabels`（来源徽标）、`sourceLayers` + `layerTopics`（学习优先级层及其作用域）、`epDepth`（深度徽标）、`topicStyles`（配色+图标名）。应用侧（`lib/themeConfig.ts` + `lib/topicOrder.ts`）只持机制不持数据；`sync-examples.mjs` 把配置拷到 `src/data/`，未提供则写 `{}`。

## 回退语义（本决策的核心承诺）

全字段可选、缺什么回退什么：无 labels 显示原始 id、无 order 按字母序、无 subtopics 不展开、无 layers 无层概念且**全部题算计划内**（`isPlanned = source 层 ≠ 拓展`）、无 styles 默认样式。配置是纯增量，任何主题不写配置也能完整运行。

## 备选方案

- **维持代码内硬编码**（现状）：换主题改源码，主题不可迁移——被否。
- **完整主题 schema（把 questions/flashcards 也收进一个大配置）**：数据与呈现职责混杂，题库文件的单一职责（schema 见 types.ts）被打破——被否。theme-config 只管呈现，不碰题数据。
- **`layerTopics` 按「配置了 subtopics 的大类」自动派生**：模考类主题有子主题（按场次分卷）却不参与层，派生规则必错——被否，改显式清单。

## 后果

- 换主题零代码改动；主题包可以整体拷贝分享（题库+课程+配置）。
- 图标是配置里的字符串名，经 `themeConfig.ts` 的白名单映射表解析到 lucide 组件（tree-shaking 只打包白名单）——扩充可选图标需要改一次代码，可接受。
- 为「主题包住仓库外」（外部主题目录/plugin 形态）扫清了最大障碍：应用不再假设主题数据在仓库内代码里。
