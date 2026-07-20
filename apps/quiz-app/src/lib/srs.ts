import type { SrsState, SrsGrade } from '../types';

/**
 * Anki 兼容的间隔重复算法（SM-2 + 学习步）。
 * 参考：https://docs.ankiweb.net/deck-options.html （Anki 官方默认参数）
 *       https://super-memory.com/english/ol/sm2.htm （SM-2 原版）
 *
 * 三种阶段：
 *  - learning：新卡学习，走 LEARNING_STEPS（默认 [1m, 10m]），good 到最后一步才毕业
 *  - relearning：review 卡 lapse（评 again）后重学，走 RELEARNING_STEPS（默认 [10m]）
 *  - review：已毕业，SM-2 长期间隔（interval × ease）
 *
 * 卡片状态机（一张卡的完整生命周期）：
 *   新卡 → learning[0]=1m → learning[1]=10m → 毕业(review)
 *                  ↓ again              ↓ again
 *               回 learning[0]      进 relearning[0]=10m → 回 review
 *   review 评 again → relearning[0]=10m → review(interval×0.5) 或回 relearning
 */

export const DAY_MS = 86_400_000;
export const MIN_MS = 60_000;

/** Anki 默认学习步（分钟）。新卡需依次走完，good 到最后一步才毕业。 */
export const LEARNING_STEPS_MIN = [1, 10];
/** Anki 默认重学步（分钟）。review 卡 lapse 后重学。 */
export const RELEARNING_STEPS_MIN = [10];

/** 学习步卡"提前显示"窗口（分钟）。Anki 默认 20m：队列无其他到期卡时，
 *  学习步卡可提前最多 20 分钟拉回继续刷（官方手册 deck-options.html）。
 *  这正是"评 good/hard 后 due=10m，但 10m 内重进仍可继续刷"的依据。
 *  review 阶段和新卡不适用——只对 learning/relearning 阶段生效。 */
export const LEARN_AHEAD_MIN = 20;
/** 学习步 fuzz 上限（分钟）。Anki 给学习步卡加 0~5m 随机扰动，
 *  防多卡同时到期总按同一顺序出现（官方 studying.html："Learning cards are also
 *  given up to 5 minutes of extra delay...answer buttons won't reflect that"）。 */
export const LEARN_FUZZ_MAX_MIN = 5;

/** 新卡的默认 ease（SM-2 标准初值） */
export const DEFAULT_EASE = 2.5;
/** ease 下限：再低就基本每天都要复习了 */
export const MIN_EASE = 1.3;
/** 毕业间隔：新卡走完学习步后 good 的首次 review 间隔（天）。Anki 默认 1d */
export const GRADUATING_INTERVAL = 1;
/** 新卡直接 easy 时的毕业间隔（天）。Anki 默认 4d */
export const EASY_INTERVAL = 4;
/** lapse（复习时答 again）后间隔乘数。Anki 默认 0.5 */
export const LAPSE_INTERVAL_MULT = 0.5;
/** ease 调整幅度（对齐 Anki 默认） */
export const EASE_DELTA = { again: -0.20, hard: -0.15, easy: +0.15 } as const;

/**
 * 给定旧状态 + 评分 + 当前时间，算出下一次状态。纯函数，无副作用。
 *
 * 学习步逻辑（learning/relearning）：
 *   - good：推进到下一个学习步；已是最后一步 → 毕业（进 review）
 *   - easy：立即毕业（跳过剩余学习步），给 EASY_INTERVAL
 *   - hard：Anki 规则——
 *       · 在第一步：取前两步的平均值（默认 (1m+10m)/2 = 5.5m ≈ 6m），仍停在第一步；
 *         只有一个学习步时取该步 ×1.5；
 *       · 在后续步：重复当前步（不推进）。
 *   - again：回到第一个学习步
 *
 * review 逻辑（SM-2）：
 *   - good：interval × ease（第二次起生效）
 *   - hard：interval × 1.2（ease 扣 0.15）
 *   - easy：interval × ease × 1.3（ease 加 0.15）
 *   - again：进 relearning，新 interval = max(1, round(旧 × LAPSE_MULT))，ease 扣 0.20
 */
