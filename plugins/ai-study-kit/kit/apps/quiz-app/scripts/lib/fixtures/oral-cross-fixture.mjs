// oral-cross-fixture.mjs — 口头四态跨侧一致夹具（#122，单一数据源）。
//
// 覆盖 oralMastery 全部分支 + mergeOralAttempts 去重/排序，两处消费同一份：
//   ① scripts/lib/oral.test.mjs —— 脚本侧判据直接断言
//   ② src/lib/oral.test.ts      —— TS 侧断言 + 直接 import oral.mjs 对拍（经 oral.d.mts）
// （TS 侧文件内联同款数据——.mjs 无法带类型进 tsc，漂移会被 ② 的逐字段对拍当场抓住。）
// expected 的 score 保留 3 位小数（与 oralMastery 的 Math.round(x*1000)/1000 同口径）。

/** at 递增的流水构造捷径。 */
const seq = (base, target, flags, source = 'recall') =>
  flags.map((correct, i) => ({ target, correct, at: base + i, source }));

export const scenarios = [
  {
    name: '空流水 → untouched',
    attempts: [],
    expected: { asked: 0, correct: 0, score: null, status: 'untouched' },
  },
  {
    name: '1 次全对 → 封顶 0.5，inProgress（防一次蒙对）',
    attempts: seq(1000, 'EP-01 暂存区', [true]),
    expected: { asked: 1, correct: 1, score: 0.5, status: 'inProgress' },
  },
  {
    name: '2 次全对 → 封顶 0.8，inProgress',
    attempts: seq(2000, 'EP-02 revert', [true, true]),
    expected: { asked: 2, correct: 2, score: 0.8, status: 'inProgress' },
  },
  {
    name: '3 次全对 → 1.0 ≥ 0.85，mastered',
    attempts: seq(3000, 'EP-03 chmod', [true, true, true]),
    expected: { asked: 3, correct: 3, score: 1, status: 'mastered' },
  },
  {
    name: '最近一次判错 → weak（负面证据优先，加权分 0.643 也不救）',
    attempts: seq(4000, 'EP-04 相对路径', [true, true, false]),
    expected: { asked: 3, correct: 2, score: 0.643, status: 'weak' },
  },
  {
    name: '加权分过弱线（全错）→ weak',
    attempts: seq(5000, 'EP-05 分支模型', [false, false]),
    expected: { asked: 2, correct: 0, score: 0, status: 'weak' },
  },
  {
    name: '5 次窗口：旧错在窗外，近 5 次全对 → mastered',
    attempts: seq(6000, 'EP-06 对象模型', [false, true, true, true, true, true]),
    expected: { asked: 6, correct: 5, score: 1, status: 'mastered' },
  },
  {
    name: '乱序输入按 at 取信（与 3 次全对同款结论）',
    attempts: [
      { target: 'EP-03 chmod', correct: true, at: 3002, source: 'case' },
      { target: 'EP-03 chmod', correct: true, at: 3000, source: 'recall' },
      { target: 'EP-03 chmod', correct: true, at: 3001, source: 'recite' },
    ],
    expected: { asked: 3, correct: 3, score: 1, status: 'mastered' },
  },
];

/** mergeOralAttempts 跨侧场景：两路落同一笔（去重）+ 各自独有（并集）+ 乱序（升序）。 */
export const mergePairs = [
  {
    name: '两路同笔去重 + 独有条目并集',
    a: [
      { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: false, at: 2000, source: 'recall' },
    ],
    b: [
      { target: 'EP-01 暂存区', correct: false, at: 2000, source: 'recall' }, // 与 a 第二条同四元组 → 去重
      { target: 'EP-01 暂存区', correct: true, at: 3000, source: 'recite' },  // b 独有
    ],
    expected: [
      { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: false, at: 2000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: true, at: 3000, source: 'recite' },
    ],
  },
  {
    name: 'theme 标记不进四元组（包内/API 两路的同一笔仍是一笔）',
    a: [{ target: 'EP-02 revert', correct: true, at: 100, source: 'recall' }],
    b: [{ theme: 'dev-intro', target: 'EP-02 revert', correct: true, at: 100, source: 'recall' }],
    expected: [{ target: 'EP-02 revert', correct: true, at: 100, source: 'recall' }],
  },
];
