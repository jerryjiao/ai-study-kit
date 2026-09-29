/** 开关基元（原型 .switch）：44×26 轨道 + 18px 圆钮，开=绿。
 *  role=switch + aria-checked，button 天然支持键盘（Enter/Space）。
 *  拨动动画走 transition（reduced-motion 下由 index.css 全局降级为瞬时）。 */
export function Switch({
  on,
  onChange,
  label,
  className = '',
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  /** 无障碍名（朗读用），通常传行标签 */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`shrink-0 w-[44px] h-[26px] rounded-full border-2 transition-colors ${
        on ? 'bg-st-green border-st-green-dark' : 'bg-st-track border-border'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`block h-[18px] w-[18px] rounded-full bg-white shadow-soft transition-transform ${
          on ? 'translate-x-[20px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
