# Flow Playbooks · 流程手册

> Step 3 按编号取用。每个流程：**目的 → 前置 → 步骤 → 完成标志**。
> 路径基准：有仓库时相对仓库根；插件安装用户（无仓库）相对**用户学习项目根**（F1 建的 `<project>/`）。改文件前先看 SKILL.md 硬红线。
> 文中 `examples/<theme>/` 泛指**主题源目录**——主题住外部主题包（F2 第 4 步二选一）时，把路径换成该包目录。

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

## F4 · 错题串讲（grill）

**目的**：把错题从「知道正确答案」升级到「知道为什么错、易混点边界在哪」。

**接力边界**：只复盘已错的题、**不教新知识**——复盘中发现错因的根子是概念没懂（不是粗心、不是题式陷阱），交棒 F10 开补站；教新知识只有 F10 一条路，别在错题里打转。

**前置**：① 后端在线（离线先 `pnpm run server` 后台起）；② 快照 `openWrong ≥ 1`（0 就别跑，白调 LLM）；③ CLI 路径需 `.env` LLM 三项配齐（agent 直产路径不需要）。

**路径选择**（双路径，agent 直产为主推——2026-08-20 复盘拍板）：
- **在 agent 会话里（zcode + /ask-coach）**：走 agent 直产，不跑 CLI。让 agent 读题库错题 + 对应课程口径，照 `grill-wrong.mjs` 的簇结构直产 `examples/<theme>/study/wrong-questions/cluster-NN-*.html`（核心区别表 + 决策流程 + 易错警示 + 变体训练）+ 更新 index.html，产完过 `pnpm run scan` 门禁再 build。验证轮 #7 已实证质量达标。**同时更新学习者档案** `examples/<theme>/study/records/profile.json`（考点级错因，机器可读）：按下方「档案契约」合并写入——下次探测/推荐就靠它点名弱考点。
- **独立终端 / 无 agent 环境**：跑下方 CLI（第 1 步会自动顺产/合并档案，无需手动）。

**档案契约**（`study/records/profile.json`，学习者私有不上站）：`{ version:1, theme, updatedAt, grillRuns, examPoints:[{ name, questionIds, wrongReasons[], advice, timesGrilled, lastSeen }], globalPatterns[] }`。合并规则：新旧考点有任意题 id 重叠视为同一考点——timesGrilled+1、wrongReasons 去重合并、questionIds 取并集、name/advice 取新；无重叠追加新条目。错因要落到具体概念（「权限位组合不熟」），不写「粗心」。CLI 路径的合并实现在 `lib/grill-utils.mjs` 的 `mergeProfile`（有单测），agent 直产照同语义手写即可。

**步骤**：

1. 生成串讲（LLM 按 考点聚类 → 每簇产深度 HTML；CLI 路径顺产学习者档案）：

   ```bash
   node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
   # 拉线上错题：SERVER=http://<host>:8787 node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
   # 控制簇数：--max-clusters 5
   ```

2. 产物在 `examples/<theme>/study/wrong-questions/cluster-NN-*.html`（根级 `wrong-questions/` 是旧布局，不再写入）+ 更新的 `index.html`。**让用户真的读**：在浏览器课程入口或直接打开文件读，每簇 = 核心区别表 + 决策流程 + 易错警示 + 变体训练。
3. 读完后回 app **重做错题集**（F3 第 4 步），把读到的东西用做题验证掉。下次会话探测会自动带上档案里的弱考点与错因（mastery-report join），不用手动衔接。

**完成标志**：串讲已读 + 涉及的错题全部毕业。剩余错题 <3 时不再重复生成（性价比低），直接重练。

---

## F5 · 做播客（podcast）

**目的**：通勤/运动时的被动巩固。选题优先级：**没掌握的课 > 错题串讲 > 整个题库**——已经熟的内容做成播客是浪费。

**前置**：`.env` LLM 配齐；要合成音频还需 TTS 配置（`TTS_PROVIDER`），没有也能跑 `--no-tts` 出逐字稿。

**步骤**：

1. 和用户定素材（默认取快照推荐：openWrong>0 优先最新串讲，其次未读课）。
2. 生成：

   ```bash
   node apps/quiz-app/scripts/podcast-generate.mjs --input examples/<theme>/lessons/<file>.html
   # 可选：--segments 15   --style conversational|lecture|interview   --no-tts
   ```