export function review(prev: SrsState | undefined, grade: SrsGrade, now: number): SrsState {
  // —— 新卡（无记录）→ 初始化为 learning 阶段第一步 ——
  if (!prev) {
    return applyLearning(undefined, grade, now);
  }

  switch (prev.phase) {
    case 'learning':
      return applyLearning(prev, grade, now);
    case 'relearning':
      return applyRelearning(prev, grade, now);
    case 'review':
    default:
      return applyReview(prev, grade, now);
  }
}

/** learning 阶段评分处理（也用于新卡初始化：prev=undefined 视为新卡第一步）。 */
function applyLearning(prev: SrsState | undefined, grade: SrsGrade, now: number): SrsState {
  const ease = prev?.ease ?? DEFAULT_EASE;
  const stepIdx = prev?.phase === 'learning' ? prev.stepIdx : 0;
  const lapses = prev?.lapses ?? 0;
  const lastStep = LEARNING_STEPS_MIN.length - 1;

  switch (grade) {
    case 'again': {
      // 回到第一步
      return mkLearning(ease, 0, lapses, now + learningStepMs(LEARNING_STEPS_MIN[0]), now);
    }
    case 'hard': {
      // Anki：在第一步取前两步平均值（默认≈6m）；在后续步重复当前步。
      // 两种情况 stepIdx 都不变（不推进）。名义步长传给 mkLearning，让 interval 字段
      // 和按钮预览一致（≈6m 而非 LEARNING_STEPS_MIN[0]=1m）。
      const min = hardStepMin(stepIdx);
      return mkLearning(Math.max(MIN_EASE, ease + EASE_DELTA.hard), stepIdx, lapses, now + learningStepMs(min), now, min);
    }
    case 'good': {
      if (stepIdx >= lastStep) {
        // 走完最后一步 → 毕业，进 review
        return mkReview(ease, GRADUATING_INTERVAL, 1, lapses, now + GRADUATING_INTERVAL * DAY_MS, now);
      }
      // 推进到下一步
      const nextIdx = stepIdx + 1;
      return mkLearning(ease, nextIdx, lapses, now + learningStepMs(LEARNING_STEPS_MIN[nextIdx]), now);
    }
    case 'easy': {
      // 立即毕业，给 EASY_INTERVAL
      return mkReview(ease + EASE_DELTA.easy, EASY_INTERVAL, 1, lapses, now + EASY_INTERVAL * DAY_MS, now);
    }
  }
}

/**
 * 学习步 due 时间（毫秒），含 Anki 的 0~5m fuzz 扰动。
 * fuzz 只加给"会再次出现"的学习步卡（防多卡同序），毕业/进 review 不加。
 * 注意：fuzz 只影响真实 due（决定何时拉回队列），按钮预览显示的是名义步长（不反映 fuzz，
 *       与 Anki 官方一致——"answer buttons won't reflect that"）。
 */
function learningStepMs(stepMin: number): number {
  const fuzz = Math.random() * LEARN_FUZZ_MAX_MIN;   // 0 ~ 5 分钟
  return (stepMin + fuzz) * MIN_MS;
}

/**
 * 学习步 Hard 按钮的步长（分钟）。Anki 规则（deck-options.html）：
 *  - 第一步：前两步平均值 (LEARNING_STEPS_MIN[0] + [1]) / 2；只有一个步时取该步 ×1.5。
 *  - 后续步：重复当前步（= LEARNING_STEPS_MIN[stepIdx]）。
 */
function hardStepMin(stepIdx: number): number {
  if (stepIdx <= 0) {
    return LEARNING_STEPS_MIN.length >= 2
      ? (LEARNING_STEPS_MIN[0] + LEARNING_STEPS_MIN[1]) / 2
      : LEARNING_STEPS_MIN[0] * 1.5;
  }
  return LEARNING_STEPS_MIN[stepIdx] ?? LEARNING_STEPS_MIN[0];
}

