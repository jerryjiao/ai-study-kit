# Flow Playbooks · 流程手册

> Step 3 按编号取用。每个流程：**目的 → 前置 → 步骤 → 完成标志**。
> 路径基准：有仓库时相对仓库根；插件安装用户（无仓库）相对**用户学习项目根**（F1 建的 `<project>/`）。改文件前先看 SKILL.md 硬红线。
> 文中 `examples/<theme>/` 泛指**主题源目录**——主题住外部主题包（F2 第 4 步二选一）时，把路径换成该包目录。
> 公共约定：跨流程交棒只写编号（如「转 F13」），按下表定位文件；高频大流程已拆独立文件（内容只搬不删，与拆分时原 flows.md 的差异仅限同期修复与拆分直链，勿拿 HEAD 直接对拍），低频小流程留在本文件。

## 流程 → 文件（目录，不写行号——行号易漂移）

| 节名 | 住哪 |
|------|------|
| F1 初始化 · F2 开新主题 · F3 每日学习 | 本文件 |
| F4 错题串讲 | [`flows/F4.md`](flows/F4.md) |
| F5 做播客 | [`flows/F5.md`](flows/F5.md) |
| F6 产课 / 加课 | [`flows/F6.md`](flows/F6.md) |
| F7 改内容 · F8 校验发布 · F9 部署 | 本文件 |
| F10 陪练教学 | [`flows/F10.md`](flows/F10.md) |
| F11 考前冲刺 | [`flows/F11.md`](flows/F11.md) |
| F12 知识图谱投影 · F13 升级 | 本文件 |
| 体检 · 诊断 | 本文件 |

配套单源（不在本文件）：落盘契约一/契约二（COACH.md 与学习记录格式、口头答题流水写入口径）在 [`../../../references/contracts.md`](../../../references/contracts.md)——F4 产档案、F10 落盘、F11 收割、state.md §7 探测共用；陪练教学法在 [`coach.md`](coach.md)——F10 用。

---

## F1 · 初始化项目（bootstrap，零 clone）

**目的**：从零到「浏览器里看到答题站」。**用户不需要 GitHub、不需要 clone 仓库**——插件自带完整可构建快照。

**定位插件里的快照**：本文件位于 `<插件根>/skills/ask-coach/references/flows.md`，向上三级即插件根，快照在 `<插件根>/kit/`（zcode/Claude 安装的插件目录都能这样反推；找不到就问用户插件装在哪或改走末尾的 clone 备选路线）。

**第 0 步 · 先探测再分支（写死，存量项目绝不盲拷）**：

```bash
# <项目> = 用户学习项目根（问一次，默认 ~/study-kit/）
test -d <项目>/kit && echo "kit=exists" || echo "kit=clean"
cat <项目>/kit/kit-version.json 2>/dev/null || echo "version=unknown"
```

- **kit 目录不存在（干净目录）** → 走下方从零初始化。
- **kit 目录已存在**——有版本文件且落后于 `<插件根>/kit/kit-version.json`，或无版本文件（= 版本未知，按最老处理）→ **不执行任何拷贝**，报两处版本差（用户项目 vS → 插件 vT）并**转 F13 升级**。为什么写死：无条件 `cp -r` 拷在已存在目录上会把新快照嵌套成 `kit/kit`，存量项目直接搞乱——误被路由进 F1 的老项目正是靠这道分支被认出来（ADR-0006）。

**步骤**（仅干净目录）：

1. 选定用户学习项目目录（问一次，默认 `~/study-kit/`），拷出快照并装依赖：

   ```bash
   mkdir -p ~/study-kit && cp -r <插件根>/kit ~/study-kit/kit
   cd ~/study-kit/kit/apps/quiz-app && npm install
   ```

2. 直接起开发服务器（快照带 dev-intro 演示主题，回落链自动生效）：

   ```bash
   npm run dev      # 前端 :5173（/api 代理到 :8787）
   ```

3. 打开 `http://localhost:5173`，确认三个 tab：**答题**、**闪卡**、**课程** 都能渲染。
4. 告诉用户：这是 dev-intro 演示主题——内容全都不会用，学自己的东西走 F2（**用户主题建议建在 `~/study-kit/theme/<name>/`**——外部主题包形态，住 kit 目录外，升级重拷不碰它；构建 `EXAMPLE_THEME=~/study-kit/theme/<name>`）。
5. （备选路线，开发者/贡献者用）clone 仓库：`git clone https://github.com/jerryjiao/ai-study-kit && pnpm install && pnpm dev`。

