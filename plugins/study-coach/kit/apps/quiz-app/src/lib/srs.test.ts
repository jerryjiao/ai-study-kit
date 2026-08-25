import { describe, it, expect } from 'vitest';
import { review, formatInterval, isDue, isLearningDueAhead, isNew, isLearningPhase, initSrs, previewInterval, DEFAULT_EASE, DAY_MS, MIN_MS, LEARNING_STEPS_MIN, RELEARNING_STEPS_MIN, LEARN_AHEAD_MIN, LEARN_FUZZ_MAX_MIN } from './srs';
import type { SrsState } from '../types';

const NOW = 1_700_000_000_000;  // 固定时间基准，避免测试 flaky
const mkReview = (over: Partial<SrsState>): SrsState => ({
  ease: DEFAULT_EASE, interval: 1, reps: 1, due: NOW, updatedAt: NOW,
  phase: 'review', stepIdx: 0, lapses: 0, ...over,
});

// —— 新卡学习步流程（Anki 默认 1m → 10m → 毕业）——
describe('review · 新卡学习步（learning 阶段）', () => {
  it('新卡 good → learning[1]=10m（推进一步，未毕业），due 含 0~5m fuzz', () => {
    const s = review(undefined, 'good', NOW);
    expect(s.phase).toBe('learning');
    expect(s.stepIdx).toBe(1);
    const dueMin = (s.due - NOW) / MIN_MS;
    expect(dueMin).toBeGreaterThanOrEqual(LEARNING_STEPS_MIN[1]);
    expect(dueMin).toBeLessThanOrEqual(LEARNING_STEPS_MIN[1] + LEARN_FUZZ_MAX_MIN);
  });
  it('新卡 again → 回 learning[0]=1m，ease 不扣（学习步不扣 ease），due 含 fuzz', () => {
    const s = review(undefined, 'again', NOW);
    expect(s.phase).toBe('learning');
    expect(s.stepIdx).toBe(0);
    const dueMin = (s.due - NOW) / MIN_MS;
    expect(dueMin).toBeGreaterThanOrEqual(LEARNING_STEPS_MIN[0]);
    expect(dueMin).toBeLessThanOrEqual(LEARNING_STEPS_MIN[0] + LEARN_FUZZ_MAX_MIN);
    expect(s.ease).toBe(DEFAULT_EASE);
  });
  it('新卡 hard → Anki 第一步取前两步平均值 (1m+10m)/2=5.5m，仍停 stepIdx=0，ease 扣 0.15', () => {
    // Anki：Hard 在第一步显示 (step0+step1)/2 的延迟，停在当前步不推进。
    // 名义 interval=5.5m（不含 fuzz，用于显示），due 在 [5.5m, 10.5m]（含 0~5m fuzz）。
    const s = review(undefined, 'hard', NOW);
    expect(s.phase).toBe('learning');
    expect(s.stepIdx).toBe(0);
    expect(s.ease).toBe(DEFAULT_EASE - 0.15);
    expect(s.interval).toBeCloseTo(5.5 / 24 / 60, 10);   // 名义步长 5.5m
    // due 含 fuzz：[5.5m, 10.5m]
    const dueMin = (s.due - NOW) / MIN_MS;
    expect(dueMin).toBeGreaterThanOrEqual(5.5);
    expect(dueMin).toBeLessThanOrEqual(5.5 + LEARN_FUZZ_MAX_MIN);
  });
  it('新卡 good 的 due 含 0~5m fuzz（防多卡同序），interval 仍是名义步长不含 fuzz', () => {
    const s = review(undefined, 'good', NOW);
    expect(s.stepIdx).toBe(1);
    expect(s.interval).toBeCloseTo(10 / 24 / 60, 10);    // 名义 10m，不含 fuzz
    const dueMin = (s.due - NOW) / MIN_MS;
    expect(dueMin).toBeGreaterThanOrEqual(10);
    expect(dueMin).toBeLessThanOrEqual(10 + LEARN_FUZZ_MAX_MIN);
  });
  it('新卡 easy → 立即毕业 review，interval=4d，ease+0.15', () => {
    const s = review(undefined, 'easy', NOW);
    expect(s.phase).toBe('review');
    expect(s.interval).toBe(4);
    expect(s.reps).toBe(1);
    expect(s.ease).toBe(DEFAULT_EASE + 0.15);
    expect(s.due).toBe(NOW + 4 * DAY_MS);
  });
  it('走完最后学习步的 good → 毕业 review，interval=1d', () => {
    // 已在 stepIdx=1（最后一步），good 应毕业
    const learning: SrsState = { ease: DEFAULT_EASE, interval: 10 / 24 / 60, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 1, lapses: 0 };
    const s = review(learning, 'good', NOW);
    expect(s.phase).toBe('review');
    expect(s.interval).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.ease).toBe(DEFAULT_EASE);  // good 不动 ease
  });
  it('学习中 again → 回第一步（不毕业），due 含 fuzz', () => {
    const learning: SrsState = { ease: DEFAULT_EASE, interval: 10 / 24 / 60, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 1, lapses: 0 };
    const s = review(learning, 'again', NOW);
    expect(s.phase).toBe('learning');
    expect(s.stepIdx).toBe(0);
    const dueMin = (s.due - NOW) / MIN_MS;
    expect(dueMin).toBeGreaterThanOrEqual(LEARNING_STEPS_MIN[0]);
    expect(dueMin).toBeLessThanOrEqual(LEARNING_STEPS_MIN[0] + LEARN_FUZZ_MAX_MIN);
  });
});

