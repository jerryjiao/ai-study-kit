// Home.planPanel.test.ts — 首页「学习计划」面板 DOM 门控冒烟（#92，spec #89 第 3 条）
// + 首页闯关重构结构冒烟（v0.25 票②，spec #110）。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 面板零 DOM
//     （首页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物本身。
//   - 有 plan → 面板全要素渲染（标题/进度条/完成 X/Y/剩余清单/断档降级文案）。
//   - 票②结构：大类卡直接显示「已答 x/总数」（0 进度下 0/N）；「进度管理」折叠区
//     已删（重置四件迁设置弹层）；圆环为纯装饰（aria-hidden，无 progressbar 语义
//     ——空 plan 用例的 not.contain('progressbar') 因此保持成立）。
//
// 判据数字的逐值断言在 src/lib/plan.test.ts（纯函数，本地正午定「今天」）与
// src/lib/topicOrder.test.ts 的 deriveTopicLevels（闯关三态）；本文件只测 Home 的
// 渲染门控与结构存在性——**不锚随「今天」漂移的数字**。
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
import { questions } from '../data/questions';

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
    expect(html).not.toContain('progressbar');       // 面板进度条不出现（圆环纯装饰也不带）
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

describe('Home 闯关重构结构（v0.25 票②）', () => {
  it('每个大类卡直接显示「已答 0/总数」（dev-intro 实数据：两大类按计划内题数上卡）', () => {
    mock.plan.units = [];
    const html = renderHome();
    // 剥标签 + JSX 注释节点得纯文本（计数 DOM 是 <b>0</b><!-- -->/<!-- -->7 … questions，
    // 中间隔着标签与注释标记，按可见文本断言最稳）
    const text = html.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '');
    // dev-intro 同步数据：git-basics 7 题 / linux-commands 3 题（空进度 → 0/N）
    for (const topic of ['git-basics', 'linux-commands']) {
      const n = questions.filter((q) => q.topic === topic).length;
      expect(n).toBeGreaterThan(0);
      expect(text).toContain(`0/${n} questions`);    // 「已答 x/总数」上卡（Q1 定案）
    }
    expect(text).toContain('0%');                    // 圆环中心完成度（空进度）
    expect(text).toContain('Level up by topic');     // 按主题闯关分区标题
  });

  it('「进度管理」折叠区已删——重置四件迁设置弹层，首页不再渲染该区', () => {
    mock.plan.units = [];
    const html = renderHome();
    expect(html).not.toContain('Progress management');
    expect(html).not.toContain('Reset list positions');   // 原折叠区里的重置按钮文案
    expect(html).not.toContain('Clear all progress');     // 原全清按钮文案
  });
});
