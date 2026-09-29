/** Anki 三色计数瓦片（原型 .count）：新=蓝 / 学习中=红 / 待复习=绿——状态色语义，
 *  粗描边 + 同色 3px 立体底边 + 大数字（30px），入口页一眼读出今日任务量。 */
export function CountBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'green';
}) {
  // 三色语义（新=蓝 / 学习中=红 / 待复习=绿）走状态色令牌；描边/立体底边同色成对
  const styles = {
    blue: 'border-st-blue/40 bg-st-blue-soft text-st-blue-ink shadow-[0_3px_0_rgb(var(--st-blue)/0.4)]',
    red: 'border-st-red-border bg-st-red-soft text-st-red-ink shadow-[0_3px_0_rgb(var(--st-red-border))]',
    green: 'border-st-green/50 bg-st-green-soft text-st-green-ink shadow-[0_3px_0_rgb(var(--st-green)/0.5)]',
  } as const;
  return (
    <div className={`flex-1 rounded-2xl border-2 px-3 py-4 text-center ${styles[color]}`}>
      <div className="text-[30px] font-extrabold leading-none tabular-nums">{value}</div>
      <div className="text-[13px] mt-1.5 font-bold leading-none">{label}</div>
    </div>
  );
}
