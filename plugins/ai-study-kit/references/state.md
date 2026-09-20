# State Detection · 状态探测协议

> Step 1 的执行细节。所有命令**只读**，在 ai-study-kit 仓库根目录执行。
> 没有任何一个字段允许凭猜测填写——每项都有对应命令，跑了才算数。

## 0. 找到仓库

```bash
# 当前目录是仓库吗？（两者任一命中即算）
test -f package.json && grep -q '"name": "ai-study-kit"' package.json
test -f AGENTS.md
```

- 命中 → 继续下面 1-7。
- 未命中 → 先看常见位置：用户学习项目 `~/study-kit/`（F1 建的，无 git，根下有 `kit/apps/quiz-app` 与 `theme/`）、用户上一次的工作目录、`~/Documents/projects/`；都找不到就问用户。用户什么都没有 → 快照只填「仓库：不存在」，跳 F1（零 clone，插件自带快照）。

## 1. 主题

```bash
echo "theme=${EXAMPLE_THEME:-dev-intro}"
THEME="${EXAMPLE_THEME:-dev-intro}"
# EXAMPLE_THEME 两种形态：仓库内主题名（examples/<name>/）或外部主题包路径（含 / 或 \，
# 主题住在套件仓库之外——见 docs/adr/0004；构建/同步/teach/grill 四个脚本都认两种形态）
case "$THEME" in
  */*|*\\*) test -d "$THEME" && echo "dir=ok (外部主题包)" || echo "dir=MISSING" ;;
  *) test -d "examples/$THEME" && echo "dir=ok" || echo "dir=MISSING" ;;
esac
ls examples/   # 仓库内有哪些主题（外部主题包不在此列，问用户路径）
```

`src/data/theme.json` 带 `dir` 字段 = 上次同步用的是外部主题包（粘滞回退靠它，别删）。

主题目录存在但内容是 dev-intro 原样（`questions.json` 里 id 前缀还是 GIT-/LNX-）→ 视为「新主题没做完」，提示走 F2 收尾。

## 2. 库存（题 / 闪卡 / 课 / 错题串讲）

```bash
# THEME_DIR：仓库内=examples/<name>，外部主题包=$EXAMPLE_THEME 本身
THEME="${EXAMPLE_THEME:-dev-intro}"
case "$THEME" in */*|*\\*) export D="$THEME" ;; *) export D="examples/$THEME" ;; esac
node -e '
const fs = require("fs"), p = (f) => `${process.env.D}/${f}`;
const nq = () => { try { return JSON.parse(fs.readFileSync(p("questions.json"))).length } catch { return 0 } };
const nf = () => { try { return JSON.parse(fs.readFileSync(p("flashcards.json"))).length } catch { return 0 } };
const nl = () => { try { return fs.readdirSync(p("lessons")).filter(f => f.endsWith(".html")).length } catch { return 0 } };
const nw = () => { for (const d of ["study/wrong-questions", "wrong-questions"]) { try { const n = fs.readdirSync(p(d)).filter(f => /^cluster-.*\.html$/.test(f)).length; if (n) return n } catch {} } return 0 };
console.log(`questions=${nq()} flashcards=${nf()} lessons=${nl()} clusters=${nw()}`);
'
```

（主题名以 `THEME=...` 前缀传给单条命令；要扫别的主题就换前缀值。）

## 3. 进度（已答 / 未毕业错题 / 到期闪卡 / 课已学完）

**来源优先级**：后端在线用 API（最新）；离线则读文件 `apps/quiz-app/progress.json`。

```bash
curl -sf http://localhost:8787/api/health   # 服务探活，成功=在线
```

进度统计（口径与 `apps/quiz-app/src/lib/progress.ts` 一致——墓碑=已删、随机沙盒不进主进度、错题毕业阈值随历史错次递增、SRS 按到期时间戳、**课已学完=显式确认制**（课程页点「✓ 学完了」才记入，打开不算；被撤销墓碑盖掉的不算，见下方代码）；**answers/srs 先与主题题/卡 id 集求交**——多主题隔离，其他主题的进度不混入）：

