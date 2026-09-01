import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, List, ChevronDown, CircleCheck, RotateCcw, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useProgress } from '../hooks/useProgress';
import { isCourseRead } from '../lib/progress';
import { practiceTopicForLesson } from '../lib/courseProgress';
import themeMeta from '../data/theme.json';
import coursesMeta from '../data/courses.json';
import { questions } from '../data/questions';

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
 * 课已学完 = 显式确认制：左侧竖排目录栏点击定位 iframe 到对应 lesson 并高亮当前课，
 * **打开不产生任何进度写入**（旧版「打开即自动记已读」已移除——路过就算学过，进度失真）；
 * 唯一写路径是底部「✓ 学完了」按钮（lib/courseProgress.applyCourseEvent）：
 * 点击才记入 coursesRead（再点撤销），点完后按钮位变「去刷这课的题 →」直达对应题集。
 * 「课全学完」边界 = isCourseRead 命中 courses.json 清单全部 lesson，UI 与 ai-study-kit skill 同口径可机读。
 */
// BASE_URL 前缀：demo 子路径部署下课程静态站也能定位（自托管/开发时 BASE_URL='/' 不影响）
// 主题名来自 sync-examples 产的 theme.json——课程 URL 跟随激活主题，切换主题无需手改此处。
const BASE = `${import.meta.env.BASE_URL}study/${themeMeta.theme}/`;
const COURSE_URL = `${BASE}index.html`;

type Lesson = { file: string; title: string; topic?: string };

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
  const { progress, dispatchCourseEvent } = useProgress();
  const [error, setError] = useState(false);
  const [showIndex, setShowIndex] = useState(true);
  const [src, setSrc] = useState(COURSE_URL);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lessons = coursesMeta.lessons as Lesson[];

  const doneCount = useMemo(
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

  // iframe 每次导航（点击目录 / 课站内链）后按 pathname 匹配清单，只更新当前课高亮
  //（回到 index / 参考页时清空）。same-origin 才读得到 contentWindow.location
  //（课程静态站同源托管，天然满足）。进度写入走 dispatchCourseEvent({kind:'open'})：
  // 显式确认制下「打开」是零写入事件（policy 见 lib/courseProgress），此处保留调用
  // 是为了让打开路径与按钮路径走同一入口，语义只有一份。
  const onFrameLoad = () => {
    try {
      const loc = frameRef.current?.contentWindow?.location;
      if (!loc) return;
      const file = matchLesson(loc.pathname, lessons);
      setCurrentFile(file);
      dispatchCourseEvent({ kind: 'open', theme: themeMeta.theme, file });
    } catch {
      // 跨源（理论不会发生）——读不到就跳过，高亮留在上一次点击的课上
    }
  };

  // 底部操作栏的当前课状态：done 决定按钮形态（✓ 学完了 ↔ 已学完·撤销 + 去刷题）
  const currentLesson = currentFile ? (lessons.find((l) => l.file === currentFile) ?? null) : null;
  const currentDone = !!currentLesson && isCourseRead(progress, themeMeta.theme, currentLesson.file);
  // 「去刷这课的题」跳转：lesson → 题库 topic（解析链见 practiceTopicForLesson；null 不渲染，不造死链）
  const bankTopics = useMemo(
    () => questions.map((q) => q.topic).filter((t): t is string => t !== undefined),
    [],
  );
  const practiceTopic = currentLesson ? practiceTopicForLesson(currentLesson, bankTopics) : null;

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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* 课程目录栏：左侧竖排清单 + 学完进度。点击定位 iframe 到对应 lesson（打开不计入，见底部按钮）。 */}
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
                  const done = isCourseRead(progress, themeMeta.theme, l.file);
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
                          : done
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-bg-surface border-border text-text-secondary hover:border-indigo-300 hover:text-indigo-700'
                      }`}
                    >
                      {done ? <CircleCheck className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-1 border-t border-border px-3 py-1.5 text-xs text-text-faint tabular-nums">
                {doneCount === lessons.length && lessons.length > 0 ? (
                  <CircleCheck className="h-3.5 w-3.5 text-green-500" strokeWidth={2} />
                ) : null}
                {t('courses.doneProgress', { done: doneCount, total: lessons.length })}
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
      {/* 底部操作栏（显式确认制）：当前定位到某课才渲染。
          未学完 → 「✓ 学完了」（点击才记入学完进度）；
          已学完 → 按钮位变「去刷这课的题 →」（直达对应题集，解析不出则隐藏）+「撤销」入口（再点撤销）。 */}
      {currentLesson && (
        <footer className="shrink-0 flex items-center justify-center gap-3 border-t border-border bg-bg-subtle/60 px-4 py-2">
          {!currentDone ? (
            <button
              onClick={() => dispatchCourseEvent({ kind: 'doneToggle', theme: themeMeta.theme, file: currentLesson.file })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-medium shadow-soft hover:bg-green-700 transition-colors"
            >
              <CircleCheck className="h-4 w-4" strokeWidth={2} />
              {t('courses.markDone')}
            </button>
          ) : (
            <>
              <button
                onClick={() => dispatchCourseEvent({ kind: 'doneToggle', theme: themeMeta.theme, file: currentLesson.file })}
                title={t('courses.undoDoneTitle')}
                className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                {t('courses.undoDone')}
              </button>
              {practiceTopic && (
                <Link
                  to={`/practice/all?topic=${encodeURIComponent(practiceTopic)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-medium shadow-soft hover:bg-indigo-700 transition-colors"
                >
                  {t('courses.goPractice')}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              )}
            </>
          )}
        </footer>
      )}
    </div>
  );
}
