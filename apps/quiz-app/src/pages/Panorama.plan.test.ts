// Panorama.plan.test.ts — 全景页计划轻量结合 DOM 门控冒烟（#93，spec #89 第 4 条；
// v0.25 票⑤更新：全景重做成构成条 + 大类糖果节点路径，计划 day chips 撤出本页
// （spec #110 Q3），计划摘要行保留——断言面随之收窄为「摘要行有/无」+「chip 零 DOM」。
// v0.25 票⑥新增：下一站推荐卡 + 赶考细引用 + 无 deadline 零催办门控的页面级验收。
// v0.27 #125 新增：债务红字退场——behind（有目标日也）不再陈列「落后 N 天」，五语旧
// 模板（home.planBehind，key 已删）以测试常量存活做零出现断言；新鲜重排审计
// （plan.rescheduled ≤ 7 天）→ 摘要行出「已重排：下一站 X，日期 Y」钩子宣告行。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 计划摘要行零
//     DOM（全景页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物本身。
//   - 有 plan → 汇总带计划摘要行（完成 X/Y）；day 卡状态 chip（单元标题）不再出现
//     （v0.25 票⑤撤出面）。
//   - 票⑥·有目标日 → 下一站推荐卡可插队（落后日程理由带目标日）+ 赶考细引用行出现
//     且 href="/"（跳首页计划面板，spec 功能轮 B：完整面板仍只在首页）。
//   - 票⑥·无目标日 → 零催办：五语渲染全景+首页，词典自身的催办模板（缺口/已过/
//     落后日程理由）一个都不出现（自动检索；人工复核见票 #116 验收记录）。
//   - #125·behind（有目标日）→ 日历对照行的「落后 N 天」红字零出现（五语旧模板锚定，
//     与推荐理由「日程已落后 N 天」区分靠 SSR 标签边界 `>模板<`——推荐理由整句不同模板）。
//   - #125·新鲜审计 → 「已重排：下一站 X，日期 Y」出现（en/zh 双语抽验）。
//
// 节奏数字（富余 N 天等）随「今天」漂移，只断言措辞不断言 N（逐值在 plan.test.ts
// 本地正午锚定）。react-dom/server 渲染（仓库无 DOM 测试环境，SSR 串是零依赖的同构
// 口径）；node 下 I18nProvider 探测不到浏览器语言 → 回退 en，断言用英文文案；
// 五语扫描用 stub localStorage 注入语言（I18nProvider 读 ask-lang 的既有通道）。
// 注：vitest include 只收 *.test.ts（无 tsx），故用 createElement 而非 JSX。
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { PlanFile } from '../types';
import { zh } from '../i18n/locales/zh';
import { en } from '../i18n/locales/en';
import { es } from '../i18n/locales/es';
import { ru } from '../i18n/locales/ru';
import { ja } from '../i18n/locales/ja';

// vi.mock 工厂被提升到 import 之前，共享态经 vi.hoisted 拿（vitest 官方口径）
const mock = vi.hoisted(() => ({ plan: { units: [] } as unknown as PlanFile }));
vi.mock('../data/plan', () => ({ plan: mock.plan }));

import { Panorama } from './Panorama';
import { Home } from './Home';
import { ProgressProvider } from '../hooks/useProgress';
import { I18nProvider } from '../i18n';

// 有计划夹具（v0.25 票⑤起全景不再渲染 day 卡 chip，day 字段不再需要与 examDays 对齐——
// 单元仅用于「chip 撤出」的反向断言与摘要行计数）。U-02 该 2026-09-08 完成但未完成 →
// 任何晚于该日的「今天」都判 behind（措辞稳定可断言）。票⑥给 U-02 挂 day: 'D2'——
// dev-intro 的 examDays 把 EP-02/03/04 排在 D2，空进度下三个考点全未掌握 → 落后日程
// 轨插队，主推 EP-02（排布表序第一个 D2 考点），验证「有目标日插队」的页面接线。
const PLAN_WITH: PlanFile = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-03', title: '搁置单元', order: 3, status: 'paused' },
    { id: 'U-04', title: '排程单元', order: 4, status: 'planned' },
    { id: 'U-05', title: '无日单元', order: 5, status: 'planned' },
    { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2026-09-08', day: 'D2', status: 'in-progress' },
    { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' },
  ],
};