**完成标志**：三个 tab 都能正常渲染。之后默认接力 F2。

**升级**（插件更新后）：不走本流程——kit 目录已存在，第 0 步会转 F13（保数据升级）。

---

## F2 · 开新主题（new-theme）

**目的**：把用户想学的东西变成完整学习闭环。方法论铁律：**大纲定考什么 → 材料讲概念 → 做题验效果**——顺序不能反，不要上来就刷题。

**步骤**（1-3 各含问用户的确认点，其余直接做）：

1. **定大纲**：问清「学什么主题 + 学到什么程度 + 给谁学」。写成 `examples/<theme>/MISSION.md`（能力大纲，参照 `examples/dev-intro/MISSION.md` 的粒度）。主题名用 kebab-case（如 `react-basics`、`k8s-fundamentals`）。
   - **顺带问一句考期/交付日期**：有就写进 MISSION.md frontmatter `deadline: YYYY-MM-DD`（通用字段，无则整段省略）；用户不想定就不写、不追问——F11 考前冲刺靠它算倒计时，缺了只在快照亮 ⚠，不拦路。
2. **排考点**（产题前的确认点，必须和用户对齐再动笔）：在 MISSION.md 的「## 考点排布表」节排出 `考点id(EP-NN) | 考点 | 深度 | 题型×题量 | day | 闪卡数`：
   - **考点列填核心关键词**——四对齐校验按它做课程/闪卡覆盖与对账，必须是会出现在课程正文和题干里的词（如「暂存区」而不是「git 三区流转的心智模型」）。
   - 深度三档：掌握 / 理解 / 了解；了解级可以 0 卡。
   - 题量配比无硬规定，参考：single:multi:judge ≈ 5:3:2、难度 易:中:难 ≈ 3:5:2——**排布表说了算**。
   - day 是日程标签（D1、D2…），题的 day、闪卡的复习节奏都对齐它。
3. **收材料**：让用户给 2-5 个权威来源（官方文档 > 经典教材 > 博客），写进 `examples/<theme>/RESOURCES.md`（参照 dev-intro 的格式和使用规则）。没有材料就先别产课——AI 凭空讲课违反方法论。
4. **建骨架**（主题住哪二选一——仓库内 examples/<theme>/，或仓库外的**外部主题包**目录
   （自己的项目目录，EXAMPLE_THEME 直接写路径，见 docs/adr/0004；不想动 kit 仓库的推荐后者））：

   ```bash
   # 仓库内：
   cp -r examples/dev-intro examples/<theme>
   # 或外部主题包（目录名即主题名）：
   # cp -r examples/dev-intro /path/to/your-project/theme/<theme>
   # 清掉演示内容，只留骨架（路径换成上面二选一的实际位置）：
   rm examples/<theme>/lessons/*.html
   rm -rf examples/<theme>/study    # 清演示学习痕迹（notes/sprint/wrong-questions 样例）；study/ 子目录由 F4/F10/F11 产出时自建
   # questions.json / flashcards.json 里的演示题卡后面整文件替换，无需逐条删
   ```

5. **产课程**（需 `.env` 配好 LLM）：写 `examples/<theme>/course-spec.json`（字段：theme/mission/audience/depth/lessonsCount/outline/resources，参照 dev-intro），然后 `node apps/quiz-app/scripts/teach-generate.mjs --theme <theme>`。没配 AI 就手写 `lessons/*.html`（结构参照现有课程：h1 + meta + lead + h2 小节 + callout + 互链）。
6. **产题**（照表直产，`qa` / `scan` / 四对齐三门全绿才算本步完成）：照排布表**逐考点**产 `examples/<theme>/questions.json`，整文件替换。Schema 见 `apps/quiz-app/src/types.ts` 的 `Question` 接口。出题纪律：
   - id 用 `<前缀>-NNN` 全局唯一且稳定——进度按 id 存，重产题库保留旧 id 免丢答题历史。
   - `examPoint` 填考点 id（EP-NN）、`day` 对齐表的 day 列——四对齐校验按它们对账，表是权威。
   - `topic` 字段决定首页分组；多选 `answer` 数组必须全对才算对，不出「半对」歧义题。
   - 选项等长、格式不给线索——正确答案不能系统性更长、更规范或带格式提示。
   - 产完即跑质量门，红了对着报错改到绿：
     ```bash
     cd apps/quiz-app && npm run qa && cd ../..   # 最长即答案 / 答案分布 / 选项长度
     pnpm run scan                                # 品牌零泄露
     pnpm run check:alignment                     # 排布表对账（examPoint/day/题量/卡数）
     ```
