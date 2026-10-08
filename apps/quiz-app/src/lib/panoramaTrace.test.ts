// panoramaTrace.test.ts — 考点学习轨迹派生单测（v0.25 票⑤，spec #110 测试决策：
// 「考点轨迹派生函数——覆盖：首答/连错/掌握节点、墓碑与撤销语义、多端合并后的顺序稳定性」）。
// 只测外部行为：progress 快照（输入）→ 事件序列（输出），不测内部遍历细节。
//
// 墓碑语义与仓库既有读端口径对齐（progress.ts）：deletedAt 字段存在即视为已删（不比
// 时间戳）；「撤销后重答」的复活发生在 merge 层——新记录不带 deletedAt，recTs（墓碑优先）
// 大于旧墓碑即整体替换。故复活用 mergeProgress 场景验证，单条记录内不构造「复活」。
import { describe, it, expect } from 'vitest';
import { deriveEpTrace } from './panoramaTrace';
import { mergeProgress } from './progress';
import type { OralAttempt, Progress, AnswerRecord, SrsState } from '../types';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 8, 12); // 2026-09-12（固定锚，测试不随「今天」漂移）

const rec = (at: number, extra: Partial<AnswerRecord> = {}): AnswerRecord => ({
  selected: ['A'],
  correct: true,
  submittedAt: at,
  ...extra,
});
const srsReview = (at: number, extra: Partial<SrsState> = {}): SrsState => ({
  ease: 2.5, interval: 30, reps: 4, due: at + DAY, updatedAt: at, phase: 'review', stepIdx: 0, lapses: 0,
  ...extra,
});
const oral = (at: number, correct: boolean): OralAttempt => ({
  target: 'EP-01 暂存区', correct, at, source: 'recall',
});
const derive = (
  answers: Record<string, AnswerRecord>,
  srs: Record<string, SrsState> = {},
  mastered = false,
  questionIds: string[] = ['Q1', 'Q2', 'Q3'],
  flashcardIds: string[] = ['FC-1'],
  oralAttempts: OralAttempt[] = [],
) => deriveEpTrace({ questionIds, flashcardIds, answers, srs, mastered, oralAttempts });
const prog = (answers: Record<string, AnswerRecord>, srs: Record<string, SrsState> = {}): Progress => ({
  version: 1, answers, srs,
});

describe('deriveEpTrace 事件派生（首答/答对/连错/闪卡毕业/掌握）', () => {
  it('首答：最早一次有效提交出「首次接触」，与对错无关', () => {
    const ev = derive({ Q2: rec(T0), Q1: rec(T0 + DAY, { correct: false, streak: 0, wrongCount: 1 }) });
    expect(ev[0]).toEqual({ at: T0, kind: 'first' });
  });

  it('答对逐题出事件；时间相邻的连续答错合并成「连错 N」（at 与锚=run 内最后一次）', () => {
    const ev = derive({
      Q1: rec(T0, { correct: false, streak: 0, wrongCount: 1 }),
      Q2: rec(T0 + DAY, { correct: false, streak: 0, wrongCount: 1 }),
      Q3: rec(T0 + 2 * DAY),
    });
    expect(ev).toEqual([
      { at: T0, kind: 'first' },
      { at: T0 + DAY, kind: 'wrongRun', qid: 'Q2', run: 2 },
      { at: T0 + 2 * DAY, kind: 'correct', qid: 'Q3' },
    ]);
  });

  it('单个答错出「答错」不升级连错；被答对隔开的答错不合并', () => {
    const ev = derive({
      Q1: rec(T0, { correct: false, streak: 0, wrongCount: 1 }),
      Q2: rec(T0 + DAY),
      Q3: rec(T0 + 2 * DAY, { correct: false, streak: 0, wrongCount: 2 }),
    });
    expect(ev.filter((e) => e.kind === 'wrong' || e.kind === 'wrongRun')).toEqual([
      { at: T0, kind: 'wrong', qid: 'Q1' },
      { at: T0 + 2 * DAY, kind: 'wrong', qid: 'Q3' },
    ]);
  });

  it('自评未判（correct=null）无结果可述不出答题事件，但计入首次接触', () => {
    const ev = derive({ Q1: rec(T0, { correct: null }), Q2: rec(T0 + DAY) });
    expect(ev).toEqual([
      { at: T0, kind: 'first' },
      { at: T0 + DAY, kind: 'correct', qid: 'Q2' },
    ]);
  });

  it('掌握：仅 mastered 才出「考点掌握」，时间 = 各题最后提交 ∪ 各卡毕业的 max', () => {
    const srs = { 'FC-1': srsReview(T0 + 3 * DAY) };
    const answers = { Q1: rec(T0), Q2: rec(T0 + DAY), Q3: rec(T0 + 2 * DAY) };
    const ev = derive(answers, srs, true);
    expect(ev[ev.length - 1]).toEqual({ at: T0 + 3 * DAY, kind: 'mastered' });
    // 非 mastered（判据未达）→ 无掌握事件，闪卡毕业照出
    const ev2 = derive(answers, srs, false);
    expect(ev2.some((e) => e.kind === 'mastered')).toBe(false);
    expect(ev2).toContainEqual({ at: T0 + 3 * DAY, kind: 'flashGrad', cardId: 'FC-1' });
  });

  it('闪卡：learning 未毕业 / 墓碑卡不出毕业事件，仅 review 态出', () => {
    const srs = {
      'FC-1': srsReview(T0 + DAY),
      'FC-2': srsReview(T0 + DAY, { phase: 'learning', interval: 0.007 }),
    };
    expect(derive({}, srs).filter((e) => e.kind === 'flashGrad')).toHaveLength(1);
    const tombed = derive({}, { 'FC-1': srsReview(T0, { deletedAt: T0 + 1 }) });
    expect(tombed.filter((e) => e.kind === 'flashGrad')).toHaveLength(0);
  });
});