// —— review 阶段 SM-2（保留原算法行为）——
describe('review · review 阶段 SM-2', () => {
  it('good 第二次（reps=1）给 6 天', () => {
    const s = review(mkReview({ reps: 1, interval: 1 }), 'good', NOW);
    expect(s.interval).toBe(6);
    expect(s.reps).toBe(2);
    expect(s.ease).toBe(DEFAULT_EASE);
  });
  it('good 第三次 = round(interval × ease)', () => {
    const s = review(mkReview({ reps: 2, interval: 6, ease: 2.5 }), 'good', NOW);
    expect(s.interval).toBe(15);
    expect(s.reps).toBe(3);
  });
  it('easy 第二次给 8 天', () => {
    const s = review(mkReview({ reps: 1, interval: 1 }), 'easy', NOW);
    expect(s.interval).toBe(8);
    expect(s.ease).toBe(DEFAULT_EASE + 0.15);
  });
  it('hard = round(interval × 1.2)，ease 扣 0.15', () => {
    const s = review(mkReview({ reps: 1, interval: 1 }), 'hard', NOW);
    expect(s.interval).toBe(1);  // round(1 * 1.2) = 1
    expect(s.ease).toBe(DEFAULT_EASE - 0.15);
  });
});

// —— lapse（复习答 again → relearning）——
describe('review · lapse 重学', () => {
  it('review 答 again → 进 relearning，interval × 0.5，lapses+1，ease 扣 0.20', () => {
    const prev = mkReview({ reps: 3, interval: 10, ease: 2.5 });
    const s = review(prev, 'again', NOW);
    expect(s.phase).toBe('relearning');
    expect(s.stepIdx).toBe(0);
    expect(s.interval).toBe(5);              // round(10 × 0.5)
    expect(s.lapses).toBe(1);
    expect(s.ease).toBe(2.3);                // 2.5 - 0.20
    expect(s.due).toBeGreaterThanOrEqual(NOW + RELEARNING_STEPS_MIN[0] * MIN_MS);
    expect(s.due).toBeLessThanOrEqual(NOW + (RELEARNING_STEPS_MIN[0] + LEARN_FUZZ_MAX_MIN) * MIN_MS);  // 10~15 分钟后重学（含 fuzz）
  });
  it('relearning good → 回 review，用 lapse 后的间隔', () => {
    const prev: SrsState = { ease: 2.3, interval: 5, reps: 0, due: NOW, updatedAt: NOW, phase: 'relearning', stepIdx: 0, lapses: 1 };
    const s = review(prev, 'good', NOW);
    expect(s.phase).toBe('review');
    expect(s.interval).toBe(5);
    expect(s.reps).toBe(1);
  });
  it('relearning again → 停留 relearning 第 0 步', () => {
    const prev: SrsState = { ease: 2.3, interval: 5, reps: 0, due: NOW, updatedAt: NOW, phase: 'relearning', stepIdx: 0, lapses: 1 };
    const s = review(prev, 'again', NOW);
    expect(s.phase).toBe('relearning');
    expect(s.stepIdx).toBe(0);
    expect(s.lapses).toBe(1);  // lapse 在进 relearning 时已计，重学 again 不重复计
  });
  it('ease 触底不低于 1.3', () => {
    const prev = mkReview({ reps: 5, interval: 30, ease: 1.4 });
    const s = review(prev, 'again', NOW);
    expect(s.ease).toBe(1.3);
  });
});

describe('formatInterval', () => {
  it('0 天 → <1m', () => expect(formatInterval(0)).toBe('<1m'));
  it('1 分钟 → 1m', () => expect(formatInterval(1 / 24 / 60)).toBe('1m'));
  it('1 天 → 1d', () => expect(formatInterval(1)).toBe('1d'));
  it('6 天 → 6d', () => expect(formatInterval(6)).toBe('6d'));
  it('15 天 → 15d', () => expect(formatInterval(15)).toBe('15d'));
  it('75 天 → 2.5mo', () => expect(formatInterval(75)).toBe('2.5mo'));
  it('730 天 → 2y', () => expect(formatInterval(730)).toBe('2y'));
});

