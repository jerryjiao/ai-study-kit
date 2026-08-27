import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Progress, AnswerRecord, SrsState, SyncStatus, UiLang, LearnSettings } from '../types';
import { emptyProgress, applyAnswer, applySrs, markRead as markReadFn, nextStreak, nextWrongCount, streakToPass, resetWrong as resetWrongFn, resetRead as resetReadFn, resetAnswersByIds as resetAnswersByIdsFn, resetReadByIds as resetReadByIdsFn, resetSrs as resetSrsFn, noteNewCard, markCourseRead as markCourseReadFn } from '../lib/progress';
import type { ThemeMode } from '../lib/theme';
import { isNew } from '../lib/srs';
import { loadProgress, saveProgress, setSyncListener, flushPending } from '../api/progressClient';

/** 进度全局状态：上提到 React Context，避免每个页面各持一份独立 state。
 *  旧实现里 Home / Practice / Read / Flashcards 各调一次 useProgress()，各自维护 state，
 *  导致 Practice 答题后 Home 看不到（除非重新 loadProgress）。全局化后所有页面共享同一份 state，
 *  答题即时反映到 dashboard。对外接口与旧 hook 完全一致。 */
interface ProgressCtxValue {
  progress: Progress;
  loaded: boolean;
  syncStatus: SyncStatus;       // 'saved' | 'error' | 'local'：同步/失败/本地模式（见 types.ts）
  retrySync: () => Promise<void>; // 手动重试 flush pending 队列（点击 banner 时调）
  submitAnswer: (id: string, rec: AnswerRecord) => void;
  markRead: (id: string) => void;
  /** 标记一节课已读（课程页 iframe 加载命中清单时调）。key 自带主题前缀，多主题隔离。 */
  markCourseRead: (theme: string, file: string) => void;
  reviewCard: (cardId: string, state: SrsState) => void;
  reset: () => Promise<void>;
  /** ids 可选：多主题隔离——传激活主题的题/卡 id 集时只清命中的，不误伤其他主题进度。 */
  resetWrong: (ids?: string[]) => void;
  resetRead: (ids?: string[]) => void;
  resetAnswersByIds: (ids: string[]) => void;
  resetReadByIds: (ids: string[]) => void;
  resetSrs: (ids?: string[]) => void;
  /** 单题手动移出错题集：把 streak 拉到 streakToPass 阈值，下次 wrongIds 自然过滤掉。
   *  用于错题练习时用户主动判定"已掌握"，不等连对达标。不删历史记录（wrongCount 保留）。 */
  dismissWrong: (id: string) => void;
  /** 设置 UI 主题偏好（light/dark/system），同步到服务器跨设备跟随。 */
  setTheme: (mode: ThemeMode) => void;
  /** 设置 UI 语言偏好（zh/en/es/ru），同步到服务器跨设备跟随。 */
  setLang: (l: UiLang) => void;
  /** 更新学习偏好（设置面板）：patch 合入 progress.settings 整块 LWW 同步（settingsUpdatedAt 仲裁）。 */
  updateSettings: (patch: Partial<LearnSettings>) => void;
}

