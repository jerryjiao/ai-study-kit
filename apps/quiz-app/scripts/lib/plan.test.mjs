// plan.test.mjs — 学习计划 plan.json 的 sync 契约单测（node:test，随 pnpm test 的 glob 跑）。
// 契约：examples/<theme>/plan.json（可选主题数据，ADR-0009）→ src/data/plan.json。
// 有则原样拷贝；无/损坏/畸形写空计划回退（import 恒可解析，消费端拿到的永远是合法形状）。
// fixtures 见同目录 fixtures/：plan-with（合法计划）/ plan-none（无文件），
// plan-broken-malformed（units 非数组）；非法 JSON 用临时目录现写。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncPlan, readPlan } from './plan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(here, 'fixtures');

const tmpDataDir = () => mkdtempSync(path.join(tmpdir(), 'plan-sync-'));

test('有 plan.json：原样拷进 data 目录（byte 级一致，不改写主题数据），返回单元数', () => {
  const dst = tmpDataDir();
  const r = syncPlan(path.join(FIXTURES, 'plan-with'), dst);
  assert.deepEqual(r, { present: true, units: 4 });
  assert.equal(
    readFileSync(path.join(dst, 'plan.json'), 'utf-8'),
    readFileSync(path.join(FIXTURES, 'plan-with', 'plan.json'), 'utf-8'),
  );
});

test('无 plan.json：写空计划回退 {units:[]}（theme-config 的 {} 回退同风格），present=false', () => {
  const dst = tmpDataDir();
  const r = syncPlan(path.join(FIXTURES, 'plan-none'), dst);
  assert.deepEqual(r, { present: false, units: 0 });
  assert.deepEqual(JSON.parse(readFileSync(path.join(dst, 'plan.json'), 'utf-8')), { units: [] });
});

test('损坏 plan.json（非法 JSON）：warn + 空计划回退，不硬崩 build', () => {
  const themeDir = mkdtempSync(path.join(tmpdir(), 'plan-theme-'));
  writeFileSync(path.join(themeDir, 'plan.json'), '{ not json');
  const dst = tmpDataDir();
  const r = syncPlan(themeDir, dst);
  assert.deepEqual(r, { present: false, units: 0 });
  assert.deepEqual(JSON.parse(readFileSync(path.join(dst, 'plan.json'), 'utf-8')), { units: [] });
});

test('畸形 plan.json（units 非数组）：视为损坏 → 空计划回退', () => {
  const dst = tmpDataDir();
  const r = syncPlan(path.join(FIXTURES, 'plan-broken-malformed'), dst);
  assert.deepEqual(r, { present: false, units: 0 });
  assert.deepEqual(JSON.parse(readFileSync(path.join(dst, 'plan.json'), 'utf-8')), { units: [] });
});

test('readPlan：合法计划返回原文解析结果，缺失/损坏回空计划（派生脚本复用同一读取口径）', () => {
  const ok = readPlan(path.join(FIXTURES, 'plan-with'));
  assert.equal(ok.present, true);
  assert.equal(ok.plan.units.length, 4);
  assert.equal(ok.plan.deadline, '2026-10-15');
  assert.equal(ok.plan.units[0].status, 'done');
  assert.equal(ok.plan.units[0].doneDate, '2026-09-02');
  assert.equal(ok.plan.units[2].plannedDate, undefined); // plannedDate 缺失 = 只进剩余清单的形态
  assert.equal(ok.plan.units[3].day, undefined);

  const none = readPlan(path.join(FIXTURES, 'plan-none'));
  assert.equal(none.present, false);
  assert.deepEqual(none.plan, { units: [] });
});

test('空计划回退幂等：目录已无计划时重复 sync 不改内容', () => {
  const dst = tmpDataDir();
  syncPlan(path.join(FIXTURES, 'plan-none'), dst);
  syncPlan(path.join(FIXTURES, 'plan-none'), dst);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dst, 'plan.json'), 'utf-8')), { units: [] });
});

// ════════════════════════════════════════════════════════════════════
// 派生层（#91）：覆盖 / 节奏·日历对照 / 节奏·速率外推 / 断档（纯函数，无 IO）
// 时间口径：now 是 ms 时间戳，按**本地自然日**解释（srs.ts 的 toDateString 同先例）。
// 测试全部用「本地正午」构造 now / 时间戳，任意时区跑都得同一自然日——跨时区确定。
// ════════════════════════════════════════════════════════════════════
import {
  deriveCoverage, deriveCalendarDiff, deriveProjection, deriveGap, derivePlanReport,
} from './plan.mjs';

