import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, List, ChevronDown, CircleCheck, RotateCcw, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useProgress } from '../hooks/useProgress';
import { useTheme } from '../lib/theme';
import { isCourseRead } from '../lib/progress';
import { practiceTopicForLesson, type Lesson } from '../lib/courseProgress';
import { Button3D, StepDot } from '../components/ui';
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
 * v0.25 票④「课程令牌同源」：课程站样式表由 gen-course-styles.mjs 从 src/index.css
 * 设计令牌生成（sync:study 拷贝后重写 public/study 副本），正文排版与 App 同视觉；
 * 暗色跟随 = 把答题站解析出的主题类同步进同源 iframe 的 <html>（明暗两套令牌在
 * 生成样式表里，class 切换即换肤）。
 *
 * 课已学完 = 显式确认制：左侧竖排目录栏（唯一导航，三态=已学完绿✓/当前金▶/未学数字）
 * 点击定位 iframe 到对应 lesson 并高亮当前课，**打开不产生任何进度写入**（旧版「打开即
 * 自动记已读」已移除——路过就算学过，进度失真）；唯一写路径是底部「✓ 学完了」按钮
 *（lib/courseProgress.applyCourseEvent）：点击才记入 coursesRead（再点撤销），点完后
 * 按钮位变「去刷这课的题 →」直达对应题集。「课全学完」边界 = isCourseRead 命中
 * courses.json 清单全部 lesson，UI 与 ai-study-kit skill 同口径可机读。
 *
 * 打开直达下一个未学完的课（原型注记②）：进度加载后自动定位到第一堂未学完的课
 *（全学完则回第一课），不再落课程站自带首页；用户先点了目录则不再自动跳。
 */
// BASE_URL 前缀：demo 子路径部署下课程静态站也能定位（自托管/开发时 BASE_URL='/' 不影响）
// 主题名来自 sync-examples 产的 theme.json——课程 URL 跟随激活主题，切换主题无需手改此处。
const BASE = `${import.meta.env.BASE_URL}study/${themeMeta.theme}/`;
const COURSE_URL = `${BASE}index.html`;

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

type Lesson0 = Lesson; // 兼容旧局部名（下方清单解构沿用）

