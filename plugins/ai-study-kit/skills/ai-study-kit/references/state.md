# State Detection · 状态探测协议

> Step 1 的执行细节。所有命令**只读**，在 ai-study-kit 仓库根目录执行。
> 没有任何一个字段允许凭猜测填写——每项都有对应命令，跑了才算数。

## 0. 找到仓库

```bash
# 当前目录是仓库吗？（两者任一命中即算）
test -f package.json && grep -q '"name": "ai-study-kit"' package.json
test -f AGENTS.md
```

- 命中 → 继续下面 1-6。
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
const nw = () => { try { return fs.readdirSync(p("wrong-questions")).filter(f => /^cluster-.*\.html$/.test(f)).length } catch { return 0 } };
console.log(`questions=${nq()} flashcards=${nf()} lessons=${nl()} clusters=${nw()}`);
'
```

（主题名以 `THEME=...` 前缀传给单条命令；要扫别的主题就换前缀值。）

## 3. 进度（已答 / 未毕业错题 / 到期闪卡）

**来源优先级**：后端在线用 API（最新）；离线则读文件 `apps/quiz-app/progress.json`。

```bash
curl -sf http://localhost:8787/api/health   # 服务探活，成功=在线
```

进度统计（口径与 `apps/quiz-app/src/lib/progress.ts` 一致——墓碑=已删、随机沙盒不进主进度、错题毕业阈值随历史错次递增、SRS 按到期时间戳；**answers/srs 先与主题题/卡 id 集求交**——多主题隔离，其他主题的进度不混入）：

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
// 课程已读：coursesRead 的 "<theme>/<file>" 前缀命中 vs lessons 目录清单
const lessonFiles = (() => { try { return fs.readdirSync(`${D}/lessons`).filter((f) => f.endsWith(".html")); } catch { return []; } })();
const readSet = new Set(lessonFiles.filter((f) => (p.coursesRead || {})[`${NAME}/${f}`] !== undefined));
console.log(JSON.stringify({
  answered, openWrong: openWrong.length, wrongIds: openWrong.map(([id]) => id),
  accuracy: graded.length ? Math.round((correct / graded.length) * 100) + "%" : "n/a",
  srsDue,
  lessonsRead: `${readSet.size}/${lessonFiles.length}`,
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

## 快照之外的加分项（顺手看，不强制）

- `git status --porcelain` 有未提交改动且涉及 `examples/` → 快照里提一句「有未提交的内容改动，发布前记得走 F8 校验」。
- 课程 tab 404 而题库正常 → build 时没带 `EXAMPLE_THEME`（sync 默认 dev-intro），带对主题重跑 build（课程 URL 由 theme.json 自动跟随，不存在「只改一半」）。
