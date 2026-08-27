import type { Question } from '../types';

/** 返回 true=对, false=错, null=未判分（未答/自评/无答案） */
export function gradeQuestion(q: Question, selected: string[]): boolean | null {
  if (q.autoGradable === false) return null;
  if (!q.answer || q.answer.length === 0) return null;
  const sel = selected.filter(Boolean);
  if (sel.length === 0) return null;
  const ansSet = new Set(q.answer);
  const selSet = new Set(sel);
  if (q.type === 'multi') {
    if (selSet.size !== ansSet.size) return false;
    for (const a of ansSet) if (!selSet.has(a)) return false;
    return true;
  }
  // single / judge: 恰好选一个且命中
  return selSet.size === 1 && ansSet.has([...selSet][0]);
}
