import { Link, NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';
import { useI18n } from '../i18n';

/**
 * 全局吸顶顶栏：品牌字标 + 三 tab 切换 + 语言/主题切换按钮。
 * 「答题」覆盖首页 / 练习 / 看题；「闪卡」/flashcards；「课程」/courses。
 */
export function TopNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
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
          <img src="/logo.png" alt="" className="h-7 w-7 rounded-[7px]" />
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
        </nav>
      </div>
    </header>
  );
}
