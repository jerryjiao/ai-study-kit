// mastery.test.ts — 考点掌握度判据单测（TS 移植版，与 scripts/lib/mastery.test.mjs 同判据）。
// v1.2（#119）起末段跨侧一致性断言：直接 import 脚本侧 mastery.mjs，同一夹具对拍两侧输出
// （AC「TS 侧与 mastery-report --json 对同一夹具输出一致判据」——mastery-report 的判据
// 本体就是那份 mastery.mjs，CLI 子进程侧的端到端断言在 scripts/lib/mastery-report.test.mjs）。
import { describe, it, expect } from 'vitest';
import type { AnswerRecord, Flashcard, Question, SrsState } from '../types';
import { isOpenWrong, isFlashGraduated, masteryByExamPoint, rankWeakness } from './mastery';
import {
  masteryByExamPoint as masteryByExamPointMjs,
  type MjsExamPointMastery,
} from '../../scripts/lib/mastery.mjs';

const qs = (eps: [string, string[]][]): Question[] =>
  eps.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep }) as Question));
const rec = (extra: Partial<AnswerRecord> = {}): AnswerRecord => ({ correct: true, ...extra } as AnswerRecord);
const fcs = (pairs: [string, string | undefined][]): Flashcard[] =>
  pairs.map(([id, ep]) => ({ id, examPoint: ep }) as Flashcard);
const srsRec = (extra: Partial<SrsState> = {}): SrsState =>
  ({ phase: 'review', ...extra } as SrsState);

describe('isOpenWrong / isFlashGraduated', () => {
  it('错题毕业阈值随历史错次递增', () => {
    expect(isOpenWrong({ streak: undefined } as AnswerRecord)).toBe(false);
    expect(isOpenWrong(rec({ streak: 0, wrongCount: 1 }))).toBe(true);
    expect(isOpenWrong(rec({ streak: 1, wrongCount: 1 }))).toBe(false);
    expect(isOpenWrong(rec({ streak: 1, wrongCount: 2 }))).toBe(true);
  });

  it('闪卡毕业 = review 阶段且无墓碑', () => {
    expect(isFlashGraduated(srsRec())).toBe(true);
    expect(isFlashGraduated(srsRec({ phase: 'learning' }))).toBe(false);
    expect(isFlashGraduated(srsRec({ phase: 'relearning' }))).toBe(false);
    expect(isFlashGraduated(undefined)).toBe(false);
    expect(isFlashGraduated(srsRec({ deletedAt: 123 }))).toBe(false);
  });
});

