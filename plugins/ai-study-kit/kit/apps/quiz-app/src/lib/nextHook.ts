// nextHook.ts — 会话收尾开环预告（v0.26 票 #124）。
//
// 每次学习会话的结束不再是终点：收尾给**下个微块预告**（「下次：EP-XX 口述 3 题，约
// 5 分钟」）——把已验证有效的「未完成感」（Zeigarnik 开环）主动经营成回归钩子，而不是
// 放任它发酵成债务感。题站会话总结页（SessionSummary）与教练收尾（skill F10「收尾开环
// 预告」节）两侧同款，判据单源：
//
//   预告考点 = 全景「下一站」推荐（nextStation 三轨：落后日程插队 > 补弱 > 结构轨）
//   动作/时长 = 微块标准颗粒（#123：单考点口述 3 题，约 5 分钟——动作常量，随微块词表）
//
// 脚本侧同判据的判据源是 plan-report --json 的 `next` 字段（scripts/lib/warmup.mjs 的
// nextHookFromStation——warmupStation 三级近似，无 knowflow 拓扑）；web 侧走真拓扑的
// nextStation——两侧一致性与诚实边界同 warmup.ts（无映射主题两侧一致；有映射主题
// 脚本侧结构轨为近似）。
//
// 语气红线（票 #124 验收④）：钩子式、零催办——只说「下次可以做什么」，不出「落后 /
// 欠 N 站 / 要补回来」类字样。全掌握/无可推考点 → null（调用方不渲染预告行，零变化）。

import type { Flashcard, PlanFile, Progress, Question } from '../types';
import { buildPanorama, flattenScheduleOrder, type CoverageSnapshot } from './panorama';
import { nextStation, derivePlanGapInput, type PlanGapInput } from './nextStation';
import { derivePlanReport } from './plan';
import { oralAttemptsForTheme } from './oral';

/** 微块标准颗粒的动作常量（与 skill F10 微块词表、plan-report `next` 字段同源）：
 *  动作 = 单考点口述 3 题，时长量级 ≈ 5 分钟（5-15 分钟微块的标准起点）。 */
export const NEXT_HOOK_ACTION = 'oral-3' as const;
export const NEXT_HOOK_MINUTES = 5;

/** 下站预告：SessionSummary 预告行与点击直达的数据形状。 */
export interface NextHook {
  /** 下一站考点 id（EP-NN）。 */
  ep: string;
  /** 考点显示名（examPoints 查询，查不到回退 ep 原样）。 */
  name: string;
  /** 预告行显示名（「EP-03 chmod」；无考点名映射时裸 ep，不重复拼接）。 */
  label: string;
  /** 选站依据（nextStation 三轨归一化：behindSchedule→schedule）。 */
  reason: 'schedule' | 'weak' | 'structural';
  /** 动作常量 id（v0.26 = 'oral-3'，口述 3 题；i18n 文案是它的呈现层）。 */
  action: typeof NEXT_HOOK_ACTION;
  /** 时长量级（分钟）。 */
  minutes: number;
  /** 题站「预告可点击直达」的落点：?ep= 考点直达（与全景节点详情/回归卡热身同一入口）。 */
  to: string;
}

/** deriveNextHook 的输入（Practice 页与单测共用形状）。 */
export interface NextHookInput {
  questions: Question[];
  progress: Progress;
  flashcards: Flashcard[];
  coverage: CoverageSnapshot | null;
  examPoints: Record<string, string>;
  examDays: Record<string, string>;
  /** 激活主题名（口述实时回流的多主题隔离键）。 */
  theme: string;
  /** 激活主题计划（src/data/plan；units 空 = 无计划 → 无落后日程轨，零催办）。 */
  plan: PlanFile;
  now: number;
}

/** 下站预告（纯函数）：全景四态（含口述实时回流）→ nextStation 主推荐 → 微块钩子形状。
 *  组装逻辑与 Home 断档回归卡 / Panorama 推荐卡同一套（buildPanorama + flattenScheduleOrder
 *  + derivePlanGapInput + nextStation），保证预告内容与「下一站推荐」口径一致（票 #124 验收①）。
 *  无考点/全掌握 → null。 */
export function deriveNextHook(input: NextHookInput): NextHook | null {
  const { questions, progress, flashcards, coverage, examPoints, examDays, theme, plan, now } = input;
  const pano = buildPanorama(
    questions, progress.answers, examPoints, flashcards, progress.srs ?? {}, coverage, examDays,
    // 口述实时回流（#122，与全景页/回归卡同源）：预告考点的四态取最新时点口径
    oralAttemptsForTheme(progress.oralAttempts, theme),
  );
  const schedulePoints = flattenScheduleOrder(pano.groups);
  if (schedulePoints.length === 0) return null;

  // 计划缺口仅有目标日才有（零催办原则，与 Home/Panorama 同一组装函数）
  let planGap: PlanGapInput | null = null;
  if (plan.units.length > 0) {
    const report = derivePlanReport({
      plan, progress, now,
      questionIds: questions.map((q) => q.id),
      cardIds: flashcards.map((f) => f.id),
      theme,
    });
    planGap = derivePlanGapInput(
      {
        deadline: report.projection.deadline,
        overdue: report.calendarDiff.overdue,
        diffDays: report.calendarDiff.diffDays,
      },
      schedulePoints,
      examDays,
    );
  }

  const station = nextStation({
    points: schedulePoints,
    edges: coverage?.graph?.edges ?? null,
    planGap,
  }).primary;
  if (!station) return null;

  const name = examPoints[station.ep] ?? station.ep;
  // reason 归一化下一站三轨词表（与 warmup 同款）：behindSchedule→schedule / unlocked→structural
  const reason: NextHook['reason'] =
    station.reason === 'behindSchedule' ? 'schedule' : station.reason === 'weak' ? 'weak' : 'structural';
  return {
    ep: station.ep,
    name,
    label: name === station.ep ? station.ep : `${station.ep} ${name}`,
    reason,
    action: NEXT_HOOK_ACTION,
    minutes: NEXT_HOOK_MINUTES,
    to: `/practice/all?ep=${encodeURIComponent(station.ep)}`,
  };
}
