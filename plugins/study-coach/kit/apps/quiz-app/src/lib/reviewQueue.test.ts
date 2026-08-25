import { describe, it, expect } from 'vitest';
import { initSession, currentCard, isComplete, applyGrade, isRelearning } from './reviewQueue';
import type { Flashcard } from '../types';

const card = (id: string): Flashcard => ({
  id, front: `f-${id}`, back: `b-${id}`, source: 'test', topic: 't',
});

/** 造 N 张卡 */
const cards = (n: number) => Array.from({ length: n }, (_, i) => card(`C${i + 1}`));

describe('initSession / currentCard / isComplete', () => {
  it('空队列 → 立即完成', () => {
    const s = initSession([]);
    expect(isComplete(s)).toBe(true);
    expect(currentCard(s)).toBeUndefined();
  });
  it('非空队列 → 未完成，当前卡为队首', () => {
    const [a, b] = cards(2);
    const s = initSession([a, b]);
    expect(isComplete(s)).toBe(false);
    expect(currentCard(s)).toBe(a);
  });
});

// —— 行为契约（对齐 AnkiWeb 实测 2026-07-05）——
// applyGrade(s, g, stillLearningAfter)：
//   - again：永远重刷（进 relearn 队尾）
//   - good/hard：仅当 stillLearningAfter=true（评分后仍处学习步阶段）才重刷
//   - easy：永远不重刷（立即毕业）
//   - 不传 stillLearningAfter（默认 false）：只有 again 重刷（向后兼容老调用）
describe('applyGrade · 默认参数（向后兼容：仅 again 重刷）', () => {
  it('3 张卡全评 good（不传 stillLearningAfter）→ 3 次完成，不进 relearn', () => {
    const s0 = initSession(cards(3));
    const s1 = applyGrade(s0, 'good');
    const s2 = applyGrade(s1, 'good');
    const s3 = applyGrade(s2, 'good');
    expect(isComplete(s3)).toBe(true);
    expect(s3.doneCount).toBe(3);
    expect(s3.relearn).toHaveLength(0);
  });
});

describe('applyGrade · again 重学', () => {
  it('3 张到期卡，1 张评 again → 本次应刷 4 次才完成', () => {
    const s0 = initSession(cards(3));            // [C1, C2, C3]
    const s1 = applyGrade(s0, 'again');          // C1 → relearn，pos=1
    expect(currentCard(s1)?.id).toBe('C2');
    expect(s1.relearn.map((c) => c.id)).toEqual(['C1']);
    expect(isComplete(s1)).toBe(false);

    const s2 = applyGrade(s1, 'good');           // C2 走，pos=2
    expect(currentCard(s2)?.id).toBe('C3');

    const s3 = applyGrade(s2, 'good');           // C3 走，main 走完，进入 relearn
    expect(isComplete(s3)).toBe(false);          // 还有 C1 要重刷
    expect(currentCard(s3)?.id).toBe('C1');
    expect(isRelearning(s3)).toBe(true);

    const s4 = applyGrade(s3, 'good');           // C1 赎回
    expect(isComplete(s4)).toBe(true);
    expect(s4.doneCount).toBe(4);
  });

  it('重学时再评 again → 卡继续留在 relearn', () => {
    const s0 = initSession(cards(2));            // [C1, C2]
    const s1 = applyGrade(s0, 'again');          // C1 → relearn，cur=C2
    const s2 = applyGrade(s1, 'good');           // C2 走，cur=C1
    const s3 = applyGrade(s2, 'again');          // C1 又忘了
    expect(isComplete(s3)).toBe(false);
    expect(currentCard(s3)?.id).toBe('C1');
    expect(s3.relearn.map((c) => c.id)).toEqual(['C1']);
    const s4 = applyGrade(s3, 'hard');           // 赎回（hard 不重刷，因 stillLearning 默认 false）
    expect(isComplete(s4)).toBe(true);
  });

  it('多张卡评 again → 按进入顺序重学', () => {
    const s0 = initSession(cards(3));
    const s1 = applyGrade(s0, 'again');          // relearn=[C1]
    const s2 = applyGrade(s1, 'again');          // relearn=[C1, C2]
    const s3 = applyGrade(s2, 'good');           // C3 走，main 走完
    expect(s3.relearn.map((c) => c.id)).toEqual(['C1', 'C2']);
    const s4 = applyGrade(s3, 'good');           // 赎回 C1
    const s5 = applyGrade(s4, 'good');           // 赎回 C2
    expect(isComplete(s5)).toBe(true);
    expect(s5.doneCount).toBe(5);
  });
});

