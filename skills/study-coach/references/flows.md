# Flow Playbooks · 流程手册

> Step 3 按编号取用。每个流程：**目的 → 前置 → 步骤 → 完成标志**。
> 所有路径相对 ai-study-kit 仓库根。改文件前先看 SKILL.md 硬红线。

---

## F1 · 初始化项目（bootstrap）

**目的**：从零到「浏览器里看到 demo 答题站」。

**步骤**：

1. 仓库不存在则 clone：

   ```bash
   git clone https://github.com/jerryjiao/ai-study-kit
   cd ai-study-kit
   ```

2. 装依赖 + 起开发服务器：

   ```bash
   pnpm install
   pnpm dev      # 前端 :5173（/api 代理到 :8787）
   ```

3. 打开 `http://localhost:5173`，确认三个 tab：**答题**（10 题，点选项即判分）、**闪卡**（4 张，again/hard/good/easy）、**课程**（2 节 HTML）。
4. 告诉用户：这是 dev-intro 演示主题——**内容全都不会用**，学自己的东西走 F2。

**完成标志**：三个 tab 都能正常渲染。之后默认接力 F2。

---

## F2 · 开新主题（new-theme）

**目的**：把用户想学的东西变成完整学习闭环。方法论铁律：**大纲定考什么 → 材料讲概念 → 做题验效果**——顺序不能反，不要上来就刷题。

**步骤**（1-3 是问用户的三个确认点，其余直接做）：

1. **定大纲**：问清「学什么主题 + 学到什么程度 + 给谁学」。写成 `examples/<theme>/MISSION.md`（能力大纲，参照 `examples/dev-intro/MISSION.md` 的粒度）。主题名用 kebab-case（如 `react-basics`、`k8s-fundamentals`）。
2. **排考点**（产题前的确认点，必须和用户对齐再动笔）：在 MISSION.md 的「## 考点排布表」节排出 `考点id(EP-NN) | 考点 | 深度 | 题型×题量 | day | 闪卡数`：
   - **考点列填核心关键词**——四对齐校验按它做课程/闪卡覆盖与对账，必须是会出现在课程正文和题干里的词（如「暂存区」而不是「git 三区流转的心智模型」）。
   - 深度三档：掌握 / 理解 / 了解；了解级可以 0 卡。
   - 题量配比无硬规定，参考：single:multi:judge ≈ 5:3:2、难度 易:中:难 ≈ 3:5:2——**排布表说了算**。
   - day 是日程标签（D1、D2…），题的 day、闪卡的复习节奏都对齐它。
3. **收材料**：让用户给 2-5 个权威来源（官方文档 > 经典教材 > 博客），写进 `examples/<theme>/RESOURCES.md`（参照 dev-intro 的格式和使用规则）。没有材料就先别产课——AI 凭空讲课违反方法论。
4. **建骨架**：

   ```bash
   cp -r examples/dev-intro examples/<theme>
   # 清掉演示内容，只留骨架：
   rm examples/<theme>/lessons/*.html
   rm -rf examples/<theme>/wrong-questions
   mkdir examples/<theme>/wrong-questions
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
8. **切换激活主题**（两处必改，一处可选）：

   ```bash
   # ① 环境变量（跑 dev/build/test 时都要带；pm2 部署见 F9）
   EXAMPLE_THEME=<theme> pnpm dev
   # ② 课程入口：apps/quiz-app/src/pages/Courses.tsx 的 COURSE_URL
   #    改成 '/study/<theme>/index.html'
   # ③（可选）首页分组顺序：apps/quiz-app/src/lib/topicOrder.ts 的 TOPIC_ORDER
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

**前置**：① 后端在线（离线先 `pnpm run server` 后台起）；② 快照 `openWrong ≥ 1`（0 就别跑，白调 LLM）；③ `.env` LLM 三项配齐。

**步骤**：

1. 生成串讲（LLM 按 考点聚类 → 每簇产深度 HTML）：

   ```bash
   node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
   # 拉线上错题：SERVER=http://<host>:8787 node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
   # 控制簇数：--max-clusters 5
   ```

2. 产物在 `examples/<theme>/wrong-questions/cluster-NN-*.html` + 更新的 `index.html`。**让用户真的读**：在浏览器课程入口或直接打开文件读，每簇 = 核心区别表 + 决策流程 + 易错警示 + 变体训练。
3. 读完后回 app **重做错题集**（F3 第 4 步），把读到的东西用做题验证掉。

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

**前置**：`examples/<theme>/course-spec.json` 存在 + `.env` LLM 配齐。没有 spec 先按 F2 第 1-2 步补大纲和材料——**没有权威材料的课不许产**。

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

- 只改 `examples/<theme>/` 源文件。`apps/quiz-app/src/data/` 和 `public/study/` 是同步产物，`dev/build/test` 会自动重建，手编必被覆盖。
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
#    env: { EXAMPLE_THEME: "<theme>" }，再 PORT=80 前缀或同处配 PORT

# ③ 之后在本地拉线上错题做串讲：
SERVER=http://<host>:8787 node apps/quiz-app/scripts/grill-wrong.mjs --theme <theme>
```

跨设备同步原理：单用户一份 `apps/quiz-app/progress.json` 存服务器，多端按时间戳合并（`mergeProgress`），无账号无同步码——手机平板开同一地址即同步。

**完成标志**：`curl http://<host>:8787/api/health` 返回 `{"ok":true}`，浏览器打开页面可用。

---

## 诊断（troubleshoot）

| 症状 | 根因 | 处置 |
|------|------|------|
| 课程 tab 白屏/404 | 主题切换只改了一半 | 核对 `EXAMPLE_THEME` 与 `Courses.tsx` 的 `COURSE_URL` 是否同主题；跑 `pnpm build`（内含 sync:study）后刷新 |
| 进度「丢了」 | 多端时间戳合并取新 | 先确认设备在线且 POST 成功（顶栏同步状态）；`curl :8787/api/progress` 看服务器权威值——本地只是缓存 |
| progress.json 写坏 | 手编/异常写入 | server 会按空进度重置，这是预期保护；**别手修这个文件**，需要清进度用 app 内重置入口 |
| 改了题不生效 | 改到了 `src/data/` 同步产物 | 回 `examples/<theme>/` 改源文件，重跑 `pnpm dev/build` |
| CLI 报「LLM 配置不完整」 | `.env` 缺项 | `cp .env.example .env`，填 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 三项 |
| grill 报拉不到错题 | 后端离线 / 确实没错题 | `pnpm run server` 后台起；快照 `openWrong=0` 就先去刷题 |
| LLM 返回 JSON 解析失败 | 模型输出跑偏 | 脚本已内置容错+重试；仍失败换模型（见 `docs/configuration.md`） |
| scan 命中 | 发布物里出现真实企业名 | 按命中文件行号中性化（「某车企」「某大厂」或删例）；技术专名（开源技术栈）可人工确认保留 |

处置完让用户复现原操作确认修复，然后建议重跑一次 Step 1 快照。
