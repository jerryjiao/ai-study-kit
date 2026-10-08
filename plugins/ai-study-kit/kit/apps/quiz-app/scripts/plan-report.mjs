#!/usr/bin/env node
/**
 * plan-report.mjs — 学习计划对账报告（无 AI，纯确定性派生；人与 agent 共用）。
 *
 * 从主题的 plan.json（可选主题数据，ADR-0009）+ 答题进度派生四组信号（判据单源
 * lib/plan.mjs，头注写清口径；前端复算走 TS 移植，spec #89 第 3/4 条消费）：
 *   1. 覆盖：done/total、当前单元、剩余清单（plannedDate 缺失单元只进清单不进日历对照）
 *   2. 节奏·日历对照：按 plannedDate「今天该到哪」vs 实际完成到哪 → 落后/富余天数
 *   3. 节奏·速率外推：近 14 天完成速率 → 预计完成日 vs deadline → 富余/缺口天数
 *      （数据不足时诚实降级不硬算，输出 reason 而非编造数字）
 *   4. 断档天数：距最后一次学习接触（answers/srs/课学完/口述四通道取最大，
 *      口述 = 主题包流水 ∪ progress.oralAttempts 并流——微块完成当天 gap=0；
 *      与本主题题/卡 id 集求交做多主题隔离）
 *   5. 断档回归动作（#120，spec #118 T1）：断档 ≥ 3 天（REGRESSION_GAP_DAYS）才出——
 *      热身一题（下一站考点挑题，mastery 四态选站）+ 计划后移建议现算（实测速率外推
 *      vs deadline/剩余日程，只建议不执行；数据不足诚实降级）。热身不依赖 plan——
 *      无计划主题（dev-intro 等）的 noop 输出同样带 regression.warmup（与 web 首页
 *      回归卡同一套动作：无计划只少后移建议行，shift 恒 null）。
 *
 * 用法：
 *   node apps/quiz-app/scripts/plan-report.mjs                    # 默认 dev-intro，人类可读
 *   node apps/quiz-app/scripts/plan-report.mjs --theme X          # 指定主题（支持外部主题包路径）
 *   node apps/quiz-app/scripts/plan-report.mjs --json             # 机器可读（agent 探测用）
 *   node apps/quiz-app/scripts/plan-report.mjs --progress /tmp/p.json   # 指定进度文件
 *
 * 约定与 mastery-report 同款：
 *   - --json 下人读日志走 stderr、stdout 只出一份结果 JSON；无 plan.json 的主题出
 *     优雅 noop（status: 'noop' + reason missing/broken），exit 0——缺可选文件不是故障。
 *     noop 下四组计划信号无数据可派生，但 regression 字段照出（热身挑题只吃题库+
 *     进度+考点四态，不吃 plan）。
 *   - 进度默认 apps/quiz-app/progress.json（本地文件口径；要看线上进度先
 *     `curl -sf $SERVER/api/progress -o /tmp/p.json` 再传进来）。文件不存在 = 空进度
 *     （断档无接触可算，不是故障）；文件损坏按空进度处理并打 warn。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { readPlan, derivePlanReport, deriveGap, deriveShiftAdvice, REGRESSION_GAP_DAYS } from './lib/plan.mjs';
import { epNameMap, epDayMap, masteryByExamPoint } from './lib/mastery.mjs';
import { readOralAttempts, groupOralAttempts, oralMastery, mergeOralAttempts, oralAttemptsFromProgress } from './lib/oral.mjs';
import { warmupStation, pickWarmupQuestion, warmupPlannedFrom, nextHookFromStation } from './lib/warmup.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const take = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const { dir: THEME_DIR, name: THEME } = resolveThemeDir(
  take('--theme') || process.env.EXAMPLE_THEME || 'dev-intro',
  REPO_ROOT
);
const AS_JSON = args.includes('--json');
const PROGRESS_PATH = take('--progress') || join(REPO_ROOT, 'apps', 'quiz-app', 'progress.json');
// --json：人读日志降级 stderr，stdout 只出结果 JSON（与 mastery-report --json 同约定）
const say = AS_JSON ? (...a) => console.error(...a) : console.log;

// ── 数据装载 ──────────────────────────────────────────────
// 题库必在（与 mastery-report 同防呆）：断档的读端过滤要拿本主题题 id 集求交
const questionsPath = join(THEME_DIR, 'questions.json');
if (!existsSync(questionsPath)) {
  console.error(`❌ 找不到题库：${questionsPath}`);
  process.exit(1);
}
let questions = [];
try { questions = JSON.parse(readFileSync(questionsPath, 'utf-8')); }
catch { questions = []; say(`⚠️ 题库解析失败（${questionsPath}）→ 断档的答题通道按无记录处理`); }

// 闪卡（可选）：断档的 srs 通道按本主题卡 id 集求交
const flashcardsPath = join(THEME_DIR, 'flashcards.json');
let flashcards = [];
if (existsSync(flashcardsPath)) {
  try { flashcards = JSON.parse(readFileSync(flashcardsPath, 'utf-8')); } catch { flashcards = []; }
}

const { present: PLAN_PRESENT, plan, reason, error } = readPlan(THEME_DIR);
if (!PLAN_PRESENT && reason === 'broken') {
  say(`⚠️ plan.json 损坏（${join(THEME_DIR, 'plan.json')}：${error}）→ 按无计划处理`);
}

// 进度（可选）：不存在 = 空进度不是故障；损坏 = 空进度 + warn
let progress = null;
if (existsSync(PROGRESS_PATH)) {
  try { progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8')); }
  catch (e) { progress = null; say(`⚠️ 进度文件损坏（${PROGRESS_PATH}：${e.message}）→ 按空进度处理`); }
}

const now = Date.now();

// ── 断档判定 + 热身挑题前置（#120 修复：不依赖 plan.json）─────────────────
// 无计划主题（dev-intro 等）回归场景同样要有热身一题——与 web 首页回归卡同一套动作
// （Home.tsx 的 gap 也独立于计划面板算，注释「无 plan 主题回归时也要热身，只少后移
// 建议行」）。有 plan 时本处 gap 与 signals.gap 同输入同值（deriveGap 纯函数幂等）。
// 口述触达通道（#123 微块）：主题包流水（唯一真源）∪ progress.oralAttempts（#122 实时
// 回流副本）并流后传入——微块口述题完成当天 gap=0，断档/回归判据认「今天已学过」
//（与 mastery-report 的并流同款，四元组去重不重复计数）。
const oralAttemptsMerged = mergeOralAttempts(
  readOralAttempts(THEME_DIR),
  oralAttemptsFromProgress(progress, THEME),
);
const gap = deriveGap(progress, now, {
  questionIds: questions.map((q) => q.id),
  cardIds: flashcards.map((f) => f.id),
  theme: THEME,
  oralAttempts: oralAttemptsMerged,
});
const regressionActive = gap.available && (gap.daysSinceLastContact ?? 0) >= REGRESSION_GAP_DAYS;

// 热身池「计划内」判据：theme-config sourceLayers + tier 双过滤（与 src/lib/warmup.ts
// 的 isPlanned && tier 同构；无 sourceLayers 配置的主题 source 层无映射 → 全算计划内）。
let sourceLayers = null;
const themeConfigPath = join(THEME_DIR, 'theme-config.json');
if (existsSync(themeConfigPath)) {
  try { sourceLayers = JSON.parse(readFileSync(themeConfigPath, 'utf-8'))?.sourceLayers ?? null; }
  catch { sourceLayers = null; }                                   // 配置损坏按无配置降级，不挡报告
}
const warmupPlanned = warmupPlannedFrom(sourceLayers);

// 热身选站 + 挑题：选站吃考点四态（mastery 同判据，含口述通道——流水现读现算比 web
// build 快照还新鲜）。calendarDiff/deadline 参数化：有 plan 传日历对照（落后日程轨
// 插队），无 plan 传 null/null——落后日程轨自然不存在（与 web 侧 nextStation 无
// planGap 时同构），走补弱/结构轨。
const buildStation = (calendarDiff, deadline) => {
  const missionPath = join(THEME_DIR, 'MISSION.md');
  const missionText = existsSync(missionPath) ? readFileSync(missionPath, 'utf-8') : '';
  const epNames = missionText ? epNameMap(missionText) : {};
  const epDays = missionText ? epDayMap(missionText) : {};
  const answers = (progress && progress.answers) || {};
  const srs = (progress && progress.srs) || {};
  const oralAttempts = readOralAttempts(THEME_DIR);
  const oralGroups = groupOralAttempts(oralAttempts, { epNames });
  const oralStatusByEp = new Map();
  for (const [ep, attempts] of oralGroups.byEp) oralStatusByEp.set(ep, oralMastery(attempts).status);
  const { points } = masteryByExamPoint({ questions, answers, epNames, flashcards, srs, oralByEp: oralStatusByEp });
  return warmupStation({ points, epDays, calendarDiff, deadline });
};
const buildWarmup = (calendarDiff, deadline) =>
  pickWarmupQuestion(questions, progress, buildStation(calendarDiff, deadline), warmupPlanned);
const regressionWarmupNoPlan = regressionActive ? buildWarmup(null, null) : null;

// 下站预告（#124 会话收尾开环预告）：收尾钩子的判据源——与下一站推荐同判据
// （warmupStation 三级，web 侧 nextStation 同构），与断档无关恒出（教练收尾固定产出一句话；
// web 会话总结页预告行同判据，两侧一致）。全掌握/无可推考点 → null，如实收尾不编预告。
const NEXT_WHY = { schedule: '按日程', weak: '按薄弱', structural: '按结构' };
const nextLabel = (n) => `${n.ep}${n.name && n.name !== n.ep ? ` ${n.name}` : ''}`;
const nextNoPlan = nextHookFromStation(buildStation(null, null));

// ── noop 路径：主题无 plan.json（可选文件），四组信号无数据可派生 ──
// regression 例外照出（热身不依赖计划；shift 恒 null——无计划无日程可挪）。
if (!PLAN_PRESENT) {
  const noop = {
    tool: 'plan-report',
    theme: THEME,
    generatedAt: new Date().toISOString(),
    status: 'noop',
    reason, // missing | broken
    note: '主题无 plan.json（可选主题数据），计划信号无数据可派生；详见 docs/adr/0009',
    regression: {
      active: regressionActive,
      threshold: REGRESSION_GAP_DAYS,
      gapDays: gap.daysSinceLastContact ?? null,
      warmup: regressionWarmupNoPlan,
      shift: null,
    },
    next: nextNoPlan,
  };
  if (AS_JSON) console.log(JSON.stringify(noop, null, 2));
  else {
    say(`🗓️ 学习计划对账 · ${THEME}`);
    say(`   无 plan.json（reason: ${reason}）→ noop，无计划信号可派生`);
    const nn = noop.next;
    if (nn) {
      say(`🧲 下站预告：${nextLabel(nn)} · 口述 3 题 · 约 ${nn.minutes} 分钟（${NEXT_WHY[nn.reason] ?? nn.reason}）`);
    } else {
      say('🧲 下站预告：无可推考点（全掌握或题库无考点标记）');
    }
    if (noop.regression.active) {
      say(`🔁 断档回归（≥ ${REGRESSION_GAP_DAYS} 天，无计划主题——只热身，无后移建议）：`);
      const w = noop.regression.warmup;
      if (w) {
        const why = w.reason === 'weak' ? '薄弱考点' : w.reason === 'structural' ? '结构序' : '回退';
        say(`   热身一题：${w.questionId}${w.name ? `（${w.ep} ${w.name}）` : w.ep ? `（${w.ep}）` : ''} · 选站依据 ${why}`);
      } else {
        say('   热身一题：无可挑题（题库无计划内题）');
      }
    }
  }
  process.exit(0);
}

// ── 派生 ──────────────────────────────────────────────────
const signals = derivePlanReport({
  plan,
  progress,
  now,
  questionIds: questions.map((q) => q.id),
  cardIds: flashcards.map((f) => f.id),
  theme: THEME,
  oralAttempts: oralAttemptsMerged,   // 与前置 gap 同输入同值（微块触达口径两侧一致）
});

const report = {
  tool: 'plan-report',
  theme: THEME,
  generatedAt: new Date().toISOString(),
  progressSource: existsSync(PROGRESS_PATH) ? PROGRESS_PATH : '(空进度)',
  status: 'ok',
  plan: { present: true, deadline: plan.deadline ?? null, units: plan.units.length },
  ...signals,
};

// ── 断档回归动作（#120，spec #118 T1）：断档 ≥ REGRESSION_GAP_DAYS 才组装 ──
// gap/regressionActive 前置已算（与 signals.gap 同输入同值）；warmup 在有 plan 分支
// 重算一次以吃日历对照（落后日程轨插队）。低于阈值 → active:false，warmup/shift
// 全 null——消费端（skill 快照）按 active 分流，不达阈值零新输出。
report.regression = {
  active: regressionActive,
  threshold: REGRESSION_GAP_DAYS,
  gapDays: gap.daysSinceLastContact ?? null,
  warmup: regressionActive ? buildWarmup(signals.calendarDiff, signals.projection.deadline) : null,
  shift: regressionActive ? deriveShiftAdvice(plan, now, gap, signals.projection) : null,
};

// 下站预告（#124）：有 plan 分支带日历对照重算（落后日程轨插队，与 buildWarmup 同参数）；
// 与断档无关恒出——收尾固定产出，快照/教练收尾/题站会话总结三端同判据。
report.next = nextHookFromStation(buildStation(signals.calendarDiff, signals.projection.deadline));

// ── 输出 ──────────────────────────────────────────────────
if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const { coverage, calendarDiff, projection, gap } = report;
  say(`🗓️ 学习计划对账 · ${THEME}`);
  say(`   进度源：${report.progressSource}`);
  say(`   计划：${coverage.total} 单元 · deadline ${report.plan.deadline ?? '（未设）'}`);
  say('');
  // 1. 覆盖
  const cur = coverage.current
    ? `${coverage.current.id} ${coverage.current.title}（${coverage.current.status}）`
    : '无（全完成或只剩搁置单元）';
  say(`📋 覆盖：完成 ${coverage.done}/${coverage.total} · 当前单元 ${cur}`);
  if (coverage.remaining.length) {
    say(`   剩余 ${coverage.remaining.length}：${coverage.remaining.map((u) => `${u.id}${u.plannedDate ? `(${u.plannedDate})` : ''}${u.status === 'paused' ? '[搁置]' : u.status === 'in-progress' ? '[在学]' : ''}`).join('、')}`);
  }
  // 2. 节奏·日历对照
  if (!calendarDiff.available) {
    say(`📅 节奏·日历：不可对照——${calendarDiff.note}`);
  } else if (calendarDiff.state === 'behind') {
    say(`📅 节奏·日历：落后 ${-calendarDiff.diffDays} 天（今天该到 ${calendarDiff.shouldAt.id} ${calendarDiff.shouldAt.title}，实际完成到 ${calendarDiff.actualAt ? calendarDiff.actualAt.id : '（尚无完成单元）'}）`);
    say(`   逾期：${calendarDiff.overdue.map((o) => `${o.id} 拖 ${o.daysOverdue} 天`).join('、')}`);
  } else if (calendarDiff.state === 'cleared') {
    say(`📅 节奏·日历：日程已清空（${calendarDiff.note}）`);
  } else if (calendarDiff.state === 'due-today') {
    say(`📅 节奏·日历：下一单元今天到期（不拖到明天就算持平）`);
  } else {
    say(`📅 节奏·日历：富余 ${calendarDiff.diffDays} 天（今天该到 ${calendarDiff.shouldAt ? calendarDiff.shouldAt.id : '（尚未到第一个日程点）'}，无逾期）`);
  }
  if (calendarDiff.invalidDateUnits.length) {
    say(`   ⚠️ plannedDate 无法解析的单元（按无日程处理）：${calendarDiff.invalidDateUnits.join('、')}`);
  }
  // 3. 节奏·速率外推
  if (projection.available) {
    const slack = projection.deadline
      ? ` vs deadline ${projection.deadline} → ${projection.slackDays >= 0 ? `富余 ${projection.slackDays} 天` : `缺口 ${-projection.slackDays} 天`}`
      : '（未设 deadline，只外推不对照）';
    say(`📈 外推：近 ${projection.windowDays} 天完成 ${projection.eventsInWindow} 单元（${projection.ratePerDay.toFixed(4)}/天）→ 剩 ${projection.remaining} 单元约 ${projection.estimatedDays} 天，预计 ${projection.estimatedDoneDate} 完成${slack}`);
  } else {
    say(`📈 外推：不可算——${projection.note}`);
  }
  // 4. 断档
  if (gap.available) {
    say(`⏸️ 断档：距上次学习接触 ${gap.daysSinceLastContact} 天（来源 ${gap.source} · ${new Date(gap.lastContactAt).toISOString()}）`);
  } else {
    say(`⏸️ 断档：无接触记录（进度文件无本主题的答题/闪卡/课学完时间戳）`);
  }
  // 5. 断档回归动作（#120）：达阈值才出——热身一题 + 计划后移建议（只建议不执行）
  if (report.regression.active) {
    say(`🔁 断档回归（≥ ${REGRESSION_GAP_DAYS} 天）：`);
    const w = report.regression.warmup;
    if (w) {
      const why = w.reason === 'schedule' ? '落后日程' : w.reason === 'weak' ? '薄弱考点' : w.reason === 'structural' ? '结构序' : '回退';
      say(`   热身一题：${w.questionId}${w.name ? `（${w.ep} ${w.name}）` : w.ep ? `（${w.ep}）` : ''} · 选站依据 ${why}`);
    } else {
      say('   热身一题：无可挑题（题库无计划内题）');
    }
    const sh = report.regression.shift;
    if (sh && sh.available) {
      const pace = sh.daysPerUnit ? `约 ${sh.daysPerUnit.toFixed(1)} 天/单元` : '速率可算';
      const vs = sh.deadline ? `vs deadline ${sh.deadline}` : `vs 剩余日程尽头 ${sh.scheduledEnd}`;
      say(`   计划建议后移 ${sh.shiftDays} 天：近 ${sh.windowDays} 天实测 ${pace}，剩余 ${sh.remaining} 单元约需 ${sh.estimatedDays} 天（${vs}）`);
    } else if (sh) {
      const whyMap = { 'no-rate': '速率无数据（近窗零完成），不硬算', 'no-target': '无 deadline 且剩余单元无日程，无对照日', 'on-track': '按实测速率仍在轨，无需后移' };
      say(`   计划后移建议：不可算——${whyMap[sh.reason] ?? sh.reason}`);
    }
  }
  // 6. 下站预告（#124 会话收尾开环预告）：与断档无关恒出——教练收尾读本行产预告句
  //    （钩子式：只说下次可以做什么，零催办零欠账字样）；判据与下一站推荐同源。
  const nx = report.next;
  if (nx) {
    say(`🧲 下站预告：${nextLabel(nx)} · 口述 3 题 · 约 ${nx.minutes} 分钟（${NEXT_WHY[nx.reason] ?? nx.reason}）`);
  } else {
    say('🧲 下站预告：无可推考点（全掌握或题库无考点标记）');
  }
}
