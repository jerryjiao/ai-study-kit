import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useProgress } from '../hooks/useProgress';

/** 主题偏好三态：浅色 / 深色 / 跟随系统（prefers-color-scheme）。
 *  存储双 key：本地 'tp-pass-theme'（秒读，内联脚本也读它）+ progress.theme/themeUpdatedAt（跨设备同步）。 */
export type ThemeMode = 'light' | 'dark' | 'system';

const LS_KEY = 'tp-pass-theme';
const LS_UPDATED_KEY = 'tp-pass-theme-updated-at';
const DEFAULT_MODE: ThemeMode = 'system';

interface ThemeCtxValue {
  mode: ThemeMode;               // 用户选择的模式（'system' = 跟随系统）
  resolvedDark: boolean;         // 实际是否深色（system 解析后的结果）
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<ThemeCtxValue | null>(null);

/** 判断当前是否应为深色（考虑 system 模式下的 prefers-color-scheme） */
function resolveDark(mode: ThemeMode, systemDark: boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemDark; // system
}

/** 将主题应用到 DOM（给 <html> 加/移 .dark 类）。
 *  这是 React 挂载后唯一操作 .dark 类的地方——内联脚本（index.html）在首屏前已做同样的事防白闪。 */
function applyDarkClass(dark: boolean): void {
  const root = document.documentElement;
  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
}

/** 读 localStorage 主题偏好（与 index.html 内联脚本同口径）。无值回退 'system'。 */
function readLocalMode(): ThemeMode {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* 配额/隐私模式 */ }
  return DEFAULT_MODE;
}

function writeLocalMode(mode: ThemeMode): void {
  try { localStorage.setItem(LS_KEY, mode); } catch { /* 配额 */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { progress, loaded, setTheme } = useProgress();
  // 初始读 localStorage（内联脚本已据此设好 .dark 类，此处保持一致，防二次闪烁）
  const [mode, setModeState] = useState<ThemeMode>(readLocalMode);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  );

  // progress 加载后：若服务器端 theme 更新（跨设备同步），用远端值同步本地。
  // 仲裁依据：progress.themeUpdatedAt > 本地缓存的 tp-pass-theme-updated-at。
  useEffect(() => {
    if (!loaded) return;
    const remoteTheme = progress.theme;
    const remoteTs = progress.themeUpdatedAt ?? 0;
    if (!remoteTheme) return; // 服务器无主题偏好，保持本地
    let localTs = 0;
    try { localTs = parseInt(localStorage.getItem(LS_UPDATED_KEY) ?? '0', 10) || 0; } catch { /* */ }
    if (remoteTs > localTs) {
      // 远端更新 → 同步到本地（本地时间戳也跟上，防止下次 load 重复覆盖本地后续修改）
      writeLocalMode(remoteTheme);
      try { localStorage.setItem(LS_UPDATED_KEY, String(remoteTs)); } catch { /* */ }
      setModeState(remoteTheme);
    }
  }, [loaded, progress.theme, progress.themeUpdatedAt]);

  // 监听系统主题变化：仅在 'system' 模式下触发重渲染
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // mode 或 systemDark 变化时重新应用 DOM
  const resolvedDark = resolveDark(mode, systemDark);
  useEffect(() => { applyDarkClass(resolvedDark); }, [resolvedDark]);

  /** 切换主题：写本地 + 经 useProgress.setTheme 写 progress 同步服务器。
   *  本地写入 tp-pass-theme-updated-at 防止 progress load 时把本地刚改的值又被远端旧值覆盖。 */
  const setMode = useCallback((m: ThemeMode) => {
    const now = Date.now();
    writeLocalMode(m);
    try { localStorage.setItem(LS_UPDATED_KEY, String(now)); } catch { /* */ }
    setModeState(m);
    setTheme(m); // → progress.theme + themeUpdatedAt → dirty effect → POST 服务器
  }, [setTheme]);

  return (
    <ThemeCtx.Provider value={{ mode, resolvedDark, setMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}

/** 从 ThemeProvider 取主题状态。必须在 <ThemeProvider> 内调用。 */
export function useTheme(): ThemeCtxValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
