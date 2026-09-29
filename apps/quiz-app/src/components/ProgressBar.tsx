/** 答题/看题进度条：细轨道 + 平滑过渡（reduced-motion 下自动降级，见 index.css）。
 *  模式着色走状态色（原型定案）：答题=条纹绿（推进）、看题=蓝（次级）。 */
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
  const barColor = mode === 'read' ? 'bg-st-blue' : 'bg-bar-green';
  return (
    <div
      className="w-full bg-st-track rounded-full h-2.5 overflow-hidden"
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