/** 本地正午时间戳（h 可覆盖，同一天内任意小时不影响自然日判定）。 */
const NOON = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();
const NOW = NOON(2026, 9, 28); // 「今天」= 2026-09-28

const PLAN4 = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-01', title: '基础', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' },
    { id: 'U-02', title: '进阶', order: 2, plannedDate: '2026-09-08', status: 'in-progress' },
    { id: 'U-03', title: '综合', order: 3, plannedDate: '2026-09-30', status: 'planned' },
    { id: 'U-04', title: '补漏', order: 4, status: 'paused' },
  ],
};

// ── 覆盖 ───────────────────────────────────────────────
test('覆盖：done/total、当前单元（in-progress 优先）、剩余清单按 order（含 paused）', () => {
  const c = deriveCoverage(PLAN4);
  assert.equal(c.done, 1);
  assert.equal(c.total, 4);
  assert.deepEqual(c.byStatus, { planned: 1, 'in-progress': 1, done: 1, paused: 1 });
  assert.equal(c.current.id, 'U-02');           // in-progress 优先当当前单元
  assert.deepEqual(c.remaining.map((u) => u.id), ['U-02', 'U-03', 'U-04']); // 非 done 按 order
  assert.equal(c.remaining[2].status, 'paused'); // paused 未完成 → 进剩余清单
  assert.equal(c.current.plannedDate, '2026-09-08'); // 视图保留 plannedDate/day/topic
});

test('覆盖：无 in-progress 时当前单元 = 第一个 planned（「接下来该做的」）', () => {
  const c = deriveCoverage({ units: [
    { id: 'U-01', title: 'a', order: 1, status: 'done' },
    { id: 'U-02', title: 'b', order: 2, status: 'planned' },
    { id: 'U-03', title: 'c', order: 3, status: 'planned' },
  ] });
  assert.equal(c.current.id, 'U-02');
});

test('覆盖：只剩 done/paused 时当前单元为 null（搁置不算「在做」）', () => {
  const c = deriveCoverage({ units: [
    { id: 'U-01', title: 'a', order: 1, status: 'done' },
    { id: 'U-02', title: 'b', order: 2, status: 'paused' },
  ] });
  assert.equal(c.current, null);
  assert.deepEqual(c.remaining.map((u) => u.id), ['U-02']);
});

test('覆盖：order 是排序真源（输入乱序输出仍按 order）；空计划 0/0', () => {
  const shuffled = { units: [...PLAN4.units].reverse() };
  assert.deepEqual(deriveCoverage(shuffled).remaining.map((u) => u.id), ['U-02', 'U-03', 'U-04']);
  const empty = deriveCoverage({ units: [] });
  assert.deepEqual(empty, { done: 0, total: 0, current: null, remaining: [], byStatus: { planned: 0, 'in-progress': 0, done: 0, paused: 0 } });
});

// ── 节奏·日历对照 ───────────────────────────────────────
test('日历对照：落后——U-02 该 09-08 完成但未完成，今天 09-28 → 落后 20 天', () => {
  const d = deriveCalendarDiff(PLAN4, NOW);
  assert.equal(d.available, true);
  assert.equal(d.today, '2026-09-28');
  assert.equal(d.state, 'behind');
  assert.equal(d.diffDays, -20);                       // 09-08 → 09-28 = 20 天，落后为负
  assert.equal(d.shouldAt.id, 'U-02');                 // 今天该完成到这里（plannedDate<=今天 的最后一个）
  assert.equal(d.actualAt.id, 'U-01');                 // 实际完成到哪（done 按 order 的最后一个）
  assert.deepEqual(d.overdue.map((o) => [o.id, o.daysOverdue]), [['U-02', 20]]);
});

test('日历对照：富余——该到今天的都做完了，下一到期 10-03 → 富余 5 天', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' },
    { id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-20', status: 'done' },
    { id: 'U-03', title: 'c', order: 3, plannedDate: '2026-10-03', status: 'planned' },
  ] }, NOW);
  assert.equal(d.state, 'slack');
  assert.equal(d.diffDays, 5);                         // 09-28 → 10-03
  assert.deepEqual(d.overdue, []);
  assert.equal(d.shouldAt.id, 'U-02');
  assert.equal(d.actualAt.id, 'U-02');
});

