import { describe, it, expect } from 'vitest';
import { gradeQuestion } from './grade';
import type { Question } from '../types';

const mk = (over: Partial<Question>): Question => ({
  id: 'x', source: 's', type: 'single', question: 'q', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: ['C'], ...over,
});

describe('gradeQuestion', () => {
  it('单选答对', () => {
    expect(gradeQuestion(mk({ type: 'single', answer: ['C'] }), ['C'])).toBe(true);
  });
  it('单选答错', () => {
    expect(gradeQuestion(mk({ type: 'single', answer: ['C'] }), ['A'])).toBe(false);
  });
  it('单选选了多个算错', () => {
    expect(gradeQuestion(mk({ type: 'single', answer: ['C'] }), ['A', 'C'])).toBe(false);
  });
  it('多选全对', () => {
    expect(gradeQuestion(mk({ type: 'multi', answer: ['A', 'B', 'D'] }), ['B', 'D', 'A'])).toBe(true);
  });
  it('多选少选算错', () => {
    expect(gradeQuestion(mk({ type: 'multi', answer: ['A', 'B', 'D'] }), ['A', 'B'])).toBe(false);
  });
  it('多选多选算错', () => {
    expect(gradeQuestion(mk({ type: 'multi', answer: ['A', 'B'] }), ['A', 'B', 'C'])).toBe(false);
  });
  it('未作答返回 null', () => {
    expect(gradeQuestion(mk({}), [])).toBe(null);
  });
  it('自评模式(autoGradable=false)返回 null', () => {
    expect(gradeQuestion(mk({ autoGradable: false, answer: [] }), ['A'])).toBe(null);
  });
  it('无答案的题返回 null', () => {
    expect(gradeQuestion(mk({ answer: [] }), ['A'])).toBe(null);
  });
  it('判断题 A=正确 答对', () => {
    expect(gradeQuestion(mk({ type: 'judge', options: { A: '正确', B: '错误' }, answer: ['A'] }), ['A'])).toBe(true);
  });
});
