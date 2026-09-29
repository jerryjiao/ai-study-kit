import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';
import { SettingsSheet } from './SettingsSheet';
import { useI18n } from '../i18n';

/** 全局吸顶顶栏（v0.25 换装，spec #110 票①）：品牌图片 logo + 四 tab + 语言/主题/设置。
 *  「练习」tab 已移除——练习入口回归首页闯关卡，顶栏第一项是「首页」（覆盖 / 全家：首页/练习/看题）。
 *  视觉语言：实底卡面 + 2px 底描边；激活 tab = 绿浅底 + 绿字（原型 .tab.on）。
 *  ≤640px 一行放下：logo 26px、tab 13px/收窄内边距、图标钮 30px；品牌文字 <420px 隐藏。 */
export function TopNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const onFlash = pathname === '/flashcards' || pathname.startsWith('/flashcards/');
  const onCourses = pathname === '/courses' || pathname.startsWith('/courses/');
  const onPanorama = pathname === '/panorama' || pathname.startsWith('/panorama/');
  const onHome = !onFlash && !onCourses && !onPanorama;

  // whitespace-nowrap：小屏挤度上升时文字折行比横向收窄更伤（条内两行字）
  const cls = (active: boolean) =>
    `px-2 sm:px-3.5 py-1.5 rounded-xl text-[13px] sm:text-sm font-bold whitespace-nowrap transition-colors ${
      active ? 'bg-st-green-soft text-st-green-ink' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
    }`;

  // 图标钮（原型 .icon-btn）：2px 描边小方钮；30px 起、≥640px 放大到 32px
  const iconBtnCls =
    'grid place-items-center h-[30px] w-[30px] sm:h-8 sm:w-8 rounded-[10px] border-2 border-border ' +
    'bg-bg-surface text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors';

  return (
    <>
      <header className="sticky top-0 z-20 h-[54px] sm:h-[60px] bg-bg-surface border-b-2 border-border">
        <div className="max-w-4xl mx-auto w-full h-full px-3 sm:px-5 flex items-center justify-between gap-1 sm:gap-2">
          <Link
            to="/"
            aria-label={t('nav.backHome')}
            className="flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base font-bold text-text-primary tracking-tight select-none shrink-0"
          >
            {/* BASE_URL 前缀：public 资源在 JS 里写死 "/logo.png" 不会随 vite base 重写，
                子路径部署（官网 /demo/）下会裂图；拼接后本地根路径与子路径都正确。
                logo 是图片资产，固定不随主题/状态色变（spec 拍板）。 */}
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-[26px] w-[26px] sm:h-[30px] sm:w-[30px] rounded-lg" />
            {/* 420px 以下品牌只留图标：四 tab + 语言/主题/设置在 390px 视口才能不横向溢出 */}
            <span className="hidden min-[420px]:inline">AI Study Kit</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <NavLink to="/" end className={cls(onHome)}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/flashcards" className={cls(onFlash)}>
              {t('nav.flashcards')}
            </NavLink>
            <NavLink to="/courses" className={cls(onCourses)}>
              {t('nav.courses')}
            </NavLink>
            <NavLink to="/panorama" className={cls(onPanorama)}>
              {t('nav.panorama')}
            </NavLink>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <LangToggle />
            <ThemeToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              className={iconBtnCls}
              title={t('settings.title')}
              aria-label={t('settings.title')}
            >
              <Settings className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>
      {/* 弹层必须是 header 的兄弟节点：header 会给 fixed 后代创建 containing block
          （backdrop-filter 陷阱），放里面蒙层就只盖住顶栏、弹层也被压进 54px 高的条里。 */}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
