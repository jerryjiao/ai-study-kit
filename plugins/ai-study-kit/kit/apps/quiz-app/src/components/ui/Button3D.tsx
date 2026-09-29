import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** 3D 按压按钮变体：颜色语义走状态色（绿=推进/主行动、蓝=次级、红=危险、
 *  金=当前关卡、plain=中性描边）。按压态（下沉 4px + 阴影收 1px）由 index.css 的
 *  .btn3d:active 统一实现——那里用 !important 压过 shadow-btn-*（同为 box-shadow，
 *  工具类文档顺序不可控），组件里只挂 btn3d 标记类 + 对应立体阴影。 */
export type Button3DVariant = 'green' | 'blue' | 'red' | 'gold' | 'plain';

const VARIANT_CLS: Record<Button3DVariant, string> = {
  green: 'bg-st-green text-white shadow-btn-green',
  blue: 'bg-st-blue text-white shadow-btn-blue',
  red: 'bg-st-red text-white shadow-btn-red',
  // 金底白字对比不足，原型用深棕字（#5B4200），这里用 gold-ink 令牌承担
  gold: 'bg-st-gold text-st-gold-ink shadow-btn-gold',
  plain: 'border-2 border-border-strong bg-bg-surface text-text-primary shadow-btn-plain',
};

type Size = 'sm' | 'md';

const SIZE_CLS: Record<Size, string> = {
  // sm：行内次级动作（提交/翻页/弹窗确认）；md：页面级主行动
  sm: 'px-4 py-2.5 text-sm rounded-xl',
  md: 'px-4 py-3 text-sm sm:px-5 sm:text-[15px] sm:rounded-[14px]',
};

const BASE_CLS =
  'btn3d inline-flex items-center justify-center gap-1.5 font-bold tracking-wide select-none ' +
  'transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0';

function buildCls(variant: Button3DVariant, size: Size, className?: string) {
  return [BASE_CLS, VARIANT_CLS[variant], SIZE_CLS[size], className].filter(Boolean).join(' ');
}

interface Props {
  variant?: Button3DVariant;
  size?: Size;
  /** 路由内跳转（react-router Link）：有 to 渲染 <Link>，否则 <button> */
  to?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
  /** 挂载即聚焦（仅 button 形态生效；弹窗默认确认键用） */
  autoFocus?: boolean;
  /** 键盘聚焦环由全局 *:focus-visible 承担；这里只透传语义属性 */
  'aria-label'?: string;
  title?: string;
}

/** 3D 按压按钮基元（原型 .btn3d）。真实使用面：QuestionCard 提交、Practice 翻页、
 *  ConfirmDialog 确认、SessionSummary 返回首页、Courses 去刷题等。 */
export function Button3D({
  variant = 'green',
  size = 'sm',
  to,
  disabled,
  onClick,
  className,
  children,
  autoFocus,
  'aria-label': ariaLabel,
  title,
}: Props) {
  const cls = buildCls(variant, size, className);
  if (to !== undefined) {
    return (
      <Link to={to} className={cls} aria-label={ariaLabel} title={title} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={onClick}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}
