// mastery.d.mts — mastery.mjs 的最小类型面（无运行时代码）。
// 用途：src/lib/mastery.test.ts 跨侧一致性断言直接 import '../../scripts/lib/mastery.mjs'
// 对拍 TS/脚本双实现（#119 AC3），tsc -b 借本文件解析该 import；判据本体以
// mastery.mjs（脚本侧）与 src/lib/mastery.ts（web 侧）双实现纪律手工同步。
export type MjsMasteryStatus = 'mastered' | 'weak' | 'inProgress' | 'untouched';
export interface MjsExamPointMastery {
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
  oralStatus: MjsMasteryStatus | null;
  status: MjsMasteryStatus;
}
export function streakToPass(wrongCount: number): number;
export function isOpenWrong(r: { streak?: number; wrongCount?: number } | undefined): boolean;
export function epNameMap(missionText: string): Record<string, string>;
export function epDayMap(missionText: string): Record<string, string>;
export function isFlashGraduated(s: { phase?: string; deletedAt?: number } | undefined): boolean;
export function masteryByExamPoint(p: {
  questions: Array<{ id: string; examPoint?: string }>;
  answers?: Record<string, { correct?: boolean | null; streak?: number; wrongCount?: number; deletedAt?: number; fromRandom?: boolean }>;
  epNames?: Record<string, string>;
  flashcards?: Array<{ id: string; examPoint?: string }>;
  srs?: Record<string, { phase?: string; deletedAt?: number }>;
  oralByEp?: Map<string, MjsMasteryStatus> | Record<string, MjsMasteryStatus> | null;
}): { points: MjsExamPointMastery[]; untracked: number };
export function rankWeakness(points: MjsExamPointMastery[]): MjsExamPointMastery[];
