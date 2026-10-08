// warmup.ts — 断档回归「热身一题」挑题判据（#120 / spec #118 T1；v0.26）。
//
// 断档 ≥ REGRESSION_GAP_DAYS（plan.ts，3 天）的回归场景里，首页回归卡与教练快照给
// 同一套动作的第一步：从**下一站考点**挑一题，低门槛重启（v0.27 才谈自动重排，本层零执行）。
//
// 选站：web 侧直接复用全景「下一站」判据（nextStation.ts——落后日程插队 > 补弱 > 结构轨），
// 调用方把 nextStation 的主推荐 StationPick 传进来，保证首页热身考点与全景页推荐卡同一站；
// 脚本侧（scripts/lib/warmup.mjs）因不引 knowflow 拓扑，用同三级优先的排布表近似——
// 无 knowflow 映射的主题（dev-intro 基准）两侧一致，有映射主题脚本侧结构轨为近似
//（nextStation.ts 头注「不承诺结构洞察」的同款诚实边界）。
//
// 挑题（本文件，双侧同构）：考点题集（examPoint 匹配 + 计划内，题库序）——
//   1. 有未答的 → 第一道未答（推进；「未答」与 mastery 口径一致：无记录/墓碑/随机沙盒不算）
//   2. 全答过   → 第一道未毕业错题（重做熟悉题，找回手感）
//   3. 否则     → 第一道
//   站点考点无计划内题（纯拓展考点）或无站点（全掌握/无考点主题）→ 全库回退同三级，reason='fallback'。
import type { Question, Progress } from '../types';
import { isPlanned } from './topicOrder';
import { wrongIds } from './progress';
import type { StationPick } from './nextStation';

/** 热身挑题结果。reason 归一化下一站三轨（behindSchedule→schedule / unlocked→structural）+ 回退。 */
export interface WarmupPick {
  questionId: string;
  /** 下一站考点 id；回退路径取被挑题的 examPoint（无考点题 → ''）。 */
  ep: string;
  reason: 'schedule' | 'weak' | 'structural' | 'fallback';
}

/** 一道题是否「未答」（mastery 口径：无记录/墓碑/随机沙盒都算没进主进度）。 */
function isUnanswered(q: Question, progress: Progress): boolean {
  const r = progress.answers[q.id];
  return !r || r.deletedAt !== undefined || r.fromRandom === true;
}

/** 题集内挑一题：第一道未答 → 第一道未毕业错题 → 第一道（题库序，纯函数）。 */
function pickFrom(pool: Question[], progress: Progress, wrongSet: Set<string>): Question | null {
  if (pool.length === 0) return null;
  return pool.find((q) => isUnanswered(q, progress)) ?? pool.find((q) => wrongSet.has(q.id)) ?? pool[0];
}

/** 热身挑题（纯函数）：站点考点题集 → 全库回退。questions 应传激活主题全量题库
 *  （多主题隔离靠题库边界，与 Home 其他派生同口径）。
 *  热身池 = 计划内且非拓展层（isPlanned + tier）：无论拓展开关状态，挑中的题在
 *  Practice 列表恒可见（「入口可点进并完成」不因拓展隐身断链）。 */
export function pickWarmupQuestion(
  questions: Question[],
  progress: Progress,
  station: StationPick | null,
): WarmupPick | null {
  const planned = questions.filter((q) => isPlanned(q) && q.tier !== 'ext');
  if (planned.length === 0) return null;
  const wrongSet = new Set(wrongIds(progress, questions));

  if (station) {
    const pool = planned.filter((q) => q.examPoint === station.ep);
    const picked = pickFrom(pool, progress, wrongSet);
    if (picked) {
      const reason: WarmupPick['reason'] =
        station.reason === 'behindSchedule' ? 'schedule' : station.reason === 'weak' ? 'weak' : 'structural';
      return { questionId: picked.id, ep: station.ep, reason };
    }
    // 站点考点在计划内无题（纯拓展考点等）→ 落全库回退
  }
  const picked = pickFrom(planned, progress, wrongSet);
  if (!picked) return null;
  return { questionId: picked.id, ep: picked.examPoint ?? '', reason: 'fallback' };
}
