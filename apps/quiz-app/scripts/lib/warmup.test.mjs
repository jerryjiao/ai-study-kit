// warmup.test.mjs — 断档回归「热身一题」脚本侧判据单测（node:test，随 pnpm test 跑）。
// 判据在 warmup.mjs（选站三级骨架 + 挑题），与 src/lib/warmup.ts 双实现同构：
// 改判据两边一起改，两边测试都要过（plan.ts/plan.mjs 双实现先例）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmupStation, pickWarmupQuestion, warmupPlannedFrom, nextHookFromStation } from './warmup.mjs';

const NOON = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const AT = NOON(2026, 9, 20);

const q = (id, over = {}) => ({ id, source: 'test-kit', type: 'single', question: id, options: { A: 'a' }, answer: ['A'], ...over });

/** 四态夹具（masteryByExamPoint 的输出形状）：EP-01 在学 / EP-02 weak / EP-03 已掌握 / EP-04 未接触。 */
const POINTS = [
  { ep: 'EP-01', name: '暂存区', status: 'inProgress', openWrongIds: [] },
  { ep: 'EP-02', name: '分支', status: 'weak', openWrongIds: ['GIT-201', 'GIT-202'] },
  { ep: 'EP-03', name: '提交', status: 'mastered', openWrongIds: [] },
  { ep: 'EP-04', name: '远端', status: 'untouched', openWrongIds: [] },
];
const EP_DAYS = { 'EP-01': 'D1', 'EP-02': 'D2', 'EP-03': 'D2', 'EP-04': 'D3' };

// ── 选站三级骨架 ─────────────────────────────────────────
test('选站·落后日程轨插队（仅有目标日）：逾期 day 序 → 该 day 第一个非掌握考点', () => {
  const cd = { overdue: [{ id: 'U-01', day: 'D2', daysOverdue: 3 }, { id: 'U-02', day: 'D1', daysOverdue: 1 }] };
  // D2 先到（更逾期）→ D2 下非掌握按题库序 = EP-02（EP-03 已掌握跳过）
  const s = warmupStation({ points: POINTS, epDays: EP_DAYS, calendarDiff: cd, deadline: '2026-10-15' });
  assert.deepEqual(s, { ep: 'EP-02', name: '分支', reason: 'schedule' });
});

test('选站·零催办：无 deadline 时落后日程轨不存在 → 走补弱轨', () => {
  const cd = { overdue: [{ id: 'U-01', day: 'D2', daysOverdue: 3 }] };
  const s = warmupStation({ points: POINTS, epDays: EP_DAYS, calendarDiff: cd, deadline: null });
  assert.equal(s.reason, 'weak');
});

test('选站·补弱轨：weak 按未毕业错题数降序；平手按题库序', () => {
  const two = [
    { ep: 'EP-05', name: 'x', status: 'weak', openWrongIds: ['A'] },
    { ep: 'EP-02', name: '分支', status: 'weak', openWrongIds: ['A', 'B'] },
  ];
  const s = warmupStation({ points: two, epDays: {}, calendarDiff: { overdue: [] }, deadline: null });
  assert.equal(s.ep, 'EP-02');
  const tie = [
    { ep: 'EP-05', name: 'x', status: 'weak', openWrongIds: ['A'] },
    { ep: 'EP-06', name: 'y', status: 'weak', openWrongIds: ['B'] },
  ];
  assert.equal(warmupStation({ points: tie, epDays: {}, calendarDiff: { overdue: [] }, deadline: null }).ep, 'EP-05');
});

test('选站·结构近似：无 weak → 题库序第一个非掌握；全掌握 → null', () => {
  const noWeak = POINTS.map((p) => (p.status === 'weak' ? { ...p, status: 'inProgress' } : p));
  const s = warmupStation({ points: noWeak, epDays: EP_DAYS, calendarDiff: { overdue: [] }, deadline: null });
  assert.deepEqual(s, { ep: 'EP-01', name: '暂存区', reason: 'structural' });
  const mastered = POINTS.map((p) => ({ ...p, status: 'mastered' }));
  assert.equal(warmupStation({ points: mastered, epDays: EP_DAYS, calendarDiff: { overdue: [] }, deadline: null }), null);
});

// ── 挑题（与 src/lib/warmup.test.ts 同构判据）────────────
const QUESTIONS = [
  q('GIT-001', { examPoint: 'EP-01' }),
  q('GIT-002', { examPoint: 'EP-01' }),
  q('GIT-003', { examPoint: 'EP-01', tier: 'ext' }),   // 拓展层：不进热身池
  q('GIT-101', { examPoint: 'EP-02' }),
];

test('挑题：站点考点第一道未答（墓碑/随机沙盒不算已答）', () => {
  const progress = { answers: {
    'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
  } };
  const pick = pickWarmupQuestion(QUESTIONS, progress, { ep: 'EP-01', name: '暂存区', reason: 'weak' });
  assert.deepEqual(pick, { questionId: 'GIT-002', ep: 'EP-01', name: '暂存区', reason: 'weak' });
});

test('挑题：考点全答过 → 第一道未毕业错题；全对 → 第一道；拓展题恒不进池', () => {
  const wrong = { answers: {
    'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
    'GIT-002': { selected: ['B'], correct: false, submittedAt: AT, streak: 0, wrongCount: 1 },
  } };
  assert.equal(pickWarmupQuestion(QUESTIONS, wrong, { ep: 'EP-01', name: 'x', reason: 'structural' }).questionId, 'GIT-002');
  const allRight = { answers: {
    'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
    'GIT-002': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
  } };
  assert.equal(pickWarmupQuestion(QUESTIONS, allRight, { ep: 'EP-01', name: 'x', reason: 'structural' }).questionId, 'GIT-001');
});