// 无目标日夹具（票⑥零催办验收）：有逾期单元（09-01 该完成、未完成）但**没设 deadline**
// ——日历对照判 behind 也不许出「落后」措辞；细引用行整个不存在。
const PLAN_NO_DEADLINE: PlanFile = {
  units: [
    { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', status: 'planned' },
    { id: 'U-02', title: '进阶单元', order: 2, status: 'planned' },
  ],
};

// 「落后 N 天」的日历对照模板（home.planBehind，五语原文）——key 已随 #125 红字退场删除，
// 模板以测试常量存活：behind 场景（有目标日也）渲染串里这些**整行**永不再出现。
// 边界锚定 `>…<`：SSR 里日历行是独立 <span>整串</span>；推荐理由「日程已落后 N 天
// （目标日 …）」是另一模板（panorama.nextWhyBehind），不同串不误伤。
const BEHIND_TEMPLATES: Record<string, string> = {
  zh: '落后 {n} 天',
  en: '{n} days behind',
  es: '{n} días de retraso',
  ru: 'Отставание {n} дн.',
  ja: '{n} 日遅れ',
};
const BEHIND_RE: Record<string, RegExp> = Object.fromEntries(
  Object.entries(BEHIND_TEMPLATES).map(([lang, s]) => [
    lang,
    new RegExp(`>${s.replace(/\{n\}/g, '\\d+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`),
  ]),
);

const renderPanorama = () =>
  renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(ProgressProvider, null, createElement(I18nProvider, null, createElement(Panorama))),
    ),
  );

const renderHome = () =>
  renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(ProgressProvider, null, createElement(I18nProvider, null, createElement(Home))),
    ),
  );

/** SSR 串 → 可见纯文本：剥标签 + 剥 React 插值注释标记（<!-- -->），跨插值断言才稳。 */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '');

describe('Panorama 计划轻量结合 DOM 门控（v0.25 票⑤：摘要行保留、day chips 撤出）', () => {
  it('空计划（无 plan.json 的 sync 回退 {units:[]}）→ 摘要行零 DOM（dev-intro 全景页零变化）', () => {
    mock.plan.units = [];
    mock.plan.deadline = undefined; // mock 是共享对象引用，逐用例显式清（防上一用例泄漏）
    const html = renderPanorama();
    expect(html).not.toContain('Plan:');        // 计划摘要行不出现
    expect(html).not.toContain('days behind');  // 节奏措辞不出现
  });

  it('有 plan → 摘要行（完成 X/Y）出现；#125 红字退场：behind 不再出「落后 N 天」；计划单元标题不进本页', () => {
    mock.plan.units = PLAN_WITH.units;
    mock.plan.deadline = PLAN_WITH.deadline;
    mock.plan.rescheduled = undefined; // mock 是共享对象引用，逐用例显式清（防上一用例泄漏）
    const html = renderPanorama();
    expect(html).toContain('Plan: 1/5 done');   // 摘要行：完成 X/Y（1 done / 5 total）
    // #125 债务红字退场：U-02 该 09-08 完成、任何晚于该日的今天都判 behind，但节奏行
    // 不再陈列落后天数（修复走重排；本用例无审计 → 整行隐藏）。en 直查，五语在下方专测。
    expect(html).not.toMatch(BEHIND_RE.en);
    // v0.25 票⑤撤出面：任何计划单元都不再有呈现位（含标题原文）
    expect(html).not.toContain('基础单元');
    expect(html).not.toContain('进阶单元');
    expect(html).not.toContain('搁置单元');
    expect(html).not.toContain('排程单元');
    expect(html).not.toContain('无日单元');
  });
});