test('日历对照：下一单元今天到期（plannedDate==今天）不算逾期 → diffDays 0 / due-today', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' },
    { id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-28', status: 'in-progress' },
  ] }, NOW);
  assert.equal(d.state, 'due-today');
  assert.equal(d.diffDays, 0);
  assert.deepEqual(d.overdue, []);                     // 逾期是严格 < 今天
});

test('日历对照：有日程的都完成了、剩余单元无 plannedDate → cleared（diffDays 无锚点）', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' },
    { id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-10', status: 'done' },
    { id: 'U-03', title: 'c', order: 3, status: 'planned' },   // 无 plannedDate：只进清单不进对照
  ] }, NOW);
  assert.equal(d.state, 'cleared');
  assert.equal(d.diffDays, null);
  assert.equal(d.actualAt.id, 'U-02');
});

test('日历对照：全计划无一个 plannedDate → available=false 诚实降级', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, status: 'planned' },
  ] }, NOW);
  assert.equal(d.available, false);
  assert.equal(d.reason, 'no-dated-units');
});

test('日历对照：今天早于全部日程 → shouldAt=null、富余到第一个日程点', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, plannedDate: '2026-10-05', status: 'planned' },
    { id: 'U-02', title: 'b', order: 2, plannedDate: '2026-10-20', status: 'planned' },
  ] }, NOW);
  assert.equal(d.shouldAt, null);
  assert.equal(d.state, 'slack');
  assert.equal(d.diffDays, 7); // 09-28 → 10-05
});

test('日历对照：paused 逾期也按未完成算（搁置不豁免日程）；乱序完成时 actualAt 取 order 最大', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'paused' },
    { id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-10', status: 'done' },
    { id: 'U-03', title: 'c', order: 3, plannedDate: '2026-09-15', status: 'done' },
  ] }, NOW);
  assert.equal(d.state, 'behind');
  assert.equal(d.diffDays, -27);
  assert.deepEqual(d.overdue.map((o) => o.id), ['U-01']);
  assert.equal(d.actualAt.id, 'U-03'); // 实际完成推进到 order 最大者（非线性完成也如实）
});

test('日历对照：plannedDate 无法解析（如 2026-02-31）→ 按 undated 处理 + invalidDateUnits 披露', () => {
  const d = deriveCalendarDiff({ units: [
    { id: 'U-BAD', title: 'x', order: 1, plannedDate: '2026-02-31', status: 'in-progress' },
    { id: 'U-OK', title: 'y', order: 2, plannedDate: '2026-10-01', status: 'planned' },
  ] }, NOW);
  assert.deepEqual(d.invalidDateUnits, ['U-BAD']);
  assert.equal(d.available, true);          // 还有合法日程单元 → 对照继续
  assert.equal(d.state, 'slack');           // U-BAD 不参与，只剩 10-01 的日程
  assert.equal(d.diffDays, 3);
});

// ── 节奏·速率外推 ───────────────────────────────────────
// 复算说明（手算一遍，防判据漂移；改判据必须重算这里）：
//   今天 2026-09-28，窗口 = 含今天往前 14 个自然日 = 2026-09-15 ～ 2026-09-28。
//   U-01 doneDate 2026-09-20（距今 8 天，落窗）、U-02 doneDate 2026-09-26（距今 2 天，落窗）
//     → eventsInWindow = 2。
//   速率 = 2 单元 ÷ 14 天 = 1/7 ≈ 0.142857 单元/天（分母固定 14，不随首末事件间隔伸缩）。
//   剩余 = U-03 + U-04 = 2 单元 → 还需 2 ÷ (2/14) = 14 天（整向上取整）。
//   预计完成日 = 2026-09-28 + 14 天 = 2026-10-12。
//   deadline 2026-10-15 → slack = 10-15 − 10-12 = +3 天（富余为正）。
const PLAN_PROJ = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-20' },
    { id: 'U-02', title: 'b', order: 2, status: 'done', doneDate: '2026-09-26' },
    { id: 'U-03', title: 'c', order: 3, status: 'planned' },
    { id: 'U-04', title: 'd', order: 4, status: 'planned' },
  ],
};

