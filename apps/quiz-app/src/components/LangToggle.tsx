import { Languages } from 'lucide-react';
import { useI18n, LANGUAGES } from '../i18n';
import type { UiLang } from '../types';

/** 语言切换器：中/EN/ES/RU/JA 五语下拉，与 ThemeToggle 并排放顶栏。
 *  选项文字永远用各自语言的自称名（中文/English/Español/Русский/日本語），不随当前 UI 语言翻译——
 *  用户哪怕看不懂当前界面，也能找到自己的语言。
 *  v0.25：外壳与顶栏图标钮同款（2px 描边小方钮）；≤640px 隐藏前置图标给 tab 让位。 */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <label
      className="relative flex items-center cursor-pointer h-[30px] sm:h-8 rounded-[10px] border-2 border-border bg-bg-surface text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors"
      title={t('lang.title')}
    >
      <Languages className="pointer-events-none absolute left-1.5 h-3.5 w-3.5 hidden min-[480px]:block" strokeWidth={2} aria-hidden />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as UiLang)}
        aria-label={t('lang.aria')}
        className="appearance-none bg-transparent min-[480px]:pl-6 pl-1.5 pr-1 sm:pr-2 h-full rounded-[10px] text-[13px] sm:text-sm font-bold cursor-pointer outline-none"
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
