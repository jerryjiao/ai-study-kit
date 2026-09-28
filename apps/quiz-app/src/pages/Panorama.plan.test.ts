// Panorama.plan.test.ts — 全景页计划轻量结合 DOM 门控冒烟（#93，spec #89 第 4 条）。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 计划摘要行与
//     day 卡 chip 零 DOM（全景页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物。
//   - 有 plan → 汇总带计划摘要行（完成 X/Y + 节奏措辞）+ 有 day 映射单元的状态 chip
//     （计划中/在学/完成/搁置）；无 day 映射的单元不进 day 卡（呈现面在首页面板）。
//
// 节奏数字（落后/富余 N 天）随「今天」漂移，只断言措辞不断言 N（逐值在 plan.test.ts
// 本地正午锚定）。day 值取真实 dev-intro theme.json 的 examDays（D1/D2）——unit.day ≡
// examDays.day（ADR-0009 命名空间契约），这里验证两侧真实对上。react-dom/server 渲染
// （仓库无 DOM 测试环境，SSR 串是零依赖的同构口径）；node 下 I18nProvider 探测不到
// 浏览器语言 → 回退 en，断言用英文文案。
//
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

// U-02 该 2026-09-08 完成但未完成 → 任何晚于该日的「今天」都判 behind（措辞稳定可断言）
const PLAN_WITH: PlanFile = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', day: 'D1', status: 'done', doneDate: '2026-09-02' },
    { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2026-09-08', day: 'D2', status: 'in-progress' },
    { id: 'U-03', title: '搁置单元', order: 3, day: 'D2', status: 'paused' },
    { id: 'U-04', title: '排程单元', order: 4, day: 'D1', status: 'planned' },
    { id: 'U-05', title: '无日单元', order: 5, status: 'planned' },
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

describe('Panorama 计划轻量结合 DOM 门控', () => {
  it('空计划（无 plan.json 的 sync 回退 {units:[]}）→ 摘要行与 chip 零 DOM（dev-intro 全景页零变化）', () => {
    mock.plan.units = [];
    const html = renderPanorama();
    expect(html).not.toContain('Plan:');        // 计划摘要行不出现
    expect(html).not.toContain('基础单元');      // day 卡 chip 不出现
    expect(html).not.toContain('days behind');  // 节奏措辞不出现
  });

  it('有 plan → 摘要行（完成 X/Y + 节奏）+ day 卡四态 chip；无 day 单元不进 day 卡', () => {
    mock.plan.units = PLAN_WITH.units;
    const html = renderPanorama();
    expect(html).toContain('Plan: 1/5 done');   // 摘要行：完成 X/Y（1 done / 5 total）
    expect(html).toContain('days behind');      // 节奏：U-02 该 09-08 完成（N 随今天漂移，不断言）
    expect(html).toContain('Done');             // chip 状态：完成（U-01 @D1）
    expect(html).toContain('Paused');           // chip 状态：搁置（U-03 @D2）
    expect(html).toContain('Planned');          // chip 状态：计划中（U-04 @D1）
    // chip 状态：在学（U-02 @D2）——「In progress」与图例 dotInProgress 的 en 文案同词，
    // 用「单元标题紧邻状态」的 SSR 邻接断言锚到 chip 上（图例里没有单元标题）
    expect(html).toContain('进阶单元</span><span class="shrink-0">In progress</span>');
    expect(html).toContain('基础单元');          // chip 单元标题（数据原文，非 i18n）
    expect(html).toContain('搁置单元');
    expect(html).not.toContain('无日单元');      // 无 day 映射的单元不进 day 卡
  });
});
