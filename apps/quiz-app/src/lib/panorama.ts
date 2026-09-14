// panorama.ts — 考点全景图（web 侧聚合，scripts/lib/panorama.mjs 的 TS 移植）。
//
// ⚠️ 口径与 scripts/lib/panorama.mjs 必须保持同步（mastery-report / skill 探测用那边的
// 版本，首页全景面板用这边）——沿 mastery.ts/mastery.mjs 双实现先例，改判据两边一起改。
//
// 三信号（v0.13）：
//   taught 讲过    来自 build 时产出的内容无关覆盖快照（src/data/coverage.json——study/records
//                  学习者私有不上站，只有 ep id/布尔/计数能出门）∪ courseTaughtAll（课全读）
//   practiced 练过 本地进度实时派生：该考点有答题记录，或快照口头计数 > 0（弱信号）
//   mastered 掌握  掌握度四态判据不变（masteryByExamPoint，题 + 闪卡双通道）
// 「讲过/口头」新鲜度 = 上次 build；答题/掌握实时。分组：theme.json examDays（排布表 day 列）。
import type { AnswerRecord, Flashcard, Question, SrsState } from '../types';
import { masteryByExamPoint, type ExamPointMastery, type MasteryStatus } from './mastery';

export interface OralCount { asked: number; correct: number }

/** 覆盖快照单点（sync-examples 产 src/data/coverage.json；内容无关——无个人叙述）。 */
export interface CoveragePoint {
  ep: string;
  taught: boolean;
  practiced: boolean;
  mastered: boolean;
  oral: OralCount | null;
}

export interface CoverageSnapshot {
  theme: string;
  generatedAt: string;
  courseTaughtAll: boolean;
  points: CoveragePoint[];
}

export interface PanoramaPoint {
  ep: string;
  name: string;
  taught: boolean;
  practiced: boolean;
  mastered: boolean;
  status: MasteryStatus;
  answered: number;
  total: number;
  openWrong: number;
  oral: OralCount | null;
}

export interface PanoramaGroup {
  day: string;
  points: PanoramaPoint[];
  summary: { total: number; taught: number; practiced: number; mastered: number };
}

export const UNSCHEDULED_DAY = '未排程';

/**
 * 全景聚合（与 scripts/lib/panorama.mjs buildPanorama 同口径；records/coursesRead 输入
 * 在 web 侧替换为 build 时快照——判据等价：taught = 快照 taught ∪ courseTaughtAll）。
 */
export function buildPanorama(
  questions: Question[],
  answers: Record<string, AnswerRecord>,
  epNames: Record<string, string> = {},
  flashcards: Flashcard[] = [],
  srs: Record<string, SrsState> = {},
  coverage: CoverageSnapshot | null = null,
  epDays: Record<string, string> = {},
): { summary: { examPoints: number; taught: number; practiced: number; mastered: number }; courseTaughtAll: boolean; groups: PanoramaGroup[] } {
  const { points } = masteryByExamPoint(questions, answers, epNames, flashcards, srs);

  const covByEp = new Map<string, CoveragePoint>();
  for (const p of coverage?.points ?? []) covByEp.set(p.ep, p);
  const courseTaughtAll = coverage?.courseTaughtAll === true;

  const dayOrder: string[] = [];
  for (const p of points) {
    const day = epDays[p.ep];
    if (day && !dayOrder.includes(day)) dayOrder.push(day);
  }
  dayOrder.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

  const groupMap = new Map<string, PanoramaPoint[]>();
  for (const p of points) {
    const day = epDays[p.ep] || UNSCHEDULED_DAY;
    if (!groupMap.has(day)) groupMap.set(day, []);
    const cov = covByEp.get(p.ep);
    const oral = cov?.oral ?? null;
    groupMap.get(day)!.push({
      ep: p.ep,
      name: p.name,
      taught: (cov?.taught ?? false) || courseTaughtAll,
      practiced: p.answered > 0 || (oral?.asked ?? 0) > 0,
      mastered: p.status === 'mastered',
      status: p.status,
      answered: p.answered,
      total: p.total,
      openWrong: p.openWrongIds.length,
      oral,
    });
  }

  const groupKeys = [...groupMap.keys()].sort((a, b) => {
    if (a === UNSCHEDULED_DAY) return 1;
    if (b === UNSCHEDULED_DAY) return -1;
    const ia = dayOrder.indexOf(a), ib = dayOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const groups: PanoramaGroup[] = groupKeys.map((day) => {
    const pts = groupMap.get(day)!;
    return {
      day,
      points: pts,
      summary: {
        total: pts.length,
        taught: pts.filter((x) => x.taught).length,
        practiced: pts.filter((x) => x.practiced).length,
        mastered: pts.filter((x) => x.mastered).length,
      },
    };
  });

  const all = groups.flatMap((g) => g.points);
  return {
    summary: {
      examPoints: all.length,
      taught: all.filter((x) => x.taught).length,
      practiced: all.filter((x) => x.practiced).length,
      mastered: all.filter((x) => x.mastered).length,
    },
    courseTaughtAll,
    groups,
  };
}