const ProgressCtx = createContext<ProgressCtxValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  // 注册同步状态监听：progressClient POST 成功/失败时回调
  useEffect(() => {
    setSyncListener((status) => setSyncStatus(status));
    return () => setSyncListener(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((p) => { if (!cancelled) { setProgress(p); setLoaded(true); } });
    return () => { cancelled = true; };
  }, []);

  // 用 ref 缓存最新 progress，让"响应 progress 变化发 POST"的 effect 能拿到最新值
  // （避免在 setProgress reducer 内部发副作用——React 18 严格模式双重调用风险）
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  // 待提交标记：setProgress 后置 true，effect 检测到就发一次 POST
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    void saveProgress(progressRef.current);
  }, [progress]);

  /** 手动重试：用户点 banner 触发 flush pending 队列 */
  const retrySync = useCallback(async () => {
    const ok = await flushPending();
    setSyncStatus(ok ? 'saved' : 'error');
  }, []);

  const submitAnswer = useCallback((id: string, rec: AnswerRecord) => {
    setProgress((prev) => {
      const prevRec = prev.answers[id];
      const streak = nextStreak(rec.correct, prevRec?.streak);
      // streak=undefined（从未答错的题）→ 不存该字段；否则存当前进度
      const withStreak = streak === undefined ? { ...rec } : { ...rec, streak };
      // wrongCount：答错累计次数（只增不减），undefined 表示从未答错
      const wrongCount = nextWrongCount(rec.correct, prevRec?.wrongCount);
      const withWrong = wrongCount === undefined ? withStreak : { ...withStreak, wrongCount };
      return applyAnswer(prev, id, withWrong);
    });
    dirtyRef.current = true; // 标记待提交，由 effect 统一 POST
  }, []);

  const markRead = useCallback((id: string) => {
    setProgress((prev) => markReadFn(prev, id));
    dirtyRef.current = true;
  }, []);

  const markCourseRead = useCallback((theme: string, file: string) => {
    setProgress((prev) => markCourseReadFn(prev, theme, file));
    dirtyRef.current = true;
  }, []);

  /** 闪卡：写入一张卡的 SRS 状态（由 srs.review 算好传入）。
   *  若该卡评分前是新卡（无记录 / 学习步首步无 lapse），顺带累加"今日新卡计数"，
   *  配合"每日新卡配额"防一天灌太多。 */
  const reviewCard = useCallback((cardId: string, state: SrsState) => {
    setProgress((prev) => {
      const wasNew = isNew(prev.srs?.[cardId]);
      let next = applySrs(prev, cardId, state);
      if (wasNew) next = noteNewCard(next);
      return next;
    });
    dirtyRef.current = true;
  }, []);

  const reset = useCallback(async () => {           // 全部
    // ⚠️ 不能直接写 emptyProgress()：writeProgress 是 read-merge-write，
    // 空对象的 answers 会被服务器旧快照补回，导致"清空全部进度"失效。
    // 改成对当前所有 answers/read/srs 打墓碑，删除意图才能持久化。
    const prev = progressRef.current;
    const now = Date.now();
    const emptied: Progress = {
      version: 1,
      answers: Object.fromEntries(Object.entries(prev.answers).map(([id]) => [id, { selected: [], correct: null, submittedAt: now, deletedAt: now }])),
      read: prev.read ?? {},
      readTombstones: Object.fromEntries(Object.keys(prev.read ?? {}).map((id) => [id, now])),
      srs: Object.fromEntries(Object.entries(prev.srs ?? {}).map(([id, s]) => [id, { ...s, deletedAt: now }])),
      // 保留 UI 偏好：reset 是清学习进度，不是清主题/语言/学习偏好等设置
      theme: prev.theme,
      themeUpdatedAt: prev.themeUpdatedAt,
      lang: prev.lang,
      langUpdatedAt: prev.langUpdatedAt,
      settings: prev.settings,
      settingsUpdatedAt: prev.settingsUpdatedAt,
    };
    setProgress(emptied);
    await saveProgress(emptied);
  }, []);

  const resetWrong = useCallback((ids?: string[]) => {      // 仅错题（ids=激活主题题集时主题隔离）
    setProgress((prev) => resetWrongFn(prev, Date.now(), ids));
    dirtyRef.current = true;
  }, []);

  const resetRead = useCallback((ids?: string[]) => {       // 仅看题（同上）
    setProgress((prev) => resetReadFn(prev, Date.now(), ids));
    dirtyRef.current = true;
  }, []);

  /** 仅重置指定题目的答题记录（重做本题集用，按 id 集合精准清除） */
  const resetAnswersByIds = useCallback((ids: string[]) => {
    setProgress((prev) => resetAnswersByIdsFn(prev, ids));
    dirtyRef.current = true;
  }, []);

  /** 仅重置指定题目的看题记录（看题模式"重看本题集"用，按 id 集合精准清除） */
  const resetReadByIds = useCallback((ids: string[]) => {
    setProgress((prev) => resetReadByIdsFn(prev, ids));
    dirtyRef.current = true;
  }, []);

  /** 重置闪卡进度：清 srs 字段（ids=激活主题卡集时主题隔离），保留答题/看题进度 */
  const resetSrs = useCallback((ids?: string[]) => {
    setProgress((prev) => resetSrsFn(prev, Date.now(), ids));
    dirtyRef.current = true;
  }, []);

  /** 单题手动移出错题集：把 streak 拉到 streakToPass(wrongCount) 阈值，下次 wrongIds 过滤掉。
   *  保留历史记录（wrongCount 不动），仅改变 streak 让题退出错题集。
   *  题不在错题集（无 streak）时无操作。 */
  const dismissWrong = useCallback((id: string) => {
    setProgress((prev) => {
      const rec = prev.answers[id];
      if (!rec || rec.streak === undefined) return prev; // 非错题，无操作
      const target = streakToPass(rec.wrongCount ?? 1);
      return applyAnswer(prev, id, { ...rec, streak: target });
    });
    dirtyRef.current = true;
  }, []);

  /** 设置 UI 主题偏好：写入 progress.theme + themeUpdatedAt，经 dirty effect 同步到服务器。
   *  时间戳用真实 Date.now()（AGENTS.md 红线：未来时间戳会压制真实写入）。 */
  const setTheme = useCallback((m: ThemeMode) => {
    setProgress((prev) => ({ ...prev, theme: m, themeUpdatedAt: Date.now() }));
    dirtyRef.current = true;
  }, []);

  /** 设置 UI 语言偏好：写入 progress.lang + langUpdatedAt（同 setTheme 的 LWW 同步模式）。 */
  const setLang = useCallback((l: UiLang) => {
    setProgress((prev) => ({ ...prev, lang: l, langUpdatedAt: Date.now() }));
    dirtyRef.current = true;
  }, []);

  /** 更新学习偏好：patch 合入 settings 整块写（合并非替换字段级），时间戳 LWW。
   *  dailyNewCards 变更时顺写 localStorage 'ask-new-per-day'——闪卡页既有读路径优先级
   *  是 settings > localStorage > 5，双写保证旧版页面/离线场景也能立即生效。 */
  const updateSettings = useCallback((patch: Partial<LearnSettings>) => {
    setProgress((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      settingsUpdatedAt: Date.now(),
    }));
    if (typeof patch.dailyNewCards === 'number') {
      try { localStorage.setItem('ask-new-per-day', String(patch.dailyNewCards)); } catch { /* 配额满等，忽略 */ }
    }
    dirtyRef.current = true;
  }, []);

  const value = useMemo<ProgressCtxValue>(
    () => ({ progress, loaded, syncStatus, retrySync, submitAnswer, markRead, markCourseRead, reviewCard, reset, resetWrong, resetRead, resetAnswersByIds, resetReadByIds, resetSrs, dismissWrong, setTheme, setLang, updateSettings }),
    [progress, loaded, syncStatus, retrySync, submitAnswer, markRead, markCourseRead, reviewCard, reset, resetWrong, resetRead, resetAnswersByIds, resetReadByIds, resetSrs, dismissWrong, setTheme, setLang, updateSettings]
  );

  return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>;
}

/** 从全局 ProgressProvider 取进度。必须在 <ProgressProvider> 内调用。 */
export function useProgress(): ProgressCtxValue {
  const ctx = useContext(ProgressCtx);
  if (!ctx) throw new Error('useProgress must be used within <ProgressProvider>');
  return ctx;
}
