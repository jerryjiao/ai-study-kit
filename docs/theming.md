# 主题显示配置（theme-config.json）

题站的一切呈现层定制——首页排序、显示名、子主题展开、来源徽标、核心/拓展层、考点深度徽标、卡片配色——都住在主题包的 `theme-config.json` 里，**不需要动任何应用代码**。完整示例见 [`examples/dev-intro/theme-config.json`](../examples/dev-intro/theme-config.json)。

## 管线

`sync-examples.mjs` 在 dev/build/test 前把 `examples/<theme>/theme-config.json` 拷到 `apps/quiz-app/src/data/theme-config.json`（同步产物，禁止手编，改了会被覆盖）。**未提供本文件的主题会同步出一个空配置 `{}`**，应用按回退语义运行——所以这个文件是完全可选的。

## 字段表（全部可省略，缺什么回退什么）

| 字段 | 类型 | 作用 | 无配置时的回退 |
|---|---|---|---|
| `topicLabels` | `{topicId: 显示名}` | 大类的界面显示名（topic id 是数据层稳定标识，展示统一走它） | 原样显示 topic id |
| `topicOrder` | `[topicId]` | 大类学习顺序（由浅入深）；未列出的 topic 落末尾按字母序 | 全部按字母序 |
| `subtopics` | `{topicId: [subtopic全名]}` | 考点深度序的子主题表，配置了的大类在首页展开二级导航 | 不展开（大类整卡一条） |
| `sourceLabels` | `{source: 短名}` | 答题卡来源徽标的显示名 | 原样显示 source |
| `sourceLayers` | `{source: 核心\|拓展}` | 来源→学习优先级层的映射 | 无层概念（`layerOf` 返回 null） |
| `layerTopics` | `[topicId]` | 哪些大类有层概念（练习页层 chips / 首页深度徽标的作用域） | 无任何主题有层 |
| `lessonTopics` | `{"<lesson文件名>": topicId}` | 课 → 题集直达映射：课程页学完一课后「去刷这课的题」按钮按它跳到对应题集 | 文件名（去 `.html`）恰与题库 topic 同名时直连，否则不渲染跳转 |
| `epDepth` | `{考点base名: 掌握\|理解\|了解}` | 子主题的考点深度徽标；查表前先剥分块后缀（`线性表一`→`线性表`） | 无徽标 |
| `topicStyles` | `{topicId: {cls, childCls, icon}}` | 大类卡片配色（Tailwind class 串）+ 图标名 | 默认样式 |

## 回退语义（设计原则）

配置是**纯增量**的：每个字段独立生效，任何缺失都有定义好的回退，绝不因配置不全而报错。核心口径是**计划内**（主进度）——`isPlanned = 来源层 ≠ 拓展`：无 `sourceLayers` 配置的主题所有题自动算计划内，进度分母/首页计数/随机池口径不变。

## 图标名

`topicStyles.icon` 写字符串名（如 `"Boxes"`、`"Layers"`），应用侧经 `apps/quiz-app/src/lib/themeConfig.ts` 的白名单映射表解析到 lucide 组件——配置是数据、组件是代码，映射表是桥。未收录的名字回退 `Boxes`；要扩充可选图标就改那张表（受 tree-shaking 约束只打包白名单内组件）。

## 子主题命名约定

`subtopic` 全名 = `{topicId}·{显示名}{中文数字分块后缀}`，如 `git-basics·工作流`、出题量大拆块时 `xxx·线性表一` / `xxx·线性表二`。前缀必须是完整的 ASCII 标识符（`[a-z0-9-]`），分隔符支持 `·` `:` `-` 三种历史写法——界面剥前缀时以 ASCII 标识符为界，避免把 topic 名自身的连字符误当分隔符。同 base 的分块按中文序号排序（一<二<…<十一，查表法，`localeCompare` 对中文数字不可靠）。

## 层（核心/拓展）

层是题目的**学习优先级**属性，由 source 派生，呈现为答题卡徽标 + 练习页筛选 chip，不占导航维度。设置面板的「拓展加练」开关（缺省关）关着时层概念整体不存在：chips 不渲染、`&layer=` 直达失效、一切列表只含计划内题；开着时回到「默认核心、chip 三档（全部/核心/拓展）」行为。计划内为 0、拓展>0 的子主题块是「纯拓展块」——开关关时整块隐身，开时显示灰色「拓展 N」徽标。
