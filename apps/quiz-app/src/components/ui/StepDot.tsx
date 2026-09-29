/** 闯关步进基元（原型 .step）：完成=绿✓ / 当前=金▶ / 未到=灰底数字。
 *  state 传 'done' | 'current' | 数字（第几关）。
 *  size 默认 30（首页子话题行）；课程目录等紧凑场景传 22。 */
export function StepDot({
  state,
  size = 30,
  className = '',
}: {
  state: 'done' | 'current' | number;
  /** 直径 px；字号随尺寸分档（≤24 用 10px，否则 14px） */
  size?: number;
  className?: string;
}) {
  const textCls = size <= 24 ? 'text-[10px]' : 'text-sm';
  const base = `shrink-0 grid place-items-center rounded-full border-2 font-bold ${textCls}`;
  if (state === 'done') {
    return (
      <span
        aria-hidden
        className={`${base} bg-st-green border-st-green-dark text-white ${className}`}
        style={{ width: size, height: size }}
      >
        ✓
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span
        aria-hidden
        className={`${base} bg-st-gold-soft border-st-gold-border text-st-gold-ink ${className}`}
        style={{ width: size, height: size }}
      >
        ▶
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`${base} bg-st-track border-border text-text-muted tabular-nums ${className}`}
      style={{ width: size, height: size }}
    >
      {state}
    </span>
  );
}
