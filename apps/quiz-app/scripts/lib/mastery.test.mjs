// mastery.test.mjs — 考点掌握度判据单测（node:test，随 pnpm test 的 glob 跑）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  streakToPass, isOpenWrong, epNameMap, masteryByExamPoint, rankWeakness, isFlashGraduated,
} from './mastery.mjs';

const qs = (eps) => eps.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep })));
const rec = (extra = {}) => ({ correct: true, ...extra });

test('streakToPass 阈值随历史错次递增（与 progress.ts 同口径）', () => {
  assert.equal(streakToPass(1), 1);
  assert.equal(streakToPass(0), 1);
  assert.equal(streakToPass(2), 2);
  assert.equal(streakToPass(5), 3); // 封顶
});

test('isOpenWrong：无 streak 记录不是错题，未达阈值是', () => {
  assert.equal(isOpenWrong({ streak: undefined }), false);
  assert.equal(isOpenWrong({ streak: 0, wrongCount: 1 }), true);
  assert.equal(isOpenWrong({ streak: 1, wrongCount: 1 }), false);  // 错 1 次连对 1 次 = 毕业
  assert.equal(isOpenWrong({ streak: 1, wrongCount: 2 }), true);   // 错 2 次需连对 2 次
});

test('epNameMap 解析 MISSION 排布表，缺表回退空映射', () => {
  const md = `| 考点id | 考点 | 深度 |\n|---|---|---|\n| EP-01 | 暂存区 | 掌握 |\n| EP-02 | revert | 理解 |`;
  assert.deepEqual(epNameMap(md), { 'EP-01': '暂存区', 'EP-02': 'revert' });
  assert.deepEqual(epNameMap(''), {});
});

test('untouched：一题未答', () => {
  const r = masteryByExamPoint({ questions: qs([['EP-01', ['A', 'B']]]), answers: {} });
  assert.equal(r.points[0].status, 'untouched');
});

test('mastered：全答对且无未毕业错题', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ streak: 1, wrongCount: 1 }) }, // B 曾错已毕业
  });
  assert.equal(r.points[0].status, 'mastered');
});

// ── 闪卡毕业组件（v1.2：可选替代通道，不再硬性必经——#119 / spec #118）──────
const fcs = (pairs) => pairs.map(([id, ep]) => ({ id, examPoint: ep }));
const srsRec = (extra = {}) => ({ phase: 'review', ...extra });

test('isFlashGraduated：review 毕业learning/无记录/墓碑不毕业', () => {
  assert.equal(isFlashGraduated(srsRec()), true);
  assert.equal(isFlashGraduated(srsRec({ phase: 'learning' })), false);
  assert.equal(isFlashGraduated(srsRec({ phase: 'relearning' })), false);
  assert.equal(isFlashGraduated(undefined), false);
  assert.equal(isFlashGraduated(srsRec({ deletedAt: 123 })), false); // 重置墓碑 = 未毕业
});

test('v1.2 解锁（AC1）：题全对 + 零 srs 记录（映射了卡也从未复习）→ mastered，闪卡不阻塞', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: {}, // 从不使用闪卡的主题：无 srs 记录
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.deepEqual(r.points[0].flashOpenIds, ['FC-1']); // 未毕业仍如实上报（展示用）
  assert.equal(r.points[0].flashGraduated, 0);
});

test('v1.2 解锁：题全对 + 闪卡在学（learning，有进度未毕业）→ mastered（SRS 彻底可选）', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec({ phase: 'learning' }) },
  });
  assert.equal(r.points[0].status, 'mastered'); // v1.1 此处是 inProgress；闪卡毕业降为可选通道
});

test('存量不回退（AC2）：映射闪卡全部毕业（review）→ mastered 成立', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01'], ['FC-2', 'EP-01']]),
    srs: { 'FC-1': srsRec(), 'FC-2': srsRec() },
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.equal(r.points[0].flashGraduated, 2);
});

test('闪卡映射按考点隔离：别的考点的卡不影响本考点，无 examPoint 的卡不参与', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A']], ['EP-02', ['B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-x', 'EP-02'], ['FC-bare', undefined]]),
    srs: { 'FC-x': srsRec({ phase: 'learning' }) }, // EP-02 的卡没毕业
  });
  assert.equal(r.points[0].status, 'mastered'); // EP-01 无映射卡，不受影响
  assert.equal(r.points[1].status, 'mastered'); // EP-02 题全对即掌握（v1.2：闪卡不阻塞）
  assert.equal(r.points[0].flashMapped, 0);
});

test('闪卡组件不掩盖负面证据：题有错 + 闪卡毕业了也还是 weak', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: false, streak: 0, wrongCount: 1 }) },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec() },
  });
  assert.equal(r.points[0].status, 'weak');
});

// ── 口述四态通道（v1.2 超题证据主通道，#119）─────────────────────
// 口述达标（oralByEp ep→'mastered'）= 主通道；有数据未达标 = 不满足主通道（可被闪卡
// 替代通道救回）；weak = 负面证据优先（压成 weak）；无口述数据 = 不阻塞（上面解锁测试已覆盖）。

test('口述达标：题全对 + oralStatus mastered → mastered（映射闪卡未毕业也放行）', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec({ phase: 'learning' }) },
    oralByEp: { 'EP-01': 'mastered' },
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.equal(r.points[0].oralStatus, 'mastered');
});

