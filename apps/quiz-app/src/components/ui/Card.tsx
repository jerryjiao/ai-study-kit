import type { ReactNode } from 'react';

/** 粗描边卡基元（原型 .card）：2px 描边 + 16px 圆角 + 0 3px 0 同色立体底边。
 *  全站卡片容器统一走这里，避免各页自描散落漂移。 */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`border-2 border-border bg-bg-surface rounded-2xl shadow-card-3d ${className}`}>{children}</div>
  );
}