test('挑题：station=null / 站点无计划内题 → 全库回退 fallback（ep 跟随被挑题）', () => {
  assert.deepEqual(
    pickWarmupQuestion(QUESTIONS, { answers: {} }, null),
    { questionId: 'GIT-001', ep: 'EP-01', name: '', reason: 'fallback' },
  );
  const onlyExt = [q('GIT-003', { examPoint: 'EP-01', tier: 'ext' }), q('GIT-101', { examPoint: 'EP-02' })];
  assert.equal(pickWarmupQuestion(onlyExt, { answers: {} }, { ep: 'EP-01', name: 'x', reason: 'weak' }).questionId, 'GIT-101');
});

test('挑题：全拓展题库（计划内为空）→ null', () => {
  const allExt = [q('GIT-003', { tier: 'ext' })];
  assert.equal(pickWarmupQuestion(allExt, { answers: {} }, { ep: 'EP-01', name: 'x', reason: 'weak' }), null);
});

// ── 热身池「计划内」判据（#120 修复：sourceLayers + tier 双过滤与 TS 侧对齐）──
test('warmupPlannedFrom：sourceLayers 配拓展的来源被排除；无映射 = 计划内；tier ext 恒排除', () => {
  const sl = { 'extra-kit': '拓展', 'main-kit': '核心' };
  const planned = warmupPlannedFrom(sl);
  assert.equal(planned(q('A', { source: 'extra-kit' })), false);            // source 层 = 拓展 → 排除
  assert.equal(planned(q('B', { source: 'main-kit' })), true);              // 核心 → 计划内
  assert.equal(planned(q('C', { source: 'unmapped' })), true);              // 无映射 = 无层概念 → 计划内
  assert.equal(planned(q('D', { source: 'main-kit', tier: 'ext' })), false); // tier ext 仍排除（双过滤）
  // 无 sourceLayers（null / 空）→ 退化为仅 tier 过滤（dev-intro 等无配置主题两侧一致）
  const noCfg = warmupPlannedFrom(null);
  assert.equal(noCfg(q('E', { source: 'extra-kit' })), true);
  assert.equal(noCfg(q('F', { source: 'x', tier: 'ext' })), false);
});

test('warmupPlannedFrom 接入 pickWarmupQuestion：教练侧不挑 web 侧刻意排除的拓展题', () => {
  const sl = { 'extra-kit': '拓展' };
  const pool = [
    q('GIT-001', { examPoint: 'EP-01', source: 'extra-kit' }),   // source 层拓展：web 侧排除
    q('GIT-002', { examPoint: 'EP-01', source: 'main-kit' }),
  ];
  const pick = pickWarmupQuestion(pool, { answers: {} }, { ep: 'EP-01', name: 'x', reason: 'weak' }, warmupPlannedFrom(sl));
  assert.equal(pick.questionId, 'GIT-002');                     // 跳过 source 拓展题挑 GIT-002
  // 不传判据（默认回退）时同一池会挑到 GIT-001——宽容降级仅限无配置场景
  assert.equal(pickWarmupQuestion(pool, { answers: {} }, { ep: 'EP-01', name: 'x', reason: 'weak' }).questionId, 'GIT-001');
});

// ── 无 plan 主题的选站路径（#120 修复：noop 也有热身）────────
test('选站·无 plan 主题：calendarDiff/deadline 传 null → 跳过落后日程轨，走补弱/结构轨', () => {
  // 补弱轨优先：有 weak 时
  assert.deepEqual(
    warmupStation({ points: POINTS, epDays: EP_DAYS, calendarDiff: null, deadline: null }),
    { ep: 'EP-02', name: '分支', reason: 'weak' },
  );
  // 无 weak → 结构轨
  const noWeak = POINTS.map((p) => (p.status === 'weak' ? { ...p, status: 'inProgress' } : p));
  assert.deepEqual(
    warmupStation({ points: noWeak, epDays: EP_DAYS, calendarDiff: null, deadline: null }),
    { ep: 'EP-01', name: '暂存区', reason: 'structural' },
  );
});

// ── 下站预告（#124 会话收尾开环预告：选站 → 钩子形状）────────
test('下站预告形状：选站结果补 action/minutes 常量（与 src/lib/nextHook.ts 同源）；null 透传', () => {
  assert.deepEqual(
    nextHookFromStation({ ep: 'EP-02', name: '分支', reason: 'weak' }),
    { ep: 'EP-02', name: '分支', reason: 'weak', action: 'oral-3', minutes: 5 },
  );
  assert.equal(nextHookFromStation(null), null);   // 全掌握/无可推考点 → null，不编预告
});

test('下站预告与热身选站同一套三级判据（同一个 station 进两个消费面，口径不漂移）', () => {
  const cd = { overdue: [{ id: 'U-01', day: 'D2', daysOverdue: 3 }] };
  const s = warmupStation({ points: POINTS, epDays: EP_DAYS, calendarDiff: cd, deadline: '2026-10-15' });
  const hook = nextHookFromStation(s);
  assert.equal(hook.ep, s.ep);                     // 预告考点 = 选站考点（同判据的字面断言）
  assert.equal(hook.reason, s.reason);
  assert.equal(hook.minutes, 5);                   // 微块标准颗粒时长量级
});