/** relearning 阶段评分处理。 */
function applyRelearning(prev: SrsState, grade: SrsGrade, now: number): SrsState {
  const ease = prev.ease;
  const lapses = prev.lapses;
  const lastStep = RELEARNING_STEPS_MIN.length - 1;

  switch (grade) {
    case 'again': {
      const min = RELEARNING_STEPS_MIN[0];
      return mkRelearning(ease, 0, lapses, now + learningStepMs(min), now);
    }
    case 'hard': {
      const min = RELEARNING_STEPS_MIN[prev.stepIdx];
      return mkRelearning(Math.max(MIN_EASE, ease + EASE_DELTA.hard), prev.stepIdx, lapses, now + learningStepMs(min), now);
    }
    case 'good': {
      if (prev.stepIdx >= lastStep) {
        // 重学完成 → 回 review，用 lapse 后的间隔（已记录在 prev.interval）
        return mkReview(ease, prev.interval, 1, lapses, now + prev.interval * DAY_MS, now);
      }
      const nextIdx = prev.stepIdx + 1;
      const min = RELEARNING_STEPS_MIN[nextIdx];
      return mkRelearning(ease, nextIdx, lapses, now + learningStepMs(min), now);
    }
    case 'easy': {
      // 直接回 review，给一个稍好的间隔
      return mkReview(ease + EASE_DELTA.easy, Math.max(1, prev.interval + 1), 1, lapses, now + (prev.interval + 1) * DAY_MS, now);
    }
  }
}

/** review 阶段评分处理（SM-2 核心）。 */
function applyReview(prev: SrsState, grade: SrsGrade, now: number): SrsState {
  let ease = prev.ease;
  let reps = prev.reps;
  const prevInterval = prev.interval;
  let interval = 0;
  let lapses = prev.lapses;

  switch (grade) {
    case 'again': {
      // lapse：进 relearning，新间隔 = max(1, round(旧 × 0.5))，ease 扣分
      ease = Math.max(MIN_EASE, ease + EASE_DELTA.again);
      reps = 0;
      interval = Math.max(1, Math.round(prevInterval * LAPSE_INTERVAL_MULT));
      lapses = lapses + 1;
      const min = RELEARNING_STEPS_MIN[0];
      return mkRelearning(ease, 0, lapses, now + min * MIN_MS, now, interval);
    }
    case 'hard': {
      ease = Math.max(MIN_EASE, ease + EASE_DELTA.hard);
      interval = reps === 0 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
      reps += 1;
      break;
    }
    case 'good': {
      interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.max(1, Math.round(prevInterval * ease));
      reps += 1;
      break;
    }
    case 'easy': {
      ease += EASE_DELTA.easy;
      interval = reps === 0 ? 4 : reps === 1 ? 8 : Math.max(1, Math.round(prevInterval * ease * 1.3));
      reps += 1;
      break;
    }
  }

  const due = now + interval * DAY_MS;
  return mkReview(ease, interval, reps, lapses, due, now);
}

// —— 构造器（确保所有字段齐全）——
/** 注意：interval 字段记录的是"名义步长"（不含 fuzz，用于显示和毕业计算），
 *  due 才含 fuzz（决定真实拉回队列时间）。hard 第一步名义步长是平均值（≈6m），
 *  不是 LEARNING_STEPS_MIN[0]，故需显式传入 intervalMin。 */
function mkLearning(ease: number, stepIdx: number, lapses: number, due: number, updatedAt: number, intervalMin?: number): SrsState {
  const min = intervalMin ?? LEARNING_STEPS_MIN[stepIdx] ?? LEARNING_STEPS_MIN[0];
  return { ease: round2(ease), interval: min / 24 / 60, reps: 0, due, updatedAt, phase: 'learning', stepIdx, lapses };
}
function mkRelearning(ease: number, stepIdx: number, lapses: number, due: number, updatedAt: number, interval?: number): SrsState {
  const min = RELEARNING_STEPS_MIN[stepIdx] ?? RELEARNING_STEPS_MIN[0];
  return { ease: round2(ease), interval: interval ?? min / 24 / 60, reps: 0, due, updatedAt, phase: 'relearning', stepIdx, lapses };
}
function mkReview(ease: number, interval: number, reps: number, lapses: number, due: number, updatedAt: number): SrsState {
  return { ease: round2(ease), interval, reps, due, updatedAt, phase: 'review', stepIdx: 0, lapses };
}

/** 初始化一张新卡的 SRS 状态：learning 阶段第一步，立即到期。 */
export function initSrs(now: number): SrsState {
  return mkLearning(DEFAULT_EASE, 0, 0, now, now);
}

/** 这张卡是否到期（该复习了）。严格判定：due <= now。
 *  ⚠️ 学习步卡（learning/relearning）请用 isLearningDueAhead —— 它带 Anki 的
 *  "提前最多 20 分钟显示"窗口，否则会出现"评 good 后 due=10m，10m 内重进看不到卡"的问题。 */