```bash
# 在线优先（-s 静默，失败不报错）；离线或文件为空则回落到仓库进度文件
curl -sf http://localhost:8787/api/progress -o /tmp/coach-progress.json
CP=$([ -s /tmp/coach-progress.json ] && echo /tmp/coach-progress.json || echo apps/quiz-app/progress.json)

CP="$CP" THEME="$THEME" node -e '
const fs = require("fs");
const readIds = (f) => { try { return new Set(JSON.parse(fs.readFileSync(f)).map((x) => x.id)); } catch { return new Set(); } };
// 主题目录两种形态（同 §1/§2）：路径=外部主题包，纯名=examples/<name>；
// coursesRead 的 "<theme>/<file>" key 一律用 basename（与 theme-path.mjs 口径一致）
const T = process.env.THEME;
const D = /[/\\]/.test(T) ? T : `examples/${T}`;
const NAME = T.split(/[/\\]/).pop();
const qIds = readIds(`${D}/questions.json`);
const fcIds = readIds(`${D}/flashcards.json`);
let p;
try { p = JSON.parse(fs.readFileSync(process.env.CP, "utf-8")); } catch { p = null; }
if (!p) { console.log("progress=empty"); process.exit(0); }
const pass = (wc) => (wc <= 1 ? 1 : wc === 2 ? 2 : 3);
const now = Date.now();
const recs = Object.entries(p.answers || {}).filter(([id, r]) => !r.deletedAt && qIds.has(id));
const answered = recs.filter(([, r]) => !r.fromRandom).length;
const openWrong = recs.filter(([, r]) => r.streak !== undefined && r.streak < pass(r.wrongCount ?? 1));
const graded = recs.filter(([, r]) => !r.fromRandom && r.correct !== null);
const correct = graded.filter(([, r]) => r.correct === true).length;
const srsDue = Object.entries(p.srs || {}).filter(([id, s]) => !s.deletedAt && fcIds.has(id) && s.due <= now).length;
// 课已学完（显式确认制）：coursesRead 命中 lessons 目录清单，且未被撤销墓碑盖掉——
// coursesReadTombstones 同 key 时间戳 ≥ 记入时间戳 = 已撤销，不计入学完（与 progress.ts isCourseRead 同构：
// seen > tomb 才算；旧数据无墓碑 = 已确认保留）
const lessonFiles = (() => { try { return fs.readdirSync(`${D}/lessons`).filter((f) => f.endsWith(".html")); } catch { return []; } })();
const readSet = new Set(lessonFiles.filter((f) => {
  const seen = (p.coursesRead || {})[`${NAME}/${f}`];
  if (seen === undefined) return false;
  const tomb = (p.coursesReadTombstones || {})[`${NAME}/${f}`];
  return tomb === undefined ? true : seen > tomb;
}));
console.log(JSON.stringify({
  answered, openWrong: openWrong.length, wrongIds: openWrong.map(([id]) => id),
  accuracy: graded.length ? Math.round((correct / graded.length) * 100) + "%" : "n/a",
  srsDue,
  lessonsDone: `${readSet.size}/${lessonFiles.length}`,
}, null, 2));
'
```

`progress=empty` 是正常态（新用户/刚重置），不是故障，别进诊断流程。

**弱考点（考点掌握度，快照第 5 行）**：进度统计之外再跑一条——确定性派生，无 AI：

```bash
node apps/quiz-app/scripts/mastery-report.mjs --theme "$THEME" --progress "$CP" --json
```

- 判据（v1.1 双通道）：考点（题库 `examPoint`，EP-NN）下题全答对、无未毕业错题，且映射闪卡（`flashcards.json` 可选 `examPoint`）全部毕业（SRS phase=review）= 掌握；有未毕业错题或当前答错 = 弱；部分作答无负面、或题全对但映射闪卡未全毕业 = 进行中。无映射闪卡的考点退回纯题维度。考点名从 MISSION 排布表解析。
- `--progress` 文件不存在 = 空进度全部 untouched，不是故障；`--theme` 两种形态都认（同 §1）。
- **口头四态与口头弱项（v0.14，同一份 `--json` 的 `oral` 字段）**：口头答题流水（`study/records/oral-attempts.json`）里的每个口头目标——排布表全部考点 ∪ 流水里的裸知识点（聊天新学、无题的概念）——判纯口头四态（近 5 次加权正确率 + 置信度封顶 1 次 0.5 / 2 次 0.8；无流水目标 = 未开始）。输出消费：`oral.weakRanked` 与 `oral.targets[].status` 进快照「弱考点」行的口头弱项——推荐时点名（「拥塞控制口头问 2 对 2、加权 0.8 还没到掌握线，再抽两轮」）。口头弱与题库弱**负面优先**：任一弱即弱；题没刷过时口头最多算「进行中」——推荐先补题。
- **知识图信号（v0.14，同一份 `--json` 的 `graph` 字段）**：传 `--graph <graph.json 路径>`（或环境变量 `KNOWFLOW_GRAPH_JSON`）时，报告装载 knowflow 知识图并给出 `graph.nodes`（节点四态 + 口头统计）与映射计数；配合 `--write-projection` 产出只读投影文件供图着色（flows.md F12）。**前置关系**：`graph.weakPrereqs` 是每个弱考点的前置链（`[{kind:'ep'|'node', id, name, mastery}]`，mastery 非 mastered 即「前置还弱」）；`graph.weakOrdered` 是尊重前置顺序的推荐序（前置先学）——推荐与陪练开场点名时用它取代裸 `weakRanked` 顺序，理由从「刷 EP-12」具体到「前置概念 EP-01 还弱，先补它」。无图 / 无映射 → `graph.loaded = false`，静默降级为纯考点口径（无前置字段），不是故障。
- 输出消费：`summary.weak` 与 `weakRanked`（弱点排序：未毕业多者先）进快照「弱考点」行；`points[].profile` 带 grill 串讲记下的错因（来自 `study/records/profile.json`，学习者私有不上站，目录语义见 §7）——推荐时点名引用，让理由从「错题多」变成「EP-03 连错 2 次，错因：权限位组合不熟」。`points[].flashOpenIds` 列出该考点未毕业的闪卡（推荐刷闪卡时点名）；判据与 web 首页「考点掌握度」面板同口径。