7. **产卡**：照排布表的闪卡数列配 `examples/<theme>/flashcards.json`，整文件替换。`闪卡数 ≥ 1` 的考点至少 1 张卡覆盖该考点关键词（四对齐方向 3）；0 卡考点必须是大纲声明的了解级。
8. **切换激活主题**（一处必改，一处可选）：

   ```bash
   # ① 环境变量（跑 dev/build/test 时都要带；pm2 部署见 F9）——课程入口
   #    Courses.tsx 读 sync 产物 src/data/theme.json 自动跟随，无需手改
   EXAMPLE_THEME=<theme> pnpm dev
   # ②（可选）首页分组顺序：apps/quiz-app/src/lib/topicOrder.ts 的 TOPIC_ORDER
   ```

9. **校验**：走 F8，全绿才算完成。

**完成标志**：F8 五项全过 + 浏览器里主题已是新内容。接力 F3 开始学。

---

## F3 · 每日学习（daily）

**目的**：今天这 20-60 分钟学什么。顺序来自方法论：**先复习（记忆在衰退）→ 再建概念（学没学过的课）→ 后做题验效果 → 错题毕业**。

**前置**：应用能跑（没起就 `pnpm dev`，让用户开 `:5173`）。

**步骤**（按快照数据依次执行，向用户报每步做什么）：

1. **到期闪卡 > 0** → 先去「闪卡」tab 清到期卡。评分口径：想不起来=again（重学），迟疑但对=hard，流畅对=good，秒答=easy。
2. **有未学过的课**（课程 tab 里没读过的节）→ 先读课，读完对应题集再刷。这是「先建概念再验效果」。
3. **有未答题** → 「答题」tab 刷对应题集。答错自动进错题本，不用手记。
4. **未毕业错题 > 0** → 练习页顶部入口「重做本题集/错题」重练。毕业规则：

   | 历史错次 | 需要连续答对 |
   |---------|-------------|
   | 1 次 | 1 次 |
   | 2 次 | 2 次 |
   | 3 次及以上 | 3 次 |

5. 收尾建议：未毕业错题攒到 ≥3 → 提示走 F4 串讲；题全答完且正确率高 → 提示 F5 播客巩固。

**完成标志**：到期卡清零 + 本次计划的题集刷完。向用户报一句本次战绩（刷了几题、对几题、错题剩几道）。

---

## F7 · 改内容（content-edit）

**目的**：改题/改课/改卡/改日程，同时守住**四对齐**（课程讲的、题考的、闪卡记的、错题展开的，围绕同一套考点）。

**操作链（顺序固定，跳步必脱节）**：

```
改 MISSION.md 学习目标 / 考点排布表（表是权威：考点、题量、day 变了，题卡跟着对齐）
  → 改 examples/<theme>/lessons/*.html（课程）
  → 改 examples/<theme>/questions.json（题的 day/examPoint/题量 对齐排布表）
  → 改 examples/<theme>/flashcards.json（照表配卡）
  → 跑校验（F8 的 scan + bidirectional-check）
```

**纪律**：

- 只改主题源目录（仓库内 `examples/<theme>/` 或外部主题包路径）的源文件。`apps/quiz-app/src/data/` 和 `public/study/` 是同步产物，`dev/build/test` 会自动重建，手编必被覆盖。
- 改题保留旧 id、只改内容——进度按 id 存，换 id 等于丢这题的答题历史。
- 删题是允许的：进度里残留的陈旧 id 会被错题/看题统计自动过滤，不用清理。
- day 标签重排不影响已答进度（进度不按 day 存），放心调日程。

**完成标志**：改动落盘 + F8 全绿。

---

## F8 · 校验发布（verify）

**目的**：发布前的质量门。五项全绿才算可发布/可部署。