export function isDue(state: SrsState | undefined, now: number): boolean {
  if (!state) return true;            // 没记录 = 新卡，算到期（是否进队列看配额）
  return state.due <= now;
}

/**
 * 学习步卡（learning/relearning）是否可进入复习队列。带 Anki 的"learn ahead limit"
 * 窗口（默认 20 分钟）：due 在 now+20m 之前都算可刷。
 *
 * 官方依据（deck-options.html）："If there's nothing else to study, Anki will show
 * learning cards up to 20 minutes early by default."
 *
 * 这解决了用户的核心痛点：评 good/hard 后卡 due=10m，退出复习页再重进——只要队列里没有
 * 别的到期卡，这张卡可立即拉回继续刷，而不是死等满 10 分钟。
 *
 * review 阶段和新卡不适用此窗口（Anki 只对学习步卡提前）。
 */
export function isLearningDueAhead(state: SrsState | undefined, now: number): boolean {
  if (!state) return true;
  return state.due <= now + LEARN_AHEAD_MIN * MIN_MS;
}

/** 这张卡是否从未复习过（新卡）。learning 阶段首步且无 lapse 算新卡。 */
export function isNew(state: SrsState | undefined): boolean {
  if (!state) return true;
  return state.phase === 'learning' && state.stepIdx === 0 && state.lapses === 0 && state.reps === 0;
}

/** 是否处于学习步阶段（learning 或 relearning）。前端用于决定是否进入"学习步快速循环"模式。 */
export function isLearningPhase(state: SrsState | undefined): boolean {
  return !!state && (state.phase === 'learning' || state.phase === 'relearning');
}

/**
 * 把间隔（天）格式化成人类可读的短字符串（用于按钮下方的间隔预览）。
 * 约定：<1m / Nm / Nh / Nd / N.Nmo / N.Ny（月=mo，年=y，避免与分钟 m 混淆）
 */
export function formatInterval(intervalDays: number): string {
  if (intervalDays <= 0) return '<1m';           // 0 天 = 当天重学，显示 "<1分钟"语义
  if (intervalDays < 1 / 24 / 60) return '<1m';  // < 1 分钟
  if (intervalDays < 1 / 24) {                   // < 1 小时：按分钟
    const m = Math.round(intervalDays * 24 * 60);
    return `${m}m`;
  }
  if (intervalDays < 1) {                        // < 1 天：按小时
    const h = Math.round(intervalDays * 24);
    return `${h}h`;
  }
  if (intervalDays < 30) {                       // < 1 月：按天
    return `${Math.round(intervalDays)}d`;
  }
  if (intervalDays < 365) {                     // < 1 年：按月
    const mo = intervalDays / 30;
    return `${round1(mo)}mo`;
  }
  const y = intervalDays / 365;                  // ≥ 1 年
  return `${round1(y)}y`;
}

/** 预览某档评分后的间隔字符串（不实际修改状态，仅用于按钮显示）。
 *  对齐 AnkiWeb 实测（2026-07-05）：
 *  - 学习步阶段（learning/relearning）产出的间隔 <1 天时，加 `<` 前缀（如 `<10m`、`<1m`、`<6m`）。
 *    AnkiWeb 这样表示"小于"，因为学习步 due 含 0~5m fuzz，显示的是名义步长（实际可能略长）。
 *  - review 阶段或 ≥1 天的间隔不加 `<`（如 `1d`、`4d`、`6d` 是确定值）。
 *  - 特例：review 阶段评 again（lapse）会先进 relearning（10m），按学习步规则显示 `<10m`。 */
export function previewInterval(prev: SrsState | undefined, grade: SrsGrade, now: number): string {
  if (prev && prev.phase === 'review' && grade === 'again') {
    const min = RELEARNING_STEPS_MIN[0];
    return '<' + formatInterval(min / 24 / 60);
  }
  const next = review(prev, grade, now);
  const text = formatInterval(next.interval);
  // 学习步阶段（含新卡 prev=undefined 视作 learning）且间隔 <1 天 → 加 < 前缀
  const isLearn = !prev || prev.phase === 'learning' || prev.phase === 'relearning';
  if (isLearn && next.interval < 1) return '<' + text;
  return text;
}

/** 保留 2 位小数 */
function round2(n: number): number { return Math.round(n * 100) / 100; }
/** 保留 1 位小数 */
function round1(n: number): number { return Math.round(n * 10) / 10; }
