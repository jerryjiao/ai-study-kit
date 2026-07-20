import type { Progress } from '../types';
import { emptyProgress, mergeProgress } from '../lib/progress';

const LS_KEY = 'tp-pass-progress-v1';
/** 失败的进度快照队列：每次彻底失败（重试用尽）的 Progress 整体存一份。
 *  下次 loadProgress 启动时尝试 flush。设计成数组而非单值，避免多次连续失败互相覆盖。
 *  每个元素是一个完整 Progress 快照（不是增量），flush 时按 submittedAt merge 进服务器。 */
const PENDING_KEY = 'tp-pass-progress-pending';

/** 同步状态回调：让 UI 层（useProgress）感知成功/失败，显示 banner */
type SyncListener = (status: 'saved' | 'error') => void;
let syncListener: SyncListener | null = null;
export function setSyncListener(fn: SyncListener | null): void {
  syncListener = fn;
}
function notify(status: 'saved' | 'error'): void {
  try { syncListener?.(status); } catch { /* 监听器异常不影响主流程 */ }
}

function readLocal(): Progress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw);
    return p && p.version === 1 && p.answers ? p : emptyProgress();
  } catch {
    return emptyProgress();
  }
}
function writeLocal(p: Progress) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* 忽略配额 */ }
}

/** 读 pending 队列（损坏/不存在返回空数组） */
function readPending(): Progress[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x && x.version === 1 && x.answers) : [];
  } catch {
    return [];
  }
}
function writePending(queue: Progress[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(queue)); } catch { /* 忽略配额 */ }
}

/** 加载：服务器权威，与本地乐观缓存合并后返回。
 *  启动时若发现 pending 队列（之前失败的快照），先尝试 flush 再走正常流程——
 *  这正是修复"D4 静默丢失"的核心：上次失败的数据，下次打开页面会被自动重发。 */
export async function loadProgress(): Promise<Progress> {
  const local = readLocal();
  try {
    // 先 flush pending（如果有）
    await flushPending();
    const res = await fetch('/api/progress', { cache: 'no-store' });
    if (!res.ok) return local;
    const remote = (await res.json()) as Progress;
    const merged = mergeProgress(local, remote);
    writeLocal(merged);
    return merged;
  } catch {
    return local; // 离线时退回本地
  }
}

/** 单次 POST，失败抛错（由调用方重试） */
async function postOnce(p: Progress): Promise<void> {
  const res = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** 带 3 次指数退避重试的 POST：1s → 2s → 4s。
 *  全部失败 → 把快照推入 pending 队列 + 通知 UI 显示 banner。
 *  这样弱网下数据也不会丢，下次打开 loadProgress 会重发。 */
async function postWithRetry(p: Progress): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await postOnce(p);
      return; // 成功
    } catch (e) {
      if (attempt === 2) throw e;       // 最后一次失败抛出
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // 1s / 2s
    }
  }
}

/** 把失败的 Progress 快照入队 */
function enqueuePending(p: Progress): void {
  const queue = readPending();
  queue.push(p);
  writePending(queue);
}

/** flush pending 队列：把所有快照逐个 merge 进服务器。
 *  服务器已是 merge 模式（progressStore.ts writeProgress），即便 queue 里多个快照
 *  之间有重叠，最终结果按 submittedAt 取新，一致。 */
export async function flushPending(): Promise<boolean> {
  const queue = readPending();
  if (queue.length === 0) return true;
  try {
    for (const snap of queue) {
      await postWithRetry(snap); // 每个快照独立重试
    }
    writePending([]);            // 全部成功 → 清空队列
    notify('saved');
    return true;
  } catch {
    notify('error');
    return false;
  }
}

/** 保存：先写本地乐观缓存，再串行 POST 服务器（服务器为权威）。
 *
 * 为什么串行：旧实现是 fire-and-forget（void saveProgress），连续提交多题时多个 POST
 * 并发到达服务器，后发的请求若闭包捕获了更早的 state（React 函数式更新是串行的，
 * 但 fetch 网络往返会乱序），会用旧 state 覆盖新 state，丢记录。
 * 串行化（链式 await 上一次 POST 完成才发下一次）保证写入顺序 = 调用顺序。
 * 本地写入仍立即执行（乐观），只对网络往返串行。
 *
 * 失败处理：3 次重试用尽 → 入 pending 队列 + UI banner 提示。
 * 不再静默吞错（这是 D4 丢失的根因）。 */
let saveChain: Promise<void> = Promise.resolve();
export function saveProgress(p: Progress): Promise<void> {
  writeLocal(p); // 乐观：立即写本地
  saveChain = saveChain
    .then(() => postWithRetry(p))
    .then(() => notify('saved'))
    .catch(() => {
      // 重试用尽：入队等下次启动 flush，并通知 UI
      enqueuePending(p);
      notify('error');
    });
  return saveChain;
}