```bash
pnpm run scan    # ① 品牌零泄露——命中必须清零：把真实企业名换成中性说法后重跑
cd apps/quiz-app && npm run qa && cd ../..   # ② 题库质量（最长即答案/答案分布/选项长度）
pnpm test        # ③ 单测（判分/进度合并/SRS/复习队列 + CLI 工具函数）
pnpm run build   # ④ 构建（含 examples → src/data、public/study 同步）
python3 scripts/bidirectional-check.py examples/<theme>/   # ⑤ 四对齐（题→课、闪卡覆盖）
```

⑤ 读主题 MISSION.md 的「## 考点排布表」做契约校验：考点覆盖（题→课）+ 题量/题型/day/闪卡数对账（大纲→题）。无排布表的主题回退 dev-intro 关键词模式并打 ⚠ 告警（建议补表）。**✗ 以非零退出码拦截，△ 略提只是警告**。脚本只抓「课程完全没讲 X」这类硬漏洞，语义对齐仍需人工判断。

**失败处理**：①命中→中性化措辞；②③④报错→读报错信息修源文件（多半是 questions.json 字段类型错）；⑤退出码 1→按方向处置：方向 1 ✗ 回 F7 补讲；方向 2 对账不符→表是权威，补题/改 examPoint/day 对齐表；方向 3 ✗→补卡，或确属了解级就在表里声明 0 卡。

**完成标志**：五项全绿。向用户报每项一行结论。

---

## F9 · 部署（deploy）

**目的**：上线到云服务器（「部署」指云服务器，本地 `pnpm run server` 只是联调）。

**前置**：F8 全绿（尤其是 build）。

**步骤**：

```bash
# ① 服务器上（clone 后）：
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs    # 必须在本目录启动（config 用 cwd 锁定工作目录）
pnpm exec pm2 save

# ② 自定义主题部署：EXAMPLE_THEME 要进 pm2 环境，改 ecosystem.config.cjs 的 apps[0].env
#    env: { EXAMPLE_THEME: "<theme>" }，再 PORT=80 前缀或同处配 PORT。
#    外部主题包同理，值直接写服务器上的绝对路径（如 "/home/u/packs/<theme>"）

# ③ 之后在本地拉线上错题做串讲：
SERVER=http://<host>:8787 node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
```

跨设备同步原理：单用户一份 `apps/quiz-app/progress.json` 存服务器，多端按时间戳合并（`mergeProgress`），无账号无同步码——手机平板开同一地址即同步。

**完成标志**：`curl http://<host>:8787/api/health` 返回 `{"ok":true}`，浏览器打开页面可用。

---

## F12 · 知识图谱投影（graph projection，v0.14）

**目的**：把本仓的学习状态（题库掌握度 + 口头四态）投影到外部知识库 knowflow 的图上（节点着色）——知识住 knowflow，学习状态住本仓，桥只传一份**只读投影文件**，绝不回写知识页（ADR-0005）。

**什么时候用**：用户想「在知识图谱上看见掌握情况 / 图着色 / 学的东西连成网」；或陪练中建立了新概念想同步图上状态。**没装 knowflow / 没有图的用户永远走不到这里**——所有图功能静默降级为纯考点口径，不报错、不唠叨。

**两仓边界**：knowflow 的图 = wiki 页 + wikilink → `graph.json`（学习者手动采集合成，本仓**零摄取**）；本仓的信号 = progress / SRS / 口头答题流水。两者靠**考点节点映射**对上。

### 第 1 步 · 找图与映射（缺任一 → 静默降级，直接说明即可）

```bash
# 图位置：问用户 knowflow 仓库的 graph.json 路径（或环境变量 KNOWFLOW_GRAPH_JSON）
test -f "$GRAPH" && echo graph=ok || echo graph=missing
# 映射文件（学习者私有，随 study/records/ 不上站不提交）：
ls "$THEME_DIR/study/records/graph-map.json" 2>/dev/null || echo map=none
```

两者都在 → 继续；缺任一 → 本流程不可用（不是故障）：
- 有图无映射 → 先走第 2 步建映射。
- 无图 → 告诉用户图功能需要 knowflow 知识库（`graph.json`），本仓不接管知识采集。

### 第 2 步 · 建考点节点映射（agent 提议 → 学习者逐条确认，绝不代确认）

映射文件 `study/records/graph-map.json`（`{ version: 1, updatedAt, mappings: [{ node, ep, label }] }`，node = knowflow 节点相对路径，ep = EP-NN）：

