import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';
import { SettingsSheet } from './SettingsSheet';
import { useI18n } from '../i18n';

/**
 * 全局吸顶顶栏：品牌字标 + 三 tab 切换 + 语言/主题切换按钮 + 学习偏好设置入口。
 * 「答题」覆盖首页 / 练习 / 看题；「闪卡」/flashcards；「课程」/courses。
 */
export function TopNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [showSettings, setShowSettings] = useState(false);
  const onFlash = pathname === '/flashcards' || pathname.startsWith('/flashcards/');
  const onCourses = pathname === '/courses' || pathname.startsWith('/courses/');
  const onQuiz = !onFlash && !onCourses;

  const cls = (active: boolean) =>
    `px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-indigo-600 text-white shadow-soft' : 'text-text-muted hover:text-text-accent hover:bg-bg-hover'
    }`;

  return (
    <header className="sticky top-0 z-20 h-16 bg-bg-surface/85 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto w-full h-full px-3 sm:px-4 flex items-center justify-between gap-2">
        <Link to="/" aria-label={t('nav.backHome')} className="flex items-center gap-2 text-base font-bold text-text-primary tracking-tight select-none transition-colors hover:text-text-accent shrink-0">
          {/* BASE_URL 前缀：public 资源在 JS 里写死 "/logo.png" 不会随 vite base 重写，
              子路径部署（官网 /demo/）下会裂图；拼接后本地根路径与子路径都正确 */}
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-7 w-7 rounded-[7px]" />
          <span className="sm:hidden">ASK</span>
          <span className="hidden sm:inline">ai-study-kit</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <NavLink to="/" end className={cls(onQuiz)}>
            {t('nav.quiz')}
          </NavLink>
          <NavLink to="/flashcards" className={cls(onFlash)}>
            {t('nav.flashcards')}
          </NavLink>
          <NavLink to="/courses" className={cls(onCourses)}>
            {t('nav.courses')}
          </NavLink>
          <LangToggle />
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full text-text-muted hover:text-text-accent hover:bg-bg-hover transition-colors"
            title={t('settings.title')}
            aria-label={t('settings.open')}
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </button>
        </nav>
      </div>
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </header>
  );
}
