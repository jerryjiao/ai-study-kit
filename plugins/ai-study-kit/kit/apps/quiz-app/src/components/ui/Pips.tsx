/** 涂卡格基元（原型 .pip）：total 格小方块，前 on 格涂色、其余轨道色。
 *  用于「连对 1/3」这类小步进的可视化（错题连对进度、关卡内题目涂格）。
 *  tone 默认 green（推进语义）；格子尺寸默认 10px、圆角 3px（原型同值）。 */
export function Pips({
  total,
  on,
  tone = 'green',
  size = 10,
  className = '',
}: {
  total: number;
  /** 已涂格数（钳制到 [0, total]） */
  on: number;
  tone?: 'green' | 'blue' | 'gold';
  size?: number;
  className?: string;
}) {
  const fillCls = tone === 'green' ? 'bg-st-green' : tone === 'blue' ? 'bg-st-blue' : 'bg-st-gold';
  const filled = Math.max(0, Math.min(total, on));
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`rounded-[3px] ${i < filled ? fillCls : 'bg-st-track'}`}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
