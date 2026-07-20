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
  Layers,
  Gauge,
  Cloud,
  Sparkles,
  FlaskConical,
  Lock,
  History,
} from 'lucide-react';
import { questions } from '../data/questions';
import { computeStats, wrongIds, readCount, isAnswerDeleted } from '../lib/progress';
import { clearPos } from '../lib/posMemory';
import { useProgress } from '../hooks/useProgress';
import { StatBadge } from '../components/StatBadge';
import { TOPIC_ORDER, orderedSubtopics as buildOrderedSubs } from '../lib/topicOrder';
import { useConfirm } from '../components/ConfirmDialog';

export function Home() {
  const { progress, reset, resetWrong, resetRead } = useProgress();
  const confirm = useConfirm();
  const stats = useMemo(() => computeStats(progress, questions), [progress]);
  const wrongCount = wrongIds(progress, questions).length;
  const readNum = useMemo(() => readCount(progress, questions), [progress]);
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // BA 方向主题体系：固定顺序 + 各自配色 + 图标
  // childCls = 子主题用的浅一档同色系样式（仅三大类有子主题）
  const topicStyles: Record<string, { cls: string; childCls: string; icon: typeof Boxes }> = {
    业务架构: {
      cls: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100',
      childCls: 'bg-indigo-50/40 border-indigo-100 text-indigo-700 hover:bg-indigo-100/70',
      icon: Boxes,
    },
    信息架构: {
      cls: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100',
      childCls: 'bg-sky-50/40 border-sky-100 text-sky-700 hover:bg-sky-100/70',
      icon: Layers,
    },
    指标架构: {
      cls: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
      childCls: 'bg-emerald-50/40 border-emerald-100 text-emerald-700 hover:bg-emerald-100/70',
      icon: Gauge,
    },
    应用架构: {
      cls: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
      childCls: 'bg-violet-50/40 border-violet-100 text-violet-700 hover:bg-violet-100/70',
      icon: Boxes,
    },
    云原生: {
      cls: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
      childCls: 'bg-blue-50/40 border-blue-100 text-blue-700 hover:bg-blue-100/70',
      icon: Cloud,
    },
    人工智能: {
      cls: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
      childCls: 'bg-amber-50/40 border-amber-100 text-amber-700 hover:bg-amber-100/70',
      icon: Sparkles,
    },
    测试: {
      cls: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',
      childCls: 'bg-rose-50/40 border-rose-100 text-rose-700 hover:bg-rose-100/70',
      icon: FlaskConical,
    },
    网络安全: {
      cls: 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200',
      childCls: 'bg-slate-100/60 border-slate-200 text-slate-700 hover:bg-slate-200/70',
      icon: Lock,
    },
  };
  // 由浅入深：按课表学习顺序排（D2业务架构 → D4信息架构 → D7指标 → D8测试 → D9云原生/AI）
  // 顺序定义与 Practice 的"下一题集"跳转共享，见 src/lib/topicOrder.ts。
  // 三大类子主题的学习深度序也定义在那（BA 总论→能力→流程→组件→价值流灯塔；IA 总论→概念→标准→治理；等）。
  // topicChildren：从 questions 数据派生各 topic 下实际存在的 subtopic（含分块后缀"一/二/三"按序归位）。
  const topicChildren = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const topic of TOPIC_ORDER) result[topic] = buildOrderedSubs(topic, questions);
    return result;
  }, []);

  // 大类题数 + 子主题题数统计
  const topics = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) {
      const t = q.topic || '(未分类)';
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()].sort(([a], [b]) => {
      const ia = TOPIC_ORDER.indexOf(a),
        ib = TOPIC_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
  }, []);
  const subtopicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) {
      if (!q.subtopic) continue;
      m.set(q.subtopic, (m.get(q.subtopic) ?? 0) + 1);
    }
    return m;
  }, []);

  // 原子 topic = 最细粒度的分组单元：有 subtopic 的题按 subtopic 归、
  // 无 subtopic 的题归到 "{topic}·其他"。用于"已答明细"面板逐块展示未答覆盖。
  // 行：{ key, topic, name, total, answered, to }
  const atomicTopics = useMemo(() => {
    type Row = { key: string; topic: string; name: string; subtopic: string; total: number; answered: number };
    const m = new Map<string, Row>();
    for (const q of questions) {
      const topic = q.topic || '(未分类)';
      const hasSub = !!q.subtopic;
      const key = hasSub ? `${topic}::${q.subtopic}` : `${topic}::\u0000`; // \u0000 = 其他桶
      let row = m.get(key);
      if (!row) {
        row = {
          key,
          topic,
          name: hasSub ? q.subtopic!.replace(/^(BA|IA|指标|CN)·/, '') : '其他',
          subtopic: q.subtopic ?? '',
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
      const aOther = a.name === '其他' ? 1 : 0, bOther = b.name === '其他' ? 1 : 0;
      if (aOther !== bOther) return aOther - bOther;
      return a.name.localeCompare(b.name);
    });
  }, [progress.answers]);

  // 上次答到的主题：扫描所有非墓碑答题记录，取 submittedAt 最新者对应的题的 topic/subtopic。
  // 纯派生值（progress.answers + questions），不持久化——每次 Home 渲染按最新进度重算。
  const lastTopic = useMemo(() => {
    let bestId: string | undefined;
    let bestTs = -1;
    for (const [id, r] of Object.entries(progress.answers)) {
      if (isAnswerDeleted(r)) continue; // 墓碑记录不算
      if (r.fromRandom) continue;       // 随机沙盒记录不更新"继续上次"入口（随机是自测，非学习主线）
      const ts = r.submittedAt ?? 0;
      if (ts > bestTs) { bestTs = ts; bestId = id; }
    }
    if (!bestId) return null;
    const q = questions.find((x) => x.id === bestId);
    if (!q) return null;
    return { topic: q.topic || '(未分类)', subtopic: q.subtopic };
  }, [progress.answers]);

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
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">T 序列笔试练习</h1>
        <p className="text-text-muted text-sm mt-2">
          业务架构（主攻 T5）· 软件质量管理（保底 T3）· 共 {stats.total} 题 · 进度自动跨设备同步
        </p>
      </header>

      {/* 统计仪表 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge label="已答" value={`${pct(stats.answered)}%`} color="indigo" icon={ListChecks} />
        <StatBadge
          label="正确率"
          value={stats.answered ? `${Math.round(stats.accuracy * 100)}%` : '—'}
          color="green"
          icon={ListChecks}
        />
        <StatBadge label="错题" value={wrongCount} color="red" icon={ListChecks} />
        <StatBadge label="已看" value={`${pct(readNum)}%`} color="sky" icon={BookOpen} />
      </div>

      {/* 上次答到的主题：继续上次入口（无答题记录时不显示） */}
      {lastTopic && (() => {
        const st = topicStyles[lastTopic.topic];
        const Icon = st?.icon ?? Boxes;
        const shortSub = lastTopic.subtopic?.replace(/^(BA|IA|指标|CN)·/, '');
        const to = lastTopic.subtopic
          ? `/practice/all?topic=${encodeURIComponent(lastTopic.topic)}&subtopic=${encodeURIComponent(lastTopic.subtopic)}`
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
              <span className="text-xs opacity-70">上次答到</span>
              <span className="ml-1.5 font-medium">
                {lastTopic.topic}
                {shortSub ? <span className="opacity-70"> · {shortSub}</span> : null}
              </span>
            </span>
            <span className="shrink-0 text-xs opacity-70">继续 →</span>
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
            错题重练（{wrongCount}）
          </Link>
          <Link
            to="/practice/random"
            className="flex items-center justify-center gap-2 bg-bg-surface border border-border-strong rounded-xl px-4 py-3 font-medium hover:bg-bg-hover transition-colors"
          >
            <Shuffle className="h-4 w-4 text-text-muted" strokeWidth={2} />
            随机 20 题
          </Link>
        </div>
      </div>

      {/* 按主题练习（两级：大类可展开/收起，三大类下有子主题；其余单卡片） */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-text-muted px-1">按主题练习（点大类展开子主题）</h2>
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
                    <span className="flex-1 text-left font-medium truncate">{topic}</span>
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
                    <span className="flex-1 font-medium truncate">{topic}</span>
                    <span className="shrink-0 text-xs opacity-70 tabular-nums">{count}</span>
                  </Link>
                )}
                {/* 子主题网格：缩进 + 同色系浅一档，展开时才渲染 */}
                {hasChildren && isOpen && (
                  <div className="grid grid-cols-2 gap-1.5 pl-3">
                    {children.map((sub) => {
                      const subCount = subtopicCounts.get(sub) ?? 0;
                      // 子主题显示名：去掉 "BA·" / "IA·" / "指标·" / "CN·" 前缀（大类已显示）
                      const shortName = sub.replace(/^(BA|IA|指标|CN)·/, '');
                      return (
                        <Link
                          key={sub}
                          to={`/practice/all?topic=${encodeURIComponent(topic)}&subtopic=${encodeURIComponent(sub)}`}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-xs transition-colors ${
                            style?.childCls ?? 'bg-bg-subtle border-border text-text-secondary hover:bg-bg-hover'
                          }`}
                        >
                          <span className="flex-1 truncate">{shortName}</span>
                          <span className="shrink-0 text-[11px] opacity-60 tabular-nums">{subCount}</span>
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
          <span className="font-medium">进度管理</span>
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
                if (await confirm('把所有练习列表（按天/主题）的位置回到第 1 题？（不影响答题记录）')) clearPos('all');
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              重置练习位置
            </button>
            <button
              onClick={async () => {
                if (await confirm('清空所有错题记录？（错题重练将没有题目，不可恢复）')) resetWrong();
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              重置错题记录
            </button>
            <button
              onClick={async () => {
                if (await confirm('清空看题进度？（不影响答题记录，不可恢复）')) resetRead();
              }}
              className="flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border bg-bg-surface rounded-lg px-3 py-2.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              重置看题进度
            </button>
          </div>
          {/* 危险操作单独隔离 */}
          <button
            onClick={async () => {
              if (
                await confirm(
                  '清空全部进度（答题 + 错题 + 看题）？此操作不可恢复，且会同步到所有设备。'
                )
              )
                reset();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            清空全部进度
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
  rows: { key: string; topic: string; name: string; subtopic: string; total: number; answered: number }[];
  topicOrder: readonly string[];
  topicChildren: Record<string, string[]>;
}) {
  // 按 topic 分组，组内按 topicChildren 的学习深度序排（与下方"按主题练习"一致）。
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) (groups[r.topic] ??= []).push(r);
  // 分组顺序：直接复用外层 topicOrder（与下方卡片网格同源），未列出的落到末尾。
  const groupKeys = Object.keys(groups).sort((a, b) => {
    const ia = topicOrder.indexOf(a), ib = topicOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  // 组内排序：有 topicChildren 定义的按其顺序（学习深度），"其他"桶放最后，其余按名次兜底。
  const sortInGroup = (topic: string) => {
    const order = topicChildren[topic] ?? [];
    return (a: (typeof rows)[number], b: (typeof rows)[number]) => {
      const aOther = a.name === '其他' ? 1 : 0, bOther = b.name === '其他' ? 1 : 0;
      if (aOther !== bOther) return aOther - bOther;
      const ia = order.indexOf(a.subtopic), ib = order.indexOf(b.subtopic);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.name.localeCompare(b.name);
    };
  };

  return (
    <div className="rounded-lg border border-border bg-bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-subtle">
        <span className="text-xs font-semibold text-text-secondary">已答覆盖明细（逐考点）</span>
      </div>
      <div className="divide-y divide-border">
        {groupKeys.map((topic) => {
          const grp = [...groups[topic]].sort(sortInGroup(topic));
          const gTotal = grp.reduce((n, r) => n + r.total, 0);
          const gAns = grp.reduce((n, r) => n + r.answered, 0);
          return (
            <div key={topic} className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-text-secondary">{topic}</span>
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
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                          : r.answered === 0
                          ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                          : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      <span>{r.name}</span>
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
