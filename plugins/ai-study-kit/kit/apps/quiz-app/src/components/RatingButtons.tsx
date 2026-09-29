import type { SrsGrade } from '../types';
import { useI18n } from '../i18n';

interface Props {
  /** 4 档各自的间隔预览字符串（由 srs.previewInterval 算出） */
  previews: Record<SrsGrade, string>;
  onGrade: (g: SrsGrade) => void;
}

/** Anki 4 档评分按钮（原型 .rate）：实色 3D 按压键——重来=红 / 困难=金 / 良好=绿（主推进）/
 *  简单=蓝（状态色语义），每键带快捷键键帽 + 间隔预览（previewInterval 既有逻辑）。
 *  按压态（下沉 4px + 阴影收 1px）由 index.css 的 .btn3d:active 统一实现。 */
export function RatingButtons({ previews, onGrade }: Props) {
  const { t } = useI18n();
  const buttons: { grade: SrsGrade; label: string; key: string; cls: string }[] = [
    { grade: 'again', label: t('srs.again'), key: '1', cls: 'bg-st-red text-white shadow-btn-red' },
    // 金底白字对比不足：沿用 Button3D gold 变体约定，字色走 gold-ink 令牌
    { grade: 'hard', label: t('srs.hard'), key: '2', cls: 'bg-st-gold text-st-gold-ink shadow-btn-gold' },
    { grade: 'good', label: t('srs.good'), key: '3', cls: 'bg-st-green text-white shadow-btn-green' },
    { grade: 'easy', label: t('srs.easy'), key: '4', cls: 'bg-st-blue text-white shadow-btn-blue' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('srs.aria')}>
      {buttons.map((b) => (
        <button
          key={b.grade}
          onClick={() => onGrade(b.grade)}
          className={`btn3d rounded-[14px] px-1 py-3 text-center animate-scale-in ${b.cls}`}
        >
          <div className="font-bold text-[15px]">{b.label}</div>
          <div className="text-xs mt-0.5 font-semibold opacity-90 tabular-nums">{previews[b.grade]}</div>
          <kbd className="inline-block mt-1.5 min-w-[1.25rem] rounded border border-current/30 px-1 text-[10px] font-mono leading-4 opacity-60">
            {b.key}
          </kbd>
        </button>
      ))}
    </div>
  );
}