3. 产物三件套在 `podcast-out/`：`*-script.json`（结构化脚本）、`*-transcript.md`（逐字稿）、`*.wav`（音频，`--no-tts` 时无）。
4. 音频没合成（无 TTS 或嫌慢，每段约 5-10 秒 × 段数）：把逐字稿给用户，提示可用其他 TTS 工具二次合成。

**完成标志**：三件套（或两件套）已生成，告诉用户文件路径。

---

## F6 · 产课 / 加课（teach）

**目的**：新增或重产课程讲解。

**接力边界**：教材（`lessons/`）的修改只发生在工厂链（F6/F7）——在这里产、过门禁、再上站。F10 教学对话里**不现改教材**：教学时发现教材有错，记下来走 F7 改。

**前置**：`examples/<theme>/course-spec.json` 存在；CLI 路径需 `.env` LLM 配齐（agent 直产路径不需要）。没有 spec 先按 F2 第 1-2 步补大纲和材料——**没有权威材料的课不许产**。

**路径选择**（双路径，agent 直产为主推——2026-08-20 复盘拍板）：
- **在 agent 会话里（zcode + /ask-coach）**：走 agent 直产，不跑 CLI。让 agent 照 spec + RESOURCES.md 直产 `examples/<theme>/lessons/*.html`（版式参照既有 lessons 与 `scripts/lib/teach-utils.mjs` 的 wrap 模板），产完过 scan/对齐门禁再 build。验证轮 #5/#7 已实证质量达标。
- **独立终端 / 无 agent 环境**：跑下方 CLI。

**步骤**：

1. 审 spec：`audience`（给谁讲）和 `depth`（beginner/intermediate/advanced）越具体产出越好；`resources` 填 RESOURCES.md 里的权威链接。
2. 生成：

   ```bash
   node apps/quiz-app/scripts/teach-generate.mjs --theme <theme>          # 课时数用 spec 的 lessonsCount
   node apps/quiz-app/scripts/teach-generate.mjs --theme <theme> --lessons 5   # 临时覆盖
   ```

3. 质量不行（讲得浅/跑题）：调 spec 的 audience/depth/resources 再跑，而不是反复重roll同样的 spec。
4. 课程变了 → 四对齐可能破：新增考点有没有对应题和卡？走 F7 的校验链收尾。

**完成标志**：`lessons/` 下新课时已生成且过了 F8 的双向校验。

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

## F10 · 陪练教学（coach）

**目的**：对话式把考点一个个**教懂 → 当场考过 → 逐考点落盘**，跨天可续。学习的主线在 F10——F3 刷题与 F4 错题串讲是汇入：教过的去 F3 刷题验证；刷错的题若根因是概念缺口，回流 F10 开补站。区别于 F6（产持久课程 html 的内容工厂）。

**教学法事实源**：本 flow 只编排「什么时候做什么」；「怎么做才算对」以 [`references/coach.md`](coach.md) 为准——三段式纪律（§3）、符号型「要死记」标注（§4）、锚点金句标准（§5）、考法五模式与过关判定（§6）、定义零容忍（§7）、诊断纠偏表（§9）。执行本 flow 前先读 coach.md；条文不整段贴进对话，对话里只出现条文的执行结果。

### 什么时候用

- 用户说「继续学习 / 接着学 / 陪我练 / 学透 X / 学一下 X / 讲讲 X」。
- 推荐算法命中**续站**（存在进行中的站）——报站名 + 待办数，**用户点头才开跑**：续站是建议不是指令，自动开跑是打扰。
- F4 串讲发现错因的根子是**概念没懂**（不是粗心、不是题式陷阱）→ 回 F10 开补站，把缺口当新站教。

### 什么时候不用

- 检验掌握程度 → F3 刷题；弄懂做错的题 → F4 复盘。两者都不教新知识——**教新知识只有 F10 一条路**，这条边界让教学不散落进刷题对话。
- 用户输入是求助不是求学（「学了没用 / 记不住 / 想放弃 / 我卡住了」）→ 先走诊断纠偏入口，诊断完再进教学循环。
- 教材本身要改 → F6/F7 工厂链。

### 第 0 步 · 开场纪律（进站续站都先走，三条缺一不可）

陪练会话的第一句话不是「今天想学什么」，是教练先报数——用户不用自己想从哪开始，也不该复习优先级被新鲜感劫持。

