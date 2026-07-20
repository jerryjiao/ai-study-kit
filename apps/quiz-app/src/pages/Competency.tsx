import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, Target } from 'lucide-react';
import { ROLES, STRATEGY, type CompetencyRole, type CompetencyItem, type Level } from '../data/competency';

/**
 * 能力矩阵核对页。把 `岗位/附件3-角色岗位能力矩阵.md`（官方唯一权威）结构化呈现，
 * 方便核对"某考点该不该学、学到什么等级"。
 *
 * 三个岗位 × 多子岗位：软质保底 / 网络安全（管理+技术）/ 业务架构主攻。
 * 交互：① 顶部岗位 tab；② 等级聚焦（高亮某一档，灰色其他）；③ 能力项卡片可展开看各等级具体要求。
 * 矩阵空格（null）特殊标注：= 该等级不强评，不是"不考"，AGENTS.md 反复强调的核对点。
 */
export function Competency() {
  const [activeKey, setActiveKey] = useState<string>('ba');
  const [focusLevel, setFocusLevel] = useState<Level | null>(null);

  const role = useMemo<CompetencyRole>(
    () => ROLES.find((r) => r.key === activeKey) ?? ROLES[0],
    [activeKey],
  );
  const strat = STRATEGY[activeKey as keyof typeof STRATEGY];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* 顶部说明 */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" strokeWidth={2} />
          <h1 className="text-lg font-bold text-text-primary">岗位能力矩阵</h1>
          <span className="text-xs text-text-faint">官方附件3 · 唯一权威依据</span>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">
          判"某考点该不该学、学到什么程度"的唯一准绳。
          <span className="text-text-faint"> 数据源自 </span>
          <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-secondary text-xs">岗位/附件3-角色岗位能力矩阵.md</code>
          <span className="text-text-faint">（官方 docx 解析版）。</span>
        </p>
      </header>

      {/* 岗位 tab */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ROLES.map((r) => {
          const label = r.sub ? `${r.group}·${r.sub}` : r.group;
          const isActive = r.key === activeKey;
          const s = STRATEGY[r.key as keyof typeof STRATEGY];
          return (
            <button
              key={r.key}
              onClick={() => setActiveKey(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-soft'
                  : 'bg-bg-surface text-text-secondary border-border hover:border-indigo-300 hover:text-indigo-600'
              }`}
              title={s ? `${s.role} · ${s.target}` : undefined}
            >
              {label}
              {s && (
                <span className={`ml-1.5 text-[10px] ${isActive ? 'text-indigo-200' : 'text-text-faint'}`}>
                  · {s.role}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 当前岗位信息条 */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-bold text-text-primary">
            {role.group}
            {role.sub && <span className="text-text-muted font-normal"> · {role.sub}</span>}
          </span>
          <span className="text-xs text-text-faint">§{role.section}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
            {role.items.length} 个能力项
          </span>
          {strat && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {strat.role} · {strat.target}
            </span>
          )}
        </div>
        {role.note && (
          <p className="text-xs text-text-secondary leading-relaxed flex gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>{role.note}</span>
          </p>
        )}
      </div>

      {/* 等级聚焦工具条 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-faint">聚焦等级：</span>
        {role.levels.map((lv) => {
          const active = focusLevel === lv;
          return (
            <button
              key={lv}
              onClick={() => setFocusLevel(active ? null : lv)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all border ${
                active
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-bg-surface text-text-muted border-border hover:border-border-strong'
              }`}
            >
              {lv}
            </button>
          );
        })}
        {focusLevel && (
          <button
            onClick={() => setFocusLevel(null)}
            className="text-xs text-text-faint hover:text-text-muted underline"
          >
            清除聚焦
          </button>
        )}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          矩阵有要求
        </span>
        <span className="flex items-center gap-1">
          <Circle className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} />
          矩阵为空（不强评，仍要备考）
        </span>
        <span className="text-text-faint">点击卡片展开各等级原文 →</span>
      </div>

      {/* 能力项列表 */}
      <div className="space-y-2.5">
        {role.items.map((item) => {
          const reqForFocus = focusLevel ? item.req[focusLevel] : undefined;
          // 聚焦某等级时，该格为空（null/undefined）则整卡变灰，让"缺口"一眼可见
          const dimmed = focusLevel !== null && (reqForFocus === null || reqForFocus === undefined);

          return (
            <ItemCard
              key={`${role.key}-${item.no}`}
              item={item}
              levels={role.levels}
              focusLevel={focusLevel}
              dimmed={dimmed}
            />
          );
        })}
      </div>

      <footer className="pt-4 text-xs text-text-faint leading-relaxed border-t border-border">
        <p>
          ⚠️ 矩阵空格 = 该等级认证不强评此项，<strong className="text-text-muted">不等于"卷子不出题"</strong>——
          备考仍按矩阵要求等级准备，空格只是优先级信号。
        </p>
        <p className="mt-1">
          对应学习材料：课件 <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-muted">docs/ba-courseware/</code> ·
          题库 <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-muted">docs/coze-exam/</code> ·
          课程 <code className="px-1 py-0.5 rounded bg-bg-subtle text-text-muted">study/ba/</code> 均为非官方备考材料。
        </p>
      </footer>
    </div>
  );
}