describe('masteryByExamPoint', () => {
  it('四态基础：untouched / inProgress / weak / mastered', () => {
    const r = masteryByExamPoint(qs([['EP-01', ['A', 'B']]]), {});
    expect(r.points[0].status).toBe('untouched');

    const part = masteryByExamPoint(qs([['EP-01', ['A', 'B', 'C']]]), { A: rec(), B: rec() });
    expect(part.points[0].status).toBe('inProgress');

    const wrong = masteryByExamPoint(qs([['EP-01', ['A', 'B']]]), {
      A: rec(),
      B: rec({ correct: false, streak: 0, wrongCount: 1 }),
    });
    expect(wrong.points[0].status).toBe('weak');
    expect(wrong.points[0].openWrongIds).toEqual(['B']);

    const done = masteryByExamPoint(qs([['EP-01', ['A', 'B']]]), {
      A: rec(),
      B: rec({ streak: 1, wrongCount: 1 }),
    });
    expect(done.points[0].status).toBe('mastered');
  });

  it('v1.2 解锁（AC1）：题全对 + 零 srs 记录（映射了卡也从未复习）→ mastered，闪卡不阻塞', () => {
    const questions = qs([['EP-01', ['A', 'B']]]);
    const answers = { A: rec(), B: rec() };
    const flashcards = fcs([['FC-1', 'EP-01']]);

    const never = masteryByExamPoint(questions, answers, {}, flashcards, {});
    expect(never.points[0].status).toBe('mastered'); // 从不使用闪卡的主题：题全对即掌握
    expect(never.points[0].flashOpenIds).toEqual(['FC-1']); // 未毕业仍如实上报（展示用）
    expect(never.points[0].flashGraduated).toBe(0);

    // 闪卡在学（有进度未毕业）同样不阻塞（「SRS 保持可用但彻底可选」）
    const learning = masteryByExamPoint(questions, answers, {}, flashcards, { 'FC-1': srsRec({ phase: 'learning' }) });
    expect(learning.points[0].status).toBe('mastered');

    // 存量不回退（AC2）：全毕业仍满足判据
    const grad = masteryByExamPoint(questions, answers, {}, flashcards, { 'FC-1': srsRec() });
    expect(grad.points[0].status).toBe('mastered');
  });

  it('无映射考点不受闪卡约束；别的考点的卡不串扰', () => {
    const r = masteryByExamPoint(
      qs([['EP-01', ['A']], ['EP-02', ['B']]]),
      { A: rec(), B: rec() },
      {},
      fcs([['FC-x', 'EP-02'], ['FC-bare', undefined]]),
      { 'FC-x': srsRec({ phase: 'learning' }) },
    );
    expect(r.points[0].status).toBe('mastered');
    expect(r.points[0].flashMapped).toBe(0);
    expect(r.points[1].status).toBe('mastered'); // v1.2：闪卡未毕业不再压成 inProgress
  });

  // ── 口述四态通道（v1.2 超题证据主通道，#119）─────────────────
  it('口述达标 → mastered（闪卡未毕业也放行）；未达标 + 闪卡未毕业 → inProgress', () => {
    const questions = qs([['EP-01', ['A', 'B']]]);
    const answers = { A: rec(), B: rec() };
    const flashcards = fcs([['FC-1', 'EP-01']]);
    const srs = { 'FC-1': srsRec({ phase: 'learning' }) };

    const oral = masteryByExamPoint(questions, answers, {}, flashcards, srs, { 'EP-01': 'mastered' });
    expect(oral.points[0].status).toBe('mastered');
    expect(oral.points[0].oralStatus).toBe('mastered');

    const stuck = masteryByExamPoint(questions, answers, {}, flashcards, {}, { 'EP-01': 'inProgress' });
    expect(stuck.points[0].status).toBe('inProgress');
    expect(stuck.points[0].oralStatus).toBe('inProgress');
  });

  it('口述未达标 + 映射闪卡全毕业 → mastered（闪卡替代通道，存量行为不回退）', () => {
    const r = masteryByExamPoint(
      qs([['EP-01', ['A', 'B']]]),
      { A: rec(), B: rec() },
      {},
      fcs([['FC-1', 'EP-01']]),
      { 'FC-1': srsRec() },
      { 'EP-01': 'inProgress' },
    );
    expect(r.points[0].status).toBe('mastered');
  });

  it('口述 weak → 负面证据优先：题全对 + 闪卡全毕业也压成 weak；题没刷口头再好也只 untouched', () => {
    const neg = masteryByExamPoint(
      qs([['EP-01', ['A', 'B']]]),
      { A: rec(), B: rec() },
      {},
      fcs([['FC-1', 'EP-01']]),
      { 'FC-1': srsRec() },
      { 'EP-01': 'weak' },
    );
    expect(neg.points[0].status).toBe('weak');

    const noQuestions = masteryByExamPoint(qs([['EP-01', ['A', 'B']]]), {}, {}, [], {}, { 'EP-01': 'mastered' });
    expect(noQuestions.points[0].status).toBe('untouched'); // 验效果靠题
  });

  it('墓碑与随机沙盒记录不计入；题库外考点名回退 EP id', () => {
    const r = masteryByExamPoint(qs([['EP-01', ['A', 'B']]]), {
      A: rec({ deletedAt: 123 }),
      B: rec({ fromRandom: true }),
    });
    expect(r.points[0].answered).toBe(0);
    expect(r.points[0].status).toBe('untouched');
    expect(r.points[0].name).toBe('EP-01'); // epNames 缺省回退

    const named = masteryByExamPoint(qs([['EP-01', ['A']]]), { A: rec() }, { 'EP-01': '暂存区' });
    expect(named.points[0].name).toBe('暂存区');
  });

  it('无 examPoint 的题进 untracked', () => {
    const r = masteryByExamPoint([{ id: 'X', topic: 'misc' } as Question, { id: 'A', examPoint: 'EP-01' } as Question], { A: rec() });
    expect(r.untracked).toBe(1);
    expect(r.points.length).toBe(1);
  });
});

