// panoramaTrace.ts — 考点学习轨迹派生（v0.25 票⑤，spec #110「甲 · 节点详情轨迹」）。
//
// 零新基建：全部事件由 progress 既有时间戳确定性派生，不新增任何存储——
//   首次接触 / 答对 / 答错 / 连错   ← answers[qid].submittedAt（progress 只存每题最新一条，
//                                  派生的是「当前证据下的轨迹」，不重放历史每次提交）
//   闪卡毕业                       ← srs[cardId]（毕业态 phase='review'，时间锚 = updatedAt
//                                  最后复习时间——SRS 只存当前态，无毕业时刻快照，spec 拒掉
//                                  「整图时间回放」时已确认这一诚实边界）
//   考点掌握                       ← 仅当前 status=mastered 才有；时间 = 全部证据就位的
//                                  max（各题最后答对时间 ∪ 各卡毕业时间）
//
// 口径纪律：与 mastery.ts 读 record 的口径一致——墓碑（deletedAt ≥ submittedAt）视为已删
// 不出事件，墓碑后再答（submittedAt > deletedAt）照常出事件；随机沙盒（fromRandom）不进
// 主进度，同样不进轨迹。多端合并稳定性：排序带全序 tie-break（时间 → 事件类 → 锚 id），
// mergeProgress 任意方向合并后同一输入映射恒出同一序列。
import type { AnswerRecord, SrsState } from '../types';
import { isAnswerDeleted, isFromRandom, isCardDeleted } from './progress';

/** 轨迹事件（kind 决定词典文案与圆点配色；qid/cardId 是副标题锚，run 是连错 run 长度）。 */
export interface TraceEvent {
  at: number;
  kind: 'first' | 'correct' | 'wrong' | 'wrongRun' | 'flashGrad' | 'mastered';
  qid?: string;
  cardId?: string;
  run?: number;
}

export interface EpTraceInput {
  /** 该考点全部题 id（masteryByExamPoint 的 questionIds） */
  questionIds: readonly string[];
  /** 映射到该考点的闪卡 id 集（flashcards[].examPoint 命中） */
  flashcardIds: readonly string[];
  answers: Record<string, AnswerRecord>;
  srs: Record<string, SrsState>;
  /** 当前掌握四态是否 mastered（masteryByExamPoint 的 status） */
  mastered: boolean;
}

/** 事件全序 tie-break：同时间先答题类、再闪卡、最后掌握收尾（同 kind 内按锚 id 字典序）。 */
const KIND_RANK: Record<TraceEvent['kind'], number> = {
  first: 0,
  correct: 1,
  wrong: 1,
  wrongRun: 1,
  flashGrad: 2,
  mastered: 3,
};

/**
 * 派生一个考点的学习轨迹（纯函数）。
 *
 * 答题事件按 submittedAt 升序走一遍：correct=true 逐题出「答对」；correct=false 逐题出
 * 「答错」，时间相邻的连续答错合并成一个「连错 N」事件（at 取 run 内最后一次，副标题锚
 * 也是它——「连错」描述的是一串相邻的挫败，不拆散）；correct=null（自评未判）无结果可述，
 * 不出事件（但它仍是该考点的有效作答，计入首次接触与掌握证据的时间集）。
 */
export function deriveEpTrace(input: EpTraceInput): TraceEvent[] {
  const { questionIds, flashcardIds, answers, srs, mastered } = input;

  // 有效记录：无记录/墓碑/随机沙盒一律视为「没发生过」（与 mastery 读端同口径）
  const live = questionIds
    .map((qid) => ({ qid, r: answers[qid] }))
    .filter(({ r }) => !!r && !isAnswerDeleted(r) && !isFromRandom(r));
  if (live.length === 0 && flashcardIds.length === 0) return [];

  const events: TraceEvent[] = [];

  // 1) 首次接触：最早一次有效提交（无论对错、无论自评）
  if (live.length > 0) {
    const first = live.reduce((a, b) => (b.r.submittedAt < a.r.submittedAt ? b : a));
    events.push({ at: first.r.submittedAt, kind: 'first' });
  }

  // 2) 答题事件：按 (submittedAt, qid) 全序走，连续答错合并成 run
  const ordered = [...live].sort(
    (a, b) => a.r.submittedAt - b.r.submittedAt || (a.qid < b.qid ? -1 : a.qid > b.qid ? 1 : 0),
  );
  let runLen = 0;
  const flushRun = (endIdx: number) => {
    if (runLen === 0) return;
    const last = ordered[endIdx];
    events.push(
      runLen >= 2
        ? { at: last.r.submittedAt, kind: 'wrongRun', qid: last.qid, run: runLen }
        : { at: last.r.submittedAt, kind: 'wrong', qid: last.qid },
    );
    runLen = 0;
  };
  ordered.forEach(({ qid, r }, i) => {
    if (r.correct === false) {
      runLen += 1;
      return;
    }
    flushRun(i - 1);
    if (r.correct === true) events.push({ at: r.submittedAt, kind: 'correct', qid });
  });
  flushRun(ordered.length - 1);

  // 3) 闪卡毕业：毕业态（phase=review）且未墓碑的映射卡，时间锚 = updatedAt（最后复习）
  for (const cardId of flashcardIds) {
    const s = srs[cardId];
    if (!s || isCardDeleted(s) || s.phase !== 'review') continue;
    events.push({ at: s.updatedAt, kind: 'flashGrad', cardId });
  }

  // 4) 考点掌握：仅当前 mastered 才有；时间 = 全部证据就位时刻（各题最后提交 ∪ 各卡毕业）
  if (mastered) {
    const times = live.map(({ r }) => r.submittedAt);
    for (const cardId of flashcardIds) {
      const s = srs[cardId];
      if (s && !isCardDeleted(s) && s.phase === 'review') times.push(s.updatedAt);
    }
    if (times.length > 0) events.push({ at: Math.max(...times), kind: 'mastered' });
  }

  // 全序排序：时间 → 事件类 rank → 锚 id（多端合并/同刻多事件的稳定序）
  const anchor = (e: TraceEvent) => e.qid ?? e.cardId ?? '';
  return events.sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    const rk = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (rk !== 0) return rk;
    return anchor(a) < anchor(b) ? -1 : anchor(a) > anchor(b) ? 1 : 0;
  });
}