1. **提议**：加载图节点（graph.json 的 id/label）与主题排布表考点（EP-NN + 考点名），按 label ↔ 考点名提出候选映射清单（节点路径、EP、双方名称并列展示）。
2. **确认**：逐条请学习者点头/改/弃——**宁可漏映射也不错配**（未映射节点仍可经口头流水独立判掌握，只是不并入考点视图）；按标题模糊匹配的「看起来像」不算确认。
3. **落盘**：写入 `study/records/graph-map.json`（已有条目合并，学习者否决的不再提议）。学习者的确认本身是数据——agent 不悄悄改它。

**红线**：绝不把 EP 或学习状态写进 knowflow 的 wiki 页面（知识库渗学习元数据，ADR-0005 明拒）。

### 第 3 步 · 产出投影（掌握度现算 → 只读文件）

```bash
node apps/quiz-app/scripts/mastery-report.mjs --theme "$THEME" --graph "$GRAPH" --write-projection --json
```

- 产物：`<graph.json 同目录>/mastery-projection.json`（`{ version: 1, generatedAt, source, nodes: [{ id, mastery, oral: { asked, correct } }] }`）——只读、可重复生成；graph.json 本体与知识页零改动，flowtest 等其他消费方零感知。
- 节点四态口径：映射节点 = 题库四态（v1.1）∪ 口头四态合流（负面证据优先）；未映射节点 = 纯口头通道。图与映射缺任一 → `graph.loaded = false`，报告自动退回纯考点口径。
- 四态→颜色的映射规则由 knowflow 侧定义（本仓不越界）；学习者重新跑一次本命令即刷新着色数据。

**完成标志**：投影文件落盘在图目录旁 + `--json` 的 `graph.projection.written = true`。提示用户在 knowflow 侧重新生成/打开图谱看节点着色。

### 只干 / 绝不干

- **只干**：找图与映射、提议映射待确认、现算产出只读投影。
- **绝不干**：回写 knowflow 的 graph.json / wiki 页；代学习者确认映射；在无图环境下硬造图信号（降级是特性不是故障）。

---

## F13 · 升级（upgrade，ADR-0006）

**目的**：把存量项目（CONTEXT.md 术语）一趟带到与当前插件版本**全功能对齐**——kit 代码更新到快照版本、缺失的新文件按模板补齐、契约缺口逐项引导补齐。数据不丢是硬承诺：progress 全程只备份不解析、分毫不动。此前被静默降级的功能（掌握度退纯题维度、考点全景口头信号恒为零）在这里被点名并给补法——**降级必告知，给补齐路径**。

**什么时候用**：

- /ask-coach 探测报版本落后（快照「版本」行：用户项目 kit 与插件快照两处 `kit-version.json` 的 diff，state.md §8）。
- F1 第 0 步识别到 kit 目录已存在（版本落后或版本未知）转来。
- 用户明说「升级 / 更新项目 / 项目旧了 / 补功能」。

**什么时候不用**：

- 干净目录 → F1 从零初始化（F13 只对已存在的项目）。
- 主题内容要改 → F7。F13 不代写内容，只补模板与点名缺口。

**步骤**：

1. **读两处版本，报漂移**（只读）：用户项目 `kit/kit-version.json` vs 插件快照 `<插件根>/kit/kit-version.json`（定位法同 F1）。无版本文件 = **版本未知，按最老处理**——如实告知「项目建于版本标记出现之前」，不给错误的安全感。落后 N 版优先读 `<插件根>/CHANGELOG.md`（随插件分发，本期起新增）数版本号，不做语义化比较；取不到 CHANGELOG 时降级为只报两处版本号、不数 N。

2. **备份 progress**（唯一必保数据）：

   ```bash
   cp <项目>/kit/apps/quiz-app/progress.json <项目>/progress.backup-<YYYYMMDD>.json
   ```

   progress 是运行期数据，升级全程**不解析、不合并、不改写**——只备份与原样保留。

