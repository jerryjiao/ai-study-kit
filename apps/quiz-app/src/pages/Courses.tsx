import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * 课程页：用全屏 iframe 嵌入 teach 产出的 study/ba/ 静态小站。
 *
 * 为什么用 iframe 而非 React 重写：teach 的课程是自包含的静态 HTML 小站
 *（lessons / reference 用 ../assets/styles.css 等相对路径互链），拆进 React 会
 * 破坏相对路径与 teach 的持续产出流程。iframe 原样嵌入，路径完整、可离线、零改 HTML。
 *
 * 课程内容由 sync:study 脚本从 study/ba/ 同步到 public/study/ba/，
 * 访问路径 /study/ba/index.html。dev/prod 都能跑（vite publicDir 自动托管）。
 *
 * 顶栏只保留全局 TopNav（64px），iframe 占满剩余视口，最大化可阅读区域。
 *（曾有多课程切换条 + 新窗口打开，2026-07-12 精简：networking 不再学，单课程无需切换条。）
 */
const COURSE_URL = '/study/ba/index.html';

export function Courses() {
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
        <h2 className="text-xl font-bold text-text-primary">课程未就绪</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          课程内容来自 <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-secondary">study/ba/</code>，
          需先运行 <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-secondary">pnpm run build</code>（含 sync:study）同步。
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <iframe
        src={COURSE_URL}
        title="业务架构备考"
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
}