describe('deriveEpTrace 口述事件（v0.26 #123 微块——全景「今日触达」的节点痕迹）', () => {
  it('微块 3 题 = 3 条口述事件（对→oralCorrect / 错→oralWrong），不合并、逐笔可对账', () => {
    const ev = derive(
      { Q1: rec(T0) }, {}, false, ['Q1', 'Q2', 'Q3'], ['FC-1'],
      [oral(T0 + 5 * DAY, true), oral(T0 + 5 * DAY + 60_000, true), oral(T0 + 5 * DAY + 120_000, false)],
    );
    expect(ev.filter((e) => e.kind === 'oralCorrect' || e.kind === 'oralWrong')).toEqual([
      { at: T0 + 5 * DAY, kind: 'oralCorrect' },
      { at: T0 + 5 * DAY + 60_000, kind: 'oralCorrect' },
      { at: T0 + 5 * DAY + 120_000, kind: 'oralWrong' },
    ]);
  });

  it('chat-first 考点（只有口述、无答题无卡）也有轨迹：首触 = 最早口述', () => {
    const ev = deriveEpTrace({
      questionIds: ['Q1'], flashcardIds: [], answers: {}, srs: {}, mastered: false,
      oralAttempts: [oral(T0 + 2 * DAY, true), oral(T0 + DAY, false)],
    });
    expect(ev).toEqual([
      { at: T0 + DAY, kind: 'first' },
      { at: T0 + DAY, kind: 'oralWrong' },
      { at: T0 + 2 * DAY, kind: 'oralCorrect' },
    ]);
  });

  it('首触取答题与口述的最早；掌握事件时间集含口述（超题证据不漏时戳）', () => {
    const answers = { Q1: rec(T0 + 2 * DAY), Q2: rec(T0 + 3 * DAY), Q3: rec(T0 + 4 * DAY) };
    const ev = deriveEpTrace({
      questionIds: ['Q1', 'Q2', 'Q3'], flashcardIds: [], answers, srs: {}, mastered: true,
      oralAttempts: [oral(T0 + DAY, true)],                       // 口述比全部答题都早
    });
    expect(ev[0]).toEqual({ at: T0 + DAY, kind: 'first' });       // 首触锚到口述
    expect(ev[ev.length - 1]).toEqual({ at: T0 + 4 * DAY, kind: 'mastered' }); // max = 最晚答题
    const lateOral = deriveEpTrace({
      questionIds: ['Q1', 'Q2', 'Q3'], flashcardIds: [], answers, srs: {}, mastered: true,
      oralAttempts: [oral(T0 + 6 * DAY, true)],                   // 口述达标是收尾证据
    });
    expect(lateOral[lateOral.length - 1]).toEqual({ at: T0 + 6 * DAY, kind: 'mastered' }); // max 含口述
  });

  it('同刻 tie-break：口述排在答题类之后、闪卡之前（KIND_RANK 稳定序）', () => {
    const same = T0 + DAY;
    const ev = derive(
      { Q1: rec(same) }, { 'FC-1': srsReview(same) }, false, ['Q1', 'Q2', 'Q3'], ['FC-1'],
      [oral(same, true)],
    );
    expect(ev).toEqual([
      { at: same, kind: 'first' },
      { at: same, kind: 'correct', qid: 'Q1' },
      { at: same, kind: 'oralCorrect' },
      { at: same, kind: 'flashGrad', cardId: 'FC-1' },
    ]);
  });

  it('缺省 oralAttempts / 坏条目（非对象、at 非有限数）不出事件不崩（旧调用零变化）', () => {
    expect(derive({ Q1: rec(T0) })).toEqual([
      { at: T0, kind: 'first' },
      { at: T0, kind: 'correct', qid: 'Q1' },
    ]);
    const dirty = deriveEpTrace({
      questionIds: ['Q1'], flashcardIds: [], answers: { Q1: rec(T0) }, srs: {}, mastered: false,
      oralAttempts: [null, 42, { target: 'EP-01', correct: true, at: 'bad' }, oral(T0 + DAY, true)] as unknown as OralAttempt[],
    });
    expect(dirty.filter((e) => e.kind.startsWith('oral'))).toEqual([
      { at: T0 + DAY, kind: 'oralCorrect' },                      // 只有合法条目出事件
    ]);
  });
});