export function Courses() {
  const { t } = useI18n();
  const { progress, loaded, dispatchCourseEvent } = useProgress();
  const { resolvedDark } = useTheme();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);
  const [showIndex, setShowIndex] = useState(true);
  const lessons = coursesMeta.lessons as Lesson[];

  // ?lesson= 直达（v0.25 票⑤：全景节点详情「看课程」入口）：命中清单才生效（脏值/缺省
  // 回退默认打开行为——进度加载后自动定位第一个未学完的课）。初始定位算「用户先点了」，
  // 不再触发自动跳转（jumpedRef 预置 true）。
  const lessonParam = searchParams.get('lesson');
  const initialLesson = lessonParam && lessons.some((l) => l.file === lessonParam) ? lessonParam : null;
  const [src, setSrc] = useState(initialLesson ? `${BASE}lessons/${initialLesson}` : COURSE_URL);
  const [currentFile, setCurrentFile] = useState<string | null>(initialLesson);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const jumpedRef = useRef(initialLesson !== null);

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

  // 暗色跟随（票④）：课程站样式表带明暗两套令牌（同源生成），把答题站解析出的
  // 主题类同步进同源 iframe 的 <html>。每次导航后文档会被替换，故 onLoad 里再补一次。
  const syncFrameTheme = () => {
    frameRef.current?.contentWindow?.document?.documentElement.classList.toggle('dark', resolvedDark);
  };
  useEffect(syncFrameTheme, [resolvedDark, src]);

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
      syncFrameTheme();
    } catch {
      // 跨源（理论不会发生）——读不到就跳过，高亮留在上一次点击的课上
    }
  };

  // 打开直达下一个未学完的课（原型注记②）：进度加载后一次性跳转——第一堂未学完
  // 的课，全学完则回第一课；用户已先点目录（currentFile 已定）则不打扰。跳转本身
  // 经 onFrameLoad 的 open 事件，零进度写入。
  useEffect(() => {
    if (!loaded || jumpedRef.current || lessons.length === 0) return;
    jumpedRef.current = true;
    if (currentFile !== null) return;
    const target =
      lessons.find((l) => !isCourseRead(progress, themeMeta.theme, l.file)) ?? lessons[0];
    setSrc(`${BASE}lessons/${target.file}`);
    setCurrentFile(target.file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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
        {/* 课程目录栏（唯一导航，原型 .toc）：左侧竖排清单三态（绿✓/金▶/序号）+ 学完进度。
            点击定位 iframe 到对应 lesson（打开不计入，见底部按钮）。 */}
        <aside
          className={`${showIndex ? 'w-60' : 'w-11'} shrink-0 flex flex-col border-r-2 border-border bg-bg-surface transition-[width]`}
        >
          <div className={`flex items-center py-2 ${showIndex ? 'px-3' : 'justify-center px-0'}`}>
            <button
              onClick={() => setShowIndex((v) => !v)}
              title={t('courses.index')}
              className={`flex items-center gap-1.5 text-[13px] font-bold text-text-secondary hover:text-text-primary transition-colors select-none tabular-nums ${
                showIndex ? 'w-full' : 'w-7 h-7 justify-center rounded-lg'
              }`}
            >
              <List className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {showIndex && (
                <>
                  <span className="truncate">{t('courses.index')}</span>
                  <span className="ml-0.5 text-text-faint">
                    {t('courses.tocCount', { done: doneCount, total: lessons.length })}
                  </span>
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
              <nav className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-1.5">
                {lessons.map((l, i) => {
                  const done = isCourseRead(progress, themeMeta.theme, l.file);
                  const active = currentFile === l.file;
                  // 目录三态（闯关步进基元，原型 .lesson）：已学完=绿✓ / 当前=金▶ / 未学=序号数字
                  return (
                    <button
                      key={l.file}
                      onClick={() => {
                        setSrc(`${BASE}lessons/${l.file}`);
                        setCurrentFile(l.file);
                      }}
                      className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-bold border-2 transition-colors ${
                        active
                          ? 'bg-st-gold-soft border-st-gold-border text-st-gold-ink'
                          : done
                            ? 'bg-st-green-soft border-st-green/40 text-st-green-ink hover:bg-st-green-soft/70'
                            : 'bg-bg-surface border-border text-text-secondary hover:border-border-strong hover:text-text-primary'
                      }`}
                    >
                      <StepDot state={done ? 'done' : active ? 'current' : i + 1} size={22} />
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-1.5 border-t-2 border-border px-3 py-2.5 text-xs font-bold text-text-secondary tabular-nums">
                {doneCount === lessons.length && lessons.length > 0 ? (
                  <CircleCheck className="h-3.5 w-3.5 text-st-green" strokeWidth={2.5} />
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
          className="w-full min-w-0 flex-1 border-0 bg-bg-app"
        />
      </div>
      {/* 底部操作栏（显式确认制，原型 .actionbar）：当前定位到某课才渲染。
          未学完 → 「✓ 学完了」（点击才记入学完进度）；
          已学完 → 按钮位变「去刷这课的题 →」（直达对应题集，解析不出则隐藏）+「撤销」入口（再点撤销）。 */}
      {currentLesson && (
        <footer className="shrink-0 flex items-center justify-center gap-3.5 border-t-2 border-border bg-bg-surface px-4 py-2.5">
          {!currentDone ? (
            <Button3D
              variant="green"
              size="sm"
              className="px-6"
              onClick={() => dispatchCourseEvent({ kind: 'doneToggle', theme: themeMeta.theme, file: currentLesson.file })}
            >
              <CircleCheck className="h-4 w-4" strokeWidth={2.5} />
              {t('courses.markDone')}
            </Button3D>
          ) : (
            <>
              <button
                onClick={() => dispatchCourseEvent({ kind: 'doneToggle', theme: themeMeta.theme, file: currentLesson.file })}
                title={t('courses.undoDoneTitle')}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-st-green/50 bg-st-green-soft px-3.5 py-2 text-[13px] font-bold text-st-green-ink transition-colors hover:bg-st-green-soft/70"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
                {t('courses.undoDone')}
              </button>
              {practiceTopic && (
                <Button3D variant="green" size="sm" className="px-6" to={`/practice/all?topic=${encodeURIComponent(practiceTopic)}`}>
                  {t('courses.goPractice')}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button3D>
              )}
            </>
          )}
        </footer>
      )}
    </div>
  );
}
