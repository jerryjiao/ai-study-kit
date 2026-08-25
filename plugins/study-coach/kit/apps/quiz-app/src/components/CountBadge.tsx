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
  const styles = {
    blue: { box: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
    red: { box: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
    green: { box: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
  } as const;
  const s = styles[color];
  return (
    <div className={`flex-1 rounded-xl px-3 py-3 text-center ring-1 ${s.box}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className="text-2xl font-bold leading-none tabular-nums">{value}</span>
      </div>
      <div className="text-xs mt-1.5 leading-none font-medium opacity-80">{label}</div>
    </div>
  );
}