1. **开场先报「今天最该练 + 为什么」**：跑全景报告（`mastery-report --panorama --json`，state.md §3）取浓缩版——汇总行（已讲 X/N · 已练 Y/N · 已掌握 Z/N）+ 最弱考点（`mastery-report` 的 weakRanked/档案错因）+ 未毕业错题数 + 到期卡数。开场一段话报「今天最该练 <一个具体动作>，因为 <数据理由>」，然后给建议的当天范围（与第 1 步的排班衔接）。**建议基于数据不基于印象**——这是推荐算法同一套判据，只是把执行时机提前到陪练开场（10 条优先级链不变）。**有知识图时（`--graph` 的 `graph.weakOrdered`）推荐序尊重前置**：前置概念还没掌握就先补它——理由照实点名（「EP-02 还弱，但它的前置 EP-01 暂存区也没掌握，先补 EP-01」），依赖顺序优先于清单顺序（state.md §3）。
2. **弱考点软坚持**：开场报出的弱考点（未毕业错题 / mastery weak）没清完 → 先清弱考点再讲新内容，这是默认排班；**不硬锁**——用户执意跳过就尊重选择，但在当站记录留痕一行：`- 跳过未清：EP-03 chmod（<用户给的原因，没有就写「用户优先学新内容」>）——下一站开场再清`（写在「错的点」节末尾）。档案不说谎，也不拦路、不说教。
3. **到期概念先口头抽背**：快照 `srsDue > 0` → 正题开始前先抽背 2-3 张到期卡的**概念**（口头问卡正面，不翻 app）：答对过、答错当场纠一条 + 记进当站「错的点」并把该卡的概念排进本站待办。抽背是拦遗忘变成缺口的第一道闸，两三张、几分钟，不展开成讲课。**每次抽背问答当场追加口头流水一条**（`oral-attempts.json`，source `recall`，写入口径见契约二）。

倒计时口径不变：只消费 MISSION.md 声明的 `deadline`（缺失亮 ⚠ 引导补，见 F11 第 1 步），教练不自设催办节奏、不替用户排冲刺日程。

### 第 1 步 · 开站前读事实（凭记忆开讲是大忌）

1. **讲到什么深度**：主题包 MISSION.md 的**考点排布表**说了算（深度、题型、day 全在表上）；没表先按 F2 第 1-2 步补，或向用户声明按材料自拟大纲。
2. **本站讲哪些**：从排布表圈**最少必要考点**（coach.md §8：缺一项就动不了，多余全砍）；可对题库按拟讲考点做词频统计——高频优先、冷门敢跳。
3. **概念从哪来**：主题包 `lessons/*.html` 与 RESOURCES.md。讲时标文件 + 位置；材料未覆盖要直说，自造类比标「自造」。
4. **用户在哪**：Step 1 快照看该主题正确率（90%+ 走快节奏）；已有 F4 串讲产物必读——真实痛点考点别装覆盖。
5. **上次讲到哪**：`study/records/` 有本主题的进行中记录 → 不是开新站，是**续站**，带待办直接进循环。

**当天范围不问用户**：从排布表 day 计划 + 进行中记录推导后给建议（「今天打第 5 站剩的两个考点，行吗」），用户可改——排班是教练的活，问「今天想学什么」是把排班外包给最不该排班的人。开场一段话报本站范围（材料/课程依据 + 考点骨架），然后**直接进考点 1**。

新站先按契约二建学习记录（`status: in-progress`），再进循环。

### 第 2 步 · 定考法（首跑问一次，之后不问）

| `mode` | 考法一句话 | 详见 |
|---|---|---|
| `quick` 快验 | 每考点从题库取选择题 2-3 道，一道一道答、即时判定，错出变体 | coach.md §6.1 |
| `deep` 深练 | 讲透后先复述再造，定义错误零容忍 | §6.2 |
| `two-step` 两段式 | 每考点先选择题快验、全对后再复述一遍 | §6.3 |
| `adaptive` 按型分配 | 记忆型走选择题 + 死记提示；理解/应用型走复述 + 造 | §6.4 |
| `custom` 自定义 | 用户原话 + 教练解析纪律，存档后原样沿用 | §6.5 |

