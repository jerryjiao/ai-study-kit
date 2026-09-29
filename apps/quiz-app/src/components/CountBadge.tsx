/** Anki 三色计数徽章：纯 CSS 彩色圆点 + 数字 + 标签
 *  放大版：用 flex-1 三等分撑满容器，数字醒目 */
export function CountBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'green';
}) {
  // 三色语义（新=蓝 / 学习中=红 / 待复习=绿）走状态色令牌
  const styles = {
    blue: { box: 'bg-st-blue-soft text-st-blue-ink ring-st-blue/30', dot: 'bg-st-blue' },
    red: { box: 'bg-st-red-soft text-st-red-ink ring-st-red/30', dot: 'bg-st-red' },
    green: { box: 'bg-st-green-soft text-st-green-ink ring-st-green/30', dot: 'bg-st-green' },
  } as const;
  const s = styles[color];
  return (
    <div className={`flex-1 rounded-xl px-3 py-3 text-center ring-2 ${s.box}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className="text-2xl font-bold leading-none tabular-nums">{value}</span>
      </div>
      <div className="text-xs mt-1.5 leading-none font-medium opacity-80">{label}</div>
    </div>
  );
}