3. **重拷 kit（保运行期文件拷回）**：主题包住 kit 外（F2 建议形态），重拷不碰它——多主题用户的所有主题包均不受影响，升级只动 kit 代码与契约映射。**快照只含 git 跟踪面**，kit 里三类运行期/本地文件不在快照内、重拷前必须先挪出（漏挪 = 粘滞主题丢/LLM 配置丢）：

   ```bash
   # 挪出运行期文件（progress 必保；theme.json 是粘滞主题记录——漏挪则升级后首次
   # 裸 build 静默回落 dev-intro；.env 是 LLM/TTS 配置，用户配过才存在）：
   mkdir -p /tmp/kit-keep
   cp <项目>/kit/apps/quiz-app/progress.json /tmp/kit-keep/    # ① 进度（唯一必保数据，先备份再挪）
   test -f <项目>/kit/apps/quiz-app/src/data/theme.json && \
     cp <项目>/kit/apps/quiz-app/src/data/theme.json /tmp/kit-keep/   # ② 粘滞主题记录
   test -f <项目>/kit/apps/quiz-app/.env && \
     cp <项目>/kit/apps/quiz-app/.env /tmp/kit-keep/                  # ③ AI 配置（有才挪）
   rm -rf <项目>/kit && cp -r <插件根>/kit <项目>/kit
   # 拷回运行期文件：
   cp /tmp/kit-keep/progress.json <项目>/kit/apps/quiz-app/progress.json
   test -f /tmp/kit-keep/theme.json && \
     cp /tmp/kit-keep/theme.json <项目>/kit/apps/quiz-app/src/data/ 2>/dev/null || \
     (mkdir -p <项目>/kit/apps/quiz-app/src/data && cp /tmp/kit-keep/theme.json <项目>/kit/apps/quiz-app/src/data/)
   test -f /tmp/kit-keep/.env && cp /tmp/kit-keep/.env <项目>/kit/apps/quiz-app/
   # 依赖随新 package.json 重装（node_modules 不在快照里）：
   cd <项目>/kit/apps/quiz-app && npm install
   # 验版本 + 验无嵌套：
   cat <项目>/kit/kit-version.json   # = 快照版本
   test ! -d <项目>/kit/kit && echo "no-nesting=ok"
   ```

4. **对照快照补缺失的新文件模板**（只补缺失，不覆盖已有）：diff 用户项目与插件快照的文件清单，缺的**代码/配置文件**从快照拷入。主题包侧（kit 外）缺的可选契约文件按模板补——`theme-config.json` 缺可不补（无配置回退是正常态；要定制呈现层，插件用户按常用字段写——显示名 `topicLabels`、分组顺序 `topicOrder`、子主题 `subtopics`、课→题集直达 `lessonTopics`，示例照快照内 `examples/dev-intro/theme-config.json`；字段全表在仓库 `docs/theming.md`，贡献者参考）；**冲刺包打印版**（`study/sprint/print.html`）是 F11 的随包产物，旧冲刺包没有属正常——下次 F11 产包自动带上，要给旧包补就重跑一次 F11。**v0.14 新数据文件（`study/records/oral-attempts.json`、`graph-map.json`）不补**——沿用「首用时自建、只读不建」惯例，没用到的新功能不添升级步骤。

5. **契约缺口逐项引导（只点名 + 给补法，绝不代写内容——内容主权在学习者）**：

   | 缺口 | 项目里的表现 | 补法（学习者的活，F13 只引导） |
   |------|-------------|-------------------------------|
   | MISSION.md 无「## 考点排布表」 | 四对齐校验回退 dev-intro 关键词模式并 ⚠；考点名映射为空 | 按 F2 第 2 步补表（考点/深度/题型×题量/day/闪卡数） |
   | 题库缺 `examPoint`/`day` 标记 | `mastery-report` 考点全部 untouched、首页掌握度面板无考点 | 照排布表给 `questions.json` 的题补 `examPoint`（EP-NN）与 `day`，改题保留旧 id |
   | 闪卡缺 `examPoint` 映射 | 掌握度退**纯题维度**（闪卡通道不参与判据）——升级前用户感知不到，此处点名 | 给 `flashcards.json` 的卡补 `examPoint` 字段映射到对应考点 |

   每项引用实测数据说明「补了恢复什么」（如 `mastery-report --json` 显示 0/45 题带考点标记 → 补齐后掌握度/全景/弱考点推荐才活），逐项问用户「现在补还是稍后」；不补的照实记着，第 6 步体检里如实报「已知悉未补」。

