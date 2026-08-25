import { useEffect } from 'react';

/**
 * 监听键盘按键，按 keymap 触发回调。
 * 用法：useKeyPress({ ' ': flip, '1': () => grade('again') })
 * 忽略输入框聚焦时的按键（避免打字触发）。
 */
export function useKeyPress(keymap: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 输入框/文本域聚焦时不触发
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const fn = keymap[e.key];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keymap]);
}
