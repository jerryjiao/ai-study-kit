import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../types';

/** 本地模式（demo 无后端降级）的行为契约，见 wayfinder #11/#12：
 *  启动探测一次 /api —— GET 不可达 → 锁定本地模式：
 *  进度只读写 localStorage、绝不 POST、UI 收到 'local' 状态。
 *  接缝：progressClient 公共 API（fetch/localStorage 为外部边界，打桩）。 */

function makeProgress(answerId: string): Progress {
  return {
    version: 1,
    answers: {
      [answerId]: { selected: ['A'], correct: true, submittedAt: 1723800000000 },
    },
  };
}

/** 内存 localStorage 桩（node 环境没有 DOM） */
function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

async function freshClient() {
  vi.resetModules();
  return import('./progressClient');
}

describe('progressClient 本地模式', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubLocalStorage();
  });

  it('启动探测 GET 不可达 → 锁定本地模式，返回本地副本并通知 local', async () => {
    const store = stubLocalStorage();
    store.set('ask-progress-v1', JSON.stringify(makeProgress('GIT-001')));
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const { loadProgress, isLocalMode, setSyncListener } = await freshClient();

    const statuses: string[] = [];
    setSyncListener((s) => statuses.push(s));
    const p = await loadProgress();

    expect(isLocalMode()).toBe(true);
    expect(p.answers['GIT-001']?.correct).toBe(true);
    expect(statuses).toContain('local');
  });

  it('本地模式下 saveProgress 只写 localStorage，绝不 POST', async () => {
    const store = stubLocalStorage();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const { loadProgress, saveProgress } = await freshClient();
    await loadProgress(); // 探测失败 → 本地模式
    fetchMock.mockClear();

    const p = makeProgress('LNX-002');
    await saveProgress(p);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(store.get('ask-progress-v1') ?? '{}')).toEqual(p);
    // pending 队列不应被写入（那是 POST 失败才有的东西）
    expect(store.has('ask-progress-pending')).toBe(false);
  });

  it('探测成功 → 同步模式：与服务器合并，saveProgress 正常 POST', async () => {
    const store = stubLocalStorage();
    store.set('ask-progress-v1', JSON.stringify(makeProgress('GIT-001')));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(makeProgress('LNX-009')), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { loadProgress, saveProgress, isLocalMode } = await freshClient();

    const p = await loadProgress();
    expect(isLocalMode()).toBe(false);
    expect(p.answers['GIT-001']?.correct).toBe(true); // 本地保留
    expect(p.answers['LNX-009']?.correct).toBe(true); // 远端合并进来

    await saveProgress(makeProgress('GIT-003'));
    const posts = fetchMock.mock.calls.filter((c) => c[1]?.method === 'POST');
    expect(posts).toHaveLength(1);
  });

  it('本地模式不是终身监禁：冷却期后保存会懒重探，后端恢复即回到同步模式', async () => {
    vi.useFakeTimers();
    try {
      stubLocalStorage();
      const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
      vi.stubGlobal('fetch', fetchMock);
      const { loadProgress, saveProgress, isLocalMode } = await freshClient();

      await loadProgress(); // 探测失败 → 本地模式
      expect(isLocalMode()).toBe(true);

      // 冷却期内保存：不重探（fetch 仅剩最初那一次调用）
      await saveProgress(makeProgress('GIT-001'));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 冷却期过后保存：懒重探，这次后端活着 → 退出本地模式
      vi.advanceTimersByTime(61_000);
      fetchMock.mockResolvedValue(new Response(JSON.stringify(makeProgress('LNX-009')), { status: 200 }));
      await saveProgress(makeProgress('GIT-002'));
      // 重探是 fire-and-forget，等微任务排空
      await vi.advanceTimersByTimeAsync(0);
      expect(isLocalMode()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