**考点全景（「报进度」，v0.13）**：进度统计之外的第二条派生——每考点三信号，按排布表 day 分组：

```bash
node apps/quiz-app/scripts/mastery-report.mjs --theme "$THEME" --progress "$CP" --panorama --json
```

- 三信号：**讲过** = 契约二学习记录（格式单源 [`contracts.md`](contracts.md)——`study/records/*.md` 的已过考点，显式 EP 前缀或考点名精确匹配）∪ 课已学完（全部课读完才点亮课程通道——部分读完不归因到考点，宁少报不虚报）；**练过** = 该考点有答题记录，或口头问答 > 0（弱信号；v0.14 起口头计数唯一真源 = 口头答题流水 `study/records/oral-attempts.json`，旧记录手写「口头题计数」节照读合并）；**掌握** = 掌握度四态判据不变。无 records、无流水、无进度时只报客观侧（答题驱动或全 false），不虚报。
- 聊天层**永远现算最新**（每次报进度重跑本命令；web 首页面板消费的是上次 build 时点的覆盖快照，两端口径一致、新鲜度不同）。
- **全景卡模板**（数字全部来自实测 JSON，按此渲染后紧跟一句推荐）：

  ```
  🗺️ 考点全景 · <theme>（已讲 X/N · 已练 Y/N · 已掌握 Z/N）
    <D1>｜已讲 x/n · 已练 y/n · 已掌握 z/n
      ✓讲 ✓练 ·掌  EP-01 暂存区（答 3/5 · 口头 2/3 · 未毕业错题 1）
      …（✓=亮 ·=未亮，逐考点一行；口头/错题仅在有值时带）
    <D2>｜…
  👉 下一步：<点名最该补的考点（弱考点优先，引用 mastery 报告）+ 一句为什么>
  ```

## 4. AI 配置（只报配齐与否，绝不回显值）

```bash
test -f .env && grep -cE '^(LLM_BASE_URL|LLM_API_KEY|LLM_MODEL)=..' .env   # =3 才算配齐
grep -cE '^TTS_PROVIDER=..' .env 2>/dev/null                                # TTS 有无（播客合成音频用）
echo "study-lang=${STUDY_LANG:-zh}"                                         # 可选：AI CLI 生成内容语言，缺省中文
```

`.env` 不存在或计数 < 3 → AI 缺配。生成内容语言（可选项，不配不算缺）：非中文学习者建议显式设——CLI 带 `--lang zh|en|es|ru`、或会话前置 `STUDY_LANG` 环境变量（上式已探当前值）；agent 直产路径（../skills/ask-coach/references/flows/F4.md、F6.md）生成内容语言直接跟随用户对话语言。分项就绪矩阵（哪个流程还差什么，一眼可见）：

| 能力 | LLM 三项 | 还需要 |
|------|----------|--------|
| F6 产课（teach） | 必需 | — |
| F4 串讲（grill CLI 路径） | 必需 | 后端在线（拉 `/api/progress`） |
| F5 播客（podcast） | 必需 | TTS 可选——缺则 `--no-tts` 只出逐字稿，不算阻塞 |

答题站/闪卡/考点掌握报告（mastery-report）不受影响（零 LLM）。补配走 `cp .env.example .env` 后填 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 三项（播客合成音频另加 `TTS_PROVIDER`）——插件用户填好即可用；贡献者形态的 provider 细节见仓库 `docs/configuration.md`。

## 5. 服务

- `curl -sf localhost:8787/api/health` 成功 → 在线。
- 离线且用户要走 F4（grill 拉错题）→ 先起服务：`pnpm run server`（后台跑，别阻塞）。

## 6. 意图

从用户原话里提取，对照 SKILL.md 的意图路由表。用户只说了模糊的「学一会儿/继续」→ 走推荐算法，不追问。

