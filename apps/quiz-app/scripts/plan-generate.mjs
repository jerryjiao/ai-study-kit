#!/usr/bin/env node
/**
 * plan-generate.mjs — 计划生成器（v0.27 #121，spec #118（自适应排期器）；无 AI，纯确定性生成）。
 *
 * 重启排期不再手写：按**实测速率**从剩余单元生成 plan.json 的 plannedDate。
 * 输入 = 题库排布表（MISSION.md 考点排布表：深度列做硬算/概念交错的轻重代理）+
 * 已有进度（plan.json done 历史 + 进度四通道的接触日）+ 实测完成速率（显式传入或
 * 从 done 历史派生，判据单源 lib/plan-generate.mjs，数学与复盘速率算术逐项对得上：
 * 剩余 N × X 天/单元 ÷ 活跃率 → 日历天数）。输出 = 每个剩余单元的合理 plannedDate，
 * deadline 只做可行性对照（排不进考期 = 报错附全算术，绝不静默压缩速率）。
 *
 * 写回纪律单源 skills/references/contracts.md 契约三「重排」节：#121 原路径 = 学习者明确
 * 说「重排计划」才跑（agent 代跑的工具链命令，可跑不可派给学习者手敲）；v0.27 #125 放宽
 * = 断档/落后时自动重排——教练场景 `--dry-run` 出建议、学习者确认后去掉本 flag 写回
 * （**可否决**：不点头就不写），或 `--auto` **明示自动**（判据单源 lib/plan-generate.mjs
 * shouldReschedule：behind=有逾期单元 / gap=断档回归且后移建议可算）。每次写回追加一条
 * 重排审计（plan.rescheduled：at 真实时间戳 + reason + triggerDays + start/scheduledEnd，
 * 历史全留可追溯）；done 单元逐字段原样；day/topic/title 不动；交错模式重排剩余单元 order。
 *
 * 用法（工具链命令，agent 代跑）：
 *   node apps/quiz-app/scripts/plan-generate.mjs --theme <主题名|主题包路径> [选项]
 *     --days-per-unit <n>   实测每单元天数（缺省从 done 历史派生：14 天窗 → 全历史跨度）
 *     --activity <0..1>     活跃率折减（缺省从进度接触日派生，无从派生按 1.0 不折减）
 *     --margin <0..n>       余量系数（默认 0；如 0.25 = 总学程加 25% 余量）
 *     --start YYYY-MM-DD    排期起点（默认今天；不许在过去）
 *     --deadline YYYY-MM-DD 考期（缺省用 plan.json 的 deadline）
 *     --interleave          硬算/概念交错（掌握=重 / 理解·了解=轻，轻先行交替；
 *                           不再「概念前置、硬算后置」）
 *     --auto                自动重排（#125）：先判 shouldReschedule，触发才排（reason 自动
 *                           取判定值 behind|gap）；在轨/今天已重排 → noop exit 0 不写回
 *     --reason behind|gap|manual  审计触发原因（默认 manual；与 --auto 互斥——auto 自己判）
 *     --dry-run             只出建议与报告不写回（教练场景：学习者确认后去掉本 flag 写回）
 *     --out <path>          输出文件（默认写回主题 plan.json——契约三读-改-写）
 *     --json                机器可读（人读日志走 stderr）
 *     --progress <path>     进度文件（活跃率派生用；默认 apps/quiz-app/progress.json）
 *
 * 缺数据明确报错不猜（exit 1）：无 plan.json（生成器只重排不发明）、零 done 历史且
 * 无显式速率、交错判据无数据、起点/deadline 坏值、排不进考期。
 * --auto 的在轨 noop 是 exit 0（不是故障，与 plan-report noop 同约定）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { readPlan } from './lib/plan.mjs';
import { readOralAttempts, mergeOralAttempts, oralAttemptsFromProgress } from './lib/oral.mjs';
import {
  epDepthMap, unitEpOf, generatePlanSchedule, deriveDaysPerUnit, deriveActivity, shouldReschedule,
} from './lib/plan-generate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────
const args = process.argv.slice(2);
const take = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const { dir: THEME_DIR, name: THEME } = resolveThemeDir(
  take('--theme') || process.env.EXAMPLE_THEME || 'dev-intro',
  REPO_ROOT,
);
const AS_JSON = args.includes('--json');
const AUTO = args.includes('--auto');
const DRY_RUN = args.includes('--dry-run');
const REASON = take('--reason');
const say = AS_JSON ? (...a) => console.error(...a) : console.log;
const die = (msg) => { console.error(`❌ ${msg}`); process.exit(1); };

// --auto 与 --reason 互斥（auto 的 reason 是判出来的，不是人挑的）；--reason 值域校验
if (AUTO && REASON !== undefined) {
  die('--auto 与 --reason 互斥——自动模式的原因由 shouldReschedule 判定，不接受手挑');
}
if (REASON !== undefined && !['behind', 'gap', 'manual'].includes(REASON)) {
  die(`--reason "${REASON}" 不在 behind|gap|manual——behind=落后触发、gap=断档回归触发、manual=学习者点名（默认）`);
}

// ── 数据装载 ──────────────────────────────
// plan.json 是本工具的操作对象：缺失/损坏都硬错误（生成器只重排已有计划，不发明计划）
const { present: PLAN_PRESENT, plan, reason: PLAN_REASON, error: PLAN_ERROR } = readPlan(THEME_DIR);
if (!PLAN_PRESENT) {
  die(`主题无可用 plan.json（${join(THEME_DIR, 'plan.json')}：${PLAN_REASON === 'broken' ? `损坏——${PLAN_ERROR}` : '缺失'}）——计划生成器只重排已有计划，不发明计划（要不要排、粒度切多大是内容决策，见契约三）`);
}

// 题库/闪卡/进度：活跃率派生的接触日按本主题 id 集求交（多主题隔离读端过滤红线）
const questionsPath = join(THEME_DIR, 'questions.json');
if (!existsSync(questionsPath)) {
  die(`找不到题库：${questionsPath}——活跃率派生要按本主题题 id 集做接触日过滤`);
}
let questions = [];
try { questions = JSON.parse(readFileSync(questionsPath, 'utf-8')); }
catch { die(`题库解析失败（${questionsPath}）——无法做主题隔离过滤`); }
let flashcards = [];
const flashcardsPath = join(THEME_DIR, 'flashcards.json');
if (existsSync(flashcardsPath)) {
  try { flashcards = JSON.parse(readFileSync(flashcardsPath, 'utf-8')); } catch { flashcards = []; }
}
const PROGRESS_PATH = take('--progress') || join(REPO_ROOT, 'apps', 'quiz-app', 'progress.json');
let progress = null;
if (existsSync(PROGRESS_PATH)) {
  try { progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8')); }
  catch (e) { progress = null; say(`⚠️ 进度文件损坏（${PROGRESS_PATH}：${e.message}）→ 按空进度处理（活跃率派生降级为不折减）`); }
}

// MISSION 排布表（可选）：深度列是交错模式的轻重判据
const missionPath = join(THEME_DIR, 'MISSION.md');
const missionText = existsSync(missionPath) ? readFileSync(missionPath, 'utf-8') : '';
const depthMap = epDepthMap(missionText);
const INTERLEAVE = args.includes('--interleave');
if (INTERLEAVE) {
  const hasEpMapping = (plan.units ?? []).some((u) => u.status !== 'done' && unitEpOf(u) && depthMap[unitEpOf(u)]);
  if (!hasEpMapping) {
    die(`交错判据无数据：剩余单元 title 无考点映射或排布表缺深度列（${missionPath}${existsSync(missionPath) ? '' : ' 不存在'}）——轻重分不出来就不硬交错，去掉 --interleave 按原顺序排`);
  }
}

const now = Date.now();

// ── 自动重排触发判定（v0.27 #125）：判据单源 lib/plan-generate.mjs shouldReschedule ─────
// 口述并流与 activity 派生共用一份（gap 触发的断档判据也要它——四通道接触日）。
const oralAttemptsMerged = mergeOralAttempts(
  readOralAttempts(THEME_DIR),
  oralAttemptsFromProgress(progress, THEME),
);
const autoCheck = shouldReschedule({
  plan, progress, now,
  questionIds: questions.map((q) => q.id),
  cardIds: flashcards.map((f) => f.id),
  theme: THEME,
  oralAttempts: oralAttemptsMerged,
});
// 审计三件：--auto 用判定值（needed 才往下走）；手动 --reason 只取 triggerDays 佐证（不 gate）
let auditReason = REASON ?? 'manual';
let auditTriggerDays = null;
if (AUTO) {
  if (!autoCheck.needed) {
    // 在轨 / 今天已重排 / 无计划 → noop exit 0（不是故障，与 plan-report noop 同约定）
    const WHY = {
      'on-track': '计划在轨（无逾期单元、断档未达回归阈值或后移建议不可算），无需重排',
      'already-rescheduled-today': '今天已重排过（审计幂等闸门），同一天不重复挪日程',
      'no-plan': '计划无单元',
    };
    const noop = {
      tool: 'plan-generate',
      theme: THEME,
      generatedAt: new Date().toISOString(),
      status: 'noop',
      reason: autoCheck.reason,
      note: WHY[autoCheck.reason] ?? autoCheck.reason,
      reschedule: autoCheck,
    };
    if (AS_JSON) console.log(JSON.stringify(noop, null, 2));
    else {
      say(`🗓️ 计划生成 · ${THEME}`);
      say(`   noop（${autoCheck.reason}）：${WHY[autoCheck.reason] ?? autoCheck.reason}——不写任何文件`);
    }
    process.exit(0);
  }
  auditReason = autoCheck.reason;
  auditTriggerDays = autoCheck.triggerDays;
} else if (REASON !== undefined) {
  auditTriggerDays = autoCheck.triggerDays;   // 手动路径也带触发佐证（on-track 时为 null，如实）
}

// ── 实测速率 + 活跃率（缺省派生，显式优先；派生口径单源 lib/plan-generate.mjs）─────
const pace = deriveDaysPerUnit({ plan, now, explicit: take('--days-per-unit') });
if (!pace.ok) die(pace.message);

const explicitActivity = take('--activity');
let activity;
let activitySource;
if (explicitActivity !== undefined) {
  activity = Number(explicitActivity);
  activitySource = 'flag';
  if (!(Number.isFinite(activity) && activity > 0 && activity <= 1)) {
    die(`--activity "${explicitActivity}" 不在 (0,1]——活跃率是折减系数（如 0.54），不是百分数`);
  }
} else {
  const derived = deriveActivity({
    progress, now,
    questionIds: questions.map((q) => q.id),
    cardIds: flashcards.map((f) => f.id),
    theme: THEME,
    oralAttempts: oralAttemptsMerged,
  });
  if (derived !== null) { activity = derived; activitySource = 'derived'; }
  else { activity = 1; activitySource = 'default'; say('⚠️ 进度接触日不足两天，活跃率无从派生 → 按 1.0 不折减（要折减请显式传 --activity，如复盘实测 0.54）'); }
}

// ── 生成（判据与数学单源 lib/plan-generate.mjs；不可行在此报错；审计恒写 v0.27 #125）─────
const result = generatePlanSchedule({
  plan, now,
  daysPerUnit: pace.value,
  activity,
  margin: take('--margin') !== undefined ? Number(take('--margin')) : 0,
  startDate: take('--start'),
  deadline: take('--deadline'),
  interleave: INTERLEAVE,
  depthMap,
  rescheduleAt: now,
  rescheduleReason: auditReason,
  rescheduleTriggerDays: auditTriggerDays,
});
if (!result.ok) die(result.message);

// ── 写回（契约三读-改-写；--dry-run 只出建议不写回 = 重排建议可被学习者否决的执行面：
//    教练场景先 dry-run 报给学习者，点头后去掉本 flag 重跑才落盘；--out 可改投他处做
//    预览/验证，默认写主题 plan.json）─────────
const OUT_PATH = DRY_RUN ? null : resolve(take('--out') ?? join(THEME_DIR, 'plan.json'));
if (OUT_PATH) {
  writeFileSync(OUT_PATH, JSON.stringify(result.plan, null, 2) + '\n');
}

// ── 输出 ──────────────────────────────
const PACE_WHERE = { flag: '显式传入', window: '近 14 天窗派生（对账刀同源）', lifetime: '全历史跨度派生' };
const ACT_WHERE = { flag: '显式传入', derived: '进度接触日派生', default: '无从派生按 1.0' };
const REASON_WHERE = { behind: '落后触发（存在逾期单元）', gap: '断档回归触发（后移建议可算）', manual: '学习者点名' };
const report = {
  tool: 'plan-generate',
  theme: THEME,
  generatedAt: new Date().toISOString(),
  status: DRY_RUN ? 'suggested' : 'ok',
  reschedule: {
    reason: auditReason,
    reasonWhere: REASON_WHERE[auditReason],
    triggerDays: auditTriggerDays,
    at: now,
    dryRun: DRY_RUN,
    autoChecked: AUTO ? autoCheck : null,
  },
  inputs: {
    daysPerUnit: pace.value,
    paceSource: pace.source,
    activity,
    activitySource,
    margin: result.summary.margin,
    start: result.summary.start,
    deadline: result.summary.deadline,
    interleave: INTERLEAVE,
  },
  schedule: result.summary,
  output: OUT_PATH,
};
if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const s = result.summary;
  say(`🗓️ 计划生成 · ${THEME}${DRY_RUN ? '（dry-run 建议，未写回——学习者确认后去掉 --dry-run 重跑生效）' : ''}`);
  say(`   重排原因：${REASON_WHERE[auditReason]}${auditTriggerDays !== null ? `（触发时${auditReason === 'behind' ? '落后' : '断档'} ${auditTriggerDays} 天）` : ''}`);
  say(`   实测速率：${s.daysPerUnit} 天/单元（${PACE_WHERE[pace.source]}）`);
  say(`   活跃率折减：${s.activity}（${ACT_WHERE[activitySource]}）${s.margin ? ` · 余量 ×${1 + s.margin}` : ''}`);
  say(`   排期：剩 ${s.remaining} 单元（重 ${s.heavy} · 轻 ${s.light}）${s.interleave ? ' · 硬算/概念交错' : ' · 原顺序'}`);
  say(`   数学：${s.formula}`);
  if (s.deadline) {
    say(`   对照：考期 ${s.deadline} · ${s.slackDays > 0 ? `富余 ${s.slackDays} 天 ✓` : s.slackDays === 0 ? '贴线到达（零富余）' : '缺口（不应到达此处——生成器已拦）'}`);
  } else {
    say('   对照：未设考期，只排程不对照（要对照补 plan.json deadline 或传 --deadline）');
  }
  say(OUT_PATH ? `   写回：${OUT_PATH}` : '   写回：无（--dry-run）');
  say('   排期表（计划完成日 · 单元）：');
  const orderedUnits = result.plan.units.filter((u) => u.status !== 'done')
    .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : a.plannedDate > b.plannedDate ? 1 : (a.order ?? 0) - (b.order ?? 0)));
  for (const u of orderedUnits) {
    const mark = INTERLEAVE
      ? (depthMap[unitEpOf(u)] ?? '').startsWith('掌握') ? '重' : '轻'
      : null;
    const st = u.status === 'in-progress' ? '[在学]' : u.status === 'paused' ? '[搁置]' : '';
    say(`     ${u.plannedDate} · ${u.id} ${u.title}${mark ? ` [${mark}]` : ''}${st}`);
  }
  // 钩子语气收尾（#125 债务红字退场的同款话术）：只宣告已发生的好事与下一站，零催办
  if (orderedUnits.length > 0) {
    say(`   已重排：下一站「${orderedUnits[0].title}」，日期 ${orderedUnits[0].plannedDate}`);
  }
  if (OUT_PATH === join(THEME_DIR, 'plan.json')) {
    say('   对账验证（直读主题文件，立即生效）：node apps/quiz-app/scripts/plan-report.mjs --theme <主题> --json');
  }
}
