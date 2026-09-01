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

## 4. AI 配置（只报配齐与否，绝不回显值）

```bash
test -f .env && grep -cE '^(LLM_BASE_URL|LLM_API_KEY|LLM_MODEL)=..' .env   # =3 才算配齐
grep -cE '^TTS_PROVIDER=..' .env 2>/dev/null                                # TTS 有无（播客合成音频用）
```

`.env` 不存在或计数 < 3 → AI 缺配。三个 AI 流程（teach/grill/podcast 的 LLM 部分）都跑不了；答题站/闪卡不受影响。补配走 `cp .env.example .env` 后填三项（细节见仓库 `docs/configuration.md`）。

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

**读哪条记录**：在 `study/records/`（或旧目录 `learning-records/`）里找最新的**进行中**站——新格式看记录 frontmatter `status: in-progress`；无 frontmatter 的旧记录按 F10 契约二兼容规则识别：文件名带 `-in-progress` 后缀、或正文含「待办」节，也算进行中（只报事实，不要求手工补格式）。多条进行中取编号（文件名前缀 NN）最大的。

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

## 快照之外的加分项（顺手看，不强制）

- `git status --porcelain` 有未提交改动且涉及 `examples/` → 快照里提一句「有未提交的内容改动，发布前记得走 F8 校验」。
- 课程 tab 404 而题库正常 → build 时没带 `EXAMPLE_THEME`（sync 默认 dev-intro），带对主题重跑 build（课程 URL 由 theme.json 自动跟随，不存在「只改一半」）。