## 7. 陪练与考期（快照第 8 行）

学习痕迹住主题包 `study/` 伞目录，进度档案在 `study/records/`（F10 逐考点写，只留本地不随 build 上站）；根级 `learning-records/` 是旧布局，照读照报（规则见本节末尾）。

```bash
# D 同 §2/§3 的主题目录（外部主题包路径，或仓库内 examples/<name>）
ls "$D/study/records/" 2>/dev/null | sort || echo "records=none"
test -d "$D/learning-records" && echo "legacy=learning-records"
grep -m1 '^mode:' "$D/COACH.md" 2>/dev/null        # 教学模式；COACH.md 缺失=静默（F10 首跑自建），不进快照
grep -m1 '^deadline:' "$D/MISSION.md" 2>/dev/null  # 考期 YYYY-MM-DD，没有就亮 ⚠
```

**读哪条记录**：在 `study/records/`（或旧目录 `learning-records/`）里找最新的**进行中**站——新格式看记录 frontmatter `status: in-progress`；无 frontmatter 的旧记录按 [`contracts.md`](contracts.md) 契约二的兼容规则识别：文件名带 `-in-progress` 后缀、或正文含「待办」节，也算进行中（只报事实，不要求手工补格式）。多条进行中取编号（文件名前缀 NN）最大的。

**快照第 8 行三形态**（只报事实，不解析语义）：

| 条件 | 形态 |
|------|------|
| 有进行中记录 | `进行中 <NN>·<topic> · 待办 N 条 · 模式 <mode>` |
| 有记录但无进行中 | `无进行中站（上次完成 <最近 done 记录的 topic>）`；没有 done 记录就只报 `无进行中站` |
| 无 `study/records/` 且无根级 `learning-records/` | `未启用` |

- `topic` 取记录 frontmatter，旧格式无 frontmatter 时用文件名 slug；`N` = 该记录「## 待办」清单里未勾选（`- [ ]`）的条数。
- `mode` 取值顺序：记录 frontmatter `mode`（用户可能中途换过）→ COACH.md frontmatter `mode` → 报「未设」。

**考期（deadline）**：读 MISSION.md frontmatter `deadline: YYYY-MM-DD`——

- **缺失**：快照第 8 行追加 `⚠ deadline 未配置`。原则是不静默跳过、也不反复唠叨：F11 考前冲刺以 deadline 为硬前置，入口处会当场拦下引导补（见 flows.md F11 第 1 步），快照的 ⚠ 就是为那一刻准备的。
- **有值**：算倒计时并在快照体现为 `距考期 <N> 天`（N = 今天到 deadline 的整天数；N ≤ 7 即推荐算法第 4 条的 F11 触发档）；已过期的报 `考期已过 N 天`，同样只报事实。

**旧布局兼容**：探测遇根级 `learning-records/` → 按本节同样的判定规则照读照报（进不进行中、待办数、模式都照算），并在快照或报告追加一句提示：`检测到旧目录 learning-records/，可一次性迁入 study/records/（F10 兼容识别，迁移自愿）`。只提示不代迁，一次会话提一遍即可。

## 8. kit 版本（快照「版本」行，ADR-0006）

用户学习项目（F1/F13 建的，根下有 `kit/`）才探；仓库本体贡献者形态恒与 skill 文档同代，报「仓库本体」即可。

```bash
# 用户项目 kit 版本——无此文件 = 版本未知，按最老处理（不是故障，版本标记前的项目都这样）
cat <项目>/kit/kit-version.json 2>/dev/null || echo "version=unknown"
# 插件快照版本：本文件插件形态在 <插件根>/references/state.md（向上一级即插件根）；手动安装在 <安装根>/skills/references/state.md（向上两级即安装根，kit 同层）
cat <插件根>/kit/kit-version.json
```

- 两处都有 → 按号判断落后与否（不做语义化比较）；落后时报「落后 N 版」——N 优先读 `<插件根>/CHANGELOG.md`（随插件分发，本期起新增）数版本号；取不到 CHANGELOG 时降级为只报两处版本号、不数 N。快照行指 F13。
- 用户项目无版本文件 → 报「版本未知，按最老处理」，同样指 F13——不给错误的安全感。
- 版本号相等 → 「已对齐」。

## 快照之外的加分项（顺手看，不强制）

- `git status --porcelain` 有未提交改动且涉及 `examples/` → 快照里提一句「有未提交的内容改动，发布前记得走 F8 校验」。
- 课程 tab 404 而题库正常 → build 时没带 `EXAMPLE_THEME`（sync 默认 dev-intro），带对主题重跑 build（课程 URL 由 theme.json 自动跟随，不存在「只改一半」）。
