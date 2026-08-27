import type { Progress } from '../types';
import { emptyProgress, mergeProgress } from '../lib/progress';

const LS_KEY = 'ask-progress-v1';
/** 失败的进度快照队列：每次彻底失败（重试用尽）的 Progress 整体存一份。
 *  下次 loadProgress 启动时尝试 flush。设计成数组而非单值，避免多次连续失败互相覆盖。
 *  每个元素是一个完整 Progress 快照（不是增量），flush 时按 submittedAt merge 进服务器。 */
const PENDING_KEY = 'ask-progress-pending';

/** 同步状态回调：让 UI 层（useProgress）感知成功/失败/本地模式，显示 banner */
type SyncListener = (status: 'saved' | 'error' | 'local') => void;
let syncListener: SyncListener | null = null;
export function setSyncListener(fn: SyncListener | null): void {
  syncListener = fn;
}
function notify(status: 'saved' | 'error' | 'local'): void {
  try { syncListener?.(status); } catch { /* 监听器异常不影响主流程 */ }
}

/** 本地模式（CONTEXT.md 术语）：进度 API 不可达时 app 自动进入的形态。
 *  启动探测一次（loadProgress 的 GET），失败即整个会话锁定：进度只存本浏览器、
 *  绝不发 POST。典型场景是官网上托管的静态 demo（GitHub Pages 无后端）。
 *  自部署连着后端时探测成功，走默认同步模式，行为与从前完全一致。 */
let localMode = false;
export function isLocalMode(): boolean {
  return localMode;
}

/** 本地模式懒重探冷却期：期间保存不重探，避免每次答题都发注定失败的请求。
 *  超过冷却期的下一次保存会 fire-and-forget 重探一次——后端恢复（如自托管重启完成）
 *  即自动回到同步模式并 flush 积压，无需用户刷新页面。 */
const REPROBE_MS = 60_000;
let lastProbeAt = 0;

async function revalidateLocalMode(): Promise<void> {
  try {
    const res = await fetch('/api/progress', { cache: 'no-store' });
    if (res.ok) {
      localMode = false;
      notify('saved');
      void flushPending(); // 后端回来了，把积压的进度补写
    }
  } catch {
    /* 仍不可达：保持本地模式，等下个冷却期 */
  }
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
  // 本地模式已锁定：不发任何请求（含 pending flush），纯本地读写
  if (localMode) return readLocal();
  try {
    // 先 flush pending（如果有）
    await flushPending();
    const res = await fetch('/api/progress', { cache: 'no-store' });
    if (!res.ok) {
      // 探测失败（404/5xx 均视为无后端）→ 锁定本地模式并告知 UI
      localMode = true;
      lastProbeAt = Date.now();
      notify('local');
      return readLocal();
    }
    const remote = (await res.json()) as Progress;
    // ⭐ 合并时【重读】本地快照，而非函数开头捕获的旧值：
    //    GET 期间可能已有乐观写入落盘（markRead/submitAnswer 的 writeLocal 先行、POST 在途），
    //    用旧快照 merge 后回写会把它们清掉，造成"UI 有、存储无"的口径漂移（2026-08-17 踩过）。
    //    重读后的 local 含乐观数据，按 submittedAt/时间戳 merge 语义不变。
    const merged = mergeProgress(readLocal(), remote);
    writeLocal(merged);
    return merged;
  } catch {
    // 网络不可达 → 同样锁定本地模式
    localMode = true;
    lastProbeAt = Date.now();
    notify('local');
    return readLocal();
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
  // 本地模式：无服务器可发，pending 队列原地保留（等将来连上真后端再 flush）
  if (localMode) return true;
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
  // 本地模式：不发 POST、不入 pending、不报错——localStorage 就是唯一存储。
  // 超过冷却期则懒重探一次，后端恢复自动回到同步模式（见 revalidateLocalMode）。
  if (localMode) {
    if (Date.now() - lastProbeAt > REPROBE_MS) {
      lastProbeAt = Date.now();
      void revalidateLocalMode();
    }
    return Promise.resolve();
  }
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
