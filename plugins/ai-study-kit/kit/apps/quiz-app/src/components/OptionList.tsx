import { Check } from 'lucide-react';
import type { QType } from '../types';
import { useI18n } from '../i18n';

interface Props {
  options: Record<string, string>;
  type: QType;
  selected: string[];
  revealed: boolean; // 是否已判分/已显示答案
  answer: string[]; // 正确答案
  onToggle: (letter: string) => void;
  disabled?: boolean;
}

/** 选项列表：字母前缀做成圆角徽章，触控区放大（p-3→px-4 py-3.5），选中/正误层次强化 */
export function OptionList({ options, type, selected, revealed, answer, onToggle, disabled }: Props) {
  const { t } = useI18n();
  const multi = type === 'multi';
  const answerSet = new Set(answer);
  return (
    <div className="space-y-2.5">
      {Object.entries(options).map(([letter, text]) => {
        const isSel = selected.includes(letter);
        const isCorrect = answerSet.has(letter);
        let cls = 'border-border bg-bg-surface hover:border-border-strong hover:bg-bg-hover/50';
        let badge = 'bg-bg-subtle text-text-secondary';
        if (revealed) {
          if (isCorrect) {
            cls = 'border-st-green bg-st-green-soft';
            badge = 'bg-st-green text-white';
          } else if (isSel) {
            cls = 'border-st-red bg-st-red-soft';
            badge = 'bg-st-red text-white';
          } else {
            cls = 'border-border bg-bg-surface opacity-60';
          }
        } else if (isSel) {
          // 选中态 = 蓝（次级/交互，原型 .opt.sel）；判分后的正误走绿/红状态色
          cls = 'border-st-blue bg-st-blue-soft';
          badge = 'bg-st-blue text-white';
        }
        return (
          <label
            key={letter}
            className={`flex items-center gap-3 border rounded-xl px-4 py-3.5 transition-colors cursor-pointer ${cls} ${
              disabled ? 'cursor-default' : ''
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${badge}`}
            >
              {letter}
            </span>
            <span className="text-text-primary flex-1 leading-snug">{text}</span>
            {revealed && isCorrect && (
              <span className="text-st-green-ink shrink-0" aria-label={t('opt.correctAnswer')}>
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </span>
            )}
            <input
              type={multi ? 'checkbox' : 'radio'}
              name="opt"
              className="sr-only"
              checked={isSel}
              disabled={disabled}
              onChange={() => onToggle(letter)}
            />
          </label>
        );
      })}
    </div>
  );
}