// —— AnkiWeb 对齐：good/hard 后仍处学习步阶段，本会话稍后再刷（核心新行为）——
// 实测：新卡 Good 推进学习步（stepIdx 0→1，未毕业）→ 靠 learn-ahead-limit
// 在本会话稍后再次出现，直到 Good 到末步毕业（进 review）才不再现。
// 防死循环：每张卡每轮最多进 relearn 一次，relearn 队列逐张消费完即完成。
describe('applyGrade · good/hard 学习步卡本会话重刷（对齐 AnkiWeb）', () => {
  it('新卡 good（仍 learning）→ 进 relearn 队尾，本会话再刷', () => {
    const s0 = initSession(cards(1));
    const s1 = applyGrade(s0, 'good', /*stillLearningAfter*/ true);
    expect(s1.relearn.map((c) => c.id)).toEqual(['C1']);   // 进了 relearn
    expect(isComplete(s1)).toBe(false);                     // 还没完成
    expect(currentCard(s1)?.id).toBe('C1');                 // 又轮到它
  });

  it('新卡 good（已毕业进 review，stillLearningAfter=false）→ 出队，不再现', () => {
    const s0 = initSession(cards(1));
    const s1 = applyGrade(s0, 'good', false);
    expect(s1.relearn).toHaveLength(0);
    expect(isComplete(s1)).toBe(true);
  });

  it('3 张卡：首轮全 good+learning → 全进 relearn；次轮全 good+毕业 → 完成（共 6 次）', () => {
    const s0 = initSession(cards(3));
    // 首轮：每张 Good 后仍处学习步 → 进 relearn
    let s = applyGrade(s0, 'good', true);   // C1 → relearn, cur=C2
    s = applyGrade(s, 'good', true);         // C2 → relearn, cur=C3
    s = applyGrade(s, 'good', true);         // C3 → relearn, main 走完, cur=C1
    expect(s.pos).toBe(3);
    expect(s.relearn.map((c) => c.id)).toEqual(['C1', 'C2', 'C3']);
    expect(isComplete(s)).toBe(false);
    // 次轮：每张 Good 后毕业（进 review，stillLearningAfter=false）→ 赎回
    s = applyGrade(s, 'good', false);        // 赎回 C1, cur=C2
    s = applyGrade(s, 'good', false);        // 赎回 C2, cur=C3
    s = applyGrade(s, 'good', false);        // 赎回 C3
    expect(isComplete(s)).toBe(true);
    expect(s.doneCount).toBe(6);
    expect(s.relearn).toHaveLength(0);
  });

  it('easy 永远立即毕业 → 即使 stillLearningAfter=true 也不重刷', () => {
    const s0 = initSession(cards(1));
    const s1 = applyGrade(s0, 'easy', true);
    expect(s1.relearn).toHaveLength(0);
    expect(isComplete(s1)).toBe(true);
  });

  it('混合：C1 again、C2 good+learning → 两者都进 relearn，按顺序赎回', () => {
    const s0 = initSession(cards(2));
    let s = applyGrade(s0, 'again');          // C1 → relearn (again 永远重刷)
    s = applyGrade(s, 'good', true);          // C2 → relearn (good+learning)
    expect(s.relearn.map((c) => c.id)).toEqual(['C1', 'C2']);
    s = applyGrade(s, 'good', false);         // 赎回 C1
    expect(currentCard(s)?.id).toBe('C2');
    s = applyGrade(s, 'good', false);         // 赎回 C2
    expect(isComplete(s)).toBe(true);
    expect(s.doneCount).toBe(4);
  });
});

describe('applyGrade · 边界', () => {
  it('已完成的会话再评分 → 无变化（防呆）', () => {
    const s0 = initSession(cards(0));
    const s1 = applyGrade(s0, 'good');
    expect(s1).toBe(s0);
    expect(s1.doneCount).toBe(0);
  });
  it('extra 模式（全量打乱）同样适用：again 也会重学', () => {
    const s0 = initSession(cards(5));
    let s = s0;
    s = applyGrade(s, 'good');                // 默认 false → 出队
    s = applyGrade(s, 'again');               // → relearn
    s = applyGrade(s, 'good');
    s = applyGrade(s, 'good');
    s = applyGrade(s, 'good');                // main 5 张走完
    expect(isComplete(s)).toBe(false);
    s = applyGrade(s, 'good');
    expect(isComplete(s)).toBe(true);
    expect(s.doneCount).toBe(6);
  });
});
