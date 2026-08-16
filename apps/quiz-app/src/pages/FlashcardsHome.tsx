import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Flame, Settings, CircleCheck, ChevronRight, RefreshCw, RotateCcw } from 'lucide-react';
import { flashcards } from '../data/flashcards';
import { useProgress } from '../hooks/useProgress';
import { isDue, isLearningDueAhead, isLearningPhase, formatInterval } from '../lib/srs';
import { newCardsToday, isCardDeleted } from '../lib/progress';
import { lsGet, lsSet } from './Flashcards';
import { CountBadge } from '../components/CountBadge';
import { useConfirm } from '../components/ConfirmDialog';
import { useI18n } from '../i18n';

const DAY_MS = 86_400_000;
const STREAK_KEY = 'ask-srs-streak';
const STREAK_DATE_KEY = 'ask-srs-last-complete-date';
const NEW_PER_DAY_KEY = 'ask-new-per-day';
const DEFAULT_NEW_PER_DAY = 5;

/** 闪卡 dashboard：今日概览 + 开始复习入口 + 每日新卡设置（对应答题页的 Home） */
export function FlashcardsHome() {
  const { progress, resetSrs } = useProgress();
  const confirm = useConfirm();
  const { t } = useI18n();
  const srs = progress.srs ?? {};
  const now = Date.now();

  const appliedNewPerDay = parseInt(lsGet(NEW_PER_DAY_KEY, String(DEFAULT_NEW_PER_DAY)), 10) || DEFAULT_NEW_PER_DAY;
  const [showSettings, setShowSettings] = useState(false);
  const [newPerDayInput, setNewPerDayInput] = useState(String(appliedNewPerDay));
  const [, forceRerender] = useState(0); // 设置保存后触发重算

  /** 三色计数 + 今日总数。判定标准与复习页（Flashcards.tsx）完全一致：
 *  - 无 srs 记录 → 新卡（按每日配额截断）
 *  - 学习步阶段（learning/relearning）且到期（带 20m 提前窗口）→ 学习中
 *  - review 阶段且到期（严格 due<=now）→ 待复习
   *  历史用 interval===0&&reps===0 判"学习中"是错的——学习步卡 interval=10min/24/60≈0.0069（非0），
   *  会被误分类。改为用 phase 判定，两页一致。 */
  const counts = useMemo(() => {
    let reviewLeft = 0,
      learningLeft = 0,
      freshLeft = 0;
    for (const c of flashcards) {
      const st = srs[c.id];
      if (!st || isCardDeleted(st)) {
        freshLeft++;
        continue;
      }
      if (isLearningPhase(st)) {
        if (isLearningDueAhead(st, now)) learningLeft++;
      } else if (isDue(st, now)) {
        reviewLeft++;
      }
    }
    return { review: reviewLeft, learning: learningLeft, fresh: Math.min(freshLeft, Math.max(0, appliedNewPerDay - newCardsToday(progress, now))) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srs, appliedNewPerDay, now, progress]);

  const totalToday = counts.review + counts.learning + counts.fresh;
  const streak = parseInt(lsGet(STREAK_KEY, '0'), 10) || 0;

  // 下一张到期卡（给用户预期）
  const nextDue = useMemo(() => {
    const future = Object.values(srs)
      .map((s) => s.due)
      .filter((d) => d > now)
      .sort((a, b) => a - b)[0];
    return future ? formatInterval((future - now) / DAY_MS) : null;
  }, [srs, now]);

  const saveNewPerDay = () => {
    const n = Math.max(0, Math.min(50, parseInt(newPerDayInput, 10) || 0));
    try {
      localStorage.setItem(NEW_PER_DAY_KEY, String(n));
    } catch {
      /* 配额 */
    }
    setShowSettings(false);
    forceRerender((x) => x + 1);
  };

  /** 重置全部闪卡进度：清服务器 srs 字段 + 本地 streak/last-complete-date。
   *  所有卡回到新卡状态。不影响答题/看题进度。 */
  const resetAllSrs = async () => {
    if (await confirm(t('fch.confirmResetSrs'))) {
      resetSrs();
      lsSet(STREAK_KEY, '0');
      lsSet(STREAK_DATE_KEY, '');
      forceRerender((x) => x + 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold text-text-primary tracking-tight">
          <Layers className="h-7 w-7 text-indigo-600" strokeWidth={2} />
          {t('fch.title')}
        </h1>
        <p className="text-text-muted text-sm mt-2">{t('fch.tagline', { n: flashcards.length })}</p>
      </header>

      {/* 今日概览：三色计数 */}
      {totalToday > 0 ? (
        <div className="flex gap-2.5">
          <CountBadge label={t('fc.new')} value={counts.fresh} color="blue" />
          <CountBadge label={t('fc.learning')} value={counts.learning} color="red" />
          <CountBadge label={t('fc.review')} value={counts.review} color="green" />
        </div>
      ) : (
        <div className="text-center py-10 space-y-3">
          <CircleCheck className="mx-auto h-14 w-14 text-green-500" strokeWidth={1.5} />
          <p className="text-text-secondary font-medium">{t('fch.todayDone')}</p>
          {nextDue && <p className="text-text-faint text-sm">{t('fc.nextDue', { interval: nextDue })}</p>}
        </div>
      )}

      {/* 连续天数 */}
      <p className="flex items-center justify-center gap-1.5 text-sm text-text-muted">
        <Flame className="h-4 w-4 text-orange-500" strokeWidth={2} />
        {t('fc.streak', { n: streak })}
      </p>

      {/* 开始复习入口 + 始终可用的"再练全部" */}
      <div className="space-y-3">
        {totalToday > 0 ? (
          <Link
            to="/flashcards/review"
            className="group flex items-center justify-between text-white rounded-2xl px-5 py-4 font-medium text-lg transition-colors bg-indigo-600 shadow-card hover:bg-indigo-700"
          >
            <span className="flex items-center gap-3">
              <Layers className="h-5 w-5 opacity-90" strokeWidth={2} />
              {t('fch.start')}
              <span className="text-indigo-100 text-sm">{t('fch.count', { n: totalToday })}</span>
            </span>
            <ChevronRight className="h-5 w-5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="flex items-center justify-center text-text-faint rounded-2xl px-5 py-4 font-medium text-lg bg-bg-subtle">
            {t('fch.nothingToday')}
          </div>
        )}

        {/* 额外练习：任何时候都能再过一遍全部卡（违背 SRS 排程，但满足"还想看"） */}
        <Link
          to="/flashcards/review?extra=1"
          className="group flex items-center justify-between text-text-secondary hover:text-indigo-700 border border-border hover:border-indigo-300 rounded-2xl px-5 py-3.5 font-medium transition-colors"
        >
          <span className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 opacity-70" strokeWidth={2} />
            <span className="text-base">{t('fch.rerunAll', { n: flashcards.length })}</span>
            <span className="text-text-faint text-xs">{t('fch.rerunNote')}</span>
          </span>
          <ChevronRight className="h-5 w-5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 设置：每日新卡数 */}
      {showSettings ? (
        <div className="bg-bg-subtle border border-border rounded-xl p-4 space-y-3 animate-fade-in">
          <label className="block text-sm font-medium text-text-primary">{t('fch.newPerDay')}</label>
          <input
            type="number"
            min={0}
            max={50}
            value={newPerDayInput}
            onChange={(e) => setNewPerDayInput(e.target.value)}
            className="w-full px-3 py-2.5 border border-border-strong rounded-lg text-center text-lg font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={saveNewPerDay}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('fch.save')}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 border border-border-strong text-text-secondary py-2.5 rounded-lg font-medium hover:bg-bg-hover transition-colors"
            >
              {t('fch.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-1.5 text-sm text-text-faint hover:text-indigo-600 transition-colors"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
            {t('fch.newPerDay')}：<span className="font-medium text-text-secondary tabular-nums">{appliedNewPerDay}</span>
          </button>
        </div>
      )}

      {/* 危险操作：重置全部闪卡进度（仅在确有进度时显示，避免空态误触） */}
      {Object.keys(srs).length > 0 && (
        <div className="text-center pt-2 border-t border-border">
          <button
            onClick={resetAllSrs}
            className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-red-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            {t('fch.resetAllSrs', { n: Object.keys(srs).length })}
          </button>
        </div>
      )}
    </div>
  );
}
