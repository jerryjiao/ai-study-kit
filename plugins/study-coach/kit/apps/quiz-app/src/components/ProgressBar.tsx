/** 答题/看题进度条：细轨道 + 平滑过渡（reduced-motion 下自动降级，见 index.css）。
 *  颜色随 mode 区分：答题=靛蓝，看题=天蓝（呼应 Practice 里看题用 sky 的约定）。 */
export function ProgressBar({
  answered,
  total,
  mode = 'practice',
}: {
  answered: number;
  total: number;
  mode?: 'practice' | 'read';
}) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  const barColor = mode === 'read' ? 'bg-sky-500' : 'bg-indigo-600';
  return (
    <div
      className="w-full bg-bg-hover rounded-full h-2.5 overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${barColor} h-full rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
