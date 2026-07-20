import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * 原生 window.confirm 的 UI 替代品。
 *
 * 用法（与原生 confirm 签名一致，只是变成 async）：
 *   const confirm = useConfirm();
 *   if (await confirm('把这题移出错题集？')) { onDismiss(); }
 *
 * 危险操作（清空/不可恢复）自动识别为红色确认按钮；也可显式传 { danger: true }。
 * 弹窗用 createPortal 渲染到 document.body，沿用全站语义 token 与阴影/动画档。
 */

type ConfirmOptions = { danger?: boolean; confirmText?: string; cancelText?: string };
type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

type PendingState = {
  message: string;
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

// 危险操作启发式：文案含「清空 / 不可恢复 / 归零」视为破坏性，确认键变红。
const DANGER_RE = /清空|不可恢复|归零|删除/;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, options, resolve });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      setPending((cur) => {
        cur?.resolve(ok);
        return null;
      });
    },
    [],
  );

  // 弹窗打开时自动聚焦确认键，并锁定背景滚动；Esc 视为取消。
  useEffect(() => {
    if (!pending) return;
    confirmBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pending, close]);

  const danger = pending?.options.danger ?? DANGER_RE.test(pending?.message ?? '');

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => close(false)}
            role="dialog"
            aria-modal="true"
            aria-label="确认操作"
          >
            <div
              className="w-full max-w-sm bg-bg-surface rounded-2xl shadow-pop p-5 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[15px] leading-relaxed text-text-primary whitespace-pre-line">
                {pending.message}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => close(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg transition-colors"
                >
                  {pending.options.cancelText ?? '取消'}
                </button>
                <button
                  ref={confirmBtnRef}
                  onClick={() => close(true)}
                  className={
                    danger
                      ? 'px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors'
                      : 'px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors'
                  }
                >
                  {pending.options.confirmText ?? '确定'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}