- **首跑触发**（主题包**无 COACH.md** 时，仅此一次）：只问一个问题——**「怎么考我？」**五个选项如上；教练按排布表构成（符号型/理解型比例）与考期临近度给推荐（选型处境见 coach.md §6 开头）。答案写入 COACH.md（契约一）。
- **开新站**：读 COACH.md 默认沿用 + 一句话确认（「还按 deep 考你？」）。
- **续站**：沿用该站记录 frontmatter 的 `mode`，不重问。
- **用户喊换模式才重选**：更新 COACH.md 与进行中站的记录。

为什么只问一次：教学模式是偏好不是每站变量，重复问等于把教练的记性外包给用户。

### 第 3 步 · 陪练循环（一次只吃一个考点）

一轮五步**讲透 → 考 → 复述 → 纠 → 造**，顺序不可换，骨架与各步标准见 coach.md §2；本 flow 钉节奏与落盘：

- **一次只讲一个考点**，讲完不预告下一个——并进两个，两个都讲不透。
- 讲解一律三段式（quick 短的是篇幅不是结构，§3），口吻与台阶守 §3.5-3.9：说话腔、先地图后路程（成员多先给全家福，亲戚概念不塞半路）、一次只上一个新东西、讲一块停一拍、重讲换说法、拆解块贴「是什么/为什么/怎么用」可见标签；符号型考点开讲第一句明说「**这是要死记的**」（§4）；每考点落一句锚点金句，抽象配类比、并列配助记（§5）。
- 换说法两轮仍讲不通、或机制天然是图（流向/层次/包含/对比）→ **图解降维重讲**（coach.md §3.10）：终端 ASCII 图内嵌即时画，复杂机制产 HTML 图解卡落 `study/notes/`（随 build 上站）；画懂不算过，回「考/复述」验证。
- **考**按本站 mode 走（§6）：选择题即时判定 ✅/❌ + 一句理由（只给题面 + 选项，答完才解释）；复述与造按 §6.6 判定；**案例型考点**（DFD/ER/UML/算法/设计模式一类主观大题）走 §6.7 案例通道——真题风格原创大题 + 解题范式四步带练 + 评分点判定，判定进口头答题流水，范式卡沉淀 `study/notes/`；定义错误零容忍，当场打断（§7）。
- **每过完一个考点，立刻增量写盘**到本站记录：已过考点追加一行（考点 + 金句）、错的点记上、待办划掉、**口头问答追加进流水**——不等站收尾。会话中断、跨天重启，进度都在盘上；所有模式一视同仁（quick 也写档案、也能续站）。

### 诊断纠偏入口（循环随时可插）

用户说「学了没用 / 记不住 / 想放弃 / 我卡住了」类输入：照 coach.md §9 对照表定位根因 → 给**一句用户下一分钟就能动手执行的话** → 从诊断出的那一环接回陪练循环。症状对不上表，先问一句再猜——猜错的诊断比没有诊断更糟。

### 第 4 步 · 收站与交棒

1. 本站考点全过 → 记录改 `status: done`，COACH.md 更新 `current-station`。
2. **阶段笔记**（仅含复述或造的模式：deep / two-step / adaptive / custom）：阶段考点全过后**主动**生成到 `study/notes/`（html：总结 + 自检题），不等用户开口；quick 只写档案不产笔记（快验只建再认，§6.1）。笔记过 `pnpm run scan` 随 build 上站。
3. **主动交棒 F3**：阶段教完直接推「去刷这课对应的题集」——教了不验，等于没闭环。

### 只干 / 绝不干

- **只干**：教懂、模式化小考、续站、逐考点落盘、阶段沉淀笔记并交棒。
- **绝不干**：在教学对话里**刷题库的题**——成组刷题是 F3 的活，quick 每考点取 2-3 道是「考」不是「练」，即停即走。**不现改教材**——教材修改只在工厂链（F6/F7）。**不替用户写笔记**——笔记是用户复述的再组织，教练只收编格式。

### 学习痕迹住哪：study/ 伞目录（四分法）

```
<主题包>/study/
├── records/          # 进度档案（md，本地不上站）——F10 逐考点写；续站、冲刺都读它
├── notes/            # 阶段笔记 + 图解卡（html，上站）——F10 阶段产出；图解卡 = 讲不通时的图解降维重讲产物（§3.10），任何模式都可产
├── wrong-questions/  # 错题讲解（html，上站）——F4 产
└── sprint/           # 冲刺包（html，上站）——F11 考前冲刺产（归 F11 管，此处只点名）
```

