import { useEffect, useRef, useState } from 'react';
import { Home, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { Stats } from '../types';
import { Button3D, Ring } from './ui';
import type { RingTone } from './ui';
import { useI18n } from '../i18n';

interface Props {
  /** 本列表统计（来自 computeListStats(progress, list)）：accuracy/answered/correct/wrong/total。
   *  收窄为传整个 Stats 对象而非散列数字，避免调用方拆解与字段漂移。 */
  stats: Stats;
  /** 列表标题（topic/subtopic/day 文案，用于按钮上下文） */
  title: string;
  /** 重做本题集：清当前列表答题记录并回到第一题。Practice 复用现有 resetThisSet。 */
  onReset: () => void;
}

/** 缓动函数：ease-out，让数字滚动先快后慢，结束段更稳。 */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** 动画时长约 900ms：与卡片缩放渐入节奏一致，reduced-motion 下直接到终值。 */
const DURATION = 900;

/** 答题总结态卡片：答完一个 topic 全部题目后，覆盖当前题展示。
 *  动画两段同步约 900ms：① 卡片缩放渐入（animate-scale-in，CSS）② 进度环填充 + 正确率数字
 *  0→目标滚动，共用同一个 requestAnimationFrame 驱动（strokeDashoffset 跟随 displayPct），
 *  保证环与数字严格同步、节奏一致。
 *  reduced-motion 下数字与环直接显示终值（不滚动），卡片渐入由 index.css 全局降级。
 *
 *  正确率口径：该列表累计正确率（computeListStats(progress, list)，含随机沙盒答错记录），
 *  非本轮 session。与 Practice 头部"已答 n/n"同口径（详见 listStats 注释）。
 *  自评题(correct===null)计入"已答"但不进正确率分母——与 computeStats 一致，
 *  组件内自算 selfRated = answered - graded，单独标注避免"已答≠对+错"困惑。 */
export function SessionSummary({
  stats, title, onReset,
}: Props) {
  const { t } = useI18n();
  const { accuracy, answered, correct, wrong, total } = stats;
  const selfRated = answered - (correct + wrong);  // answered 含自评，graded=correct+wrong
  // 数字滚动：从 0 缓动到目标百分比。reduced-motion 直接置终值。
  const targetPct = Math.round(accuracy * 100);
  const [displayPct, setDisplayPct] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || targetPct === 0) {
      setDisplayPct(targetPct);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setDisplayPct(Math.round(easeOut(t) * targetPct));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [targetPct]);

  // 进度环：conic 圆环基元（Ring），p 直接吃 displayPct——环填充与数字滚动共用同一
  // rAF 驱动，严格同步（沿用旧 SVG 环的同步策略，仅换渲染实现）。
  // 正确率档位文案 + 配色：状态色语义（好=绿推进 / 中=蓝次级 / 低=金当前需加强）。
  const tier: { text: string; tone: RingTone; num: string } = accuracy >= 0.8
    ? { text: t('summary.tierGood'), tone: 'green', num: 'text-st-green-ink' }
    : accuracy >= 0.6
      ? { text: t('summary.tierOk'), tone: 'blue', num: 'text-st-blue-ink' }
      : { text: t('summary.tierLow'), tone: 'gold', num: 'text-st-gold-ink' };

  return (
    <div className="animate-scale-in flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-2 text-text-muted">
        <CheckCircle2 className="h-5 w-5 text-st-green" strokeWidth={2} />
        <span className="font-medium">{t('summary.title', { title })}</span>
      </div>

      {/* 进度环 + 中心数字：Ring 填充与数字滚动同步。 */}
      <Ring p={displayPct} tone={tier.tone} size={160} thickness={12}>
        <div className="flex flex-col items-center">
          <span className={`text-4xl font-bold tabular-nums ${tier.num}`}>{displayPct}<span className="text-2xl">%</span></span>
          <span className="text-xs text-text-faint mt-0.5">{tier.text}</span>
        </div>
      </Ring>

      {/* 分项统计：已答/对/错。自评题如有则单独标注，避免"已答≠对+错"引起困惑。 */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-xl font-bold text-text-primary tabular-nums">{answered}</div>
          <div className="text-xs text-text-faint">{t('summary.answered')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-st-green-ink tabular-nums">{correct}</div>
          <div className="text-xs text-text-faint">{t('summary.correctCount')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-st-red-ink tabular-nums">{wrong}</div>
          <div className="text-xs text-text-faint">{t('summary.wrongCount')}</div>
        </div>
      </div>
      {selfRated > 0 && (
        <p className="text-xs text-text-faint -mt-3">
          {t('summary.selfRated', { n: selfRated })}
        </p>
      )}
      <p className="text-xs text-text-faint -mt-2">{t('summary.totalNote', { n: total })}</p>

      {/* 动作按钮：返回首页（默认，绿=推进）+ 重做本题集（次选，二次确认由 onReset 内部处理）。 */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <Button3D to="/" className="flex-1">
          <Home className="h-4 w-4" strokeWidth={2} />
          {t('summary.backHome')}
        </Button3D>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 border-2 border-border-strong rounded-xl text-text-secondary font-medium hover:bg-bg-hover transition-colors"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          {t('summary.redo')}
        </button>
      </div>
    </div>
  );
}