6. **收尾体检**：跑「体检」节的两个新探测项——**版本漂移**报「已对齐」；**契约完整性**按第 5 步处置结果如实报（没补的缺口仍列出，注明学习者已知悉）。全绿的口径 = 无漂移 + 无**未告知**的缺口，不是无缺口。

**完成标志**：`<项目>/kit/kit-version.json` = 快照版本 · 无嵌套 `kit/kit` · progress 与升级前逐字节一致（`diff` 备份）· 每个契约缺口已补或已明确告知。

---

## 体检（study-doctor）

**目的**：一句话把**全部校验门 + 环境探测**串成一份汇总报告——每项过/红 + 建议修复顺序。零新校验逻辑：四门校验跑的是 F8 既有命令（去掉最慢的 build），环境探测跑的是 state.md 既有探测命令，加上版本漂移 + 契约完整性两个探测项（ADR-0006，命令见下方第 3 步），体检只做编排聚合。新主题建站后、出问题时、发布前想快速确认状态，都从这儿进。

**与 F8 的分工**：F8 是发布质量门（五门含 build，红了不许发布）；体检是**诊断视图**——不跑 build（慢且写盘），多探一层环境（LLM/TTS/后端/主题/sync 新鲜度/版本漂移/契约完整性），红项给修复顺序。

**步骤**（命令原样串跑，逐项记 ✅/❌）：

1. **四门校验**（红一个都别发布）：

   ```bash
   pnpm run scan                                        # ① 品牌零泄露
   cd apps/quiz-app && npm run qa && cd ../..           # ② 题库质量
   pnpm test                                            # ③ 单测
   pnpm run check:alignment                             # ④ 四对齐（默认主题；外部主题包传目录）
   ```

2. **环境探测**（只读；缺什么补什么，不拦发布）：

   ```bash
   test -f .env && grep -cE '^(LLM_BASE_URL|LLM_API_KEY|LLM_MODEL)=..' .env   # LLM 三项，=3 配齐
   grep -cE '^TTS_PROVIDER=..' .env 2>/dev/null                                # TTS 有无（播客用，可缺）
   curl -sf localhost:8787/api/health                                          # 后端在线
   # 主题解析 + sync 新鲜度（state.md §1 同款）：
   echo "theme=${EXAMPLE_THEME:-dev-intro}"
   diff -q apps/quiz-app/src/data/questions.json "<主题源>/questions.json"     # 源与产物一致 = 新鲜
   diff -q apps/quiz-app/src/data/flashcards.json "<主题源>/flashcards.json"
   ```

   sync 不新鲜的表现：diff 报差异或 `src/data/*.json` 不存在——源改了没重跑 `pnpm dev/build`（内含 sync）。

3. **版本漂移 + 契约完整性**（ADR-0006 两探测项，只读、只报事实与补法、不代修）：

   ```bash
   # ① 版本漂移：用户项目 kit 版本 vs 插件快照版本（state.md §8；仅用户学习项目形态——
   #    仓库本体恒与 skill 同代，报「仓库本体」即可）
   cat <项目>/kit/kit-version.json 2>/dev/null || echo "version=unknown"
   cat <插件根>/kit/kit-version.json
   # ② 契约完整性：排布表 / 题库考点标记 / 闪卡映射三件（D=主题源目录，同 §1 两形态）
   grep -c '^## 考点排布表' "$D/MISSION.md" 2>/dev/null || echo "table=missing"
   THEME_DIR="$D" node -e '
   const fs = require("fs");
   const D = process.env.THEME_DIR;
   const qs = JSON.parse(fs.readFileSync(`${D}/questions.json`, "utf-8"));
   const fc = JSON.parse(fs.readFileSync(`${D}/flashcards.json`, "utf-8"));
   console.log(`questionsTagged=${qs.filter((q) => q.examPoint).length}/${qs.length} flashcardsMapped=${fc.filter((c) => c.examPoint).length}/${fc.length}`);
   '
   ```

   - 漂移三态：两处版本相等 = 已对齐；用户项目版本旧 = 落后 N 版（N 优先用 `<插件根>/CHANGELOG.md` 数——随插件分发，本期起新增；取不到时降级为只报两处版本号、不数 N）→ 补法走 F13；无版本文件 = 版本未知按最老 → 同样 F13。
   - 契约缺口判定：`table=missing` 或 0 = 排布表缺失；`questionsTagged` 低于全量 = 掌握度/全景的考点维度失明；`flashcardsMapped=0`（或排布表声明有卡考点却无映射）= 掌握度退纯题维度。补法都在 F13 第 5 步的表里——只报事实，不虚报也不代修。
   - 已对齐 + 无缺口的项目：两项报 ✅，不输出多余噪音。

