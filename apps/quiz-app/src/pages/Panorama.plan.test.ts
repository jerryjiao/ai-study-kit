// Panorama.plan.test.ts — 全景页计划轻量结合 DOM 门控冒烟（#93，spec #89 第 4 条；
// v0.25 票⑤更新：全景重做成构成条 + 大类糖果节点路径，计划 day chips 撤出本页
// （spec #110 Q3），计划摘要行保留——断言面随之收窄为「摘要行有/无」+「chip 零 DOM」）。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 计划摘要行零
//     DOM（全景页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物。
//   - 有 plan → 汇总带计划摘要行（完成 X/Y + 节奏措辞）；day 卡状态 chip（单元标题）
//     不再出现（v0.25 票⑤撤出面）。
//
// 节奏数字（落后/富余 N 天）随「今天」漂移，只断言措辞不断言 N（逐值在 plan.test.ts
// 本地正午锚定）。react-dom/server 渲染（仓库无 DOM 测试环境，SSR 串是零依赖的同构
// 口径）；node 下 I18nProvider 探测不到浏览器语言 → 回退 en，断言用英文文案。
// 注：vitest include 只收 *.test.ts（无 tsx），故用 createElement 而非 JSX。
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { PlanFile } from '../types';

// vi.mock 工厂被提升到 import 之前，共享态经 vi.hoisted 拿（vitest 官方口径）
const mock = vi.hoisted(() => ({ plan: { units: [] } as unknown as PlanFile }));
vi.mock('../data/plan', () => ({ plan: mock.plan }));

import { Panorama } from './Panorama';
import { ProgressProvider } from '../hooks/useProgress';
import { I18nProvider } from '../i18n';

// 有计划夹具（v0.25 票⑤起全景不再渲染 day 卡 chip，day 字段不再需要与 examDays 对齐——
// 单元仅用于「chip 撤出」的反向断言与摘要行计数）。U-02 该 2026-09-08 完成但未完成 →
// 任何晚于该日的「今天」都判 behind（措辞稳定可断言）
const PLAN_WITH: PlanFile = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-03', title: '搁置单元', order: 3, status: 'paused' },
    { id: 'U-04', title: '排程单元', order: 4, status: 'planned' },
    { id: 'U-05', title: '无日单元', order: 5, status: 'planned' },
    { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2026-09-08', status: 'in-progress' },
    { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' },
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

describe('Panorama 计划轻量结合 DOM 门控（v0.25 票⑤：摘要行保留、day chips 撤出）', () => {
  it('空计划（无 plan.json 的 sync 回退 {units:[]}）→ 摘要行零 DOM（dev-intro 全景页零变化）', () => {
    mock.plan.units = [];
    const html = renderPanorama();
    expect(html).not.toContain('Plan:');        // 计划摘要行不出现
    expect(html).not.toContain('days behind');  // 节奏措辞不出现
  });

  it('有 plan → 摘要行（完成 X/Y + 节奏）出现；计划单元标题不再进本页（day chips 撤出）', () => {
    mock.plan.units = PLAN_WITH.units;
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
