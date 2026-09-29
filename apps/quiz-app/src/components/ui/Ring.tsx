import type { CSSProperties, ReactNode } from 'react';

/** 圆环基元（原型 .ring）：conic-gradient 实现，p=百分比（0-100，越界钳制）。
 *  中心内容走 children（数字/文案），由调用方排字号与颜色。
 *  tone 决定填充色用的状态令牌；track 恒用 --st-track（明暗各有一套值）。
 *  无障碍：容器挂 progressbar 语义（aria-valuenow=p），纯装饰场景传 aria-hidden 覆盖。 */
export type RingTone = 'green' | 'green-low' | 'blue' | 'gold' | 'red';

const TONE_VAR: Record<RingTone, string> = {
  green: '--st-green',
  'green-low': '--st-green-low',
  blue: '--st-blue',
  gold: '--st-gold',
  red: '--st-red',
};

export function Ring({
  p,
  tone = 'green',
  size = 52,
  thickness = 6,
  className = '',
  children,
  ariaHidden = false,
}: {
  p: number;
  tone?: RingTone;
  /** 外径 px；内孔 = size - 2×thickness（原型 52/40 ⇒ 默认 thickness 6） */
  size?: number;
  thickness?: number;
  className?: string;
  children?: ReactNode;
  /** 纯装饰（如同处已有文字进度）时置 true，去掉 progressbar 语义 */
  ariaHidden?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(p)));
  const inner = Math.max(0, size - thickness * 2);
  const style: CSSProperties = {
    width: size,
    height: size,
    // 与原型同式：conic-gradient(主色 p%, 轨道 0)
    background: `conic-gradient(rgb(var(${TONE_VAR[tone]})) ${clamped}%, rgb(var(--st-track)) 0)`,
  };
  return (
    <span
      role={ariaHidden ? undefined : 'progressbar'}
      aria-hidden={ariaHidden || undefined}
      aria-valuenow={ariaHidden ? undefined : clamped}
      aria-valuemin={ariaHidden ? undefined : 0}
      aria-valuemax={ariaHidden ? undefined : 100}
      className={`relative inline-grid place-items-center rounded-full shrink-0 ${className}`}
      style={style}
    >
      {/* 内孔：absolute + inset-0 + margin auto 居中（宽高小于容器时的经典居中法） */}
      <span aria-hidden className="absolute inset-0 m-auto rounded-full bg-bg-surface" style={{ width: inner, height: inner }} />
      <span className="relative z-10 grid place-items-center">{children}</span>
    </span>
  );
}
