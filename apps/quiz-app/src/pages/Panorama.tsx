import { useMemo, useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { X, Play, BookOpen, Compass } from 'lucide-react';
import { questions } from '../data/questions';
import { flashcards } from '../data/flashcards';
import themeMeta from '../data/theme.json';
import coursesMeta from '../data/courses.json';
import { coverage } from '../data/coverage';
import { plan } from '../data/plan';
import {
  buildPanorama,
  shouldRenderGraph,
  groupByTopic,
  countStatuses,
  flattenScheduleOrder,
  pointMatchesFilter,
  parsePanoramaFilter,
  type PanoramaFilter,
  type PanoramaPoint,
  type PanoramaGraphEdge,
  type TopicSection,
} from '../lib/panorama';
import { nextStation, type NextStationResult } from '../lib/nextStation';
import { deriveEpTrace, type TraceEvent } from '../lib/panoramaTrace';
import { isFlashGraduated, type MasteryStatus } from '../lib/mastery';
import { deriveCalendarDiff, deriveCoverage, deriveProjection, diffCalendarDays, type PlanCalendarDiff, type PlanProjection } from '../lib/plan';
import { TOPIC_ORDER, topicLabel } from '../lib/topicOrder';
import type { Lesson } from '../lib/courseProgress';
import type { AnswerRecord, SrsState } from '../types';
import { useProgress } from '../hooks/useProgress';
import { useI18n, type TFn } from '../i18n';
import { Button3D, Card, Switch } from '../components/ui';

/**
 * 考点全景独立页（/panorama，v0.17 自首页折叠面板迁出；v0.25 票⑤重做成「着色地图 +
 * 节点详情」，spec #110 Q3 / 审阅轮②③；票⑥加「诊断 → 导引」三新件）。
 *
 * 版式（原型 proto-panorama.html）：顶部整纲构成条——四态按考点数等比分段的横条 + 计数
 * 图例（判据与 mastery 同口径，本页 buildPanorama/masteryByExamPoint 派生）；每大类一张
 * 全宽卡，内含横向糖果节点路径（绿✓已掌握 / 金▶带光环=在学 / 红!薄弱 / 灰数字未接触），
 * 节点下挂考点名、路径横滑（移动端左右滑）。原 7 信号行（讲/练/掌 chip、口头明细、未毕业
 * 徽标）全部收进节点详情弹层（原型 pano-history-light.html）：四态、答 x/y、错 N、
 * 闪卡毕业、学习轨迹时间线（lib/panoramaTrace 纯函数派生，零新基建）+ 直达刷题与课程。
 *
 * 票⑥三新件（原型 pano-next-card.html）：①「下一站」推荐卡（第一屏、构成条之前）——
 * lib/nextStation 纯函数：落后日程插队（仅有目标日）> 补弱（带拖住下游）> 拓扑序最早
 * 解锁（无 knowflow 映射回退排布表近似），主推 + 理由 + 次选链接 + 绿按钮直达题集；
 * ②赶考细引用——仅当主题设了目标日（plan.json deadline）才出现的一行节奏对照，点达
 * 首页完整计划面板（完整面板仍只在首页，spec 功能轮 B）；③无 deadline 零催办——无
 * 目标日的主题任何节奏措辞里不出「落后」类字样（planPaceLine 门控，成文进
 * docs/methodology「目标日是可选的」）。
 *
 * 筛选：全部/只看薄弱/只看未掌握（?filter= 深链兼容，#78）；非命中节点压暗不隐藏（地图
 * 保留空间上下文）。knowflow 前置连线默认关、开关打开叠加（v0.14 投影功能不丢；无图/
 * 超阈值不渲染开关，回退纯路径清单——注意图阈值只门控连线渲染，不门控下一站推荐计算）。
 * 计划 day chips 已撤出本页（spec Q3；计划摘要行 #93 保留，完整计划面板在首页）。
 */

/** 四态 → 构成条段色 / 图例圆点色（共用一套状态色语义）。 */
const STATUS_COLOR: Record<MasteryStatus, string> = {
  mastered: 'bg-st-green',
  inProgress: 'bg-st-gold',
  weak: 'bg-st-red',
  untouched: 'bg-st-track border-2 border-border',
};

/** 节点糖果配色（原型 .node.done/.cur/.weak/.new；3D 底边 = 0 3px 0 同族深色）。 */
const NODE_CLS: Record<MasteryStatus, string> = {
  mastered: 'bg-st-green border-st-green-dark text-white shadow-[0_3px_0_rgb(var(--st-green-dark))]',
  inProgress: 'bg-st-gold border-st-gold-border text-st-gold-ink shadow-[0_3px_0_rgb(var(--st-gold-border)),0_0_0_6px_rgb(var(--st-gold-soft))]',
  weak: 'bg-st-red border-st-red-dark text-white shadow-[0_3px_0_rgb(var(--st-red-dark))]',
  untouched: 'bg-bg-surface border-border text-text-faint shadow-[0_3px_0_rgb(var(--st-track))]',
};

/** 节点下名字配色：当前/薄弱加粗着色，其余灰（原型同款）。 */
const NODE_NAME_CLS: Record<MasteryStatus, string> = {
  mastered: 'text-text-muted',
  inProgress: 'text-st-gold-ink font-extrabold',
  weak: 'text-st-red-ink font-extrabold',
  untouched: 'text-text-muted',
};

/** 详情弹层状态 chip 配色（原型 .stchp）。 */
const CHIP_CLS: Record<MasteryStatus, string> = {
  mastered: 'text-st-green-ink bg-st-green-soft border-st-green/40',
  inProgress: 'text-st-gold-ink bg-st-gold-soft border-st-gold-border',
  weak: 'text-st-red-ink bg-st-red-soft border-st-red-border',
  untouched: 'text-text-muted bg-st-track border-border',
};

/** 轨迹圆点描边色：首次=灰 / 答对·毕业·掌握=绿 / 错=红。 */
const TL_DOT_CLS: Record<TraceEvent['kind'], string> = {
  first: 'border-text-faint',
  correct: 'border-st-green',
  wrong: 'border-st-red',
  wrongRun: 'border-st-red',
  flashGrad: 'border-st-green',
  mastered: 'border-st-green',
};

const STATE_KEY: Record<MasteryStatus, 'panorama.stateMastered' | 'panorama.stateInProgress' | 'panorama.stateWeak' | 'panorama.stateUntouched'> = {
  mastered: 'panorama.stateMastered',
  inProgress: 'panorama.stateInProgress',
  weak: 'panorama.stateWeak',
  untouched: 'panorama.stateUntouched',
};

/** 日历对照 → 摘要行节奏文案（#93 保留面）。state→key 与首页 PlanPanel 同款（复用
 *  home.plan* 词典 key：同一派生状态两处同文，防措辞漂移）；改判据两处一起改。
 *  ⭐ 无 deadline 零催办（v0.25 票⑥）：落后（behind）是催办语义——无目标日的主题即使
 *  日历对照判 behind 也不出这个词（返回 null 隐藏），富余/今天到期/日程已清是中性事实照出。 */
function planPaceLine(cd: PlanCalendarDiff, t: TFn, deadline: string | null): { text: string; cls: string } | null {
  if (!cd.available) return { text: t('home.planNoCalendar'), cls: 'text-text-faint' };
  if (cd.state === 'behind') {
    if (!deadline) return null;                                       // 无目标日 → 零催办字样
    return { text: t('home.planBehind', { n: -(cd.diffDays ?? 0) }), cls: 'text-red-600' };
  }
  if (cd.state === 'due-today') return { text: t('home.planDueToday'), cls: 'text-amber-600' };
  if (cd.state === 'cleared') return { text: t('home.planCleared'), cls: 'text-green-600' };
  return { text: t('home.planSlack', { n: cd.diffDays ?? 0 }), cls: 'text-green-600' };
}

/** 轨迹时间锚格式化：今天 → 词典「今天」；同年 → MM-DD；跨年 → YYYY-MM-DD（纯展示，
 *  确定性派生不用 Intl——SSR/浏览器/时区输出一致）。 */
function fmtTraceDay(at: number, now: number, todayLabel: string): string {
  const d = new Date(at), n = new Date(now);
  const md = (x: Date) => `${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return todayLabel;
  return d.getFullYear() === n.getFullYear() ? md(d) : `${d.getFullYear()}-${md(d)}`;
}

export function Panorama() {
  const { progress } = useProgress();
  const { t } = useI18n();
  // 筛选：?filter=weak|unmastered 深链直达，非法值回退「全部」；不写 localStorage
  //（查看层会话状态，刷新即回「全部」）——解析/命中语义在 lib 纯函数（#78）。
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parsePanoramaFilter(searchParams.get('filter'));
  const setFilter = (f: PanoramaFilter) => setSearchParams(f === 'all' ? {} : { filter: f }, { replace: false });
  // knowflow 连线默认关（spec 用户故事 25：默认视图保持简洁；开了叠加在节点路径上）
  const [knowflowOn, setKnowflowOn] = useState(false);
  const [openEp, setOpenEp] = useState<string | null>(null);

  const themeData = themeMeta as { examPoints?: Record<string, string>; examDays?: Record<string, string> };
  const panorama = useMemo(
    () => buildPanorama(
      questions, progress.answers, themeData.examPoints ?? {},
      flashcards, progress.srs ?? {}, coverage, themeData.examDays ?? {},
    ),
    [progress.answers, progress.srs],
  );
  const allPoints = useMemo(() => panorama.groups.flatMap((g) => g.points), [panorama.groups]);
  const counts = useMemo(() => countStatuses(allPoints), [allPoints]);
  const sections = useMemo(() => groupByTopic(questions, allPoints, TOPIC_ORDER), [allPoints]);
  const byEp = useMemo(() => new Map(allPoints.map((p) => [p.ep, p])), [allPoints]);

  // 考点 →（题 id 集 / 映射闪卡 id 集）：节点详情的轨迹派生与闪卡毕业计数用（纯派生不落盘）
  const idsByEp = useMemo(() => {
    const m = new Map<string, { qids: string[]; fids: string[] }>();
    const slot = (ep: string) => {
      let s = m.get(ep);
      if (!s) { s = { qids: [], fids: [] }; m.set(ep, s); }
      return s;
    };
    for (const q of questions) if (q.examPoint) slot(q.examPoint).qids.push(q.id);
    for (const f of flashcards) if (f.examPoint) slot(f.examPoint).fids.push(f.id);
    return m;
  }, []);
  // 考点 → 大类 topic → 课程清单里的课（「看课程」直达；解析不出就不渲染按钮，不造死链）
  const lessonByEp = useMemo(() => {
    const epTopic = new Map<string, string>();
    for (const q of questions) if (q.examPoint && !epTopic.has(q.examPoint)) epTopic.set(q.examPoint, q.topic || '');
    const m = new Map<string, Lesson>();
    for (const l of coursesMeta.lessons as Lesson[]) {
      if (!l.topic) continue;
      for (const [ep, topic] of epTopic) if (topic === l.topic && !m.has(ep)) m.set(ep, l);
    }
    return m;
  }, []);

  // 计划摘要行（#93 保留）：仅当激活主题有 plan.json；day chips 已撤出（spec Q3），
  // 完整计划面板仍在首页。计划信号不依赖 progress，派生一次即可。
  const planView = useMemo(() => {
    if (plan.units.length === 0) return null;
    return {
      coverage: deriveCoverage(plan),
      calendarDiff: deriveCalendarDiff(plan, Date.now()),
      projection: deriveProjection(plan, Date.now()),
    };
  }, []);
  const planPace = planView ? planPaceLine(planView.calendarDiff, t, planView.projection.deadline) : null;

  const edges = coverage.graph?.edges ?? null;

  // 下一站推荐（票⑥）：输入 = 排布表序四态 + knowflow 前置映射 + 计划缺口（仅有目标日）。
  // 落后日程映射链：逾期单元（plannedDate < 今天且未完成）的 day → examDays 同 day 的
  // 非掌握考点，按最逾期 day 优先、同 day 排布表序；无目标日 planGap=null（零催办原则）。
  const schedulePoints = useMemo(() => flattenScheduleOrder(panorama.groups), [panorama.groups]);
  const planGap = useMemo(() => {
    if (!planView) return null;
    const deadline = planView.projection.deadline;
    if (!deadline) return null;
    const cd = planView.calendarDiff;
    const examDays = themeData.examDays ?? {};
    const overdueDays: string[] = [];
    for (const u of cd.overdue) {
      const d = (u as { day?: unknown }).day;
      if (typeof d === 'string' && d !== '' && !overdueDays.includes(d)) overdueDays.push(d);
    }
    const overdueEps: string[] = [];
    for (const d of overdueDays) {
      for (const p of schedulePoints) {
        if (p.status !== 'mastered' && examDays[p.ep] === d) overdueEps.push(p.ep);
      }
    }
    return { deadline, overdueEps, daysOverdue: Math.max(0, -(cd.diffDays ?? 0)) };
  }, [planView, schedulePoints]);
  const station = useMemo(
    () => nextStation({ points: schedulePoints, edges, planGap }),
    [schedulePoints, edges, planGap],
  );

  const graphable = shouldRenderGraph(allPoints.length, edges);

  if (panorama.summary.examPoints === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-text-primary tracking-tight">{t('panorama.title')}</h1>
        <p className="text-sm text-text-faint">{t('panorama.noEp')}</p>
      </div>
    );
  }

  const FILTER_CHIPS: { value: PanoramaFilter; label: string }[] = [
    { value: 'all', label: t('panorama.filterAll') },
    { value: 'weak', label: t('panorama.filterWeak') },
    { value: 'unmastered', label: t('panorama.filterUnmastered') },
  ];
  const LEGEND: { status: MasteryStatus; n: number }[] = [
    { status: 'mastered', n: counts.mastered },
    { status: 'inProgress', n: counts.inProgress },
    { status: 'weak', n: counts.weak },
    { status: 'untouched', n: counts.untouched },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* 页头：标题 + knowflow 开关（有图才渲染）+ 筛选 chips（?filter= 深链） */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-text-primary tracking-tight mr-auto">{t('panorama.title')}</h1>
        {graphable && (
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-text-muted">
            {t('panorama.knowflowLabel')}
            <Switch on={knowflowOn} onChange={setKnowflowOn} label={t('panorama.knowflowLabel')} />
          </span>
        )}
        <div role="group" aria-label={t('panorama.filterAria')} className="flex gap-2">
          {FILTER_CHIPS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold border-2 transition-colors ${
                filter === value
                  ? 'bg-st-green border-st-green-dark text-white shadow-[0_3px_0_rgb(var(--st-green-dark))]'
                  : 'bg-bg-surface border-border text-text-muted hover:text-text-primary hover:border-border-strong shadow-[0_2px_0_rgb(var(--color-border))]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* 下一站推荐卡（票⑥，原型 pano-next-card.html .next）：第一屏、构成条之前——
          全景从纯诊断升级为「诊断 + 导引」。主推考点 + 理由（补弱/前置解锁/落后日程）+
          次选链接 + 绿按钮直达题集；无可推荐（全掌握/空）整卡不渲染。 */}
      {station.primary && <NextStationCard station={station} deadline={planGap?.deadline ?? null} />}

      {/* 赶考细引用（票⑥，spec 功能轮 B）：仅当主题设了目标日才出现——按当前节奏预计完成日
          vs 目标日的富余/差距一行，点达首页完整计划面板（完整面板仍只在首页，spec Q3）。
          无目标日 = 这行整个不存在（零催办原则）；速率不足诚实降级为只报目标日倒计时。 */}
      {planView && planView.projection.deadline && (
        <PaceCitation projection={planView.projection} today={planView.calendarDiff.today} />
      )}

      {/* 整纲构成条：四态按考点数等比分段（judged by masteryByExamPoint，同口径）+ 计数图例。
          计划摘要行（#93）保留在图例下；「讲过/口头」快照新鲜度提示一并收口在此。 */}
      <Card className="px-4 sm:px-[18px] py-4 space-y-3">
        <div
          className="flex gap-1 h-5 sm:h-6"
          role="img"
          aria-label={LEGEND.map(({ status, n }) => `${t(STATE_KEY[status])} ${n}`).join('，')}
        >
          {LEGEND.map(({ status, n }) => n > 0 && (
            <i
              key={status}
              style={{ flexGrow: n }}
              title={`${t(STATE_KEY[status])} ${n}`}
              className={`block rounded-md min-w-[6px] ${STATUS_COLOR[status]}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-extrabold text-text-muted tabular-nums">
          {LEGEND.map(({ status, n }) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-full ${STATUS_COLOR[status]}`} />
              {t(STATE_KEY[status])} <b className="text-text-primary text-sm">{n}</b>
            </span>
          ))}
          <span className="ml-auto text-text-faint font-bold">{t('panorama.totalPoints', { n: allPoints.length })}</span>
        </div>
        {planView && planPace && (
          <p className="text-sm text-text-muted tabular-nums flex flex-wrap items-baseline gap-x-2">
            <span className="shrink-0">
              {t('panorama.planDone', { done: planView.coverage.done, total: planView.coverage.total })}
            </span>
            <span className={planPace.cls}>{planPace.text}</span>
          </p>
        )}
        <p className="text-[11px] text-text-faint">
          {t('panorama.stale')}
          {knowflowOn && <span className="ml-1">{t('panorama.graphHint')}</span>}
        </p>
      </Card>

      {/* 按大类看考点：一张全宽卡 = 一条关卡路径（原型 .seclabel + .tcard） */}
      <div>
        <h2 className="flex flex-wrap items-baseline gap-x-2.5 mt-5 mb-3 px-0.5 text-[15px] font-extrabold text-text-primary">
          {t('panorama.byTopic')}
          <small className="text-xs font-bold text-text-faint">{t('panorama.byTopicHint')}</small>
        </h2>
        <TopicMarch
          sections={sections}
          filter={filter}
          edges={edges}
          knowflowOn={knowflowOn && graphable}
          onOpenNode={setOpenEp}
        />
      </div>

      {openEp && (
        <NodeSheet
          point={byEp.get(openEp) ?? null}
          ids={idsByEp.get(openEp) ?? { qids: [], fids: [] }}
          answers={progress.answers}
          srs={progress.srs ?? {}}
          lesson={lessonByEp.get(openEp) ?? null}
          onClose={() => setOpenEp(null)}
        />
      )}
    </div>
  );
}

/** 下一站推荐卡（原型 .next）：🧭 图标 + 「下一站」小标 + 考点名/状态 chip + 理由行 +
 *  次选链接 + 绿按钮直达题集。理由文案按 reason 分流；次选按结构轨向（knowflow/排布表）
 *  分流措辞——无映射主题是排布表近似，不冒称结构洞察。 */
function NextStationCard({ station, deadline }: { station: NextStationResult; deadline: string | null }) {
  const { t } = useI18n();
  const p = station.primary!;
  const alt = station.alt;
  const epQuery = `/practice/all?ep=${encodeURIComponent(p.ep)}`;
  const why =
    p.reason === 'weak'
      ? p.weak && p.weak.downstream.length > 0
        ? t('panorama.nextWhyWeakBlocks', { n: p.weak.openWrong, m: p.weak.downstream.length, names: p.weak.downstream.join(' · ') })
        : t('panorama.nextWhyWeak', { n: p.weak?.openWrong ?? 0 })
      : p.reason === 'behindSchedule'
        ? t('panorama.nextWhyBehind', { n: p.daysOverdue ?? 0, date: deadline ?? '' })
        : station.structural === 'knowflow'
          ? t('panorama.nextWhyUnlocked')
          : t('panorama.nextWhySchedule');
  // 次选措辞：主推补弱 → 「按结构/排布表顺推」；主推落后日程 → 「换个优先级」；
  // 主推结构 → 「接下来」。链接后缀带次选自己的理由词（前置已解锁/排布表下一项/薄弱）。
  const altPref =
    p.reason === 'weak'
      ? t(station.structural === 'knowflow' ? 'panorama.nextAltWeakPref' : 'panorama.nextAltWeakPrefSched')
      : p.reason === 'behindSchedule'
        ? t('panorama.nextAltGenPref')
        : t('panorama.nextAltAfter');
  const altLabel = alt
    ? alt.reason === 'weak'
      ? t('panorama.nextAltWeak', { name: alt.name })
      : station.structural === 'knowflow'
        ? t('panorama.nextAltUnlocked', { name: alt.name })
        : t('panorama.nextAltNext', { name: alt.name })
    : null;
  return (
    <Card className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-4">
      <span className="grid place-items-center w-[46px] h-[46px] rounded-[14px] bg-st-green-soft border-2 border-st-green/30 text-st-green-ink shrink-0" aria-hidden>
        <Compass className="h-[21px] w-[21px]" strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-[230px]">
        <div className="text-xs font-extrabold text-st-green-ink tracking-[2px]">{t('panorama.nextLabel')}</div>
        <h3 className="mt-0.5 flex flex-wrap items-center gap-2 text-base font-extrabold text-text-primary">
          <span className="truncate">{p.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-px text-[11px] font-extrabold border-2 ${CHIP_CLS[p.status]}`}>
            {t(STATE_KEY[p.status])}
          </span>
        </h3>
        <p className="mt-1 text-[13px] font-semibold text-text-muted tabular-nums">{why}</p>
        {alt && altLabel && (
          <p className="mt-1 text-xs font-bold text-text-faint">
            {altPref}{' '}
            <Link
              to={`/practice/all?ep=${encodeURIComponent(alt.ep)}`}
              className="text-st-blue-ink underline decoration-current underline-offset-2 hover:opacity-80"
            >
              {altLabel}
            </Link>
          </p>
        )}
      </div>
      <Button3D variant="green" size="sm" to={epQuery} className="shrink-0 w-full sm:w-auto">
        <Play className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
        {p.reason === 'weak' ? t('panorama.nextGoWeak') : t('panorama.nextGo')}
      </Button3D>
    </Card>
  );
}

/** 赶考细引用（spec 功能轮 B）：一行「按当前节奏预计 X 完成 · 距目标差/富余 N 天 →」，
 *  Link 到首页（完整计划面板）。速率不足（近窗无完成记录）→ 诚实降级只报目标日倒计时，
 *  绝不硬算编数；渲染前提 = 主题设了目标日（调用方守门，无目标日零催办）。 */
function PaceCitation({ projection, today }: { projection: PlanProjection; today: string }) {
  const { t } = useI18n();
  const deadline = projection.deadline!;
  let text: string;
  if (projection.available) {
    const base = t('panorama.paceProj', { date: projection.estimatedDoneDate ?? '' });
    text = (projection.slackDays ?? 0) >= 0
      ? `${base} · ${t('panorama.paceProjSlack', { n: projection.slackDays ?? 0 })}`
      : `${base} · ${t('panorama.paceProjDeficit', { n: -(projection.slackDays ?? 0) })}`;
  } else {
    const d = diffCalendarDays(today, deadline) ?? 0;
    text = d > 0
      ? t('panorama.paceDeadlineIn', { n: d })
      : d === 0 ? t('panorama.paceDeadlineToday') : t('panorama.paceDeadlineOver', { n: -d });
  }
  return (
    <Link
      to="/"
      aria-label={t('panorama.paceAria')}
      className="flex items-center gap-1.5 -mt-1 px-1 text-[13px] font-bold text-text-muted tabular-nums hover:text-text-primary transition-colors"
    >
      <span className="truncate">{text}</span>
      <span aria-hidden className="text-st-blue-ink font-extrabold">→</span>
    </Link>
  );
}

/** 大类关卡路径 +（可选）knowflow 连线层。连线端点实测自节点圆心（挂载/尺寸变化/路径
 *  横滑时重测——scroll 事件不冒泡但可捕获，容器上 capture 监听拿到全部 pathwrap 的横滑）。
 *  无图 / 超阈值 / 开关未开 → 零 SVG DOM（v0.14 回退语义不变）。 */
function TopicMarch({ sections, filter, edges, knowflowOn, onOpenNode }: {
  sections: TopicSection[];
  filter: PanoramaFilter;
  edges: PanoramaGraphEdge[] | null;
  knowflowOn: boolean;
  onOpenNode: (ep: string) => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map());
  const [nodePos, setNodePos] = useState<Record<string, { x: number; y: number }>>({});

  const allPoints = useMemo(() => sections.flatMap((s) => s.points), [sections]);
  const epSet = useMemo(() => new Set(allPoints.map((p) => p.ep)), [allPoints]);
  const drawableEdges = useMemo(
    () => (edges ?? []).filter((e) => epSet.has(e.from) && epSet.has(e.to)),
    [edges, epSet],
  );

  const measure = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cb = c.getBoundingClientRect();
    const next: Record<string, { x: number; y: number }> = {};
    for (const [ep, el] of dotRefs.current) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      if (!b.width) continue;
      next[ep] = { x: b.left + b.width / 2 - cb.left, y: b.top + b.height / 2 - cb.top };
    }
    setNodePos(next);
  }, []);
  useLayoutEffect(() => {
    if (!knowflowOn) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    // 路径横滑重测：scroll 不冒泡，capture 到容器上（含各 pathwrap 的横向滚动）
    containerRef.current?.addEventListener('scroll', measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      containerRef.current?.removeEventListener('scroll', measure, true);
    };
  }, [knowflowOn, measure]);

  return (
    <div ref={containerRef} className="relative space-y-3.5">
      {knowflowOn && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" aria-hidden="true">
          <defs>
            <marker id="pano-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth={6} markerHeight={6} orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
            </marker>
          </defs>
          {drawableEdges.map((e) => {
            const a = nodePos[e.from];
            const b = nodePos[e.to];
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            // 近同列（横向路径布局里常见）时向外弓弯，避免与路径连线叠成一条直线
            const bow = Math.abs(dx) < 32 ? 28 : dx * 0.45;
            const d = `M ${a.x} ${a.y} C ${a.x + bow} ${a.y + dy * 0.3}, ${b.x + bow} ${b.y - dy * 0.3}, ${b.x} ${b.y}`;
            return e.prerequisite ? (
              <path key={`${e.from}->${e.to}`} d={d} fill="none" stroke="#d97706" strokeWidth={1.5} strokeOpacity={0.65} markerEnd="url(#pano-arrow)" />
            ) : (
              <path key={`${e.from}->${e.to}`} d={d} fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeOpacity={0.5} strokeDasharray="4 3" />
            );
          })}
        </svg>
      )}
      {sections.map((s) => (
        <section key={s.topic || '__none__'} className="rounded-2xl border-2 border-border bg-bg-surface shadow-card-3d pt-4 pb-2 px-4">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-[15px] font-extrabold text-text-primary">
              {topicLabel(s.topic) || t('home.uncategorized')}
            </h3>
            <span className="text-[13px] font-bold text-text-muted tabular-nums">
              {t('panorama.topicMasteredPrefix')} <b className="text-st-green-ink">{s.counts.mastered}</b>/{s.points.length} {t('panorama.topicEpUnit')}
            </span>
            <span className="ml-auto flex items-center gap-2.5 text-[12.5px] font-extrabold text-text-muted tabular-nums">
              {(['mastered', 'inProgress', 'weak', 'untouched'] as const).map((st) => (
                s.counts[st] > 0 && (
                  <span key={st} className="inline-flex items-center gap-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[st]}`} />
                    {s.counts[st]}
                  </span>
                )
              ))}
            </span>
          </header>
          {/* 路径本体：横向糖果节点 + 连接底线，可横滑；节点 = 考点，点击开详情弹层 */}
          <div className="overflow-x-auto mt-3.5 pb-1.5">
            <div className="relative w-max flex gap-[18px] px-1 pt-0.5">
              <span aria-hidden className="absolute left-[24px] right-[24px] top-[20px] sm:top-[22px] h-[5px] rounded-full bg-st-track" />
              {s.points.map((p, i) => {
                const dimmed = !pointMatchesFilter(p, filter);
                return (
                  <button
                    key={p.ep}
                    onClick={() => onOpenNode(p.ep)}
                    aria-label={`${p.name} · ${t(STATE_KEY[p.status])}`}
                    className={`relative w-14 shrink-0 flex flex-col items-center gap-1.5 cursor-pointer transition-opacity ${dimmed ? 'opacity-30' : ''}`}
                  >
                    <span
                      ref={(el) => {
                        dotRefs.current.set(p.ep, el);
                        return undefined;
                      }}
                      className={`grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full border-[2.5px] text-[16px] sm:text-[17px] font-extrabold tabular-nums transition-transform hover:-translate-y-0.5 ${NODE_CLS[p.status]}`}
                    >
                      {p.status === 'mastered' ? '✓' : p.status === 'inProgress' ? '▶' : p.status === 'weak' ? '!' : i + 1}
                    </span>
                    <span className={`max-w-[62px] truncate text-center text-xs font-bold ${NODE_NAME_CLS[p.status]}`} title={`${p.ep} ${p.name}`}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/** 节点详情弹层（原型 pano-history-light .sheet）：四态 chip + 讲/练/掌 chip + 答题/错题/
 *  闪卡统计 + 学习轨迹时间线 + 直达刷题与课程。手机底部弹层、桌面居中卡片（同设置面板）。 */
function NodeSheet({ point, ids, answers, srs, lesson, onClose }: {
  point: PanoramaPoint | null;
  ids: { qids: string[]; fids: string[] };
  answers: Record<string, AnswerRecord>;
  srs: Record<string, SrsState>;
  lesson: Lesson | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  // Esc 关闭（移动端习惯：点遮罩关，见 backdrop onClick）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!point) return null;
  const flashGraduated = ids.fids.filter((id) => isFlashGraduated(srs[id])).length;
  const trace = deriveEpTrace({
    questionIds: ids.qids,
    flashcardIds: ids.fids,
    answers,
    srs,
    mastered: point.status === 'mastered',
  });
  const now = Date.now();
  const sig = (on: boolean, label: string, onCls: string) => (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${on ? onCls : 'bg-bg-subtle text-text-faint'}`}>
      {on ? `✓${label}` : `·${label}`}
    </span>
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={point.name}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[540px] max-h-[85vh] overflow-y-auto bg-bg-surface border-2 border-border rounded-t-3xl sm:rounded-[20px] shadow-xl px-5 pt-4 pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-[17px] font-extrabold text-text-primary mr-auto truncate">{point.ep} · {point.name}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold border-2 ${CHIP_CLS[point.status]}`}>
            {t(STATE_KEY[point.status])}
          </span>
          <button
            onClick={onClose}
            aria-label={t('panorama.sheetClose')}
            className="shrink-0 grid place-items-center w-[30px] h-[30px] rounded-full border-2 border-border text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* 三信号 chip（原 7 信号行的讲/练/掌收编处）+ 统计行 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {sig(point.taught, t('panorama.taught'), 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300')}
          {sig(point.practiced, t('panorama.practiced'), 'bg-st-blue-soft text-st-blue-ink')}
          {sig(point.mastered, t('panorama.mastered'), 'bg-st-green-soft text-st-green-ink')}
          {point.oral && (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-bg-subtle text-text-muted tabular-nums">
              {t('panorama.oral', { correct: point.oral.correct, asked: point.oral.asked })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px] font-extrabold text-text-muted tabular-nums">
          <span>{t('panorama.answered', { answered: point.answered, total: point.total })}</span>
          <span className="text-st-red-ink">{t('panorama.statWrongTimes', { n: point.openWrong })}</span>
          <span>{t('panorama.statFlash', { graduated: flashGraduated, mapped: ids.fids.length })}</span>
        </div>

        {/* 学习轨迹时间线（lib/panoramaTrace 确定性派生，零新基建） */}
        <div className="mt-4 text-[13px] font-extrabold tracking-wide text-text-muted">{t('panorama.timelineTitle')}</div>
        {trace.length === 0 ? (
          <p className="mt-2.5 text-[13.5px] font-bold text-text-faint">{t('panorama.timelineEmpty')}</p>
        ) : (
          <div className="mt-2.5">
            {trace.map((ev, i) => (
              <div key={`${ev.at}-${ev.kind}-${ev.qid ?? ev.cardId ?? ''}-${i}`} className="flex gap-3">
                <span className="w-[52px] shrink-0 text-right text-xs font-extrabold text-text-faint tabular-nums pt-[3px]">
                  {fmtTraceDay(ev.at, now, t('panorama.tlToday'))}
                </span>
                <span className="relative w-3.5 shrink-0 flex justify-center">
                  {i < trace.length - 1 && <span aria-hidden className="absolute top-2 -bottom-2.5 w-[3px] bg-border" />}
                  <span aria-hidden className={`relative z-[1] mt-[2px] w-[13px] h-[13px] rounded-full border-[3px] bg-bg-surface ${TL_DOT_CLS[ev.kind]}`} />
                </span>
                <span className="pb-3 min-w-0 text-[13.5px] font-bold text-text-primary">
                  {ev.kind === 'first' && t('panorama.tlFirst')}
                  {ev.kind === 'correct' && t('panorama.tlCorrect')}
                  {ev.kind === 'wrong' && t('panorama.tlWrong')}
                  {ev.kind === 'wrongRun' && t('panorama.tlWrongRun', { n: ev.run ?? 0 })}
                  {ev.kind === 'flashGrad' && t('panorama.tlFlash')}
                  {ev.kind === 'mastered' && t('panorama.tlMastered')}
                  {ev.kind === 'mastered'
                    ? <small className="block text-xs font-semibold text-text-muted mt-px">{t('panorama.tlMasteredSub')}</small>
                    : (ev.qid || ev.cardId) && <small className="block text-xs font-semibold text-text-muted mt-px">{ev.qid ?? ev.cardId}</small>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 直达行动：去刷这考点的题（Practice ?ep= 直达）/ 看课程（解析出课才渲染） */}
        <div className={`grid gap-2.5 mt-4 ${lesson ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button3D variant="green" size="sm" to={`/practice/all?ep=${encodeURIComponent(point.ep)}`}>
            <Play className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {t('panorama.sheetPractice')}
          </Button3D>
          {lesson && (
            <Button3D variant="plain" size="sm" to={`/courses?lesson=${encodeURIComponent(lesson.file)}`}>
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              {t('panorama.sheetCourse')}
            </Button3D>
          )}
        </div>
      </div>
    </div>
  );
}