4. **按模板输出报告**（数字全部来自实测）：

   ```
   🩺 体检报告
   校验门（红一个都别发布）：
     ① 品牌扫描 … ✅ 零命中 / ❌ 命中 N（按行号中性化后重跑）
     ② 题库质量 … ✅ / ❌ <哪条约束红>
     ③ 单测 … ✅ 全过 / ❌ fail N（读报错修源文件）
     ④ 四对齐 … ✅ / ❌ <哪个方向>（处置见 F8 失败处理）
   环境（缺什么补什么）：
     LLM 三项 … 配齐 ✅ / 缺（影响 F6 产课、F4 CLI、F5；补法 cp .env.example .env 填 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三项，贡献者细节见仓库 docs/configuration.md）
     TTS … 有 / 无（F5 可 --no-tts 只出逐字稿，不算阻塞）
     后端 :8787 … 在线 ✅ / 离线（要 F4 拉错题先 pnpm run server）
     主题 … <theme>（dir ok / MISSING / 外部主题包路径）
     sync 新鲜度 … ✅ / ❌（重跑 pnpm build——常连带解掉假红）
   版本与契约（ADR-0006；只报事实与补法）：
     版本漂移 … ✅ 已对齐（v<x>）/ ⚠ 落后 N 版（v<旧> → v<新>，走 F13）/ ⚠ 版本未知（无 kit-version.json，按最老，走 F13）/ 仓库本体
     契约完整性 … ✅ 无缺口 / ⚠ <排布表缺失 · 题缺考点标记 N/M · 卡缺映射 N/M>（补法见 F13 第 5 步）
   建议修复顺序：<只列红项，按下面的固定优先级>
   ```

5. **修复顺序**（固定优先级，只报红项）：**sync 不新鲜 → 校验门红**（先重跑 `pnpm build` 再复检——产物落后会造成假红）→ **版本漂移**（走 F13——旧 kit 跑新 skill 文档会撞墙，先对齐再修别的）→ **契约缺口**（F13 第 5 步引导补，学习者的活）→ **.env 缺项** → **后端离线**。为什么 sync 在最前：它是「环境在说谎」的那一类，先排除假信号再修真问题；漂移排在其后同理——kit 代际差会让校验结果本身不可信。

**完成标志**：报告已输出（全绿加一句「可发布，发布前再走 F8 过 build 门」；有红则修复顺序已给出）。修复后重跑体检确认转绿。

---

## 诊断（troubleshoot）

| 症状 | 根因 | 处置 |
|------|------|------|
| 课程 tab 白屏/404 | build 时没带 EXAMPLE_THEME / study 未同步 | 带 `EXAMPLE_THEME=<theme> pnpm build`（内含 sync:study，课程 URL 由 theme.json 自动跟随）后刷新 |
| 进度「丢了」 | 多端时间戳合并取新 | 先确认设备在线且 POST 成功（顶栏同步状态）；`curl :8787/api/progress` 看服务器权威值——本地只是缓存 |
| progress.json 写坏 | 手编/异常写入 | server 会按空进度重置，这是预期保护；**别手修这个文件**，需要清进度用 app 内重置入口 |
| 改了题不生效 | 改到了 `src/data/` 同步产物 | 回 `examples/<theme>/` 改源文件，重跑 `pnpm dev/build` |
| CLI 报「LLM 配置不完整」 | `.env` 缺项 | `cp .env.example .env`，填 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 三项 |
| grill 报拉不到错题 | 后端离线 / 确实没错题 | `pnpm run server` 后台起；快照 `openWrong=0` 就先去刷题 |
| LLM 返回 JSON 解析失败 | 模型输出跑偏 | 脚本已内置容错+重试；仍失败换模型（改 `.env` 的 `LLM_MODEL`；provider 细节见仓库 `docs/configuration.md`） |
| scan 命中 | 发布物里出现真实企业名 | 按命中文件行号中性化（「某车企」「某大厂」或删例）；技术专名（开源技术栈）可人工确认保留 |

处置完让用户复现原操作确认修复，然后建议重跑一次 Step 1 快照。