test('速率外推：近 14 天 2 完成 → 预计 2026-10-12 完成，比 deadline 富余 3 天（手算见上）', () => {
  const p = deriveProjection(PLAN_PROJ, NOW);
  assert.equal(p.available, true);
  assert.equal(p.windowDays, 14);
  assert.equal(p.eventsInWindow, 2);
  assert.equal(p.ratePerDay, 2 / 14);
  assert.equal(p.remaining, 2);
  assert.equal(p.estimatedDays, 14);
  assert.equal(p.estimatedDoneDate, '2026-10-12');
  assert.equal(p.slackDays, 3);
  assert.equal(p.state, 'slack');
});

test('速率外推窗口边界：doneDate=今天−13（09-15）落窗、今天−14（09-14）不落窗；doneDate=今天也落窗', () => {
  const p = deriveProjection({ units: [
    { id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-15' }, // 距今 13 天 → 窗内
    { id: 'U-02', title: 'b', order: 2, status: 'done', doneDate: '2026-09-14' }, // 距今 14 天 → 窗外
    { id: 'U-03', title: 'c', order: 3, status: 'done', doneDate: '2026-09-28' }, // 今天 → 窗内
    { id: 'U-04', title: 'd', order: 4, status: 'planned' },
  ] }, NOW);
  assert.equal(p.eventsInWindow, 2);
  // 复算：2/14 每天，剩 1 单元 → 1 ÷ (2/14) = 7 天 → 09-28 + 7 = 10-05
  assert.equal(p.estimatedDays, 7);
  assert.equal(p.estimatedDoneDate, '2026-10-05');
});

test('速率外推降级：近 14 天无完成事件（doneDate 太老或缺失）→ 不硬算，available=false', () => {
  const p = deriveProjection(PLAN4, NOW); // 唯一 done 是 09-02（距今 26 天，窗外）
  assert.equal(p.available, false);
  assert.equal(p.reason, 'no-recent-completions');
  assert.equal(p.ratePerDay, null);
  assert.equal(p.estimatedDoneDate, null);
  assert.equal(p.remaining, 3);           // 数字照实给，只是不外推
  assert.ok(p.note && p.note.includes('不硬算'));   // 降级要给人读的理由
});

test('速率外推降级：全部完成 → complete；空计划 → no-units', () => {
  assert.equal(deriveProjection({ units: PLAN_PROJ.units.slice(0, 2) }, NOW).reason, 'complete');
  assert.equal(deriveProjection({ units: [] }, NOW).reason, 'no-units');
});

test('速率外推：无 deadline → 预计完成日照算，slack 诚实置 null（no-deadline）', () => {
  const p = deriveProjection({ units: PLAN_PROJ.units }, NOW); // 同 PLAN_PROJ 但去掉 deadline
  assert.equal(p.available, true);
  assert.equal(p.estimatedDoneDate, '2026-10-12');
  assert.equal(p.deadline, null);
  assert.equal(p.slackDays, null);
  assert.equal(p.state, 'no-deadline');
});

test('速率外推：速率撑不到 deadline → 缺口为负（deficit）。复算：1 完成/14 天 × 剩 10 = 140 天', () => {
  // 复算：events=1（doneDate=今天）→ rate=1/14；剩 10 单元 → 10×14 = 140 天；
  //   09-28 + 140 天 = 2027-02-15（9月剩2 + 10月31 + 11月30 + 12月31 + 1月31 + 2月15）；
  //   deadline 2026-12-01 → slack = 12-01 − 2027-02-15 = −76 天（缺口）。
  const p = deriveProjection({
    deadline: '2026-12-01',
    units: [
      { id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-28' },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `U-${String(i + 2).padStart(2, '0')}`, title: 'x', order: i + 2, status: 'planned' })),
    ],
  }, NOW);
  assert.equal(p.eventsInWindow, 1);
  assert.equal(p.estimatedDays, 140);
  assert.equal(p.estimatedDoneDate, '2027-02-15');
  assert.equal(p.slackDays, -76);
  assert.equal(p.state, 'deficit');
});

// ── 断档天数 ───────────────────────────────────────────
test('断档：三通道（answers/srs/课学完）取最大，自然日差，报来源', () => {
  const g = deriveGap({
    answers: { A: { submittedAt: NOON(2026, 9, 25, 9) } },
    srs: { 'FC-1': { updatedAt: NOON(2026, 9, 27, 22) } },
    coursesRead: { 't/git.html': NOON(2026, 9, 20, 10) },
  }, NOW, { questionIds: ['A'], cardIds: ['FC-1'], theme: 't' });
  assert.equal(g.available, true);
  assert.equal(g.source, 'srs');
  assert.equal(g.daysSinceLastContact, 1);   // 09-27 → 09-28（自然日，不是 24h 取整）
  assert.equal(g.lastContactAt, NOON(2026, 9, 27, 22));
});

test('断档：今天接触过 → 0 天；墓碑答案也算接触（提交发生过）', () => {
  const g = deriveGap({
    answers: { A: { submittedAt: NOON(2026, 9, 28, 8), deletedAt: NOON(2026, 9, 28, 9) } },
  }, NOW, { questionIds: ['A'], cardIds: [], theme: 't' });
  assert.equal(g.available, true);
  assert.equal(g.daysSinceLastContact, 0);
  assert.equal(g.source, 'answers');
});

test('断档：无任何接触时间戳 → 诚实降级 no-contact（不是 0 天）', () => {
  const g = deriveGap({}, NOW, { questionIds: [], cardIds: [], theme: 't' });
  assert.equal(g.available, false);
  assert.equal(g.reason, 'no-contact');
  assert.equal(g.daysSinceLastContact, null);
});

test('断档·多主题隔离：其他主题的 answers/srs/课学完记录不参与（读端过滤红线）', () => {
  const g = deriveGap({
    answers: { A: { submittedAt: NOON(2026, 9, 25) }, OTHER: { submittedAt: NOON(2026, 9, 27) } },
    srs: { 'FC-1': { updatedAt: NOON(2026, 9, 20) }, 'FC-9': { updatedAt: NOON(2026, 9, 27) } },
    coursesRead: { 't/x.html': NOON(2026, 9, 18), 'other/y.html': NOON(2026, 9, 27) },
  }, NOW, { questionIds: ['A'], cardIds: ['FC-1'], theme: 't' });
  assert.equal(g.source, 'answers');               // 本主题最晚接触 = A 的 09-25
  assert.equal(g.daysSinceLastContact, 3);         // 09-25 → 09-28；OTHER/FC-9/other 主题全被滤掉
});

// ── 总装 + fixture 集成 ────────────────────────────────
test('derivePlanReport 总装：plan-with fixture 四组信号一次派生（含降级面）', () => {
  const { plan } = readPlan(path.join(FIXTURES, 'plan-with'));
  const r = derivePlanReport({ plan, progress: {}, now: NOW, questionIds: [], cardIds: [], theme: 'plan-with' });
  assert.equal(r.coverage.done, 1);
  assert.equal(r.coverage.current.id, 'U-02');
  assert.deepEqual(r.coverage.remaining.map((u) => u.id), ['U-02', 'U-03', 'U-04']);
  assert.equal(r.calendarDiff.state, 'behind');               // U-02 该 09-08 完成，今天 09-28
  assert.equal(r.calendarDiff.diffDays, -20);
  assert.equal(r.projection.available, false);                // 唯一 done 的 doneDate 09-02 在窗外
  assert.equal(r.projection.reason, 'no-recent-completions');
  assert.equal(r.gap.available, false);                       // 空进度 → 无接触
  assert.equal(r.gap.reason, 'no-contact');
});

test('空计划（无 plan.json 的回退形态）走派生层：全降级不编数', () => {
  const r = derivePlanReport({ plan: { units: [] }, progress: {}, now: NOW, questionIds: [], cardIds: [], theme: 'x' });
  assert.deepEqual(r.coverage.remaining, []);
  assert.equal(r.calendarDiff.available, false);
  assert.equal(r.projection.available, false);
  assert.equal(r.gap.available, false);
});

test('脏数据容忍：units 里的非对象条目跳过不崩（readPlan 只保证 units 是数组，不保证条目干净）', () => {
  const dirty = { units: [null, 42, PLAN4.units[0], PLAN4.units[1]] }; // U-01 done + U-02 in-progress
  assert.equal(deriveCoverage(dirty).total, 2);
  assert.equal(deriveCoverage(dirty).done, 1);
  assert.equal(deriveCoverage(dirty).current.id, 'U-02');
  assert.equal(deriveCalendarDiff(dirty, NOW).state, 'behind');   // U-02 plannedDate 09-08 逾期
  assert.equal(deriveProjection(dirty, NOW).reason, 'no-recent-completions');
});
