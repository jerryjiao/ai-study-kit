import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  color?: 'slate' | 'green' | 'red' | 'indigo' | 'sky';
  icon?: LucideIcon;
}

/** 首页统计徽章：大号数字 + 小标签 + 可选图标，语义配色 */
export function StatBadge({ label, value, color = 'slate', icon: Icon }: Props) {
  const styles: Record<NonNullable<Props['color']>, { box: string; icon: string }> = {
    slate: { box: 'bg-slate-50 text-slate-700 ring-slate-200', icon: 'text-slate-400' },
    green: { box: 'bg-green-50 text-green-700 ring-green-200', icon: 'text-green-500' },
    red: { box: 'bg-red-50 text-red-700 ring-red-200', icon: 'text-red-500' },
    indigo: { box: 'bg-indigo-50 text-indigo-700 ring-indigo-200', icon: 'text-indigo-500' },
    sky: { box: 'bg-sky-50 text-sky-700 ring-sky-200', icon: 'text-sky-500' },
  };
  const s = styles[color];
  return (
    <div className={`rounded-xl px-3 py-3.5 text-center ring-1 ${s.box}`}>
      {Icon && <Icon className={`mx-auto mb-1 h-4 w-4 ${s.icon}`} strokeWidth={2} aria-hidden />}
      <div className="text-2xl sm:text-[1.75rem] font-bold leading-none tracking-tight tabular-nums">{value}</div>
      <div className="text-xs sm:text-[0.8125rem] mt-1.5 text-slate-500 font-medium">{label}</div>
    </div>
  );
}
