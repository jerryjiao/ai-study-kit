import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PartyPopper, Flame, ChevronRight, RefreshCw } from 'lucide-react';
import { flashcards } from '../data/flashcards';
import { useProgress } from '../hooks/useProgress';
import { useKeyPress } from '../hooks/useKeyPress';
import { review, previewInterval, isDue, isLearningDueAhead, isNew, isLearningPhase, formatInterval } from '../lib/srs';
import { LEARNING_STEPS_MIN, RELEARNING_STEPS_MIN } from '../lib/srs';
import { newCardsToday, isCardDeleted } from '../lib/progress';
import { initSession, currentCard, isComplete, applyGrade } from '../lib/reviewQueue';
import type { ReviewSession } from '../lib/reviewQueue';
import { RatingButtons } from '../components/RatingButtons';
import type { Flashcard, SrsGrade, SrsState } from '../types';

const DAY_MS = 86_400_000;
const STREAK_KEY = 'ask-srs-streak';
const STREAK_DATE_KEY = 'ask-srs-last-complete-date';
const NEW_PER_DAY_KEY = 'ask-new-per-day';
const DEFAULT_NEW_PER_DAY = 5;

/** localStorage 安全读 */
export const lsGet = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
export const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 配额 */ } };

/** 今日字符串（用于 streak 判断"是否同一天完成"） */
const todayStr = () => new Date().toDateString();

/** 复习流程页：构建今日队列并逐张复习。dashboard（FlashcardsHome）负责入口与设置。
 *  ?extra=1 → 再练一轮：忽略到期，全部卡打乱再过一遍（评分照常记，但不更新连续天数）。 */
