// Home.planPanel.test.ts — 首页「学习计划」面板 DOM 门控冒烟（#92，spec #89 第 3 条）。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 面板零 DOM
//     （首页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物本身。
//   - 有 plan → 面板全要素渲染（标题/进度条/完成 X/Y/剩余清单/断档降级文案）。
//
// 判据数字的逐值断言在 src/lib/plan.test.ts（纯函数，本地正午定「今天」）；本文件只测
// Home 的渲染门控与结构存在性——**不锚随「今天」漂移的数字**（落后/富余/外推随日期变）。
// 用 react-dom/server 渲染（仓库无 DOM 测试环境，SSR 串是零依赖的同构口径）；
// node 环境下 I18nProvider 探测不到浏览器语言 → 回退 en，断言用英文文案。
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

import { Home } from './Home';
import { ProgressProvider } from '../hooks/useProgress';
import { I18nProvider } from '../i18n';

const PLAN_WITH: PlanFile = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-01', title: '基础概念', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' },
    { id: 'U-02', title: '进阶操作', order: 2, plannedDate: '2026-09-08', status: 'in-progress' },
    { id: 'U-03', title: '综合应用', order: 3, status: 'planned' },
    { id: 'U-04', title: '查漏补缺', order: 4, status: 'paused' },
  ],
};

const renderHome = () =>
  renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(ProgressProvider, null, createElement(I18nProvider, null, createElement(Home))),
    ),
  );

describe('Home 计划面板 DOM 门控', () => {
  it('空计划（无 plan.json 的 sync 回退 {units:[]}）→ 面板零 DOM（dev-intro 首页零变化）', () => {
    mock.plan.units = [];
    const html = renderHome();
    expect(html).not.toContain('Study plan');        // 面板标题不出现
    expect(html).not.toContain('progressbar');       // 面板进度条不出现
  });

  it('有 plan → 面板全要素渲染：标题/进度条/完成 X/Y/剩余清单（含在学/搁置 chip）/断档', () => {
    mock.plan.units = PLAN_WITH.units;
    const html = renderHome();
    expect(html).toContain('Study plan');            // 标题
    expect(html).toContain('progressbar');           // 进度条（role）
    expect(html).toContain('1/4 done');              // 完成 X/Y（1 done / 4 total）
    expect(html).toContain('3 units left');          // 剩余清单计数（U-02/03/04）
    expect(html).toContain('进阶操作');               // 剩余单元标题（数据原文，非 i18n）
    expect(html).toContain('In progress');           // 在学 chip（U-02）
    expect(html).toContain('Paused');                // 搁置 chip（U-04）
    expect(html).toContain('No study contact yet');  // 断档降级文案（空进度 → no-contact）
    // 落后/富余/外推数字随「今天」漂移，这里不断言（逐值在 plan.test.ts 本地正午锚定）
  });
});
