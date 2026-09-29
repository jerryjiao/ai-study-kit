import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks,
  Repeat,
  Shuffle,
  BookOpen,
  RotateCcw,
  Trash2,
  ChevronRight,
  ChevronDown,
  Boxes,
  Cloud,
  Sparkles,
  FlaskConical,
  Lock,
  History,
  CalendarDays,
} from 'lucide-react';
import { questions } from '../data/questions';
import { flashcards } from '../data/flashcards';
import { plan } from '../data/plan';
import themeMeta from '../data/theme.json';
import { computeStats, wrongIds, readCount, isAnswerDeleted } from '../lib/progress';
import { clearPos } from '../lib/posMemory';
import { useProgress } from '../hooks/useProgress';
import { StatBadge } from '../components/StatBadge';
import { TOPIC_ORDER, orderedSubtopics as buildOrderedSubs, topicLabel, stripSubtopicPrefix, epDepthOf, isPlanned, LAYER_TOPICS } from '../lib/topicOrder';
import { themeConfig, iconFor } from '../lib/themeConfig';
import { derivePlanReport, diffCalendarDays, type PlanReport } from '../lib/plan';
import { useConfirm } from '../components/ConfirmDialog';
import { useI18n } from '../i18n';

export function Home() {
  const { progress, reset, resetWrong, resetRead, syncStatus } = useProgress();
  const confirm = useConfirm();
  const { t } = useI18n();
  // 拓展加练开关（设置面板，缺省关）：关 = 拓展彻底隐身（纯拓展块不渲染、直达链接失效）
  const extOn = progress.settings?.extOn === true;
  const stats = useMemo(() => computeStats(progress, questions), [progress]);
  const wrongCount = wrongIds(progress, questions).length;
  const readNum = useMemo(() => readCount(progress, questions), [progress]);
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // 主题体系：各 topic 的配色 + 图标，全部来自 theme-config.json 的 topicStyles
  // （icon 是配置里的字符串名，经 iconFor 映射到 lucide 组件；未配置的主题走默认样式）。
  // childCls = 子主题用的浅一档同色系样式（主题支持 subtopic 分块时用）。
  const topicStyles: Record<string, { cls: string; childCls: string; icon: typeof Boxes }> = {};
  for (const [topic, st] of Object.entries(themeConfig.topicStyles ?? {})) {
    topicStyles[topic] = { cls: st.cls, childCls: st.childCls, icon: iconFor(st.icon) };
  }
  // 由浅入深：按 TOPIC_ORDER 学习顺序排。
  // 顺序定义与 Practice 的"下一题集"跳转共享，见 src/lib/topicOrder.ts。
  // topicChildren：从 questions 数据派生各 topic 下实际存在的 subtopic（含分块后缀"一/二/三"按序归位）。
  const topicChildren = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const topic of TOPIC_ORDER) result[topic] = buildOrderedSubs(topic, questions);
    return result;
  }, []);

  // 大类题数 + 子主题题数统计（主进度口径 = 计划内题，拓展层不进计数；topic 为空的题归到 '' 桶）
  const topics = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) {
      if (!isPlanned(q)) continue;
      const t = q.topic || '';
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()].sort(([a], [b]) => {
      const ia = TOPIC_ORDER.indexOf(a),
        ib = TOPIC_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
  }, []);
  // 子主题计数：计划内计数（卡片主数字）与拓展计数（纯拓展块的灰徽标）分开统计
  const subtopicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) {
      if (!q.subtopic || !isPlanned(q)) continue;
      m.set(q.subtopic, (m.get(q.subtopic) ?? 0) + 1);
    }
    return m;
  }, []);
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

  // 原子 topic = 最细粒度的分组单元：有 subtopic 的题按 subtopic 归、
  // 无 subtopic 的题归到 "{topic}·其他"。用于"已答明细"面板逐块展示未答覆盖。
  // isOther 标记"其他"桶（展示文案走 t('home.other')，排序用 flag 而非字符串比较，不随语言漂移）。
  const atomicTopics = useMemo(() => {
    type Row = { key: string; topic: string; name: string; subtopic: string; isOther: boolean; total: number; answered: number };
    const m = new Map<string, Row>();
    for (const q of questions) {
      if (!isPlanned(q)) continue; // 覆盖明细 = 主进度口径，纯拓展块不列（其补刷进度看错题本）
      const topic = q.topic || '';
      const hasSub = !!q.subtopic;
      const key = hasSub ? `${topic}::${q.subtopic}` : `${topic}::\u0000`; // \u0000 = 其他桶
      let row = m.get(key);
      if (!row) {
        row = {
          key,
          topic,
          name: hasSub ? stripSubtopicPrefix(q.subtopic!) : '',
          subtopic: q.subtopic ?? '',
          isOther: !hasSub,
          total: 0,
          answered: 0,
        };
        m.set(key, row);
      }
      row.total++;
      const rec = progress.answers[q.id];
      if (rec && !isAnswerDeleted(rec) && !rec.fromRandom) row.answered++;
    }
    // 排序：按 TOPIC_ORDER，桶内"其他"放最后
    return [...m.values()].sort((a, b) => {
      const ia = TOPIC_ORDER.indexOf(a.topic), ib = TOPIC_ORDER.indexOf(b.topic);
      const ta = ia === -1 ? 99 : ia, tb = ib === -1 ? 99 : ib;
      if (ta !== tb) return ta - tb;
      if (a.isOther !== b.isOther) return a.isOther ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
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

  // 多主题隔离：本页 reset 类操作只清激活主题的进度（题 id 集），不误伤其他主题。
  const themeQuestionIds = useMemo(() => questions.map((q) => q.id), []);

  // 学习计划面板数据（#92）：仅当激活主题有 plan.json——sync 产物 units 非空才派生；
  // dev-intro 等无计划主题 sync 写空计划回退 {units:[]} → planReport=null → 面板整块不渲染，
  // 首页 DOM 零变化。判据 src/lib/plan.ts（scripts/lib/plan.mjs 的 TS 移植，双实现纪律）；
  // 断档的读端过滤传本主题题/卡 id 集求交（多主题隔离红线），课学完按 theme 前缀过滤。
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

  // 展开状态：默认全部收起，点开才展开。
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">AI Study Kit</h1>
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

      {/* 上次答到的主题：继续上次入口（无答题记录时不显示） */}
      {lastTopic && (() => {
        const st = topicStyles[lastTopic.topic];
        const Icon = st?.icon ?? Boxes;
        const shortSub = lastTopic.subtopic ? stripSubtopicPrefix(lastTopic.subtopic) : '';
        // 上次答的是拓展题 → 开关开着时链接带 layer=拓展 直达拓展筛选；
        // 开关关着（拓展隐身）时回落到该主题的计划内列表（subtopic 落下会是空列表）
        const layerSuffix = lastTopic.isExt && extOn ? '&layer=拓展' : '';
        const subFallBack = lastTopic.isExt && !extOn;
        const to = lastTopic.subtopic && !subFallBack
          ? `/practice/all?topic=${encodeURIComponent(lastTopic.topic)}&subtopic=${encodeURIComponent(lastTopic.subtopic)}${layerSuffix}`
          : `/practice/all?topic=${encodeURIComponent(lastTopic.topic)}`;
        return (
          <Link
            to={to}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-sm transition-colors ${
              st?.cls ?? 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <History className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} />
            <span className="flex-1">
              <span className="text-xs opacity-70">{t('home.resume')}</span>
              <span className="ml-1.5 font-medium">
                {topicLabel(lastTopic.topic) || t('home.uncategorized')}
                {shortSub && !subFallBack ? <span className="opacity-70"> · {shortSub}</span> : null}
              </span>
            </span>
            <span className="shrink-0 text-xs opacity-70">{t('home.resumeGo')}</span>
          </Link>
        );
      })()}

      {/* 主操作入口 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/practice/wrong"
            className="flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 font-medium hover:bg-red-100 transition-colors"
          >
            <Repeat className="h-4 w-4" strokeWidth={2} />
            {t('home.wrongRetry', { n: wrongCount })}
          </Link>
          <Link
            to="/practice/random"
            className="flex items-center justify-center gap-2 bg-bg-surface border border-border-strong rounded-xl px-4 py-3 font-medium hover:bg-bg-hover transition-colors"
          >
            <Shuffle className="h-4 w-4 text-text-muted" strokeWidth={2} />
            {/* 题数按 min(20, 计划内题池) 动态显示——Practice 的 random 列表就是
                slice(0, min(20, len))，且随机池只从计划内抽（口径一致，避免"承诺 20 只给 10"）。 */}
            {t('home.random20', { n: Math.min(20, plannedCount) })}
          </Link>
        </div>
      </div>

      {/* 考点全景已迁独立页 /panorama（顶栏「全景」入口），首页不再内嵌 */}

      {/* 按主题练习（两级：大类可展开/收起，三大类下有子主题；其余单卡片） */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-text-muted px-1">{t('home.byTopic')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map(([topic, count]) => {
            const style = topicStyles[topic];
            const Icon = style?.icon ?? Boxes;
            const children = topicChildren[topic];
            const isOpen = expanded.has(topic);
            const hasChildren = children && children.length > 0;
            return (
              <div key={topic} className={hasChildren ? 'space-y-1.5' : ''}>
                {hasChildren ? (
                  // 有子主题的大类：button（展开/收起）+ 整行卡片
                  <button
                    onClick={() => toggleExpand(topic)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-sm transition-colors ${
                      style?.cls ?? 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} />
                    <span className="flex-1 text-left font-medium truncate">{topicLabel(topic) || t('home.uncategorized')}</span>
                    <span className="shrink-0 text-xs opacity-70 tabular-nums">{count}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      strokeWidth={2}
                    />
                  </button>
                ) : (
                  // 无子主题的 topic：保持原单卡片 Link 行为
                  <Link
                    to={`/practice/all?topic=${encodeURIComponent(topic)}`}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-sm transition-colors ${
                      style?.cls ?? 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={2} />
                    <span className="flex-1 font-medium truncate">{topicLabel(topic) || t('home.uncategorized')}</span>
                    <span className="shrink-0 text-xs opacity-70 tabular-nums">{count}</span>
                  </Link>
                )}
                {/* 子主题网格：缩进 + 同色系浅一档，展开时才渲染 */}
                {hasChildren && isOpen && (
                  <div className="grid grid-cols-2 gap-1.5 pl-3">
                    {children.map((sub) => {
                      const subCount = subtopicCounts.get(sub) ?? 0;
                      const extCount = subExtCounts.get(sub) ?? 0;
                      // 计划内为 0、拓展>0 的"纯拓展块"：拓展开关关着时整块隐身；
                      // 开着时计数位改灰色"拓展 N"徽标，链接带 layer=拓展 让 Practice 直接落在拓展筛选上
                      const extOnly = subCount === 0 && extCount > 0;
                      if (extOnly && !extOn) return null;
                      // 子主题显示名：去掉 "TOPIC·" 前缀（大类已显示，前缀冗余）
                      const shortName = stripSubtopicPrefix(sub);
                      // 考点深度徽标（掌握/理解/了解）：仅有层概念的大类（layerTopics）显示
                      const depth = LAYER_TOPICS.includes(topic) ? epDepthOf(shortName) : null;
                      return (
                        <Link
                          key={sub}
                          to={`/practice/all?topic=${encodeURIComponent(topic)}&subtopic=${encodeURIComponent(sub)}${extOnly ? '&layer=拓展' : ''}`}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-xs transition-colors ${
                            style?.childCls ?? 'bg-bg-subtle border-border text-text-secondary hover:bg-bg-hover'
                          }`}
                        >
                          <span className="flex-1 truncate">{shortName}</span>
                          {depth && (
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              depth === '掌握' ? 'bg-rose-50 text-rose-500' : depth === '理解' ? 'bg-amber-50 text-amber-600' : 'bg-bg-subtle text-text-faint'
                            }`}>{depth}</span>
                          )}
                          {extOnly ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-subtle text-text-faint">拓展 {extCount}</span>
                          ) : (
                            <span className="shrink-0 text-[11px] opacity-60 tabular-nums">{subCount}</span>
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

      {/* 进度管理（折叠，避免误触危险操作） */}
      <details className="group rounded-xl border border-border bg-bg-subtle/50 overflow-hidden">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm text-text-muted hover:text-text-secondary select-none list-none [&::-webkit-details-marker]:hidden">
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          <span className="font-medium">{t('home.progressManage')}</span>
          <ChevronRight className="h-4 w-4 ml-auto opacity-50 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* 已答覆盖明细：逐原子 topic 展示"答了 X / 共 Y"，未答满的块可点进练习 */}
          <AnsweredDetailPanel
            rows={atomicTopics}
            topicOrder={TOPIC_ORDER}
            topicChildren={topicChildren}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={async () => {
                if (await confirm(t('home.confirmResetPos'))) clearPos('all');
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              {t('home.resetPos')}
            </button>
            <button
              onClick={async () => {
                if (await confirm(t('home.confirmResetWrong'))) resetWrong(themeQuestionIds);
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              {t('home.resetWrong')}
            </button>
            <button
              onClick={async () => {
                if (await confirm(t('home.confirmResetRead'))) resetRead(themeQuestionIds);
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              {t('home.resetRead')}
            </button>
          </div>
          {/* 危险操作单独隔离 */}
          <button
            onClick={async () => {
              if (await confirm(t('home.confirmResetAll'))) reset();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {t('home.resetAll')}
          </button>
        </div>
      </details>
    </div>
  );
}

/** 已答明细面板：按原子 topic（有 subtopic 按 subtopic，无则归"{topic}·其他"）逐块列出
 *  已答/总数，未答满的块高亮并可点进对应练习列表。每个 topic 分一组。 */
function AnsweredDetailPanel({
  rows,
  topicOrder,
  topicChildren,
}: {
  rows: { key: string; topic: string; name: string; subtopic: string; isOther: boolean; total: number; answered: number }[];
  topicOrder: readonly string[];
  topicChildren: Record<string, string[]>;
}) {
  const { t } = useI18n();
  // 按 topic 分组，组内按 topicChildren 的学习深度序排（与下方"按主题练习"一致）。
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) (groups[r.topic] ??= []).push(r);
  // 分组顺序：直接复用外层 topicOrder（与下方卡片网格同源），未列出的落到末尾。
  const groupKeys = Object.keys(groups).sort((a, b) => {
    const ia = topicOrder.indexOf(a), ib = topicOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  // 组内排序：有 topicChildren 定义的按其顺序（学习深度），"其他"桶（isOther）放最后，其余按名次兜底。
  const sortInGroup = (topic: string) => {
    const order = topicChildren[topic] ?? [];
    return (a: (typeof rows)[number], b: (typeof rows)[number]) => {
      if (a.isOther !== b.isOther) return a.isOther ? 1 : -1;
      const ia = order.indexOf(a.subtopic), ib = order.indexOf(b.subtopic);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.name.localeCompare(b.name);
    };
  };

  return (
    <div className="rounded-lg border border-border bg-bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-subtle">
        <span className="text-xs font-semibold text-text-secondary">{t('home.coverDetail')}</span>
      </div>
      <div className="divide-y divide-border">
        {groupKeys.map((topic) => {
          const grp = [...groups[topic]].sort(sortInGroup(topic));
          const gTotal = grp.reduce((n, r) => n + r.total, 0);
          const gAns = grp.reduce((n, r) => n + r.answered, 0);
          return (
            <div key={topic || '__uncategorized__'} className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-text-secondary">{topicLabel(topic) || t('home.uncategorized')}</span>
                <span className="text-[11px] text-text-faint tabular-nums">
                  {gAns}/{gTotal}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grp.map((r) => {
                  const done = r.answered >= r.total;
                  // URL：有 subtopic 的走 topic+subtopic 过滤；"其他"桶（无 subtopic）按 topic 过滤。
                  const to = r.subtopic
                    ? `/practice/all?topic=${encodeURIComponent(r.topic)}&subtopic=${encodeURIComponent(r.subtopic)}`
                    : `/practice/all?topic=${encodeURIComponent(r.topic)}`;
                  return (
                    <Link
                      key={r.key}
                      to={to}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border transition-colors ${
                        done
                          ? 'bg-st-green-soft border-st-green/40 text-st-green-ink hover:bg-st-green-soft/70'
                          : r.answered === 0
                          ? 'bg-st-red-soft border-st-red-border text-st-red-ink hover:bg-st-red-soft/70'
                          : 'bg-st-gold-soft border-st-gold-border text-st-gold-ink hover:bg-st-gold-soft/70'
                      }`}
                    >
                      <span>{r.isOther ? t('home.other') : r.name}</span>
                      <span className="text-[10px] opacity-70 tabular-nums">
                        {r.answered}/{r.total}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
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

  // 节奏·日历对照：落后（红）/富余（绿）/今天到期（琥珀）/日程已清；不可对照 → 降级文案
  let pace: { text: string; cls: string };
  if (!calendarDiff.available) {
    pace = { text: t('home.planNoCalendar'), cls: 'text-text-faint' };
  } else if (calendarDiff.state === 'behind') {
    pace = { text: t('home.planBehind', { n: -(calendarDiff.diffDays ?? 0) }), cls: 'text-red-600' };
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
        {/* 节奏三行：日历对照 / 速率外推 / 断档 */}
        <div className="space-y-1 text-xs tabular-nums">
          <div className="flex items-baseline gap-2">
            <span className="text-text-muted shrink-0">{t('home.planPace')}</span>
            <span className={pace.cls}>{pace.text}</span>
          </div>
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

