import { useMemo, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { questions } from '../data/questions';
import { flashcards } from '../data/flashcards';
import themeMeta from '../data/theme.json';
import { coverage } from '../data/coverage';
import { plan } from '../data/plan';
import {
  buildPanorama,
  shouldRenderGraph,
  filterPanoramaGroups,
  parsePanoramaFilter,
  type PanoramaFilter,
  type PanoramaGroup,
  type PanoramaGraphEdge,
} from '../lib/panorama';
import {
  deriveCalendarDiff,
  deriveCoverage,
  planUnitsByDay,
  type PlanCalendarDiff,
  type PlanUnitView,
} from '../lib/plan';
import type { MasteryStatus } from '../lib/mastery';
import type { PlanUnitStatus } from '../types';
import { useProgress } from '../hooks/useProgress';
import { useI18n, type TFn, type TKey } from '../i18n';

/**
 * 考点全景独立页（/panorama，v0.17 自首页折叠面板迁出）：顶部四态汇总带（讲/练/掌 x/N +
 * 图例），下方每学程 day 一张卡片，考点行放宽（四态圆点 + 讲/练/掌 chip + EP 编号名称 +
 * 答 x/y + 口头 x/y + 未毕业徽标）。判据 src/lib/panorama.ts（与 mastery-report 同口径，
 * 双实现纪律）。无考点标记的主题降级为提示行。连线层：快照 graph.edges 有数据时自绘 SVG
 * 把考点连成图（实线箭头=前置，虚线=关联），节点圆点按掌握四态着色；无图/超阈值回退
 * day 卡片清单（shouldRenderGraph，没装 knowflow 的用户看不到任何变化）。
 */

/** 四态圆点配色（页头图例与考点行共用）。 */
const STATUS_DOT_CLS: Record<MasteryStatus, string> = {
  mastered: 'bg-green-500',
  weak: 'bg-red-500',
  inProgress: 'bg-amber-500',
  untouched: 'bg-slate-300',
};

const STATUS_LEGEND: { status: MasteryStatus; key: 'panorama.dotMastered' | 'panorama.dotWeak' | 'panorama.dotInProgress' | 'panorama.dotUntouched' }[] = [
  { status: 'mastered', key: 'panorama.dotMastered' },
  { status: 'weak', key: 'panorama.dotWeak' },
  { status: 'inProgress', key: 'panorama.dotInProgress' },
  { status: 'untouched', key: 'panorama.dotUntouched' },
];

/** day 卡计划 chip：单元状态 → 词典 key + 配色（在学金 / 完成绿 / 搁置灰边与首页
 *  剩余清单 chip 同语言，计划中为全景新增面 → 中性灰）。 */
const PLAN_CHIP: Record<PlanUnitStatus, { labelKey: TKey; cls: string }> = {
  planned: { labelKey: 'panorama.planStatusPlanned', cls: 'bg-bg-subtle text-text-muted border border-border' },
  'in-progress': { labelKey: 'panorama.planStatusInProgress', cls: 'bg-st-gold-soft text-st-gold-ink' },
  done: { labelKey: 'panorama.planStatusDone', cls: 'bg-green-100 text-green-700' },
  paused: { labelKey: 'panorama.planStatusPaused', cls: 'bg-bg-subtle text-text-faint border border-border' },
};

/** 脏 status 兜底 chip（sync 只保证 units 是数组，status 可能缺/坏——只出标题不出状态）。 */
const PLAN_CHIP_FALLBACK_CLS = 'bg-bg-subtle text-text-muted border border-border';

/** 日历对照 → 摘要行节奏文案。state→key 映射与首页 PlanPanel 同款（复用 home.plan*
 *  词典 key：同一派生状态两处同文，防措辞漂移）；颜色语义一致（落后红/富余绿/今天到期
 *  琥珀/降级灰）。改判据语义时两处一起改（src/lib/plan.ts 双实现纪律的面）。 */
function planPaceLine(cd: PlanCalendarDiff, t: TFn): { text: string; cls: string } {
  if (!cd.available) return { text: t('home.planNoCalendar'), cls: 'text-text-faint' };
  if (cd.state === 'behind') return { text: t('home.planBehind', { n: -(cd.diffDays ?? 0) }), cls: 'text-red-600' };
  if (cd.state === 'due-today') return { text: t('home.planDueToday'), cls: 'text-amber-600' };
  if (cd.state === 'cleared') return { text: t('home.planCleared'), cls: 'text-green-600' };
  return { text: t('home.planSlack', { n: cd.diffDays ?? 0 }), cls: 'text-green-600' };
}

export function Panorama() {
  const { progress } = useProgress();
  const { t } = useI18n();
  // 筛选：?filter=weak|unmastered 深链直达，非法值回退「全部」；不写 localStorage
  //（查看层会话状态，刷新即回「全部」）——解析/过滤语义在 lib 纯函数（#78）。
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parsePanoramaFilter(searchParams.get('filter'));
  const setFilter = (f: PanoramaFilter) => setSearchParams(f === 'all' ? {} : { filter: f }, { replace: false });
  // 讲过/口头来自 build 时产出的内容无关覆盖快照（src/data/coverage.json，records 私有不出本地），
  // 练过/掌握由本地进度实时派生；分组按 theme.json examDays（MISSION 排布表 day 列）。
  const themeData = themeMeta as { examPoints?: Record<string, string>; examDays?: Record<string, string> };
  const panorama = useMemo(
    () => buildPanorama(
      questions, progress.answers, themeData.examPoints ?? {},
      flashcards, progress.srs ?? {}, coverage, themeData.examDays ?? {},
    ),
    [progress.answers, progress.srs],
  );
  // 筛选只收窄 day 卡片列表；汇总带保持全局口径（grill 定案：筛选时不丢全局感）
  const visibleGroups = useMemo(() => filterPanoramaGroups(panorama.groups, filter), [panorama.groups, filter]);

  // 学习计划轻量结合（#93）：仅当激活主题有 plan.json（sync 产物 units 非空）——dev-intro
  // 等无计划主题 sync 写空计划回退 {units:[]} → planView=null → 摘要行与 day 卡 chip 零
  // DOM（全景页零变化）。判据与首页计划面板同源（src/lib/plan.ts 同一组纯函数，数字与
  // plan-report --json 一致）；这里只取摘要行要的覆盖 + 日历对照和 day→单元映射，不算
  // 断档/外推（范围受控：全景页不做第二个计划面板）。计划信号不依赖 progress，派生一次即可。
  const planView = useMemo(() => {
    if (plan.units.length === 0) return null;
    return {
      coverage: deriveCoverage(plan),
      calendarDiff: deriveCalendarDiff(plan, Date.now()),
      unitsByDay: planUnitsByDay(plan),
    };
  }, []);
  const planPace = planView ? planPaceLine(planView.calendarDiff, t) : null;

  if (panorama.summary.examPoints === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('panorama.title')}</h1>
        <p className="text-sm text-text-faint">{t('panorama.noEp')}</p>
      </div>
    );
  }

  const FILTER_CHIPS: { value: PanoramaFilter; label: string }[] = [
    { value: 'all', label: t('panorama.filterAll') },
    { value: 'weak', label: t('panorama.filterWeak') },
    { value: 'unmastered', label: t('panorama.filterUnmastered') },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('panorama.title')}</h1>
        {/* 三档筛选 chips：当前档高亮；切档即时过滤，空 day 组整组隐藏 */}
        <div role="group" aria-label={t('panorama.filterAria')} className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${
                filter === value
                  ? 'bg-st-green-soft text-st-green-ink border-st-green'
                  : 'bg-bg-surface border-border text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* 汇总带：全局三信号数字 + 计划摘要行（有 plan.json 才有）+ 四态图例（始终全局口径，后续筛选不收窄它） */}
      <section className="rounded-xl border border-border bg-bg-surface px-4 py-3 space-y-2">
        <p className="text-sm font-medium text-text-secondary tabular-nums">
          {t('panorama.summary', { ...panorama.summary, total: panorama.summary.examPoints })}
        </p>
        {planView && planPace && (
          <p className="text-sm text-text-muted tabular-nums flex flex-wrap items-baseline gap-x-2">
            <span className="shrink-0">
              {t('panorama.planDone', { done: planView.coverage.done, total: planView.coverage.total })}
            </span>
            <span className={planPace.cls}>{planPace.text}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {STATUS_LEGEND.map(({ status, key }) => (
            <span key={status} className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLS[status]}`} />
              {t(key)}
            </span>
          ))}
        </div>
      </section>

      <PanoramaGroups
        groups={visibleGroups}
        edges={coverage.graph?.edges ?? null}
        unitsByDay={planView?.unitsByDay ?? null}
      />
    </div>
  );
}

/** day 卡片 + 连线层：SVG 叠加在全部卡片之上（绝对定位天然盖过静态卡片背景），
 *  开了连线时考点行转 relative 让文字盖回连线上——沿原首页面板的分层方案原样迁入。
 *  计划 chip（#93）：unitsByDay 非空时 day 卡头带该 day 映射单元的状态 chip（计划中/
 *  在学/完成/搁置）；day 命名空间与 examDays 同源（ADR-0009），无 plan 的主题传 null
 *  → 头部零变化。chip 描述的是 day 的计划单元，不受考点筛选收窄（与汇总带全局口径同精神）。 */
function PanoramaGroups({ groups, edges, unitsByDay }: {
  groups: PanoramaGroup[];
  edges: PanoramaGraphEdge[] | null;
  unitsByDay: Map<string, PlanUnitView[]> | null;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map());
  const [nodePos, setNodePos] = useState<Record<string, { x: number; y: number }>>({});

  const allPoints = useMemo(() => groups.flatMap((g) => g.points), [groups]);
  const drawGraph = shouldRenderGraph(allPoints.length, edges);
  const epSet = useMemo(() => new Set(allPoints.map((p) => p.ep)), [allPoints]);
  const drawableEdges = useMemo(
    () => (drawGraph ? (edges ?? []).filter((e) => epSet.has(e.from) && epSet.has(e.to)) : []),
    [drawGraph, edges, epSet],
  );

  // 连线端点实测（沿 day 分组布局叠连线，零新依赖）：挂载/容器尺寸变化时重测
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
    if (!drawGraph) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [drawGraph, measure]);

  const dotTitle: Record<string, string> = {
    mastered: t('panorama.dotMastered'),
    weak: t('panorama.dotWeak'),
    inProgress: t('panorama.dotInProgress'),
    untouched: t('panorama.dotUntouched'),
  };
  // 三信号 chip：亮=该色系，灭=灰底「·」前缀（语义见 panorama.ts 头注）
  const sig = (on: boolean, label: string, onCls: string) => (
    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium ${on ? onCls : 'bg-bg-subtle text-text-faint'}`}>
      {on ? `✓${label}` : `·${label}`}
    </span>
  );

  return (
    <div ref={containerRef} className="relative space-y-4">
      {drawGraph && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <marker id="pano-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
            </marker>
          </defs>
          {drawableEdges.map((e) => {
            const a = nodePos[e.from];
            const b = nodePos[e.to];
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            // 近同列（day 分组布局里常见）时向外弓弯，避免与相邻连线重叠成一条直线
            const bow = Math.abs(dx) < 32 ? 28 : dx * 0.45;
            const mid = `M ${a.x} ${a.y} C ${a.x + bow} ${a.y + dy * 0.3}, ${b.x + bow} ${b.y - dy * 0.3}, ${b.x} ${b.y}`;
            return e.prerequisite ? (
              <path key={`${e.from}->${e.to}`} d={mid} fill="none" stroke="#d97706" strokeWidth={1.5} strokeOpacity={0.65} markerEnd="url(#pano-arrow)" />
            ) : (
              <path key={`${e.from}->${e.to}`} d={mid} fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeOpacity={0.5} strokeDasharray="4 3" />
            );
          })}
        </svg>
      )}
      <p className="text-[11px] text-text-faint px-1">
        {t('panorama.stale')}
        {drawGraph && <span className="ml-1">{t('panorama.graphHint')}</span>}
      </p>
      {groups.map((g) => {
        const planChips = unitsByDay?.get(g.day) ?? [];
        return (
          <section key={g.day} className="rounded-xl border border-border bg-bg-surface overflow-hidden">
            <header className="px-4 py-2.5 border-b border-border bg-bg-subtle/60 flex items-baseline gap-2.5">
              <h2 className="text-sm font-semibold text-text-secondary shrink-0">{g.day}</h2>
              <span className="text-xs text-text-faint tabular-nums truncate">
                {t('panorama.summary', g.summary)}
              </span>
              {planChips.length > 0 && (
                <span className="ml-auto shrink-0 flex flex-wrap items-baseline justify-end gap-1.5 max-w-[60%]">
                  {planChips.map((u) => {
                    const chip = u.status ? PLAN_CHIP[u.status] : null;   // 脏 status → 只出标题
                    return (
                      <span
                        key={u.id}
                        className={`inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${chip?.cls ?? PLAN_CHIP_FALLBACK_CLS}`}
                      >
                        <span className="truncate max-w-[10rem]">{u.title}</span>
                        {chip && <span className="shrink-0">{t(chip.labelKey)}</span>}
                      </span>
                    );
                  })}
                </span>
              )}
            </header>
            <div className="px-4 py-3 space-y-2.5">
              {g.points.map((p) => (
                <div key={p.ep} className={`flex items-center gap-2 text-sm ${drawGraph ? 'relative' : ''}`}>
                  <span
                    ref={(el) => {
                      dotRefs.current.set(p.ep, el);
                      return undefined;
                    }}
                    title={dotTitle[p.status] ?? undefined}
                    className={`shrink-0 h-2.5 w-2.5 rounded-full ring-2 ring-bg ${STATUS_DOT_CLS[p.status]}`}
                  />
                  {sig(p.taught, t('panorama.taught'), 'bg-sky-50 text-sky-700')}
                  {sig(p.practiced, t('panorama.practiced'), 'bg-st-blue-soft text-st-blue-ink')}
                  {sig(p.mastered, t('panorama.mastered'), 'bg-green-50 text-green-700')}
                  <span className="font-medium text-text-secondary truncate min-w-0">
                    {p.ep} {p.name}
                  </span>
                  <span className="shrink-0 text-xs text-text-faint tabular-nums">
                    {t('panorama.answered', { answered: p.answered, total: p.total })}
                  </span>
                  {p.oral && (
                    <span className="shrink-0 text-[11px] text-text-faint tabular-nums">
                      {t('panorama.oral', { correct: p.oral.correct, asked: p.oral.asked })}
                    </span>
                  )}
                  {p.openWrong > 0 && (
                    <span className="shrink-0 ml-auto px-1.5 py-0.5 rounded text-[11px] bg-red-50 text-red-600">
                      {t('panorama.wrong', { n: p.openWrong })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