口诀：**学新读教材、内化写笔记、平时查档案、考前背冲刺包**——前三种是积累，冲刺包是收割。上站的 html（notes / wrong-questions / sprint）统一过品牌 scan、随 build 发布；records 只留本地。旧布局的根级 `learning-records/` 照读照报（识别规则见契约二），并提示用户一次性迁进 `study/records/`，不强制。

### 契约一 · COACH.md（住主题包根）

```markdown
---
mode: deep             # quick|deep|two-step|adaptive|custom，语义见 coach.md §6
updated: <date>
current-station: 5     # 最新进行中站 = study/records/ 记录编号
---

## 教学偏好便签

<!-- 常规模式：一两句偏好即可（如「例子偏向后端场景」「讲慢一点」） -->
<!-- custom 模式必含两份：
     用户原话：「别让我干背，每讲完一个马上让我用一遍」
     教练解析纪律：每考点 2 道选择题即时判定 + 1 个微产物；
     过关线 = 选择题全对 且 微产物用对考点（判定细则 coach.md §6.6） -->
```

frontmatter `mode` 是全主题教学模式的权威存储；续站时以站内记录的 `mode` 为准（用户可能中途换过），COACH.md 兜底。

### 契约二 · 学习记录（`study/records/<NN>-<slug>.md`，本地）

```markdown
---
id: 5                  # 站编号 = 文件名前缀 NN，主题内递增
topic: HTTP 状态码      # 本站教什么
mode: two-step         # 本站考法，续站沿用此值
status: in-progress    # in-progress | done
---

## 已过考点
- 状态码家族划分 · 金句：「4xx 怪客户端，5xx 怪服务端」
- 3xx 重定向辨析 · 金句：「301 永久搬家，302 临时出门」

## 错的点
- 复述时把 301/302 方向说反——已当场纠（§7 四拍），变体已补答对

## 待办
- [x] 家族划分
- [x] 3xx 重定向
- [ ] 4xx 具体码辨析

## 口头题计数
- EP-01 状态码家族划分：问 3 对 2
- 3xx 重定向辨析：问 2 对 2
```

（「口头题计数」节为 v0.13 旧格式：v0.14 起停写，计数改由口头答题流水派生——见下方写入口径；旧记录照读合并。）

**口头答题流水写入口径（v0.14 起，口头计数的唯一真源）**：

- 聊天陪练的每次口头问答**当场追加一条明细**到 `study/records/oral-attempts.json`（追加式 JSON 数组，学习者私有不上站）：

  ```json
  { "target": "EP-01 状态码家族划分", "correct": true, "at": 1789000000000, "source": "recall" }
  ```

  - `target` 目标引用，宽容格式三档：`EP-NN` 前缀（题库考点，全景按它 join 排布表）→ knowflow 图节点相对路径（无题的新知识）→ 裸考点名（兜底）。
  - `correct` 对错布尔；`at` **真实 `Date.now()`**——与 progress.json 同款红线，绝不允许固定值或未来时间戳；`source` 三值：`recall` 抽背 / `recite` 复述 / `case` 案例评分点（判定细则见 coach.md §6.6/§6.7）。
- **写入口径（多会话并发安全）**：写前重读文件全文 → 追加新条目 → 整文件写回；消费端按 `at` 排序取信、完全相同的四元组去重（`apps/quiz-app/scripts/lib/oral.mjs` 的纯函数，有单测）。与「已过考点」同节奏：一轮考完就追加，不等收站。
- **「## 口头题计数」节停写（v0.13 引入、v0.14 废弃）**：总数一律从流水派生（`mastery-report --panorama` 与探测口径自动带出），不再手写「问 N 对 M」——手写两处必漂移。
- **旧记录照读不丢**：解析器兼容旧「口头题计数」节（`lib/records.mjs`），全景「练过/口头」信号把旧手写计数与流水合并，升级不丢历史。

**旧格式兼容（只报事实，不要求补格式）**：无 frontmatter 的旧记录，按文件名带 `-in-progress` 后缀、或正文含「待办」节，识别为进行中站，照常续；无「口头题计数」节的旧记录照常解析，计数缺省为空。

**完成标志**：本站考点全过 + 记录 `status: done` +（含复述/造的模式）`study/notes/` 笔记落盘且 scan 零命中 + 已交棒 F3。

---

## F11 · 考前冲刺（sprint）

