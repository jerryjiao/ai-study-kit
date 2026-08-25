import type { Flashcard, SrsGrade } from '../types';

/**
 * 会话级复习调度（纯函数状态机）。
 *
 * 为什么存在：早期实现把 queue 做成 `useMemo([srs])` 响应式，评分后 srs 变化会让 queue
 * 重建并缩短（good/hard/easy 的卡移出今日队列），而 pos 单调 +1 → pos 越界 → 误判完成，
 * 把 again 留在学习中队列的卡轮不到再刷就退出了。
 *
 * 修复：进入复习页时构建一次快照队列（main），评分只更新 srs 不重建队列；
 * again 的卡显式排进 relearn 尾部队列，在本会话内再刷，直到评 hard 以上。
 * 完成判定 = main 走完 且 relearn 清空。
 */

export interface ReviewSession {
  /** 进入页面时快照的今日队列（不再随 srs 变化） */
  main: Flashcard[];
  /** 已处理的原队列位置（0..main.length） */
  pos: number;
  /** 重学队列：again 的卡排到队尾，本会话内再刷 */
  relearn: Flashcard[];
  /** 本次会话已评分次数（含重学），用于进度条分子与 streak 判定 */
  doneCount: number;
}

/** 初始化一个复习会话：传入快照后的今日队列（调用方负责构建+打乱） */
export function initSession(queue: Flashcard[]): ReviewSession {
  return { main: queue, pos: 0, relearn: [], doneCount: 0 };
}

/** 当前应展示的卡：main 未走完取 main[pos]，否则取 relearn 队首 */
export function currentCard(s: ReviewSession): Flashcard | undefined {
  return s.pos < s.main.length ? s.main[s.pos] : s.relearn[0];
}

/** 当前卡是否来自重学队列（前端用于展示"重学"标记等，可选） */
export function isRelearning(s: ReviewSession): boolean {
  return s.pos >= s.main.length && s.relearn.length > 0;
}

/** 是否全部完成：原队列走完 且 无遗留重学卡 */
export function isComplete(s: ReviewSession): boolean {
  return s.pos >= s.main.length && s.relearn.length === 0;
}

/**
 * 应用一次评分，返回新会话状态（不可变）。
 * 注意：本函数只管队列调度，不碰 srs；srs 由调用方照常 review() + reviewCard() 写入。
 *
 * 调度规则（对齐 AnkiWeb 实测 2026-07-05）：
 * - again：当前卡推入 relearn 队尾（本会话再刷）。
 * - good/hard 且评分后仍处学习步阶段（stillLearningAfter=true）：也推入 relearn 队尾，
 *   本会话稍后再刷。AnkiWeb 实测：新卡 Good 推进学习步后，靠 learn-ahead-limit
 *   会在本会话稍后（刷完别的卡后）再次出现，直到毕业（进 review）才不再现。
 * - good/hard/easy 且评分后毕业（进 review，stillLearningAfter=false）：出队，不再现。
 * - easy：永远立即毕业，出队。
 *
 * 防"死循环"的关键（曾踩坑）：完成判定 isComplete = main 走完 且 relearn 清空。
 * 一轮内每张卡最多进 relearn 一次（again 或 stillLearningAfter），不会 head→tail
 * 无限循环——因为 relearn 队列会被逐张消费掉。即使所有卡都 learning，刷完 N 轮后
 * 全部毕业（或 due 远到 learn-ahead 窗口外），relearn 清空即完成。AnkiWeb 也是如此。
 *
 * pos 推进规则：main 未走完时 +1；已进入 relearn 阶段时 pos 不再变（停在 main.length），
 * 改由 relearn 队首消费驱动。
 *
 * @param stillLearningAfter 评分后该卡是否仍处学习步阶段（learning/relearning）。
 *   调用方算 next=review(prev,g,now) 后用 isLearningPhase(next) 传入。默认 false
 *   （保持向后兼容：不传则只有 again 重刷）。
 */
export function applyGrade(s: ReviewSession, grade: SrsGrade, stillLearningAfter = false): ReviewSession {
  const cur = currentCard(s);
  if (!cur) return s; // 已完成，忽略

  const doneCount = s.doneCount + 1;

  // 判定该卡本次评分后是否要排到 relearn 队尾本会话再刷：
  //  - again：永远要（忘了，立刻重看）
  //  - good/hard：仅当评分后仍处学习步阶段（仍 learning/relearning，未毕业进 review）
  //  - easy：永远不（easy 立即毕业）
  const shouldRequeue = grade === 'again' || (stillLearningAfter && (grade === 'good' || grade === 'hard'));

  if (shouldRequeue) {
    if (s.pos < s.main.length) {
      // main 阶段：推进 main，卡进 relearn 队尾
      return { ...s, pos: s.pos + 1, relearn: [...s.relearn, cur], doneCount };
    }
    // relearn 阶段：队首挪到队尾（再刷一次）
    const [, ...rest] = s.relearn;
    return { ...s, relearn: [...rest, cur], doneCount };
  }

  // 不重刷 → 出队
  if (s.pos < s.main.length) {
    return { ...s, pos: s.pos + 1, doneCount };
  }
  // 来自 relearn：移除队首（视为已毕业/赎回）
  const [, ...rest] = s.relearn;
  return { ...s, relearn: rest, doneCount };
}
