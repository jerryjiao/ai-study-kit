import type { SrsGrade } from '../types';
import { useI18n } from '../i18n';

interface Props {
  /** 4 档各自的间隔预览字符串（由 srs.previewInterval 算出） */
  previews: Record<SrsGrade, string>;
  onGrade: (g: SrsGrade) => void;
}

/** Anki 4 档评分按钮：重学/困难/良好(默认高亮)/简单，带快捷键 + 间隔预览
 *  放大触控区（py-3→py-4），快捷键做成键帽样式，四档层次更清晰 */
export function RatingButtons({ previews, onGrade }: Props) {
  const { t } = useI18n();
  const buttons: { grade: SrsGrade; label: string; key: string; cls: string }[] = [
    { grade: 'again', label: t('srs.again'), key: '1', cls: 'bg-red-50 text-red-700 border-red-200 active:bg-red-100' },
    { grade: 'hard', label: t('srs.hard'), key: '2', cls: 'bg-orange-50 text-orange-700 border-orange-200 active:bg-orange-100' },
    {
      grade: 'good',
      label: t('srs.good'),
      key: '3',
      cls: 'bg-green-600 text-white border-green-600 active:bg-green-700 ring-2 ring-green-300 ring-offset-1',
    },
    { grade: 'easy', label: t('srs.easy'), key: '4', cls: 'bg-blue-50 text-blue-700 border-blue-200 active:bg-blue-100' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('srs.aria')}>
      {buttons.map((b) => (
        <button
          key={b.grade}
          onClick={() => onGrade(b.grade)}
          className={`border rounded-xl py-4 px-1 text-center transition-colors animate-scale-in ${b.cls}`}
        >
          <div className="font-semibold text-sm">{b.label}</div>
          <div className="text-xs mt-1 opacity-80 tabular-nums">{previews[b.grade]}</div>
          <kbd className="inline-block mt-1.5 min-w-[1.25rem] rounded border border-current/30 px-1 text-[10px] font-mono leading-4 opacity-60">
            {b.key}
          </kbd>
        </button>
      ))}
    </div>
  );
}