test('口述未达标 + 闪卡未毕业 → inProgress（超题证据不满足，但不构成负面）', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: {},
    oralByEp: { 'EP-01': 'inProgress' },
  });
  assert.equal(r.points[0].status, 'inProgress');
  assert.equal(r.points[0].oralStatus, 'inProgress');
});

test('口述未达标 + 映射闪卡全毕业 → mastered（闪卡替代通道，存量行为不回退）', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec() },
    oralByEp: { 'EP-01': 'inProgress' },
  });
  assert.equal(r.points[0].status, 'mastered');
});

test('口述 weak → 负面证据优先：题全对 + 闪卡全毕业也压成 weak', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec() },
    oralByEp: { 'EP-01': 'weak' },
  });
  assert.equal(r.points[0].status, 'weak');
});

test('口述 positive 不越权：题没刷（untouched）口头再好也不算掌握；口头 weak 一题未答也 weak', () => {
  const good = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: {},
    oralByEp: { 'EP-01': 'mastered' },
  });
  assert.equal(good.points[0].status, 'untouched'); // 验效果靠题
  const bad = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: {},
    oralByEp: { 'EP-01': 'weak' },
  });
  assert.equal(bad.points[0].status, 'weak'); // 负面证据优先（与 mergeMastery 同规则）
});

test('oralByEp 兼容 Map 传入；无口述数据的考点 oralStatus = null', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A']], ['EP-02', ['B']]]),
    answers: { A: rec(), B: rec() },
    oralByEp: new Map([['EP-01', 'mastered']]),
  });
  assert.equal(r.points[0].oralStatus, 'mastered');
  assert.equal(r.points[1].oralStatus, null);
});

// ── 跨侧一致夹具（#119 AC3）────────────────────────────────────
// 数据源 = fixtures/mastery-cross-fixture.mjs（单一来源）；同一夹具在
// src/lib/mastery.test.ts（TS 侧判据 + import 本模块对拍）与
// scripts/lib/mastery-report.test.mjs（CLI 子进程 --json 端到端）断言同一组期望。
import { fixture as CROSS_FIXTURE_DATA, oralByEp as CROSS_ORAL, expected as CROSS_EXPECTED } from './fixtures/mastery-cross-fixture.mjs';

test('跨侧一致夹具：v1.2 五分支（口述达标/无数据解锁/证据不足/闪卡替代/口述负面）', () => {
  const r = masteryByExamPoint({
    questions: CROSS_FIXTURE_DATA.questions,
    answers: CROSS_FIXTURE_DATA.answers,
    flashcards: CROSS_FIXTURE_DATA.flashcards,
    srs: CROSS_FIXTURE_DATA.srs,
    oralByEp: CROSS_ORAL,
  });
  const got = Object.fromEntries(r.points.map((p) => [p.ep, p.status]));
  assert.deepEqual(got, CROSS_EXPECTED);
});

test('weak：毕业中（streak 未达阈值）即使最近一次答对', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: true, streak: 1, wrongCount: 2 }) }, // 错 2 次才连对 1 次
  });
  assert.equal(r.points[0].status, 'weak');
  assert.deepEqual(r.points[0].openWrongIds, ['B']);
});

test('weak：最近一次答错', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: false, streak: 0, wrongCount: 1 }) },
  });
  assert.equal(r.points[0].status, 'weak');
});

test('inProgress：部分作答且无负面证据', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B', 'C']]]),
    answers: { A: rec(), B: rec() },
  });
  assert.equal(r.points[0].status, 'inProgress');
});

test('自评未判（correct===null）：算已答、不算掌握也不算负面', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: { correct: null } },
  });
  assert.equal(r.points[0].answered, 2);
  assert.equal(r.points[0].status, 'inProgress'); // 无负面但正向证据不全
});

test('墓碑与随机沙盒不计入', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: {
      A: rec({ deletedAt: 123 }),          // 已删
      B: rec({ fromRandom: true }),        // 随机沙盒
    },
  });
  assert.equal(r.points[0].answered, 0);
  assert.equal(r.points[0].status, 'untouched');
});

test('多主题隔离：题库外的 answers 记录不参与', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A']]]),
    answers: { A: rec(), OTHER: rec({ correct: false, streak: 0, wrongCount: 1 }) },
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.equal(r.points.length, 1);
});

test('无 examPoint 的题进 untracked，不进考点报告', () => {
  const r = masteryByExamPoint({
    questions: [{ id: 'X', topic: 'misc' }, { id: 'A', examPoint: 'EP-01' }],
    answers: { A: rec() },
  });
  assert.equal(r.untracked, 1);
  assert.equal(r.points.length, 1);
});

test('rankWeakness：weak 先于 inProgress，weak 按未毕业数降序', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']], ['EP-02', ['C', 'D']], ['EP-03', ['E']], ['EP-04', ['F', 'G']]]),
    answers: {
      A: rec({ correct: false, streak: 0, wrongCount: 1 }),  // EP-01 weak，1 未毕业
      B: rec(),
      C: rec({ correct: false, streak: 0, wrongCount: 2 }),  // EP-02 weak，1 未毕业
      D: rec({ correct: false, streak: 0, wrongCount: 1 }),  // EP-02 又一未毕业
      E: rec(),                                             // EP-03 mastered
      F: rec(),                                             // EP-04 inProgress（G 未答）
    },
  });
  const rank = rankWeakness(r.points).map((p) => p.ep);
  assert.deepEqual(rank, ['EP-02', 'EP-01', 'EP-04']); // 2 未毕业 > 1 未毕业 > inProgress
});