**目的**：距考期一周内，把学习档案收割成一份能背的**冲刺包**，然后交棒模考。这个阶段学的边际收益让位于巩固——不再开站学新，而是把已教过的（金句）、已错过的（警示）、已判型要死记的（必背）聚合到一处。**F11 不产新知识**：四分法口诀里前三种是积累，冲刺包是收割，是全 kit 唯一不生产新知识的聚合派生物。

**教学法事实源**：本 flow 只编排「何时产包、从哪收割、交给谁」；收割按教时的同一套标准执行——金句长什么样以 coach.md §5 为准，哪些考点属必背以 §4 判型三问为准。不按同一套标准收，包里收的就不是当年种下的东西。

### 什么时候用

- **距 MISSION.md frontmatter `deadline` ≤ 7 天**（**7 天阈值写死**，不随主题调整）。为什么是 7 天：冲刺的原理是短窗密集重复（coach.md §8）——窗口更长就拖回积累模式，更短则新一轮巩固灌不进。推荐算法在「到期闪卡清零之后、陪练续站之前」这一档命中即推荐 F11；包不存在、或产包后又攒了新记录/新错题导致过期 → 先产包或重产。
- 用户明说「**冲刺 / 考前 / 突击**」——距 deadline 多远都算，用户意图优先于阈值。

### 什么时候不用

- MISSION.md 没有 `deadline` → 先走下方硬前置补上；倒计时都算不出来，谈不上冲刺。
- 还在积累期（距 deadline > 7 天且用户没喊冲刺）→ F10 续站、F3 每日学习才是主线——提前收割只会收个半空的包。
- 想学新东西、想弄懂某个概念 → F10。F11 只收割已种的，不播种。

### 第 1 步 · 硬前置：deadline 缺失先补，绝不瞎猜倒计时

读 MISSION.md frontmatter 的 `deadline: YYYY-MM-DD`。**没有就先引导用户补**（F2 开主题时问过一次，这里补问：「考核是哪天？」），写进 frontmatter 才继续；定不了日子就先不冲刺，回 F10/F3 主线。为什么绝不瞎猜：7 天阈值的一切判断都建立在真日期上——猜早了透支冲刺，猜晚了临考才发现来不及。快照对缺失 deadline 亮 ⚠，就是为了在这一刻被硬前置拦下、当场引导，而不是静默跳过。

### 第 2 步 · 产冲刺包四件套 + 打印版（`study/sprint/`，html，过 scan 随 build 上站）

数据只从**两处既有档案**收割，抽取口径沿用 F10 契约二的记录格式，**不重造格式**：

1. **金句速记表**：聚合 `study/records/` 全部记录「已过考点」节的每一行 `- <考点> · 金句：「<金句>」`，按站分组（记录 frontmatter 的 `topic` 做组名）。金句合格与否以 coach.md §5 为准——**讲的时候不落金句，考前就没得背**：这张表收割的正是 F10 循环里逐考点落下的锚点。
2. **易错警示 TOP N**：两路聚合——各站记录「错的点」节的每一条 + F4 串讲簇（`study/wrong-questions/`）里的易错警示，按复发与严重度排序，N 不写死、取一屏能扫完的量（扫不完的警示等于没有），**一行一句、不展开讲解**。为什么不再讲：冲刺期是提醒不是教学，警示行的任务是让用户扫一眼想起「这里我错过」——真要重讲，那是 F4/F10 的活。
3. **必背清单**：MISSION.md「## 考点排布表」全部**记忆型/符号型考点**，判型按 coach.md §4 三问（约定还是推理、定义还是推导、再认还是推演）——§4 那句「判型在这一步做对，考前收割才有得收」在此兑现。
4. **考前最后一天 checklist**：可勾选的行动清单，内容保持通用——金句速记表从头到尾过一遍、警示行扫一遍、清掉到期的闪卡复习、必背清单里还生疏的再看一眼、睡够。最后一条不是玩笑：临场提取靠状态，不靠熬夜。

5. **单文件打印版 `print.html`**（v0.13 起，考前一晚/通勤拿纸背的载体）：四件套按「金句 → 警示 → 必背 → checklist」顺序合并进一个自包含 HTML，规约：
   - **自包含**：CSS 全内联，不依赖 `assets/styles.css`、不带任何导航/返回链接/外链按钮——纸上没有可点的东西；
   - **打印 CSS**：`@media print` 去背景色、正文 11-12pt 衬线友好字号；**章节连续排版不强制分页**（要背的材料页越少越好），只防截断——金句行/警示行 `page-break-inside: avoid`、节标题 `page-break-after: avoid` 不与首行分离、最后一天 checklist 整块不跨页（方便整页勾选）；
   - **屏显即纸样**：不打印时也按纸面排版（白底、A4 比例宽 ~700px、一屏可扫），浏览器 Ctrl/Cmd+P 直接存 PDF 或打印——**不引入任何 PDF 生成依赖**（pandoc/weasyprint 一类明确不用）；
   - checklist 用 `☐` 可勾选框形态；同款内容随包过 `pnpm run scan`。

