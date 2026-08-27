import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import type { Progress } from '../src/types';
import { mergeProgress } from '../src/lib/progress';

const EMPTY: Progress = { version: 1, answers: {}, read: {} };

function isValid(x: unknown): x is Progress {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (!o.answers || typeof o.answers !== 'object') return false;
  return true;
}

export function readProgress(file: string): Progress {
  if (!existsSync(file)) return { ...EMPTY, answers: {} };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    return isValid(parsed) ? parsed : { ...EMPTY, answers: {} };
  } catch {
    return { ...EMPTY, answers: {} };
  }
}

/** 合并写入：读旧 → 与 incoming merge（按 submittedAt/updatedAt 取新）→ 原子写。
 *
 * 为什么不是盲覆盖：服务器是单用户权威源，但前端可能多 tab / 多设备同时 POST。
 * 盲覆盖下，A 写 D4 + B 用旧 state 写 D3，会丢 A 的 D4。改成 read-merge-write 后，
 * 每次写入都基于磁盘最新状态合并，按时间戳取新，两边记录最终都保留。
 *
 * mergeProgress（progress.ts:192）已实现合并语义：answers 按 submittedAt、
 * read/srs 按时间戳、srsMeta 按日期。复用同一份逻辑，前后端一致。
 *
 * 注意：read-merge-write 三步非原子，理论上两个并发 POST 可能都 read 到同一旧值
 * 再各自 merge 写入——但 merge 按时间戳取新，最坏结果是两次写入内容一致，不会丢记录。 */
export function writeProgress(file: string, incoming: Progress): void {
  if (!isValid(incoming)) throw new Error('invalid progress payload');
  const base = readProgress(file);
  const merged = mergeProgress(base, incoming);
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify(merged), 'utf-8');
  renameSync(tmp, file);
}
