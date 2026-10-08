// oral.d.mts — oral.mjs 的最小类型面（无运行时代码）。
// 用途：src/lib/oral.test.ts 跨侧一致性断言直接 import '../../scripts/lib/oral.mjs'
// 对拍 TS/脚本双实现（#122），tsc -b 借本文件解析该 import；判据本体以
// oral.mjs（脚本侧）与 src/lib/oral.ts（web 侧）双实现纪律手工同步。
export type MjsOralStatus = 'mastered' | 'inProgress' | 'weak' | 'untouched';
export interface MjsOralAttempt {
  theme?: string;
  target: string;
  correct: boolean;
  at: number;
  source?: string | null;
}
export interface MjsOralMasteryResult {
  asked: number;
  correct: number;
  score: number | null;
  status: MjsOralStatus;
}
export function mergeOralAttempts(a?: MjsOralAttempt[], b?: MjsOralAttempt[]): MjsOralAttempt[];
export function oralMastery(attempts?: MjsOralAttempt[]): MjsOralMasteryResult;
export function oralAttemptsFromProgress(progress: unknown, theme: string): MjsOralAttempt[];
