import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks,
  Repeat,
  Shuffle,
  BookOpen,
  ChevronDown,
  Boxes,
  Play,
  CalendarDays,
} from 'lucide-react';
import { questions } from '../data/questions';
import { flashcards } from '../data/flashcards';
import { plan } from '../data/plan';
import themeMeta from '../data/theme.json';
import { computeStats, wrongIds, readCount, isAnswerDeleted } from '../lib/progress';
import { useProgress } from '../hooks/useProgress';
import { StatBadge } from '../components/StatBadge';
import { Button3D, Ring, StepDot, Pips } from '../components/ui';
import {
  TOPIC_ORDER,
  orderedSubtopics as buildOrderedSubs,
  topicLabel,
  stripSubtopicPrefix,
  isPlanned,
  deriveTopicLevels,
  type SubLevel,
} from '../lib/topicOrder';
import { themeConfig, iconFor } from '../lib/themeConfig';
import { derivePlanReport, diffCalendarDays, type PlanReport } from '../lib/plan';
import { useI18n } from '../i18n';

/** 低进度阈值（%）：低于此值圆环用浅一档绿（--st-green-low，不惩罚），0% 走灰字。
 *  原型：15% 浅绿、50%+ 正常绿、0% 灰。 */
const LOW_PCT = 25;
/** 当前关卡涂卡格上限：题数超过它就不渲 Pips（数字已表达，避免一行溢出）。 */
const PIPS_MAX = 12;

