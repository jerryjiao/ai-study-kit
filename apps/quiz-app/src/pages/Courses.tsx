import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, List, ChevronDown, CircleCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { useProgress } from '../hooks/useProgress';
import { isCourseRead } from '../lib/progress';
import themeMeta from '../data/theme.json';
import coursesMeta from '../data/courses.json';

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
 * 课程已读（v0.4 痛点 #3）：左侧竖排课程目录栏列出清单（sync-examples 产的 courses.json），
 * 点击定位到对应 lesson；iframe 每次加载（含课站内部互链导航）按 same-origin pathname
 * 匹配清单自动标记已读并高亮当前课（progress.coursesRead，key="<theme>/<文件名>"）。
 * 「课全读」完成边界 = 清单全部命中，UI 与 study-coach skill 同口径可机读。
 */
// BASE_URL 前缀：demo 子路径部署下课程静态站也能定位（自托管/开发时 BASE_URL='/' 不影响）
// 主题名来自 sync-examples 产的 theme.json——课程 URL 跟随激活主题，切换主题无需手改此处。
const BASE = `${import.meta.env.BASE_URL}study/${themeMeta.theme}/`;
const COURSE_URL = `${BASE}index.html`;

type Lesson = { file: string; title: string };

/** 从 iframe 的 same-origin pathname 里解析命中的 lesson 文件名。
 *  课站内链可能是 index 视角的 "lessons/x.html"，也可能是 lesson 内部视角的 "x.html"
 *  或 "../lessons/x.html"——统一剥掉前导路径段后按文件名匹配清单。 */
function matchLesson(pathname: string, lessons: Lesson[]): string | null {
  const marker = `/study/${themeMeta.theme}/`;
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  const rest = pathname.slice(idx + marker.length); // e.g. "lessons/01-system.html"
  const file = rest.split('/').filter(Boolean).pop() ?? '';
  return lessons.some((l) => l.file === file) ? file : null;
}

export function Courses() {
  const { t } = useI18n();
  const { progress, markCourseRead } = useProgress();
  const [error, setError] = useState(false);
  const [showIndex, setShowIndex] = useState(true);
  const [src, setSrc] = useState(COURSE_URL);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lessons = coursesMeta.lessons as Lesson[];

  const readCount = useMemo(
    () => lessons.filter((l) => isCourseRead(progress, themeMeta.theme, l.file)).length,
    [progress, lessons],
  );

  // iframe 加载失败时给个降级提示（课程未同步时）
  useEffect(() => {
    let cancelled = false;
    fetch(COURSE_URL, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setError(!r.ok); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  // iframe 每次导航（点击目录 / 课站内链）后按 pathname 匹配清单自动标记已读，
  // 同时更新当前课高亮（回到 index / 参考页时清空）。
  // same-origin 才读得到 contentWindow.location（课程静态站同源托管，天然满足）。
  const onFrameLoad = () => {
    try {
      const loc = frameRef.current?.contentWindow?.location;
      if (!loc) return;
      const file = matchLesson(loc.pathname, lessons);
      setCurrentFile(file);
      if (file) markCourseRead(themeMeta.theme, file);
    } catch {
      // 跨源（理论不会发生）——读不到就跳过，目录点击路径仍可标记
    }
  };

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
    <div className="h-[calc(100vh-4rem)] flex">
      {/* 课程目录栏：左侧竖排清单 + 已读进度。点击定位 iframe 到对应 lesson（加载即自动标记已读）。 */}
      <aside
        className={`${showIndex ? 'w-60' : 'w-11'} shrink-0 flex flex-col border-r border-border bg-bg-subtle/60 transition-[width]`}
      >
        <div className={`flex items-center py-1.5 ${showIndex ? 'px-2' : 'justify-center px-0'}`}>
          <button
            onClick={() => setShowIndex((v) => !v)}
            title={t('courses.index')}
            className={`flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors select-none ${
              showIndex ? '' : 'w-7 h-7 justify-center rounded-md'
            }`}
          >
            <List className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {showIndex && (
              <>
                <span className="truncate">{t('courses.index')}</span>
                <ChevronDown
                  className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50 rotate-90 transition-transform"
                  strokeWidth={2}
                />
              </>
            )}
          </button>
        </div>
        {showIndex && lessons.length > 0 && (
          <>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {lessons.map((l) => {
                const read = isCourseRead(progress, themeMeta.theme, l.file);
                const active = currentFile === l.file;
                return (
                  <button
                    key={l.file}
                    onClick={() => {
                      setSrc(`${BASE}lessons/${l.file}`);
                      setCurrentFile(l.file);
                    }}
                    className={`w-full flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs border transition-colors ${
                      active
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : read
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                          : 'bg-bg-surface border-border text-text-secondary hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    {read ? <CircleCheck className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
                    <span className="truncate">{l.title}</span>
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center gap-1 border-t border-border px-3 py-1.5 text-xs text-text-faint tabular-nums">
              {readCount === lessons.length && lessons.length > 0 ? (
                <CircleCheck className="h-3.5 w-3.5 text-green-500" strokeWidth={2} />
              ) : null}
              {t('courses.readProgress', { read: readCount, total: lessons.length })}
            </div>
          </>
        )}
      </aside>
      <iframe
        ref={frameRef}
        src={src}
        onLoad={onFrameLoad}
        title={t('courses.frameTitle')}
        className="w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
