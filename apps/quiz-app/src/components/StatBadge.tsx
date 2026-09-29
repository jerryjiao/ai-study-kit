import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  /** 语义配色走状态令牌：green=推进、blue=次级、red=错题、gold=当前/在学、slate=中性 */
  color?: 'slate' | 'green' | 'red' | 'blue' | 'gold';
  icon?: LucideIcon;
}

/** 首页统计徽章：大号数字 + 小标签 + 可选图标，语义配色（状态色令牌） */
export function StatBadge({ label, value, color = 'slate', icon: Icon }: Props) {
  const styles: Record<NonNullable<Props['color']>, { box: string; icon: string }> = {
    slate: { box: 'bg-bg-subtle text-text-secondary ring-border', icon: 'text-text-faint' },
    green: { box: 'bg-st-green-soft text-st-green-ink ring-st-green/30', icon: 'text-st-green' },
    red: { box: 'bg-st-red-soft text-st-red-ink ring-st-red/30', icon: 'text-st-red' },
    blue: { box: 'bg-st-blue-soft text-st-blue-ink ring-st-blue/30', icon: 'text-st-blue' },
    gold: { box: 'bg-st-gold-soft text-st-gold-ink ring-st-gold/40', icon: 'text-st-gold' },
  };
  const s = styles[color];
  return (
    <div className={`rounded-xl px-3 py-3.5 text-center ring-2 ${s.box}`}>
      {Icon && <Icon className={`mx-auto mb-1 h-4 w-4 ${s.icon}`} strokeWidth={2} aria-hidden />}
      <div className="text-2xl sm:text-[1.75rem] font-bold leading-none tracking-tight tabular-nums">{value}</div>
      <div className="text-xs sm:text-[0.8125rem] mt-1.5 text-text-muted font-medium">{label}</div>
    </div>
  );
}
