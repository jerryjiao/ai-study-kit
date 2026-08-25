import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { zh } from './locales/zh';
import { en } from './locales/en';
import { es } from './locales/es';
import { ru } from './locales/ru';
import { useProgress } from '../hooks/useProgress';
import type { UiLang } from '../types';

import type { TKey } from './locales/zh';
export type { TKey };

/** t(key, vars)：查当前语言词典 → 缺 key 回退 zh → 仍缺回退 key 名；{name} 占位符替换。 */
export type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

/** 顶栏语言切换菜单（code + 语言自称名——永远用语言本身的名字显示，不翻译）。 */
export const LANGUAGES: { code: UiLang; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
];

const DICTS: Record<UiLang, Record<TKey, string>> = { zh, en, es, ru };

/** <html lang> 属性值（BCP 47），供读屏/浏览器翻译识别。 */
const HTML_LANG: Record<UiLang, string> = { zh: 'zh-CN', en: 'en', es: 'es', ru: 'ru' };

const LS_KEY = 'ask-lang';
const LS_UPDATED_KEY = 'ask-lang-updated-at';

function makeT(lang: UiLang): TFn {
  const dict = DICTS[lang] ?? DICTS.zh;
  return (key, vars) => {
    let s = dict[key] ?? zh[key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(v));
      }
    }
    return s;
  };
}

/** 首次访问（无存储偏好）按浏览器语言挑一个支持的语言；都不匹配回退 en。 */
function detectLang(): UiLang {
  try {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
      const primary = String(tag).toLowerCase().split('-')[0];
      if (primary === 'zh' || primary === 'en' || primary === 'es' || primary === 'ru') return primary;
    }
  } catch { /* SSR / 隐私模式 */ }
  return 'en';
}

/** 读 localStorage 语言偏好。无值（首次访问）→ 按浏览器语言探测。 */
function readLocalLang(): UiLang {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'zh' || v === 'en' || v === 'es' || v === 'ru') return v;
  } catch { /* 配额/隐私模式 */ }
  return detectLang();
}

interface I18nCtxValue {
  lang: UiLang;
  setLang: (l: UiLang) => void;
  t: TFn;
}

const I18nCtx = createContext<I18nCtxValue | null>(null);

/** UI 语言 Provider：模式与 ThemeProvider 完全同构。
 *  存储：本地 'ask-lang'（秒读）+ progress.lang/langUpdatedAt（跨设备同步，LWW 仲裁）。 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { progress, loaded, setLang: setLangProgress } = useProgress();
  const [lang, setLangState] = useState<UiLang>(readLocalLang);

  // progress 加载后：若服务器端语言更新（跨设备同步），用远端值同步本地。
  // 仲裁依据与主题一致：progress.langUpdatedAt > 本地缓存的 ask-lang-updated-at。
  useEffect(() => {
    if (!loaded) return;
    const remoteLang = progress.lang;
    const remoteTs = progress.langUpdatedAt ?? 0;
    if (!remoteLang) return; // 服务器无语言偏好，保持本地
    let localTs = 0;
    try { localTs = parseInt(localStorage.getItem(LS_UPDATED_KEY) ?? '0', 10) || 0; } catch { /* */ }
    if (remoteTs > localTs) {
      try {
        localStorage.setItem(LS_KEY, remoteLang);
        localStorage.setItem(LS_UPDATED_KEY, String(remoteTs));
      } catch { /* */ }
      setLangState(remoteLang);
    }
  }, [loaded, progress.lang, progress.langUpdatedAt]);

  // 应用到 DOM：<html lang> 供读屏/翻译工具识别；document.title 跟随语言。
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
    document.title = makeT(lang)('app.title');
  }, [lang]);

  const t = useMemo(() => makeT(lang), [lang]);

  /** 切换语言：写本地 + 经 useProgress.setLang 写 progress 同步服务器（同 setTheme 模式）。 */
  const setLang = useCallback((l: UiLang) => {
    const now = Date.now();
    try {
      localStorage.setItem(LS_KEY, l);
      localStorage.setItem(LS_UPDATED_KEY, String(now));
    } catch { /* */ }
    setLangState(l);
    setLangProgress(l);
  }, [setLangProgress]);

  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nCtx.Provider>
  );
}

/** 从 <I18nProvider> 取语言状态与 t()。必须在 <I18nProvider> 内调用。 */
export function useI18n(): I18nCtxValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