/** 单个能力项卡片：标题行 + 等级灯条 + 可展开各等级原文 */
function ItemCard({
  item,
  levels,
  focusLevel,
  dimmed,
}: {
  item: CompetencyItem;
  levels: Level[];
  focusLevel: Level | null;
  dimmed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-bg-surface transition-all ${
        dimmed ? 'border-border opacity-50' : 'border-border hover:border-indigo-200'
      }`}
    >
      {/* 标题行：点击展开 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md bg-bg-subtle text-text-muted text-xs font-mono font-semibold">
          {item.no}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary text-sm">{item.name}</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 leading-snug line-clamp-2">{item.desc}</p>
        </div>
        {/* 等级灯条 */}
        <div className="flex items-center gap-1 shrink-0">
          {levels.map((lv) => {
            const has = item.req[lv] !== undefined && item.req[lv] !== null;
            const focused = focusLevel === lv;
            return (
              <span
                key={lv}
                title={has ? `${lv}：有要求` : `${lv}：矩阵为空（不强评）`}
                className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                  has
                    ? focused
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : focused
                      ? 'bg-text-faint text-text-primary ring-2 ring-text-faint ring-offset-1'
                      : 'bg-bg-subtle text-text-faint border border-border border-dashed'
                }`}
              >
                {lv}
              </span>
            );
          })}
        </div>
        <ChevronDown
          className={`shrink-0 h-4 w-4 text-text-faint transition-transform mt-1 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {/* 展开内容：各等级具体要求 */}
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border mt-1">
          <div className="text-xs text-text-faint pt-3">能力项描述</div>
          <p className="text-xs text-text-secondary leading-relaxed -mt-1">{item.desc}</p>

          <div className="text-xs text-text-faint pt-2">各等级要求（官方原文）</div>
          <div className="space-y-2">
            {levels.map((lv) => {
              const v = item.req[lv];
              const focused = focusLevel === lv;
              return (
                <div
                  key={lv}
                  className={`flex gap-3 p-2.5 rounded-lg text-xs leading-relaxed transition-colors ${
                    v === undefined || v === null
                      ? 'bg-bg-subtle'
                      : focused
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200'
                        : 'bg-bg-subtle/50'
                  }`}
                >
                  <span
                    className={`shrink-0 font-mono font-bold ${
                      v === undefined || v === null ? 'text-text-faint' : 'text-emerald-600'
                    }`}
                  >
                    {lv}
                  </span>
                  <div className="flex-1">
                    {v === undefined || v === null ? (
                      <span className="text-text-faint italic">矩阵为空 — 该等级不强评此项（非"不考"，仍需备考）</span>
                    ) : (
                      <span className="text-text-primary whitespace-pre-wrap">{v}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
