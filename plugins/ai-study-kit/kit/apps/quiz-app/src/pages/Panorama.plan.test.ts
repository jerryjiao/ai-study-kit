// Panorama.plan.test.ts — 全景页计划轻量结合 DOM 门控冒烟（#93，spec #89 第 4 条；
// v0.25 票⑤更新：全景重做成构成条 + 大类糖果节点路径，计划 day chips 撤出本页
// （spec #110 Q3），计划摘要行保留——断言面随之收窄为「摘要行有/无」+「chip 零 DOM」。
// v0.25 票⑥新增：下一站推荐卡 + 赶考细引用 + 无 deadline 零催办门控的页面级验收。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 计划摘要行零
//     DOM（全景页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物。
//   - 有 plan → 汇总带计划摘要行（完成 X/Y + 节奏措辞）；day 卡状态 chip（单元标题）
//     不再出现（v0.25 票⑤撤出面）。
//   - 票⑥·有目标日 → 下一站推荐卡可插队（落后日程理由带目标日）+ 赶考细引用行出现
//     且 href="/"（跳首页计划面板，spec 功能轮 B：完整面板仍只在首页）。
//   - 票⑥·无目标日 → 零催办：五语渲染全景+首页，词典自身的催办模板（落后/缺口/已过/
//     落后日程理由）一个都不出现（自动检索；人工复核见票 #116 验收记录）。
//
// 节奏数字（落后/富余 N 天）随「今天」漂移，只断言措辞不断言 N（逐值在 plan.test.ts
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

  it('有 plan → 摘要行（完成 X/Y + 节奏）出现；计划单元标题不再进本页（day chips 撤出）', () => {
    mock.plan.units = PLAN_WITH.units;
    mock.plan.deadline = PLAN_WITH.deadline;
    const html = renderPanorama();
    expect(html).toContain('Plan: 1/5 done');   // 摘要行：完成 X/Y（1 done / 5 total）
    expect(html).toContain('days behind');      // 节奏：U-02 该 09-08 完成（N 随今天漂移，不断言）
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
  // 催办模板 key 集：落后（日历对照）/ 缺口（速率外推）/ deadline 已过 / 细引用差距 /
  // 推荐卡落后日程理由。无目标日时这些模板一个都不该渲染——五语逐一验证。
  const PRESSURE_KEYS = [
    'home.planBehind', 'home.planProjDeficit', 'home.planDeadlineOver',
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