describe('isDue / isNew / isLearningPhase / isLearningDueAhead', () => {
  it('undefined 卡算到期（新卡）', () => {
    expect(isDue(undefined, NOW)).toBe(true);
    expect(isNew(undefined)).toBe(true);
  });
  it('due 在未来 → 未到期', () => {
    expect(isDue(mkReview({ due: NOW + 10000 }), NOW)).toBe(false);
  });
  it('due 在过去 → 到期', () => {
    expect(isDue(mkReview({ due: NOW - 10000 }), NOW)).toBe(true);
  });
  it('learning 阶段首步 = 新卡', () => {
    expect(isNew({ ease: DEFAULT_EASE, interval: 0, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 0, lapses: 0 })).toBe(true);
  });
  it('review 阶段 = 非新卡', () => {
    expect(isNew(mkReview({ reps: 1, interval: 1 }))).toBe(false);
  });
  it('learning/relearning = 学习阶段', () => {
    expect(isLearningPhase({ ease: DEFAULT_EASE, interval: 0, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 0, lapses: 0 })).toBe(true);
    expect(isLearningPhase({ ease: DEFAULT_EASE, interval: 5, reps: 0, due: NOW, updatedAt: NOW, phase: 'relearning', stepIdx: 0, lapses: 1 })).toBe(true);
    expect(isLearningPhase(mkReview({}))).toBe(false);
  });
  it('isLearningDueAhead：学习步卡 due 在 20m 内仍可刷（Anki learn ahead limit）', () => {
    const learning: SrsState = { ease: DEFAULT_EASE, interval: 10 / 24 / 60, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 1, lapses: 0 };
    // 刚评完 good，due = NOW + 10m → 仍应可刷（在 20m 窗口内）
    const justGraded = { ...learning, due: NOW + 10 * MIN_MS };
    expect(isLearningDueAhead(justGraded, NOW)).toBe(true);
    // due = NOW + 19m → 仍可刷（边界内）
    expect(isLearningDueAhead({ ...learning, due: NOW + 19 * MIN_MS }, NOW)).toBe(true);
    // due = NOW + 21m → 不可刷（超出窗口）
    expect(isLearningDueAhead({ ...learning, due: NOW + 21 * MIN_MS }, NOW)).toBe(false);
    // 已过期 → 可刷
    expect(isLearningDueAhead({ ...learning, due: NOW - 1000 }, NOW)).toBe(true);
    // review 卡：isLearningDueAhead 不应被误用，但若调用仍按窗口判定（review 应该用 isDue）
    // 这里只验证学习步窗口行为，前端 review 卡用 isDue 不用 isLearningDueAhead。
  });
  it('isDue（严格）vs isLearningDueAhead（带窗口）：同一张学习步卡的差异', () => {
    const learning: SrsState = { ease: DEFAULT_EASE, interval: 10 / 24 / 60, reps: 0, due: NOW + 10 * MIN_MS, updatedAt: NOW, phase: 'learning', stepIdx: 1, lapses: 0 };
    // due=NOW+10m：严格 isDue=false（未到期），但 isLearningDueAhead=true（窗口内可刷）
    expect(isDue(learning, NOW)).toBe(false);
    expect(isLearningDueAhead(learning, NOW)).toBe(true);
  });
});

describe('previewInterval', () => {
  it('新卡 good 预览 = <10m（学习步，<1天 加 < 前缀，对齐 AnkiWeb）', () => {
    expect(previewInterval(undefined, 'good', NOW)).toBe('<10m');
  });
  it('新卡 again 预览 = <1m（学习步首步）', () => {
    expect(previewInterval(undefined, 'again', NOW)).toBe('<1m');
  });
  it('新卡 hard 预览 = <6m（第一步取前两步平均值，对齐 AnkiWeb 实测）', () => {
    expect(previewInterval(undefined, 'hard', NOW)).toBe('<6m');
  });
  it('新卡 easy 预览 = 4d（立即毕业进 review，不加 <）', () => {
    expect(previewInterval(undefined, 'easy', NOW)).toBe('4d');
  });
  it('review good 预览 = 6d（review 阶段不加 <）', () => {
    expect(previewInterval(mkReview({ reps: 1, interval: 1 }), 'good', NOW)).toBe('6d');
  });
  it('review again 预览 = 重学步时间 <10m（加 < 前缀，因进 relearning 学习步）', () => {
    // interval=4d 的 review 卡评 again：lapse 后 interval=2d，但先进 relearning 10m，显示 <10m
    expect(previewInterval(mkReview({ reps: 1, interval: 4 }), 'again', NOW)).toBe('<10m');
  });
  it('learning again 预览 = 第一步时间 <1m', () => {
    const learning: SrsState = { ease: DEFAULT_EASE, interval: 10 / 24 / 60, reps: 0, due: NOW, updatedAt: NOW, phase: 'learning', stepIdx: 1, lapses: 0 };
    expect(previewInterval(learning, 'again', NOW)).toBe('<1m');
  });
});
