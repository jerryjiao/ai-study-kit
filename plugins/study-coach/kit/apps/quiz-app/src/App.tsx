import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { FlashcardsHome } from './pages/FlashcardsHome';
import { Flashcards } from './pages/Flashcards';
import { Courses } from './pages/Courses';
import { TopNav } from './components/TopNav';
import { SyncStatusBanner } from './components/SyncStatusBanner';
import { ProgressProvider, useProgress } from './hooks/useProgress';
import { ThemeProvider } from './lib/theme';
import { I18nProvider, useI18n } from './i18n';
import { ConfirmProvider } from './components/ConfirmDialog';

/** GitHub Pages 下 demo 深链刷新会被站根 404.html 兜底：它把目标路由存进
 *  sessionStorage 后重定向到 demo 首页，这里在 app 启动时恢复深链。
 *  （apps/site/scripts/patch-404.mjs 注入的脚本与本组件是同一机制的两端。） */
function DeepLinkRestore() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const target = sessionStorage.getItem('ask-demo-route');
      if (target) {
        sessionStorage.removeItem('ask-demo-route');
        navigate(target, { replace: true });
      }
    } catch { /* sessionStorage 不可用（隐私模式等）则放弃恢复 */ }
  }, [navigate]);
  return null;
}

function Shell() {
  const { loaded } = useProgress();
  const { t } = useI18n();
  if (!loaded) return <div className="p-8 text-center text-text-muted">{t('app.loading')}</div>;
  return (
    // basename 跟随 vite base：demo 子路径部署（/ai-study-kit/demo/）下路由不白屏
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DeepLinkRestore />
      <TopNav />
      <SyncStatusBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice/:mode" element={<Practice />} />
        {/* /read 已并入 Practice 的看题模式，旧链接重定向到首页 */}
        <Route path="/read" element={<Navigate to="/" replace />} />
        <Route path="/flashcards" element={<FlashcardsHome />} />
        <Route path="/flashcards/review" element={<Flashcards />} />
        <Route path="/courses" element={<Courses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <I18nProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </ThemeProvider>
      </I18nProvider>
    </ProgressProvider>
  );
}
