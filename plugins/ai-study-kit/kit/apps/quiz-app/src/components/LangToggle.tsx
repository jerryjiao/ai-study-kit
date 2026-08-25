import { Languages } from 'lucide-react';
import { useI18n, LANGUAGES } from '../i18n';
import type { UiLang } from '../types';

/** 语言切换器：中/EN/ES/RU 四语下拉，与 ThemeToggle 并排放顶栏。
 *  选项文字永远用各自语言的自称名（中文/English/Español/Русский），不随当前 UI 语言翻译——
 *  用户哪怕看不懂当前界面，也能找到自己的语言。 */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="relative flex items-center cursor-pointer" title={t('lang.title')}>
      <Languages
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-text-muted"
        strokeWidth={2}
        aria-hidden
      />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as UiLang)}
        aria-label={t('lang.aria')}
        className="appearance-none bg-transparent pl-7 pr-3 py-1.5 rounded-full text-sm font-medium text-text-muted hover:text-text-accent hover:bg-bg-hover transition-colors cursor-pointer outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
