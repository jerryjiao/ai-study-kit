import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '../i18n';
import themeMeta from '../data/theme.json';

/**
 * 课程页：用全屏 iframe 嵌入 examples/<theme>/ 静态小站（teach 产出）。
 *
 * 为什么用 iframe 而非 React 重写：teach 的课程是自包含的静态 HTML 小站
 *（lessons / reference 用 ../assets/styles.css 等相对路径互链），拆进 React 会
 * 破坏相对路径与 teach 的持续产出流程。iframe 原样嵌入，路径完整、可离线、零改 HTML。
 *
 * 课程内容由 sync:study 脚本从 examples/<theme>/ 同步到 public/study/<theme>/，
 * 访问路径 /study/<theme>/index.html。dev/prod 都能跑（vite publicDir 自动托管）。
 *
 * 顶栏只保留全局 TopNav（64px），iframe 占满剩余视口，最大化可阅读区域。
 */
// BASE_URL 前缀：demo 子路径部署下课程静态站也能定位（自托管/开发时 BASE_URL='/' 不影响）
// 主题名来自 sync-examples 产的 theme.json——课程 URL 跟随激活主题，切换主题无需手改此处。
const COURSE_URL = `${import.meta.env.BASE_URL}study/${themeMeta.theme}/index.html`;

export function Courses() {
  const { t } = useI18n();
  const [error, setError] = useState(false);

  // iframe 加载失败时给个降级提示（课程未同步时）
  useEffect(() => {
    let cancelled = false;
    fetch(COURSE_URL, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setError(!r.ok); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <BookOpen className="mx-auto h-14 w-14 text-text-faint" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-text-primary">{t('courses.notReady')}</h2>
        <p className="text-text-muted text-sm leading-relaxed">{t('courses.notReadyHint')}</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <iframe
        src={COURSE_URL}
        title={t('courses.frameTitle')}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
}