describe('rankWeakness', () => {
  it('weak 先于 inProgress，weak 按未毕业数降序', () => {
    const r = masteryByExamPoint(
      qs([['EP-01', ['A', 'B']], ['EP-02', ['C', 'D']], ['EP-03', ['E']], ['EP-04', ['F', 'G']]]),
      {
        A: rec({ correct: false, streak: 0, wrongCount: 1 }),
        B: rec(),
        C: rec({ correct: false, streak: 0, wrongCount: 2 }),
        D: rec({ correct: false, streak: 0, wrongCount: 1 }),
        E: rec(),
        F: rec(),
      },
    );
    expect(rankWeakness(r.points).map((p) => p.ep)).toEqual(['EP-02', 'EP-01', 'EP-04']);
  });
});

// ── 跨侧一致性（#119 AC3）：同一夹具，TS 侧与脚本侧 mastery.mjs 逐字段对拍 ──────────
// 夹具与 scripts/lib/mastery.test.mjs 的 CROSS_FIXTURE 同数据（五考点覆盖 v1.2 全部分支）；
// mastery-report --json 的判据本体就是那份 mastery.mjs，CLI 端到端断言在
// scripts/lib/mastery-report.test.mjs（同夹具跑子进程）。
const CROSS_QUESTIONS = qs([
  ['EP-01', ['A1', 'A2']],
  ['EP-02', ['B1', 'B2']],
  ['EP-03', ['C1', 'C2']],
  ['EP-04', ['D1', 'D2']],
  ['EP-05', ['E1', 'E2']],
]);
const CROSS_ANSWERS = Object.fromEntries(
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'].map((id) => [id, rec()]),
);
const CROSS_FLASHCARDS = fcs([['F1', 'EP-04'], ['F2', 'EP-04'], ['F3', 'EP-03']]);
const CROSS_SRS: Record<string, SrsState> = { F1: srsRec(), F2: srsRec() };
const CROSS_ORAL: Record<string, 'mastered' | 'inProgress' | 'weak'> = {
  'EP-01': 'mastered',   // 口述达标（主通道）
  'EP-03': 'inProgress', // 口述未达标 + 闪卡替代通道未走通（F3 从未复习）
  'EP-04': 'inProgress', // 口述未达标 + 闪卡全毕业 → 替代通道
  'EP-05': 'weak',       // 口述负面证据优先
};
const CROSS_EXPECTED: Record<string, string> = {
  'EP-01': 'mastered',
  'EP-02': 'mastered',   // 无口述数据 → 零闪卡 chat-first 解锁
  'EP-03': 'inProgress',
  'EP-04': 'mastered',
  'EP-05': 'weak',
};

describe('跨侧一致（TS vs scripts/lib/mastery.mjs，同夹具同判据）', () => {
  it('v1.2 五分支：TS 侧判据输出期望四态', () => {
    const r = masteryByExamPoint(CROSS_QUESTIONS, CROSS_ANSWERS, {}, CROSS_FLASHCARDS, CROSS_SRS, CROSS_ORAL);
    expect(Object.fromEntries(r.points.map((p) => [p.ep, p.status]))).toEqual(CROSS_EXPECTED);
  });

  it('脚本侧（mastery-report 同一份判据）对同一夹具输出逐字段一致', () => {
    const mjs = masteryByExamPointMjs({
      questions: CROSS_QUESTIONS,
      answers: CROSS_ANSWERS,
      flashcards: CROSS_FLASHCARDS,
      srs: CROSS_SRS,
      oralByEp: CROSS_ORAL,
    });
    const ts = masteryByExamPoint(CROSS_QUESTIONS, CROSS_ANSWERS, {}, CROSS_FLASHCARDS, CROSS_SRS, CROSS_ORAL);
    const pick = (p: (typeof ts.points)[number] | MjsExamPointMastery) => ({
      ep: p.ep, answered: p.answered, correctNow: p.correctNow, openWrongIds: p.openWrongIds,
      flashMapped: p.flashMapped, flashGraduated: p.flashGraduated, flashOpenIds: p.flashOpenIds,
      oralStatus: p.oralStatus, status: p.status,
    });
    expect(mjs.points.map(pick)).toEqual(ts.points.map(pick));
    expect(Object.fromEntries(mjs.points.map((p) => [p.ep, p.status]))).toEqual(CROSS_EXPECTED);
  });
});
