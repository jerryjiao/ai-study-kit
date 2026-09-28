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
 *   4. 断档天数：距最后一次学习接触（answers/srs/课学完三通道取最大，
 *      与本主题题/卡 id 集求交做多主题隔离）
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
 *   - 进度默认 apps/quiz-app/progress.json（本地文件口径；要看线上进度先
 *     `curl -sf $SERVER/api/progress -o /tmp/p.json` 再传进来）。文件不存在 = 空进度
 *     （断档无接触可算，不是故障）；文件损坏按空进度处理并打 warn。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { readPlan, derivePlanReport } from './lib/plan.mjs';

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

// ── noop 路径：主题无 plan.json（可选文件），四组信号无数据可派生 ──
if (!PLAN_PRESENT) {
  const noop = {
    tool: 'plan-report',
    theme: THEME,
    generatedAt: new Date().toISOString(),
    status: 'noop',
    reason, // missing | broken
    note: '主题无 plan.json（可选主题数据），计划信号无数据可派生；详见 docs/adr/0009',
  };
  if (AS_JSON) console.log(JSON.stringify(noop, null, 2));
  else say(`🗓️ 学习计划对账 · ${THEME}\n   无 plan.json（reason: ${reason}）→ noop，无计划信号可派生`);
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
}
