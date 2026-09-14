// mastery.test.ts — 考点掌握度判据单测（TS 移植版，与 scripts/lib/mastery.test.mjs 同判据）。
import { describe, it, expect } from 'vitest';
import type { AnswerRecord, Flashcard, Question, SrsState } from '../types';
import { isOpenWrong, isFlashGraduated, masteryByExamPoint, rankWeakness } from './mastery';

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

  it('闪卡毕业组件：题全对但映射闪卡未毕业 → inProgress；全毕业 → mastered', () => {
    const questions = qs([['EP-01', ['A', 'B']]]);
    const answers = { A: rec(), B: rec() };
    const flashcards = fcs([['FC-1', 'EP-01']]);

    const open = masteryByExamPoint(questions, answers, {}, flashcards, { 'FC-1': srsRec({ phase: 'learning' }) });
    expect(open.points[0].status).toBe('inProgress');
    expect(open.points[0].flashOpenIds).toEqual(['FC-1']);
    expect(open.points[0].flashGraduated).toBe(0);

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
    expect(r.points[1].status).toBe('inProgress');
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
