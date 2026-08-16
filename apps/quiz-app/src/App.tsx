import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function Shell() {
  const { loaded } = useProgress();
  const { t } = useI18n();
  if (!loaded) return <div className="p-8 text-center text-text-muted">{t('app.loading')}</div>;
  return (
    // basename 跟随 vite base：demo 子路径部署（/ai-study-kit/demo/）下路由不白屏
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
