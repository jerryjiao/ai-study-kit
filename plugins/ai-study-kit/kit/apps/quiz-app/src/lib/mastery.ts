// mastery.ts — 考点掌握度判据（web UI 用，scripts/lib/mastery.mjs 的 TS 移植）。
//
// ⚠️ 判据与 scripts/lib/mastery.mjs 必须保持同步（mastery-report.mjs / skill 探测用那边的
// 版本，首页掌握度面板用这边）——改判据两边一起改，测试两边都有。
//
// 判据（v1.1，题 + 闪卡双通道）：
//   mastered    考点下全部题已作答、最近一次全对、无未毕业错题，
//               且映射闪卡（flashcards[].examPoint）全部毕业（SRS phase = review）
//   weak        存在未毕业错题，或最近一次有答错的题
//   inProgress  有作答且无负面证据，但未答全、含未评自测题、或映射闪卡未全部毕业
//   untouched   一题未答
//
// 考点显示名来自 sync-examples.mjs 产进 src/data/theme.json 的 examPoints
// （MISSION.md 排布表解析），UI 不重复解析 markdown。
// 多主题隔离：只遍历传入 questions 的 id，answers/srs 里其他主题的记录天然不参与。
import type { AnswerRecord, Flashcard, Question, SrsState } from '../types';
import { isAnswerDeleted, isFromRandom, isCardDeleted, streakToPass } from './progress';

export type MasteryStatus = 'mastered' | 'weak' | 'inProgress' | 'untouched';

export interface ExamPointMastery {
  ep: string;
  name: string;
  questionIds: string[];
  total: number;
  answered: number;
  correctNow: number;
  openWrongIds: string[];
  flashMapped: number;
  flashGraduated: number;
  flashOpenIds: string[];
  status: MasteryStatus;
}

/** 错题毕业阈值（与 progress.ts streakToPass 一致，直接复用同一实现）。 */
export { streakToPass };

/** 记录是否仍是未毕业错题（与 grill-utils isWrong 同口径）。 */
export function isOpenWrong(r: AnswerRecord | undefined): boolean {
  if (!r || r.streak === undefined) return false;
  return r.streak < streakToPass(r.wrongCount ?? 1);
}

/** 闪卡是否已毕业：有 SRS 记录、无墓碑、进入 review 阶段（SM-2 长期间隔）。 */
export function isFlashGraduated(s: SrsState | undefined): boolean {
  return !!s && !isCardDeleted(s) && s.phase === 'review';
}

/**
 * 按考点聚合掌握度。
 * @param questions 激活主题题库（examPoint 为 EP-NN；无 examPoint 的题不参与，计入 untracked）
 * @param answers   progress.answers
 * @param epNames   考点显示名（theme.json 的 examPoints，可空）
 * @param flashcards 激活主题闪卡（含可选 examPoint；空数组 = 判据退回纯题维度）
 * @param srs        progress.srs
 */
export function masteryByExamPoint(
  questions: Question[],
  answers: Record<string, AnswerRecord>,
  epNames: Record<string, string> = {},
  flashcards: Flashcard[] = [],
  srs: Record<string, SrsState> = {},
): { points: ExamPointMastery[]; untracked: number } {
  // 考点 → 映射闪卡 id 集（examPoint 精确匹配）
  const flashByEp = new Map<string, string[]>();
  for (const f of flashcards) {
    if (!f.examPoint) continue;
    const list = flashByEp.get(f.examPoint) ?? [];
    list.push(f.id);
    flashByEp.set(f.examPoint, list);
  }

  const groups = new Map<string, string[]>();
  let untracked = 0;
  for (const q of questions) {
    const ep = q.examPoint;
    if (!ep) { untracked++; continue; }
    const list = groups.get(ep) ?? [];
    list.push(q.id);
    groups.set(ep, list);
  }

  const points: ExamPointMastery[] = [];
  for (const [ep, ids] of groups) {
    let answered = 0;
    let correctNow = 0;
    let neutral = 0;
    const openWrongIds: string[] = [];
    for (const id of ids) {
      const r = answers[id];
      // 与 skill 快照口径一致：墓碑=已删、随机沙盒不进主进度
      if (!r || isAnswerDeleted(r) || isFromRandom(r)) continue;
      answered++;
      if (r.correct === true) correctNow++;
      if (r.correct === null) neutral++;
      if (isOpenWrong(r)) openWrongIds.push(id);
    }
    // 闪卡组件：映射卡里未毕业的（墓碑=已重置，算未毕业）
    const flashIds = flashByEp.get(ep) ?? [];
    const flashOpenIds = flashIds.filter((id) => !isFlashGraduated(srs[id]));
    // 负面证据 = 未毕业错题 或 最近一次答错（自评未判只占位，不算负面也不算正向）
    const hasNegative = openWrongIds.length > 0 || correctNow + neutral < answered;
    let status: MasteryStatus;
    if (answered === 0) status = 'untouched';
    else if (hasNegative) status = 'weak';
    else if (answered === ids.length && correctNow === ids.length && flashOpenIds.length === 0) status = 'mastered';
    else status = 'inProgress';
    points.push({
      ep, name: epNames[ep] || ep, questionIds: ids, total: ids.length, answered, correctNow, openWrongIds,
      flashMapped: flashIds.length, flashGraduated: flashIds.length - flashOpenIds.length, flashOpenIds, status,
    });
  }
  return { points, untracked };
}

/**
 * 弱点排序：weak 在前（未毕业错题数降序，其次当前答错数），再 inProgress（未答数降序）。
 * mastered / untouched 不进榜（没有行动价值）。顺序与 scripts/lib/mastery.mjs rankWeakness 一致。
 */
export function rankWeakness(points: ExamPointMastery[]): ExamPointMastery[] {
  return points
    .filter((p) => p.status === 'weak' || p.status === 'inProgress')
    .sort((a, b) => {
      const rank = (p: ExamPointMastery) => (p.status === 'weak' ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.status === 'weak') {
        const wrongNowA = a.answered - a.correctNow;
        const wrongNowB = b.answered - b.correctNow;
        return (b.openWrongIds.length - a.openWrongIds.length) || (wrongNowB - wrongNowA);
      }
      return (b.total - b.answered) - (a.total - a.answered);
    });
}
