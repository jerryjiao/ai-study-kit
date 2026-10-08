// mastery-cross-fixture.mjs — 掌握度判据 v1.2 跨侧一致夹具（#119 AC3，单一数据源）。
//
// 五考点恰好覆盖 v1.2 全部分支，三处消费同一份：
//   ① scripts/lib/mastery.test.mjs        —— 脚本侧判据直接断言
//   ② src/lib/mastery.test.ts             —— TS 侧判据断言 + 直接 import mastery.mjs 对拍
//   ③ scripts/lib/mastery-report.test.mjs —— CLI 子进程跑 mastery-report --json 端到端断言
// （TS 侧文件内联同款数据——.mjs 无法带类型进 tsc，漂移会被 ② 的逐字段对拍当场抓住。）
//
// oralAttempts 是口头流水原文（target 带 EP 前缀，at 递增）；oralByEp 由
// groupOralAttempts + oralMastery 现算（与 mastery-report 同链路），不是手写结论。
import { groupOralAttempts, oralMastery } from '../oral.mjs';

const qs = (eps) => eps.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep })));

/** 全部题最近一次全对（题主证全满足，五考点差异全在超题证据/口述负面）。 */
export const fixture = {
  questions: qs([
    ['EP-01', ['A1', 'A2']],
    ['EP-02', ['B1', 'B2']],
    ['EP-03', ['C1', 'C2']],
    ['EP-04', ['D1', 'D2']],
    ['EP-05', ['E1', 'E2']],
  ]),
  answers: Object.fromEntries(
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'].map((id) => [id, { correct: true }]),
  ),
  // EP-04 两卡全毕业（替代通道可走通）；EP-03 一卡无 srs 记录（替代通道走不通）
  flashcards: [
    { id: 'F1', examPoint: 'EP-04' },
    { id: 'F2', examPoint: 'EP-04' },
    { id: 'F3', examPoint: 'EP-03' },
  ],
  srs: { F1: { phase: 'review' }, F2: { phase: 'review' } },
  // 口头流水：EP-01 三连对 → 达标（1.0 ≥ 0.85）；EP-03/EP-04 各两对 → 封顶 0.8 未达标；
  // EP-05 最后一答判错 → weak（负面证据优先）。EP-02 无流水 = 无口述数据。
  oralAttempts: [
    { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
    { target: 'EP-01 暂存区', correct: true, at: 2000, source: 'recite' },
    { target: 'EP-01 暂存区', correct: true, at: 3000, source: 'case' },
    { target: 'EP-03 chmod', correct: true, at: 4000, source: 'recall' },
    { target: 'EP-03 chmod', correct: true, at: 5000, source: 'recall' },
    { target: 'EP-04 相对路径', correct: true, at: 6000, source: 'recite' },
    { target: 'EP-04 相对路径', correct: true, at: 7000, source: 'recite' },
    { target: 'EP-05 分支模型', correct: true, at: 8000, source: 'recall' },
    { target: 'EP-05 分支模型', correct: true, at: 9000, source: 'recall' },
    { target: 'EP-05 分支模型', correct: false, at: 10000, source: 'recall' },
  ],
};

/** 口述四态（groupOralAttempts + oralMastery 现算，与 mastery-report 同链路）。 */
export const oralByEp = (() => {
  const groups = groupOralAttempts(fixture.oralAttempts, {});
  const out = {};
  for (const [ep, attempts] of groups.byEp) out[ep] = oralMastery(attempts).status;
  return out;
})();

/** 期望四态（三处断言的同一组结论）。 */
export const expected = {
  'EP-01': 'mastered',   // 口述达标（超题证据主通道；闪卡无关）
  'EP-02': 'mastered',   // 无口述数据 → 零闪卡 chat-first 解锁：题全对即掌握（AC1）
  'EP-03': 'inProgress', // 口述未达标 + 闪卡替代通道未走通（F3 从未复习）
  'EP-04': 'mastered',   // 口述未达标 + 闪卡全毕业 → 替代通道（存量不回退，AC2）
  'EP-05': 'weak',       // 口述 weak → 负面证据优先
};
