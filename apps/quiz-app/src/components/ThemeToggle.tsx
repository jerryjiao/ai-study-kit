import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme';

/** 三态主题切换按钮：浅色 → 深色 → 跟随系统 → 浅色（循环）。
 *  图标反映"当前选择"，点击切到下一档。
 *  放在 TopNav 导航栏旁，与答题/闪卡/课程 tab 并列。 */
export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const label = mode === 'light' ? '浅色模式' : mode === 'dark' ? '深色模式' : '跟随系统';

  return (
    <button
      onClick={() => setMode(next)}
      className="p-2 rounded-full text-text-muted hover:text-text-accent hover:bg-bg-hover transition-colors"
      title={`当前：${label}（点击切换）`}
      aria-label={`切换主题，当前${label}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
