import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { FlashcardsHome } from './pages/FlashcardsHome';
import { Flashcards } from './pages/Flashcards';
import { Courses } from './pages/Courses';
import { Competency } from './pages/Competency';
import { TopNav } from './components/TopNav';
import { SyncStatusBanner } from './components/SyncStatusBanner';
import { ProgressProvider, useProgress } from './hooks/useProgress';
import { ThemeProvider } from './lib/theme';
import { ConfirmProvider } from './components/ConfirmDialog';

function Shell() {
  const { loaded } = useProgress();
  if (!loaded) return <div className="p-8 text-center text-text-muted">加载进度中…</div>;
  return (
    <BrowserRouter>
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
        <Route path="/competency" element={<Competency />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <ThemeProvider>
        <ConfirmProvider>
          <Shell />
        </ConfirmProvider>
      </ThemeProvider>
    </ProgressProvider>
  );
}