export function Home() {
  const { progress, syncStatus } = useProgress();
  const { t } = useI18n();
  // 拓展加练开关（设置面板，缺省关）：关 = 拓展彻底隐身（纯拓展块不渲染、直达链接失效）
  const extOn = progress.settings?.extOn === true;
  const stats = useMemo(() => computeStats(progress, questions), [progress]);
  const wrongCount = wrongIds(progress, questions).length;
  const readNum = useMemo(() => readCount(progress, questions), [progress]);
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // 主题体系：各 topic 的图标（theme-config 的 topicStyles；颜色即状态，卡片样式已统一走
  // 状态色令牌，icon 是配置里唯一还承载主题身份的字段）。
  const topicIcons: Record<string, typeof Boxes> = {};
  for (const [topic, st] of Object.entries(themeConfig.topicStyles ?? {})) {
    topicIcons[topic] = iconFor(st.icon);
  }
  // topicChildren：从 questions 数据派生各 topic 下实际存在的 subtopic（含分块后缀
  // "一/二/三"按序归位），子话题步进的渲染序（与 Practice 的"下一题集"跳转共享）。
  const topicChildren = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const topic of TOPIC_ORDER) result[topic] = buildOrderedSubs(topic, questions);
    return result;
  }, []);

  // 纯拓展块的计数（计划内为 0、拓展>0 的子话题块）：主进度不列，拓展开关开着才显示灰徽标
  const subExtCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) {
      if (!q.subtopic || isPlanned(q)) continue;
      m.set(q.subtopic, (m.get(q.subtopic) ?? 0) + 1);
    }
    return m;
  }, []);
  // 随机 20 沙盒从计划内抽（拓展经 chip 放行，不进随机池）
  const plannedCount = useMemo(() => questions.filter((q) => isPlanned(q)).length, []);

  // 主进度口径的已答题 id 集（非墓碑、非随机沙盒）：闯关关卡计数的输入。
  const answeredIds = useMemo(() => {
    const s = new Set<string>();
    for (const q of questions) {
      const r = progress.answers[q.id];
      if (r && !isAnswerDeleted(r) && !r.fromRandom) s.add(q.id);
    }
    return s;
  }, [progress.answers]);

  // 上次答到的主题：扫描激活题库的答题记录（而非全量 answers），取 submittedAt 最新者。
  // 纯派生值（progress.answers + questions），不持久化——每次 Home 渲染按最新进度重算。
  // ⚠️ 必须以 questions 为主序扫描（多主题隔离）：全量扫 answers 时，其他主题更新的
  // 作答时间戳会吞掉本主题的 resume 入口（find 不到题 → 整个入口消失）。
  const lastTopic = useMemo(() => {
    let bestId: string | undefined;
    let bestTs = -1;
    for (const q of questions) {
      const r = progress.answers[q.id];
      if (!r || isAnswerDeleted(r)) continue; // 墓碑记录不算
      if (r.fromRandom) continue;            // 随机沙盒记录不更新"继续上次"入口（随机是自测，非学习主线）
      const ts = r.submittedAt ?? 0;
      if (ts > bestTs) { bestTs = ts; bestId = q.id; }
    }
    if (!bestId) return null;
    const q = questions.find((x) => x.id === bestId);
    if (!q) return null;
    return { topic: q.topic || '', subtopic: q.subtopic, isExt: !isPlanned(q) };
  }, [progress.answers]);

  // 闯关关卡（v0.25 票②）：大类卡「已答 x/总数」+ 子话题步进三态的唯一数据源。
  // lastTopic 也驱动「当前主题默认展开」（用户故事 1：不用点任何折叠区就能看到进度）。
  const levels = useMemo(
    () => deriveTopicLevels(questions, answeredIds, lastTopic),
    [answeredIds, lastTopic],
  );
  // 子关卡查数 map（渲染序走 topicChildren，计数与状态从这里查）
  const subLevelMap = useMemo(() => {
    const m = new Map<string, SubLevel>();
    for (const lv of levels) for (const s of lv.subs) m.set(s.sub, s);
    return m;
  }, [levels]);

  // 学习计划面板数据（#92）：仅当激活主题有 plan.json——sync 产物 units 非空才派生；
  // dev-intro 等无计划主题 sync 写空计划回退 {units:[]} → planReport=null → 面板整块不渲染，
  // 首页 DOM 零变化。判据 src/lib/plan.ts（scripts/lib/plan.mjs 的 TS 移植，双实现纪律）；
  // 断档的读端过滤传本主题题/卡 id 集求交（多主题隔离红线），课学完按 theme 前缀过滤。
  const themeQuestionIds = useMemo(() => questions.map((q) => q.id), []);
  const planReport = useMemo(() => {
    if (plan.units.length === 0) return null;
    return derivePlanReport({
      plan,
      progress,
      now: Date.now(),
      questionIds: themeQuestionIds,
      cardIds: flashcards.map((f) => f.id),
      theme: (themeMeta as { theme: string }).theme,
    });
  }, [progress, themeQuestionIds]);
  // 剩余清单里 unit.topic 的题集直达：只对本主题真实存在的 topic 建 Link（脏 topic id 降级纯展示）
  const planTopicIds = useMemo(() => new Set(questions.map((q) => q.topic || '')), []);

  // 展开状态：默认展开当前在学主题（闯关步进直接可见），其余大类点开才展开。
  const [expanded, setExpanded] = useState<Set<string>>(
    () => (lastTopic ? new Set([lastTopic.topic]) : new Set()),
  );
  const toggleExpand = (topic: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-7">
      <header className="text-center">
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-text-primary tracking-tight">
          {t('home.heroTitle')}
        </h1>
        <p className="text-text-muted text-sm mt-2">
          {t(syncStatus === 'local' ? 'home.taglineLocal' : 'home.tagline', { total: stats.total })}
        </p>
      </header>

      {/* 统计仪表（状态色语义：已答=绿推进 / 正确率=蓝次级 / 错题=红 / 已看=金） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge label={t('home.statAnswered')} value={`${pct(stats.answered)}%`} color="green" icon={ListChecks} />
        <StatBadge
          label={t('home.statAccuracy')}
          value={stats.answered ? `${Math.round(stats.accuracy * 100)}%` : '—'}
          color="blue"
          icon={ListChecks}
        />
        <StatBadge label={t('home.statWrong')} value={wrongCount} color="red" icon={ListChecks} />
        <StatBadge label={t('home.statRead')} value={`${pct(readNum)}%`} color="gold" icon={BookOpen} />
      </div>

      {/* 学习计划面板（#92）：有 plan.json 的主题第一眼可见（统计仪表正下方）；
          无计划主题 planReport=null 整块不渲染（dev-intro 首页零变化） */}
      {planReport && <PlanPanel report={planReport} topicIds={planTopicIds} />}

      {/* 主行动区（原型 .cta）：继续上次=绿主键（推进），错题重练/随机=蓝次键。
          无答题记录时不渲染"继续上次"（首次学习从下方闯关卡进入）。 */}
      <div className={`grid gap-3 ${lastTopic ? 'grid-cols-1 sm:grid-cols-[2fr_1fr_1fr]' : 'grid-cols-2'}`}>
        {lastTopic && (() => {
          // 上次答的是拓展题 → 开关开着时链接带 layer=拓展 直达拓展筛选；
          // 开关关着（拓展隐身）时回落到该主题的计划内列表（subtopic 落下会是空列表）
          const subFallBack = lastTopic.isExt && !extOn;
          const layerSuffix = lastTopic.isExt && extOn ? '&layer=拓展' : '';
          const to = lastTopic.subtopic && !subFallBack
            ? `/practice/all?topic=${encodeURIComponent(lastTopic.topic)}&subtopic=${encodeURIComponent(lastTopic.subtopic)}${layerSuffix}`
            : `/practice/all?topic=${encodeURIComponent(lastTopic.topic)}`;
          const shortSub = lastTopic.subtopic && !subFallBack ? stripSubtopicPrefix(lastTopic.subtopic) : '';
          const resumeLabel = topicLabel(lastTopic.topic) || t('home.uncategorized');
          return (
            <Button3D variant="green" size="md" to={to} className="w-full">
              <Play className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="truncate">
                {t('home.resumeCta')} · {resumeLabel}
                {shortSub ? ` · ${shortSub}` : ''}
              </span>
            </Button3D>
          );
        })()}
        <Button3D variant="blue" size="md" to="/practice/wrong" className="w-full">
          <Repeat className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          <span className="truncate">{t('home.wrongRetry', { n: wrongCount })}</span>
        </Button3D>
        <Button3D variant="blue" size="md" to="/practice/random" className="w-full">
          <Shuffle className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {/* 题数按 min(20, 计划内题池) 动态显示——Practice 的 random 列表就是
              slice(0, min(20, len))，且随机池只从计划内抽（口径一致，避免"承诺 20 只给 10"）。 */}
          <span className="truncate">{t('home.random20', { n: Math.min(20, plannedCount) })}</span>
        </Button3D>
      </div>

      {/* 考点全景已迁独立页 /panorama（顶栏「全景」入口），首页不再内嵌 */}

      {/* 按主题闯关（v0.25 票②，spec #110 Q1/Q2）：大类卡带完成度圆环 + 「已答 x/总数」；
          当前在学主题默认展开子话题步进（✓ 答满 / ▶ 当前关卡 / 数字 未到）。
          深度徽标（掌握/理解/了解）已删——数字位由答题进度接管（Q2 定案）。 */}
      <div className="space-y-2.5">
        <h2 className="text-center text-[17px] font-extrabold text-text-primary">
          <span className="inline-block bg-st-green-soft text-st-green-ink px-3.5 py-0.5 rounded-full">
            {t('home.byTopic')}
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {levels.map(({ topic, answered: tAns, total }) => {
            const Icon = topicIcons[topic] ?? Boxes;
            const children = topicChildren[topic];
            const hasChildren = children && children.length > 0;
            const isOpen = expanded.has(topic);
            const isNow = lastTopic?.topic === topic;
            const topicPct = total === 0 ? 0 : Math.round((tAns / total) * 100);
            // 低进度浅一档绿（不惩罚）、0% 灰字；圆环是纯装饰（卡上已有 x/y 文字，
            // 页首统计也有已答 %——ariaHidden 防读屏双读）
            const low = topicPct > 0 && topicPct < LOW_PCT;
            const numCls = topicPct === 0 ? 'text-text-faint' : low ? 'text-st-green-low-dark' : 'text-st-green-ink';
            const headInner = (
              <>
                <Ring p={topicPct} tone={low ? 'green-low' : 'green'} size={52} ariaHidden>
                  <b aria-hidden className={`text-[12px] font-extrabold tabular-nums ${numCls}`}>{topicPct}%</b>
                </Ring>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
                    <span className="font-bold text-[15px] truncate">{topicLabel(topic) || t('home.uncategorized')}</span>
                    {isNow && (
                      <span className="shrink-0 text-[13px] font-bold text-st-gold-ink">· {t('home.nowTag')}</span>
                    )}
                  </div>
                  <div className="text-[13px] text-text-muted font-bold tabular-nums mt-0.5">
                    <b className={numCls}>{tAns}</b>/{total} {t('home.qUnit')}
                  </div>
                </div>
              </>
            );
            return (
              <div key={topic} className={`rounded-2xl border-2 border-border bg-bg-surface shadow-card-3d ${hasChildren ? 'overflow-hidden' : ''}`}>
                {hasChildren ? (
                  // 有子话题的大类：卡头 button（展开/收起子话题步进）
                  <button
                    onClick={() => toggleExpand(topic)}
                    className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-bg-hover transition-colors"
                    aria-expanded={isOpen}
                  >
                    {headInner}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                ) : (
                  // 无子话题的 topic：整卡直达练习
                  <Link
                    to={`/practice/all?topic=${encodeURIComponent(topic)}`}
                    className="flex items-center gap-3.5 p-4 hover:bg-bg-hover transition-colors"
                  >
                    {headInner}
                  </Link>
                )}
                {/* 子话题闯关步进：✓ 答满 / ▶ 当前关卡（金高亮 + 涂卡格）/ 数字 未到；
                    每行直接显示「已答 x/总数」（Q1 定案），行可点直达对应题集 */}
                {hasChildren && isOpen && (
                  <div className="grid gap-1.5 border-t-2 border-dashed border-border mx-3.5 pt-3 mb-3.5">
                    {children.map((sub, idx) => {
                      const lv = subLevelMap.get(sub);
                      const subCount = lv?.total ?? 0;
                      const subAns = lv?.answered ?? 0;
                      const extCount = subExtCounts.get(sub) ?? 0;
                      // 计划内为 0、拓展>0 的"纯拓展块"：拓展开关关着时整块隐身；
                      // 开着时计数位改灰色"拓展 N"徽标，链接带 layer=拓展 让 Practice 直接落在拓展筛选上
                      const extOnly = subCount === 0 && extCount > 0;
                      if (extOnly && !extOn) return null;
                      // 子主题显示名：去掉 "TOPIC·" 前缀（大类已显示，前缀冗余）
                      const shortName = stripSubtopicPrefix(sub);
                      const state = lv?.state ?? 'todo';
                      return (
                        <Link
                          key={sub}
                          to={`/practice/all?topic=${encodeURIComponent(topic)}&subtopic=${encodeURIComponent(sub)}${extOnly ? '&layer=拓展' : ''}`}
                          className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                            state === 'current'
                              ? 'border-st-gold-border bg-st-gold-soft text-st-gold-ink hover:bg-st-gold-soft/70'
                              : 'border-border bg-bg-subtle/50 text-text-secondary hover:bg-bg-hover'
                          }`}
                        >
                          {extOnly ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-subtle text-text-faint border border-border">
                              {t('home.extTag', { n: extCount })}
                            </span>
                          ) : (
                            <StepDot state={state === 'done' ? 'done' : state === 'current' ? 'current' : idx + 1} size={26} />
                          )}
                          <span className="flex-1 truncate">{shortName}</span>
                          {/* 当前关卡涂卡格：本关题数 ≤ 上限才渲（数字已表达，防溢出） */}
                          {!extOnly && state === 'current' && subCount <= PIPS_MAX && (
                            <Pips total={subCount} on={subAns} />
                          )}
                          {!extOnly && (
                            <span className="shrink-0 text-[13px] text-text-muted tabular-nums">
                              <b className="text-text-primary">{subAns}</b>/{subCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 学习计划面板（#92，spec #89 第 3 条）：覆盖（进度条 + 完成 X/Y + 剩余清单）、
 *  节奏（日历对照落后/富余 + 速率外推富余/缺口 + 距 deadline 天数）、断档（距上次学习 N 天）。
 *  判据全部来自 src/lib/plan.ts 现算（与 scripts/lib/plan.mjs 双实现同步，数字与
 *  plan-report --json 一致）；数据不足的信号走降级文案（无日程/速率不足/无接触），绝不显示编造数字。
 *  剩余清单里带合法 unit.topic 的单元可点进对应题集（题库无此 topic 的降级纯展示）。 */
function PlanPanel({ report, topicIds }: { report: PlanReport; topicIds: Set<string> }) {
  const { t } = useI18n();
  const { coverage, calendarDiff, projection, gap } = report;
  const pct = coverage.total === 0 ? 0 : Math.round((coverage.done / coverage.total) * 100);

  // 节奏·日历对照：落后（红）/富余（绿）/今天到期（琥珀）/日程已清；不可对照 → 降级文案。
  // ⭐ 无 deadline 零催办（v0.25 票⑥）：「落后」是催办语义——无目标日的主题即使日历对照
  // 判 behind 也不出这个词（整行隐藏）；富余/今天到期/日程已清是中性事实照出。全景页同款。
  let pace: { text: string; cls: string } | null;
  if (!calendarDiff.available) {
    pace = { text: t('home.planNoCalendar'), cls: 'text-text-faint' };
  } else if (calendarDiff.state === 'behind') {
    pace = projection.deadline
      ? { text: t('home.planBehind', { n: -(calendarDiff.diffDays ?? 0) }), cls: 'text-red-600' }
      : null;                                                          // 无目标日 → 零催办字样
  } else if (calendarDiff.state === 'due-today') {
    pace = { text: t('home.planDueToday'), cls: 'text-amber-600' };
  } else if (calendarDiff.state === 'cleared') {
    pace = { text: t('home.planCleared'), cls: 'text-green-600' };
  } else {
    pace = { text: t('home.planSlack', { n: calendarDiff.diffDays ?? 0 }), cls: 'text-green-600' };
  }

  // 距 deadline 天数（无 deadline 不显示；负数 = 已过）
  let deadlineLine: string | null = null;
  if (projection.deadline) {
    const d = diffCalendarDays(calendarDiff.today, projection.deadline);
    if (d !== null) {
      deadlineLine =
        d > 0 ? t('home.planDeadlineIn', { n: d })
        : d === 0 ? t('home.planDeadlineToday')
        : t('home.planDeadlineOver', { n: -d });
    }
  }

  // 节奏·速率外推：可算 → 预计完成日（+ 对 deadline 富余/缺口）；数据不足 → 降级文案不硬算
  let projLine: { text: string; cls: string } | null = null;
  if (projection.available) {
    const base = t('home.planProjection', { window: projection.windowDays, date: projection.estimatedDoneDate ?? '' });
    if (projection.state === 'slack') {
      projLine = { text: `${base} · ${t('home.planProjSlack', { n: projection.slackDays ?? 0 })}`, cls: 'text-green-600' };
    } else if (projection.state === 'deficit') {
      projLine = { text: `${base} · ${t('home.planProjDeficit', { n: -(projection.slackDays ?? 0) })}`, cls: 'text-red-600' };
    } else {
      projLine = { text: base, cls: 'text-text-secondary' };   // 无 deadline：只外推不对照
    }
  } else if (projection.reason === 'no-recent-completions') {
    projLine = { text: t('home.planProjNoData', { window: projection.windowDays }), cls: 'text-text-faint' };
  } else if (projection.reason === 'complete') {
    projLine = { text: t('home.planProjComplete'), cls: 'text-green-600' };
  } // no-units 到不了 UI（面板渲染前提 = units 非空）

  const gapLine = gap.available
    ? { text: t('home.planGap', { n: gap.daysSinceLastContact ?? 0 }), cls: 'text-text-secondary' }
    : { text: t('home.planNoContact'), cls: 'text-text-faint' };

  return (
    <section className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <header className="px-4 py-2.5 border-b border-border bg-bg-subtle/60 flex items-center gap-2.5">
        <CalendarDays className="h-4 w-4 text-text-muted shrink-0" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-text-secondary shrink-0">{t('home.planTitle')}</h2>
        <span className="ml-auto text-xs text-text-muted tabular-nums shrink-0">
          {t('home.planDone', { done: coverage.done, total: coverage.total })}
        </span>
        {deadlineLine && <span className="text-xs text-text-muted tabular-nums shrink-0">{deadlineLine}</span>}
      </header>
      <div className="px-4 py-3 space-y-2.5">
        {/* 进度条（覆盖主数字在面板头「完成 X/Y」）；条纹绿=推进（原型 .bigbar） */}
        <div
          className="h-2 rounded-full bg-st-track overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-bar-green rounded-full" style={{ width: `${pct}%` }} />
        </div>
        {/* 节奏三行：日历对照（无目标日判 behind 时整行隐藏——零催办）/ 速率外推 / 断档 */}
        <div className="space-y-1 text-xs tabular-nums">
          {pace && (
            <div className="flex items-baseline gap-2">
              <span className="text-text-muted shrink-0">{t('home.planPace')}</span>
              <span className={pace.cls}>{pace.text}</span>
            </div>
          )}
          {projLine && <div className={projLine.cls}>{projLine.text}</div>}
          <div className={gapLine.cls}>{gapLine.text}</div>
        </div>
        {/* 剩余清单：非 done 单元（含在学/搁置）；带合法 topic 的可点进对应题集 */}
        {coverage.remaining.length > 0 && (
          <div className="pt-0.5">
            <p className="text-[11px] text-text-faint mb-1.5 tabular-nums">
              {t('home.planRemaining', { n: coverage.remaining.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {coverage.remaining.map((unit) => {
                const inner = (
                  <>
                    <span className="truncate">{unit.title}</span>
                    {unit.plannedDate && (
                      <span className="text-[10px] opacity-60 tabular-nums shrink-0">{unit.plannedDate}</span>
                    )}
                    {unit.status === 'in-progress' && (
                      <span className="shrink-0 px-1 rounded text-[10px] font-medium bg-st-gold-soft text-st-gold-ink">
                        {t('home.planStatusInProgress')}
                      </span>
                    )}
                    {unit.status === 'paused' && (
                      <span className="shrink-0 px-1 rounded text-[10px] font-medium bg-bg-subtle text-text-faint border border-border">
                        {t('home.planStatusPaused')}
                      </span>
                    )}
                  </>
                );
                const cls = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border-2 transition-colors ${
                  unit.status === 'in-progress'
                    ? 'bg-st-gold-soft border-st-gold-border text-st-gold-ink hover:bg-st-gold-soft/70'
                    : unit.status === 'paused'
                    ? 'bg-bg-subtle border-border text-text-faint'
                    : 'bg-bg-subtle border-border text-text-secondary hover:bg-bg-hover'
                }`;
                const known = !!unit.topic && topicIds.has(unit.topic);
                return known ? (
                  <Link key={unit.id} to={`/practice/all?topic=${encodeURIComponent(unit.topic!)}`} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <span key={unit.id} className={cls}>{inner}</span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
