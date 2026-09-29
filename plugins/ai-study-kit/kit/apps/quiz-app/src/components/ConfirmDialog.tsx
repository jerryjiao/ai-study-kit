import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { Button3D, Card } from './ui';

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

// 危险操作启发式：文案含各语言的「清空 / 不可恢复 / 归零」类词视为破坏性，确认键变红。
// （danger 检测在渲染时做，不在这里做——渲染时才能拿到当前语言的词典。）
const DANGER_RE =
  /清空|不可恢复|归零|删除|\bclear\b|\bclearing\b|\breset\b|irreversible|cannot be undone|vaciar|borrar|restablecer|rehacer|deshacer|очист|сброс|необратим|обнул/i;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingState | null>(null);

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

  // 弹窗打开时锁定背景滚动；确认键聚焦由 Button3D 的 autoFocus 承担（portal 挂载即聚焦）；Esc 视为取消。
  useEffect(() => {
    if (!pending) return;
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
            aria-label={t('confirm.aria')}
          >
            <div
              className="w-full max-w-sm animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="p-5">
                <p className="text-[15px] leading-relaxed text-text-primary whitespace-pre-line">
                  {pending.message}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => close(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border-2 border-border rounded-xl transition-colors"
                  >
                    {pending.options.cancelText ?? t('confirm.cancel')}
                  </button>
                  <Button3D variant={danger ? 'red' : 'green'} onClick={() => close(true)} autoFocus className="py-2">
                    {pending.options.confirmText ?? t('confirm.ok')}
                  </Button3D>
                </div>
              </Card>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}