export function Flashcards() {
  const { progress, reviewCard } = useProgress();
  const srs = progress.srs ?? {};
  const now = Date.now();
  const [params] = useSearchParams();
  const isExtra = params.get('extra') === '1';

  const appliedNewPerDay = parseInt(lsGet(NEW_PER_DAY_KEY, String(DEFAULT_NEW_PER_DAY)), 10) || DEFAULT_NEW_PER_DAY;
  const [sessionTick, setSessionTick] = useState(0);  // 改 isExtra/appliedNewPerDay 时强制重建会话

  /** 进入复习页时构建一次今日队列（快照，评分后不重建）。
   *  extra 模式：全部卡打乱；正式模式：到期复习 > 学习中 > 新卡（配额）。
   *  依赖只挂 [isExtra, appliedNewPerDay, sessionTick]，故意不挂 srs —— 否则评分后 srs 变化
   *  会让队列缩短，pos 越界 → 误判完成，again 的卡轮不到再刷（已修 bug）。 */
  const session = useMemo<ReviewSession>(() => {
    const shuf = <T,>(arr: T[]) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (isExtra) return initSession(shuf(flashcards));

    const states: Record<string, SrsState | undefined> = srs;
    const due: Flashcard[] = [];        // review 阶段到期复习
    const learning: Flashcard[] = [];   // 学习步阶段到期（learning/relearning，学习步循环）
    const fresh: Flashcard[] = [];      // 新卡（无 srs 记录）

    for (const c of flashcards) {
      const st = states[c.id];
      // 墓碑卡（resetSrs 后的 deletedAt）视为新卡，归入 fresh 队列
      if (!st || isCardDeleted(st)) { fresh.push(c); continue; }
      // Anki：学习步阶段（learning/relearning）的卡用 isLearningDueAhead——
      // 带 20m 提前窗口（learn ahead limit）。否则评 good 后 due=10m，10m 内重进看不到卡，
      // 体验"得死等满 10 分钟"。review 阶段仍用严格 isDue。
      if (isLearningPhase(st)) {
        if (isLearningDueAhead(st, now)) learning.push(c);
        continue;
      }
      // review 阶段：到期才复习
      if (isDue(st, now)) due.push(c);
    }
    // 每日新卡配额：扣掉今日已引入的新卡数（跨会话累计，跨天归零）。
    // 旧实现 fresh.slice(0, newPerDay) 每次进页面都重新填满，导致一天能学完全部卡。
    // 每日新卡配额：扣掉今日已引入的新卡数（跨会话累计，跨天归零）。
    // 旧实现 fresh.slice(0, newPerDay) 每次进页面都重新填满，导致一天能学完全部卡。
    // ⚠️ session 的 useMemo 故意不依赖 progress/srs：评分会改 progress，若纳入依赖会让
    //    队列重建 → setStep(session) 重置 doneCount=0 → "今天复习了 0 张"且永不完成。
    //    队列只在进入/切 extra/改配额时构建一次（快照），newCardsToday 读的也是此刻值。
    const newLeft = Math.max(0, appliedNewPerDay - newCardsToday(progress, now));
    const freshLimited = fresh.slice(0, newLeft);
    return initSession([...shuf(due), ...shuf(learning), ...shuf(freshLimited)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtra, appliedNewPerDay, sessionTick]);

  const [step, setStep] = useState<ReviewSession>(session);
  // 队列重建（切 extra/改配额）时同步重置 step
  useEffect(() => { setStep(session); }, [session]);

  const cur = currentCard(step);
  const [flipped, setFlipped] = useState(false);

  /** 统计：三色计数（本会话剩余） */
  const counts = useMemo(() => {
    let reviewLeft = 0, learningLeft = 0, freshLeft = 0;
    for (const c of flashcards) {
      const st = srs[c.id];
      if (!st) { freshLeft++; continue; }
      if (isLearningPhase(st)) {
        if (isLearningDueAhead(st, now)) learningLeft++;
      } else if (isDue(st, now)) reviewLeft++;
    }
    return { review: reviewLeft, learning: learningLeft, fresh: Math.min(freshLeft, Math.max(0, appliedNewPerDay - newCardsToday(progress, now))) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srs, appliedNewPerDay, now, progress]);

  const totalToday = counts.review + counts.learning + counts.fresh;
  /** 进度分母：用会话快照时的队列长度（稳定，不随评分中途跳变）。
   *  extra 模式队列 = 全量；正式模式队列 = 进入时的今日三色汇总。 */
  const denom = session.main.length;
  const doneCount = step.doneCount;
  /** 本会话因评 again 而被重新拉回刷的次数（=评分总次数 - 去重处理过的卡数）。
   *  用于进度条文案标注"含 N 张重学"，消除"5/5 却还有卡"的误导。 */
  const relearnExtra = Math.max(0, doneCount - denom);
  /** 进度条分子：夹到 denom 内，避免 again 重刷导致 >100%。 */
  const progressNum = Math.min(doneCount, denom);

  /** 评分处理：srs 照常记，会话队列走 applyGrade。
   *  对齐 AnkiWeb 实测：again → 本会话重刷；good/hard 后若仍处学习步阶段（未毕业），
   *  也排到 relearn 尾部本会话再刷（AnkiWeb 靠 learn-ahead-limit 实现，实测确认）；
   *  easy 或毕业的 good/hard → 出队。 */
  const grade = useCallback((g: SrsGrade) => {
    if (!cur) return;
    const prev = srs[cur.id];
    const next = review(prev, g, Date.now());
    reviewCard(cur.id, next);
    setStep((s) => applyGrade(s, g, isLearningPhase(next)));
    setFlipped(false);
  }, [cur, srs, reviewCard]);

  /** Space 双用：未翻面→翻面；已翻面→good */
  const flipOrGood = useCallback(() => {
    if (!cur) return;
    if (flipped) grade('good'); else setFlipped(true);
  }, [cur, flipped, grade]);

  useKeyPress({
    ' ': flipOrGood,
    '1': () => cur && flipped && grade('again'),
    '2': () => cur && flipped && grade('hard'),
    '3': () => cur && flipped && grade('good'),
    '4': () => cur && flipped && grade('easy'),
  });

  // 完成今日复习 → 更新 streak（只在刚好完成时触发一次）。
  // extra 模式（再练一轮）不更新 streak —— 它不是正式今日复习，只是额外练习。
  // 同步 setStreak：让完成页用最新值渲染，避免"首次完成显示 0、刷新后才 1"。
  const complete = isComplete(step);
  useEffect(() => {
    if (isExtra) return;   // 再练一轮不触发 streak
    if (complete && session.main.length > 0 && doneCount > 0) {
      const lastDate = lsGet(STREAK_DATE_KEY, '');
      const today = todayStr();
      if (lastDate !== today) {
        const prevStreak = parseInt(lsGet(STREAK_KEY, '0'), 10) || 0;
        // 昨天/更久前完成过 → +1；否则从 1 开始（首次或中断后重计）
        const yesterday = new Date(Date.now() - DAY_MS).toDateString();
        const newStreak = lastDate === yesterday ? prevStreak + 1 : 1;
        lsSet(STREAK_KEY, String(newStreak));
        lsSet(STREAK_DATE_KEY, today);
        setStreak(newStreak);
      }
    }
  }, [complete, session, doneCount, isExtra]);

  /** 预览 4 档间隔 */
  const previews = useMemo(() => {
    if (!cur) return { again: '<1m', hard: '1d', good: '1d', easy: '4d' };
    const prev = srs[cur.id];
    return {
      again: previewInterval(prev, 'again', now),
      hard: previewInterval(prev, 'hard', now),
      good: previewInterval(prev, 'good', now),
      easy: previewInterval(prev, 'easy', now),
    };
  }, [cur, srs, now]);

  // streak 用 state 承载：完成判定 effect 里 setStreak 后立即驱动完成页重渲染，
  // 避免"首完成显示 0、刷新后才变 1"的时序 bug（旧实现直接读 lsGet 拿到 effect 写入前的旧值）。
  const [streak, setStreak] = useState<number>(() => parseInt(lsGet(STREAK_KEY, '0'), 10) || 0);

  // —— 完成态：原队列走完 且 无遗留重学卡 ——
  if (complete) {
    // 找下一张到期的卡（给用户预期）
    const futureDues = Object.values(srs)
      .map((s) => s.due)
      .filter((d) => d > now)
      .sort((a, b) => a - b);
    const nextDue = futureDues[0];
    const nextDueText = nextDue ? formatInterval((nextDue - now) / DAY_MS) : null;
    // 今天晚些时候到期的学习步卡数（due 在今天内、>now 的 learning/relearning 卡）。
    // 对齐 AnkiWeb 完成页："There are X remaining learning card(s) due later today."
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const learningDueLaterToday = Object.values(srs).filter((s) =>
      isLearningPhase(s) && s.due > now && s.due <= todayEnd.getTime()
    ).length;

    // 再练一轮模式：只显示完成 + 返回，不显示 streak / 再练入口
    if (isExtra) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-center space-y-4 animate-fade-in">
            <RefreshCw className="mx-auto h-16 w-16 text-indigo-500" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold text-text-primary">额外练习完成!</h2>
            <p className="text-text-secondary">
              本轮又过了 <span className="font-semibold tabular-nums">{doneCount}</span> 张，评分已记录
            </p>
            <Link
              to="/flashcards"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium mt-3 shadow-soft hover:bg-indigo-700 transition-colors"
            >
              返回闪卡
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center space-y-4 animate-fade-in">
          <PartyPopper className="mx-auto h-16 w-16 text-indigo-500" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-text-primary">今日复习完成!</h2>
          <p className="text-text-secondary">
            今天复习了 <span className="font-semibold tabular-nums">{doneCount}</span> 张
          </p>
          <p className="flex items-center justify-center gap-1.5 text-text-muted text-sm">
            <Flame className="h-4 w-4 text-orange-500" strokeWidth={2} />
            连续坚持 <span className="font-semibold text-text-primary tabular-nums">{streak}</span> 天
          </p>
          {nextDueText && <p className="text-text-faint text-sm">下一张卡约 {nextDueText}后到期</p>}
          {learningDueLaterToday > 0 && (
            <p className="text-amber-500 text-sm">
              还有 {learningDueLaterToday} 张学习卡今天晚些时候到期，到时可继续刷
            </p>
          )}
          <div className="flex flex-col items-center gap-3 mt-4">
            {/* 再练一轮：诚实告知违背 SRS 排程，评分照常记 */}
            <Link
              to="/flashcards/review?extra=1"
              className="inline-flex items-center gap-1.5 text-text-muted hover:text-indigo-600 text-sm border border-border hover:border-indigo-300 rounded-xl px-5 py-2.5 transition-colors"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
              再练一轮（额外复习，不更新连续天数）
            </Link>
            <Link
              to="/flashcards"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-soft hover:bg-indigo-700 transition-colors"
            >
              返回闪卡
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 走到这里说明未完成 → cur 必有值（complete ⟺ cur === undefined）
  const card = cur as Flashcard;
  const curState = srs[card.id];
  const cardIsNew = isNew(curState);
  // 卡片阶段标记：学习步 / 重学步 / 新卡 / 复习
  const phaseLabel = (() => {
    if (!curState) return { text: '新卡', cls: 'bg-blue-100 text-blue-700' };
    if (curState.phase === 'learning') {
      const step = LEARNING_STEPS_MIN[curState.stepIdx] ?? LEARNING_STEPS_MIN[0];
      return { text: `学习步 ${curState.stepIdx + 1}/${LEARNING_STEPS_MIN.length}·${step}m`, cls: 'bg-amber-100 text-amber-700' };
    }
    if (curState.phase === 'relearning') {
      const step = RELEARNING_STEPS_MIN[curState.stepIdx] ?? RELEARNING_STEPS_MIN[0];
      return { text: `重学·${step}m`, cls: 'bg-red-100 text-red-700' };
    }
    return { text: '复习', cls: 'bg-green-100 text-green-700' };
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* 三色计数 + 进度条。extra 模式（再练全部）不显示三色——它与"今日待办"无关，只保留进度 */}
      <div className="space-y-2">
        {!isExtra && (
          <>
            {/* AnkiWeb 风格顶部计数：N + N + N（蓝新卡 + 红学习中 + 绿待复习），实时更新 */}
            <div className="flex items-center justify-center gap-2 text-lg font-semibold tabular-nums">
              <span className="text-blue-600">{counts.fresh}</span>
              <span className="text-text-faint font-normal">+</span>
              <span className="text-red-500">{counts.learning}</span>
              <span className="text-text-faint font-normal">+</span>
              <span className="text-green-600">{counts.review}</span>
            </div>
            <div className="flex gap-2.5 justify-center text-[10px] text-text-faint">
              <span>新卡</span>
              <span>学习中</span>
              <span>待复习</span>
            </div>
          </>
        )}
        <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${denom ? (progressNum / denom) * 100 : 0}%` }}
          />
        </div>
        <div className="text-center text-xs text-text-faint tabular-nums">
          {progressNum} / {denom}
          {relearnExtra > 0 && <span className="ml-1 text-amber-500">· 含 {relearnExtra} 张重学</span>}
          {isExtra && <span className="ml-1 text-indigo-500">· 额外练习</span>}
        </div>
      </div>

      {/* 卡片区：未翻面时点击翻面看答案；已翻面后点击为 no-op（不再翻回）。
          旧实现翻面后点卡片会 toggle 翻回，评分思考时误点就藏起答案+收起评分按钮，打断流程。
          与 Anki 一致：翻面后答案常驻，评分只走底部按钮/键盘。 */}
      <button
        key={card.id}
        onClick={() => { if (!flipped) setFlipped(true); }}
        className={`flex-1 bg-bg-surface border-2 rounded-2xl p-6 sm:p-8 text-left flex flex-col justify-center min-h-[40vh] active:bg-bg-hover shadow-card transition-all duration-300 hover:shadow-lg animate-card-next ${
          flipped ? 'border-indigo-300' : 'border-border hover:border-border-strong'
        }`}
      >
        <div className="text-xs text-text-faint mb-3 flex items-center gap-2">
          <span className="truncate">{card.topic}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${phaseLabel.cls}`}>{phaseLabel.text}</span>
        </div>
        <div className={`text-lg sm:text-xl text-text-primary whitespace-pre-wrap leading-relaxed transition-opacity duration-200 ${flipped ? 'opacity-95' : ''}`}>
          {card.front}
        </div>
        {flipped && (
          <>
            <hr className="my-4 border-indigo-100 dark:border-indigo-900" />
            <div className="text-base sm:text-lg text-green-700 dark:text-green-400 whitespace-pre-wrap leading-relaxed font-medium animate-flip-in">
              {card.back}
            </div>
          </>
        )}
        <div className="mt-4 text-sm text-text-faint">{flipped ? '选下方评分（或按 1-4）' : '点击卡片或空格翻面'}</div>
      </button>

      {/* 操作栏 */}
      {!flipped ? (
        <button
          onClick={() => setFlipped(true)}
          className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-medium text-lg hover:bg-slate-700 transition-colors shadow-soft dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          显示答案 <kbd className="inline-block ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-mono">Space</kbd>
        </button>
      ) : (
        <RatingButtons previews={previews} onGrade={grade} />
      )}
    </div>
  );
}