describe('Panorama 下一站推荐卡 + 赶考细引用（v0.25 票⑥）', () => {
  it('有目标日 → 落后日程插队：推荐卡主推 D2 考点、理由带目标日，绿按钮直达题集', () => {
    mock.plan.units = PLAN_WITH.units;
    mock.plan.deadline = PLAN_WITH.deadline; // vi.mock 工厂捕获的是对象引用：deadline 必须显式赋上
    const html = renderPanorama();
    expect(html).toContain('Next up');                                    // 推荐卡小标
    expect(html).toContain('days behind schedule (goal 2026-10-15)');     // 落后日程理由（N 漂移不断言）
    expect(html).toContain('/practice/all?ep=EP-02');                     // 主推直达题集（D2 排布表序第一）
    expect(html).toContain('next in schedule');                           // 次选（EP-01，排布表近似措辞）
  });

  it('有目标日 → 赶考细引用行出现且指向首页（完整计划面板仍只在首页）；速率不足降级为目标日倒计时', () => {
    mock.plan.units = PLAN_WITH.units;
    mock.plan.deadline = PLAN_WITH.deadline;
    const html = renderPanorama();
    // 近 14 天窗无完成记录（U-01 doneDate 09-02 不落窗）→ 诚实降级：只报目标日倒计时
    expect(html).toContain('days to your goal');
    // 属性顺序无关：同一 <a> 上同时有 href="/" 与计划面板 aria-label（跳首页完整计划面板）
    expect(html).toMatch(/<a(?=[^>]*href="\/")(?=[^>]*aria-label="Open the full study plan)/);
  });

  it('无目标日 → 细引用行不存在、推荐退化为排布表序（无 behindSchedule 理由）', () => {
    mock.plan.units = PLAN_NO_DEADLINE.units;
    mock.plan.deadline = undefined;
    const html = renderPanorama();
    expect(html).not.toContain('days to your goal');      // 细引用不出现
    expect(html).not.toContain('behind schedule');        // 落后日程理由不出现
    expect(html).toContain('Next up');                    // 推荐卡仍在（退化为结构/排布表轨）
    expect(html).toContain('next in schedule');           // 理由措辞 = 排布表近似
  });
});

describe('无目标日零催办·五语扫描（v0.25 票⑥，自动检索面）', () => {
  // 催办模板 key 集：缺口（速率外推）/ deadline 已过 / 细引用差距 / 推荐卡落后日程理由。
  // 无目标日时这些模板一个都不该渲染——五语逐一验证。（home.planBehind 已随 #125 红字
  // 退场删除，改由下方 BEHIND_TEMPLATES 测试常量守护「落后 N 天」永不回潮。）
  const PRESSURE_KEYS = [
    'home.planProjDeficit', 'home.planDeadlineOver',
    'panorama.paceProjDeficit', 'panorama.nextWhyBehind',
  ] as const;
  const DICTS: Record<string, Record<string, string>> = { zh, en, es, ru, ja };

  /** 词典模板 → 匹配正则：{n}/{m} → 数字，{date} → 日期串，其余占位符 → 任意非标签段。 */
  const tmplToRe = (s: string) =>
    new RegExp(
      s
        .split(/(\{\w+\})/)
        .map((part) =>
          part === '{n}' || part === '{m}' ? '\\d+'
          : /^\{\w+\}$/.test(part) ? '[^<>]*'
          : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        )
        .join(''),
    );

  it.each(Object.keys(DICTS))('%s：无目标日（含逾期单元）渲染全景+首页，催办模板零出现', (lang) => {
    mock.plan.units = PLAN_NO_DEADLINE.units;
    mock.plan.deadline = undefined;
    const g = globalThis as { localStorage?: Storage };
    const stub = { getItem: () => lang, setItem: () => {}, removeItem: () => {} };
    g.localStorage = stub as unknown as Storage;
    let pano = '';
    let home = '';
    try {
      pano = visibleText(renderPanorama());
      home = visibleText(renderHome());
    } finally {
      delete g.localStorage; // 还原 node 环境（后续用例回退 en）
    }
    for (const key of PRESSURE_KEYS) {
      const re = tmplToRe(DICTS[lang][key]);
      expect(re.test(pano), `${lang} ${key} 不该出现在全景页`).toBe(false);
      expect(re.test(home), `${lang} ${key} 不该出现在首页`).toBe(false);
    }
  });
});

describe('债务红字退场 + 已重排钩子行（v0.27 #125）', () => {
  it.each(Object.keys(BEHIND_TEMPLATES))(
    '%s：behind（有目标日，U-02 已逾期）渲染全景+首页，日历对照红字零出现（推荐理由不受影响）',
    (lang) => {
      mock.plan.units = PLAN_WITH.units;
      mock.plan.deadline = PLAN_WITH.deadline;
      mock.plan.rescheduled = undefined;
      const g = globalThis as { localStorage?: Storage };
      g.localStorage = { getItem: () => lang, setItem: () => {}, removeItem: () => {} } as unknown as Storage;
      let pano = '';
      let home = '';
      try {
        pano = renderPanorama();
        home = renderHome();
      } finally {
        delete g.localStorage;
      }
      // 红字退场：任何语言的「落后 N 天」日历行都不出现（首页/全景同款）
      expect(BEHIND_RE[lang].test(pano), `${lang} 全景页不该出落后红字`).toBe(false);
      expect(BEHIND_RE[lang].test(home), `${lang} 首页不该出落后红字`).toBe(false);
      // 全景推荐理由（panorama.nextWhyBehind）是导引不是债务陈列，behind 插队照出（en 直查）
      if (lang === 'en') {
        expect(pano).toContain('behind schedule (goal 2026-10-15)');
      }
    },
  );

  it('新鲜审计（今天重排）→ 全景摘要行与首页节奏行出「已重排：下一站 X，日期 Y」钩子宣告（en/zh 抽验）', () => {
    // 重排后形态：U-02 挪到未来日 + 审计一条（at=now，今天 → 新鲜）；U-03/04/05 无日程
    // 只进清单。下一站 = U-02（唯一有日程的剩余单元）。
    mock.plan.units = [
      { id: 'U-03', title: '搁置单元', order: 3, status: 'paused' },
      { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2099-06-01', day: 'D2', status: 'in-progress' },
      { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' },
    ];
    mock.plan.deadline = undefined;
    mock.plan.rescheduled = [
      { at: Date.now(), reason: 'behind', triggerDays: 5, start: '2099-06-01', scheduledEnd: '2099-06-01' },
    ];
    const pano = renderPanorama();
    const home = renderHome();
    expect(pano).toContain('Rescheduled: next up');     // 全景摘要行（en）
    expect(pano).toContain('进阶单元');                  // 下一站单元标题（数据原文）
    expect(pano).toContain('2099-06-01');               // 下一站日期
    expect(home).toContain('Rescheduled: next up');     // 首页节奏行（en）

    const g = globalThis as { localStorage?: Storage };
    g.localStorage = { getItem: () => 'zh', setItem: () => {}, removeItem: () => {} } as unknown as Storage;
    try {
      expect(renderPanorama()).toContain('已重排：下一站');   // zh 全景
      expect(renderHome()).toContain('已重排：下一站');       // zh 首页
    } finally {
      delete g.localStorage;
    }
  });

  it('陈旧审计（> 7 天）→ 钩子宣告行静默（可追溯归 plan.json，呈现归新鲜度）', () => {
    mock.plan.units = [
      { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2099-06-01', status: 'in-progress' },
    ];
    mock.plan.deadline = undefined;
    const stale = new Date(2000, 0, 1, 12).getTime();   // 远古审计：UI 静默但文件保留
    mock.plan.rescheduled = [{ at: stale, reason: 'manual', triggerDays: null, start: '2000-01-01', scheduledEnd: '2000-01-01' }];
    expect(renderPanorama()).not.toContain('Rescheduled: next up');
    expect(renderHome()).not.toContain('Rescheduled: next up');
  });
});