describe('deriveEpTrace 墓碑与撤销语义（与 mastery 读端同口径）', () => {
  it('答题墓碑：deletedAt 存在即视为已删——该题事件整体消失', () => {
    const ev = derive({
      Q1: rec(T0, { correct: false, streak: 0, wrongCount: 1, deletedAt: T0 + 1 }),
    });
    expect(ev).toEqual([]);
  });

  it('随机沙盒记录（fromRandom）不进轨迹（不污染主进度口径）', () => {
    const ev = derive({ Q1: rec(T0, { fromRandom: true, correct: false, streak: 0, wrongCount: 1 }) });
    expect(ev).toEqual([]);
  });

  it('撤销后重答（复活）：merge 拿无墓碑的新记录顶掉墓碑 → 事件锚新时间', () => {
    // 设备 A：Q1 被重置（墓碑 T0+2d）；设备 B：之后重答（T0+3d，无墓碑字段）
    const a = prog({ Q1: rec(T0, { deletedAt: T0 + 2 * DAY }) });
    const b = prog({ Q1: rec(T0 + 3 * DAY), Q2: rec(T0 + DAY) });
    const merged = mergeProgress(a, b);
    expect(merged.answers.Q1.deletedAt).toBeUndefined();          // 合并语义：新记录顶掉墓碑
    const ev = deriveEpTrace({
      questionIds: ['Q1', 'Q2', 'Q3'], flashcardIds: [],
      answers: merged.answers, srs: {}, mastered: false,
    });
    expect(ev).toEqual([
      { at: T0 + DAY, kind: 'first' },
      { at: T0 + DAY, kind: 'correct', qid: 'Q2' },
      { at: T0 + 3 * DAY, kind: 'correct', qid: 'Q1' },
    ]);
  });
});

describe('deriveEpTrace 多端合并后的顺序稳定性', () => {
  // 设备 A：Q1 后答对（顶掉 B 的旧错）、Q2 错；设备 B：Q1 曾答错、Q3 对 + 卡毕业
  const a = prog({
    Q1: rec(T0 + 4 * DAY),
    Q2: rec(T0 + 2 * DAY, { correct: false, streak: 0, wrongCount: 1 }),
  });
  const b = prog({
    Q1: rec(T0, { correct: false, streak: 0, wrongCount: 1 }),
    Q3: rec(T0 + 3 * DAY),
  }, { 'FC-1': srsReview(T0 + 5 * DAY) });
  const deriveMerged = (x: Progress, y: Progress) => {
    const m = mergeProgress(x, y);
    return deriveEpTrace({
      questionIds: ['Q1', 'Q2', 'Q3'], flashcardIds: ['FC-1'],
      answers: m.answers, srs: m.srs ?? {}, mastered: true,
    });
  };

  it('mergeProgress 两个方向合并 → 派生序列逐事件一致（合并交换律下的确定性）', () => {
    const ab = deriveMerged(a, b);
    const ba = deriveMerged(b, a);
    expect(ab).toEqual(ba);
    // 合并语义：Q1 取新（A 的 T0+4d 对，B 的旧错被顶掉）、Q2 存活、Q3 存活、卡毕业
    expect(ab).toEqual([
      { at: T0 + 2 * DAY, kind: 'first' },                        // Q2 最早
      { at: T0 + 2 * DAY, kind: 'wrong', qid: 'Q2' },
      { at: T0 + 3 * DAY, kind: 'correct', qid: 'Q3' },
      { at: T0 + 4 * DAY, kind: 'correct', qid: 'Q1' },
      { at: T0 + 5 * DAY, kind: 'flashGrad', cardId: 'FC-1' },
      { at: T0 + 5 * DAY, kind: 'mastered' },
    ]);
  });

  it('同刻多事件：全序 tie-break（时间 → 事件类 → 锚 id）不随输入顺序翻转', () => {
    const same = T0 + DAY;
    const answers = {
      Q2: rec(same, { correct: false, streak: 0, wrongCount: 1 }),
      Q1: rec(same, { correct: false, streak: 0, wrongCount: 1 }),
      Q3: rec(same),
    };
    const ev = derive(answers, { 'FC-1': srsReview(same) });
    expect(ev).toEqual([
      { at: same, kind: 'first' },
      { at: same, kind: 'wrongRun', qid: 'Q2', run: 2 },   // 同刻连错按 qid 全序走，锚=Q2
      { at: same, kind: 'correct', qid: 'Q3' },
      { at: same, kind: 'flashGrad', cardId: 'FC-1' },
    ]);
    // 输入 map 键序打乱 → 输出不变
    const shuffled = derive({
      Q3: rec(same),
      Q1: rec(same, { correct: false, streak: 0, wrongCount: 1 }),
      Q2: rec(same, { correct: false, streak: 0, wrongCount: 1 }),
    }, { 'FC-1': srsReview(same) });
    expect(shuffled).toEqual(ev);
  });
});
