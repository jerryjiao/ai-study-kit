import { Link, NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

/**
 * 全局吸顶顶栏：品牌字标 + 四 tab 切换 + 主题切换按钮。
 * 「答题」覆盖首页 / 练习 / 看题；「闪卡」/flashcards；「课程」/courses；「矩阵」/competency（岗位能力矩阵核对）。
 */
export function TopNav() {
  const { pathname } = useLocation();
  const onFlash = pathname === '/flashcards' || pathname.startsWith('/flashcards/');
  const onCourses = pathname === '/courses' || pathname.startsWith('/courses/');
  const onMatrix = pathname === '/competency' || pathname.startsWith('/competency/');
  const onQuiz = !onFlash && !onCourses && !onMatrix;

  const cls = (active: boolean) =>
    `px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-indigo-600 text-white shadow-soft' : 'text-text-muted hover:text-text-accent hover:bg-bg-hover'
    }`;

  return (
    <header className="sticky top-0 z-20 h-16 bg-bg-surface/85 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto w-full h-full px-3 sm:px-4 flex items-center justify-between gap-2">
        <Link to="/" aria-label="返回首页" className="text-base font-bold text-text-primary tracking-tight select-none transition-colors hover:text-text-accent shrink-0">
          <span className="sm:hidden">T<span className="text-text-accent">·</span>P</span>
          <span className="hidden sm:inline">T<span className="text-text-accent">·</span>Pass</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <NavLink to="/" end className={cls(onQuiz)}>
            答题
          </NavLink>
          <NavLink to="/flashcards" className={cls(onFlash)}>
            闪卡
          </NavLink>
          <NavLink to="/courses" className={cls(onCourses)}>
            课程
          </NavLink>
          <NavLink to="/competency" className={cls(onMatrix)}>
            矩阵
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