产完跑 `pnpm run scan`，零命中才随 build 上站——与 notes / wrong-questions 同一道发布门。

### 第 3 步 · 收割见缺口：包内标记「回 F10 补」，不开站

聚合时发现缺口——必背清单里的考点在金句速记表里没有对应行（没教过，或教了没落金句）、排布表考点在 records 里没档——**在包内标记「回 F10 补」，不在冲刺期开新站**。为什么：冲刺期开站等于收割日下种，短窗不够长，种了也长不熟；缺口记下来，确有余力也是回 F10 走正常陪练循环，不在冲刺对话里讲课。

### 第 4 步 · 交棒 F3 模考

冲刺包背熟（金句能脱口而出、警示行扫过、必背清单过完）→ **交棒 F3**：用题库做一次**限时整卷演练（模考）**——收割的成色用模考验收，不用「感觉背下来了」验收。不在冲刺对话里补课、不替用户背：背是用户的动作，包只是载体。交棒时提一句：**冲刺包有打印版**（`study/sprint/print.html`，浏览器打开 Ctrl/Cmd+P 即可存 PDF 打印）——考前一晚和通勤路上拿纸背。

### 只干 / 绝不干

- **只干**：收割两处档案成四件套 + 打印版、缺口标记「回 F10 补」、交棒 F3 模考。
- **绝不干**：**不补课、不开新站**（教新知识只有 F10 一条路）；**不重造记录格式**（抽取口径认契约二）；**不排每日冲刺日程**（只产包 + 交棒模考，冲刺节奏是用户自己的事）；**不在冲刺对话里刷题**（成组做题是 F3 的活）；**不引 PDF 生成依赖**（打印版就是自包含 HTML，浏览器打印即得）。

**完成标志**：四件套 + 打印版落盘 `study/sprint/` + `pnpm run scan` 零命中 + 缺口已标记「回 F10 补」+ 已交棒 F3 模考。

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

1. **读两处版本，报漂移**（只读）：用户项目 `kit/kit-version.json` vs 插件快照 `<插件根>/kit/kit-version.json`（定位法同 F1）。无版本文件 = **版本未知，按最老处理**——如实告知「项目建于版本标记出现之前」，不给错误的安全感。落后 N 版用 CHANGELOG 数版本号，不做语义化比较。

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

4. **对照快照补缺失的新文件模板**（只补缺失，不覆盖已有）：diff 用户项目与插件快照的文件清单，缺的**代码/配置文件**从快照拷入。主题包侧（kit 外）缺的可选契约文件按模板补——`theme-config.json` 缺可不补（无配置回退是正常态，要定制呈现层再按仓库 `docs/theming.md` 的字段表写模板）；**冲刺包打印版**（`study/sprint/print.html`）是 F11 的随包产物，旧冲刺包没有属正常——下次 F11 产包自动带上，要给旧包补就重跑一次 F11。**v0.14 新数据文件（`study/records/oral-attempts.json`、`graph-map.json`）不补**——沿用「首用时自建、只读不建」惯例，没用到的新功能不添升级步骤。

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

   - 漂移三态：两处版本相等 = 已对齐；用户项目版本旧 = 落后 N 版（CHANGELOG 数版本）→ 补法走 F13；无版本文件 = 版本未知按最老 → 同样 F13。
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
     LLM 三项 … 配齐 ✅ / 缺（影响 F6 产课、F4 CLI、F5；补法 docs/configuration.md）
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
| LLM 返回 JSON 解析失败 | 模型输出跑偏 | 脚本已内置容错+重试；仍失败换模型（见 `docs/configuration.md`） |
| scan 命中 | 发布物里出现真实企业名 | 按命中文件行号中性化（「某车企」「某大厂」或删例）；技术专名（开源技术栈）可人工确认保留 |

处置完让用户复现原操作确认修复，然后建议重跑一次 Step 1 快照。
