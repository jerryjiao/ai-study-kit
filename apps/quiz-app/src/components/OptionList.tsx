import { Check } from 'lucide-react';
import type { QType } from '../types';

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
            cls = 'border-green-500 bg-green-50 dark:bg-green-950/40';
            badge = 'bg-green-600 text-white';
          } else if (isSel) {
            cls = 'border-red-500 bg-red-50 dark:bg-red-950/40';
            badge = 'bg-red-600 text-white';
          } else {
            cls = 'border-border bg-bg-surface opacity-60';
          }
        } else if (isSel) {
          cls = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-200';
          badge = 'bg-indigo-600 text-white';
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
              <span className="text-green-600 shrink-0" aria-label="正确答案">
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
