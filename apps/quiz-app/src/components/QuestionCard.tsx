import { useState, useEffect } from 'react';
import { Check, X, Sparkles, LogOut } from 'lucide-react';
import type { Question } from '../types';
import { gradeQuestion } from '../lib/grade';
import { topicLabel, SOURCE_LABELS, layerOf } from '../lib/topicOrder';
import { OptionList } from './OptionList';
import { useConfirm } from './ConfirmDialog';
import { useI18n } from '../i18n';
import themeMeta from '../data/theme.json';

/** 题目配图：examples/<theme>/assets/<imageRef>，由 sync:study 同步到 public/study/<theme>/assets/。
 *  Vite 静态服务 public 目录。必须用 BASE_URL 前缀拼成根绝对路径：BrowserRouter 的 basename
 *  不影响文档相对 URL 的解析，裸相对路径在 /practice/all 等二级路由下会解析到 /practice/study/... 而 404。 */
const ACTIVE_THEME = (themeMeta as { theme: string }).theme;

interface Props {
  q: Question;
  index: number;
  initialSelected?: string[];
  initialRevealed?: boolean;
  onSubmit?: (selected: string[], correct: boolean | null) => void;
  readOnly?: boolean; // true = 看题模式，只读、答案直接高亮
  wrongCount?: number; // 历史累计答错次数（来自进度记录）；仅在提交后或已有记录时展示
  streak?: number;          // 错题当前连对次数（来自 rec.streak）；undefined=非错题
  streakNeeded?: number;    // 移出错题集需要的连对次数（streakToPass(wrongCount)）
  onDismiss?: () => void;   // 手动移出错题集回调（仅错题练习模式传入）
}

export function QuestionCard({ q, index, initialSelected = [], initialRevealed = false, onSubmit, readOnly = false, wrongCount, streak, streakNeeded, onDismiss }: Props) {
  const confirm = useConfirm();
  const { t } = useI18n();
  // 看题模式：selected 取正确答案，强制 revealed，不可交互
  const initSel = readOnly ? q.answer : initialSelected;
  const initRev = readOnly ? true : initialRevealed;
  const [selected, setSelected] = useState<string[]>(initSel);
  const [revealed, setRevealed] = useState(initRev);
  // 切换题目时重置
  useEffect(() => { setSelected(initSel); setRevealed(initRev); }, [q.id, readOnly]);

  const multi = q.type === 'multi';
  const toggle = (letter: string) => {
    if (revealed) return;
    setSelected((prev) =>
      multi ? (prev.includes(letter) ? prev.filter((x) => x !== letter) : [...prev, letter]) : [letter]
    );
  };

  const correct = revealed ? gradeQuestion(q, selected) : null;
  const selfEval = q.autoGradable === false;

  const handleSubmit = () => {
    const res = gradeQuestion(q, selected);
    setRevealed(true);
    onSubmit?.(selected, res);
  };

  return (
    <div className="bg-bg-surface rounded-2xl shadow-card border border-border p-5 sm:p-7 animate-fade-in">
      <div className="flex items-center gap-2 mb-4 text-xs text-text-muted flex-wrap">
        <span className={`px-2 py-0.5 rounded-md font-medium ${
          multi ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'bg-bg-subtle text-text-muted'
        }`}>
          {multi ? t('q.multi') : q.type === 'judge' ? t('q.judge') : t('q.single')}
        </span>
        <span className="bg-bg-subtle px-2 py-0.5 rounded-md font-medium text-text-secondary">{SOURCE_LABELS[q.source] ?? q.source}</span>
        {layerOf(q.source) && (
          <span className={`px-2 py-0.5 rounded-md font-medium ${
            layerOf(q.source) === '核心' ? 'bg-indigo-50 text-indigo-600' : 'bg-bg-subtle text-text-faint'
          }`}>{layerOf(q.source)}</span>
        )}
        {q.topic && <span className="text-text-faint">· {topicLabel(q.topic)}</span>}
        {q.difficulty && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-medium">{t('q.difficulty', { level: q.difficulty })}</span>
        )}
        <span className="ml-auto text-text-faint tabular-nums">{t('q.index', { n: index + 1 })}</span>
      </div>
      <p className="text-lg font-medium text-text-primary mb-5 whitespace-pre-wrap leading-relaxed">{q.question}</p>

      {q.imageRef && (
        <img
          src={`${import.meta.env.BASE_URL}study/${ACTIVE_THEME}/assets/${q.imageRef}`}
          alt={t('q.imageAlt')}
          loading="lazy"
          className="max-w-full rounded-xl border border-border mb-5 bg-white shadow-soft"
        />
      )}

      <OptionList options={q.options} type={q.type} selected={selected} revealed={revealed}
        answer={q.answer} onToggle={toggle} disabled={revealed} />

      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className="mt-5 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-soft"
        >
          {selfEval ? t('q.submitSelfEval') : t('q.submit')}
        </button>
      ) : (
        <div className="mt-5 space-y-2.5 animate-fade-in">
          {!selfEval && correct !== null && !readOnly && (
            <p
              className={`flex items-center gap-1.5 font-semibold ${correct ? 'text-green-600' : 'text-red-600'}`}
            >
              {correct ? (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <X className="h-5 w-5" strokeWidth={2.5} />
              )}
              {correct ? t('q.correct') : t('q.wrong', { answer: q.answer.join('') })}
              {/* 累计错次提示：本次答错时展示"累计错 N"（含本次）；本次答对但历史错过展示"历史错 N"。
                  wrongCount 由 submitAnswer 维护，只增不减，用于识别"反复出错的难题"。 */}
              {wrongCount && wrongCount > 0 && (
                <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${correct ? 'bg-amber-50 text-amber-600' : 'bg-red-50'}`}>
                  {correct
                    ? t('q.wrongCountHistory', { n: wrongCount })
                    : t('q.wrongCountTotal', { n: wrongCount })}
                </span>
              )}
            </p>
          )}
          {/* 错题掌握进度：仅在错题练习（streak 被维护 + onDismiss 提供）且本次答对时展示。
              - streak < streakNeeded：提示"还差几次连对"，给用户进度感
              - streak >= streakNeeded：理论上 wrongIds 已自动过滤，但留个手动按钮兜底
              onDismiss 未传入（非错题练习模式）时不展示，避免误用。 */}
          {!selfEval && correct === true && !readOnly && streak !== undefined && streakNeeded !== undefined && onDismiss && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
              {streak < streakNeeded ? (
                <span className="text-sm text-emerald-700">
                  {t('q.streakProgress', { streak, needed: streakNeeded, left: streakNeeded - streak })}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  {t('q.mastered')}
                </span>
              )}
              <button
                onClick={async () => { if (await confirm(t('q.confirmDismiss'))) onDismiss(); }}
                className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-medium transition-colors"
                title={t('q.dismissTitle')}
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                {t('q.dismiss')}
              </button>
            </div>
          )}
          {selfEval && (
            <p className="flex items-center gap-1.5 text-text-secondary text-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('q.selfEvalNote')}
            </p>
          )}
          {q.analysis && (
            <div className="rounded-xl bg-bg-subtle border border-border px-4 py-3">
              <p className="text-sm text-text-secondary leading-relaxed">
                <span className="font-semibold text-text-primary">{t('q.analysis')}</span>
                {q.analysis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
