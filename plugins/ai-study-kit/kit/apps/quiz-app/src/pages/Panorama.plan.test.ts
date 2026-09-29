// Panorama.plan.test.ts — 全景页计划轻量结合 DOM 门控冒烟（#93，spec #89 第 4 条；
// #108 夹具 day 改从真实 examDays 派生——粘滞主题换 day 键（W1/W2…）不再假红）。
//
// 验收面：
//   - 空 plan（无 plan.json 的 sync 回退 {units:[]}，dev-intro 形态）→ 计划摘要行与
//     day 卡 chip 零 DOM（全景页对无计划主题零变化）；经 vi.mock 注入，不碰 sync 产物。
//   - 有 plan → 汇总带计划摘要行（完成 X/Y + 节奏措辞）+ 有 day 映射单元的状态 chip
//     （计划中/在学/完成/搁置）；无 day 映射的单元不进 day 卡（呈现面在首页面板）。
//
// 节奏数字（落后/富余 N 天）随「今天」漂移，只断言措辞不断言 N（逐值在 plan.test.ts
// 本地正午锚定）。day 值不写死也不 mock：与被测页面同源 import '../data/theme.json'
// （真实 sync 产物），从其 examDays 的值集合现取——unit.day ≡ examDays.day（ADR-0009
// 命名空间契约），夹具 day 与真实 day 卡分组键对得上 chip 才可能渲染，这里验证两侧
// 真实对上。不同 day 值可能不足 2 个，派生按实际值集合退化：≥2 取前 2 个（保住
// 「跨 day」与组内排序形态）、恰 1 个则两个槽并到同一 day、0 个（无 examDays）退化
// 为无 day 映射（chip 零 DOM，只剩摘要行断言）。react-dom/server 渲染（仓库无 DOM
// 测试环境，SSR 串是零依赖的同构口径）；node 下 I18nProvider 探测不到浏览器语言 →
// 回退 en，断言用英文文案。
//
// 注：vitest include 只收 *.test.ts（无 tsx），故用 createElement 而非 JSX。
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { PlanFile } from '../types';
import themeMeta from '../data/theme.json';

// vi.mock 工厂被提升到 import 之前，共享态经 vi.hoisted 拿（vitest 官方口径）
const mock = vi.hoisted(() => ({ plan: { units: [] } as unknown as PlanFile }));
vi.mock('../data/plan', () => ({ plan: mock.plan }));

import { Panorama } from './Panorama';
import { ProgressProvider } from '../hooks/useProgress';
import { I18nProvider } from '../i18n';

// 真实 examDays 的不同 day 值（去重保 JSON 出现序；脏值容忍只收非空字符串）——夹具
// day 的唯一来源，day 卡分组键同源同值（ADR-0009：unit.day ≡ examDays 的 day）。
const themeData = themeMeta as { examDays?: Record<string, string> };
const EXAM_DAYS = [...new Set(Object.values(themeData.examDays ?? {}))].filter(
  (d): d is string => typeof d === 'string' && d !== '',
);
// 夹具至多用前 2 个不同 day（≥2 才保得住「跨 day」且两组各有 ≥2 单元可断组内排序）；
// 不足自动退化：恰 1 个 → 两个槽并到同一 day（组内排序断言照成立）；0 个 → undefined
// （与无 day 映射同义，planUnitsByDay 跳过）。
const dayAt = (slot: 0 | 1): string | undefined =>
  EXAM_DAYS.length ? EXAM_DAYS[slot % Math.min(EXAM_DAYS.length, 2)] : undefined;

// 输入序故意打乱组内 order（U-04@槽0 在 U-01@槽0 前、U-03@槽1 在 U-02@槽1 前）——
// day 卡 chip 必须按 order 排序输出（planUnitsByDay），乱序输入才验得出排序行为。
// U-02 该 2026-09-08 完成但未完成 → 任何晚于该日的「今天」都判 behind（措辞稳定可断言）
const PLAN_WITH: PlanFile = {
  deadline: '2026-10-15',
  units: [
    { id: 'U-03', title: '搁置单元', order: 3, day: dayAt(1), status: 'paused' },
    { id: 'U-04', title: '排程单元', order: 4, day: dayAt(0), status: 'planned' },
    { id: 'U-05', title: '无日单元', order: 5, status: 'planned' },
    { id: 'U-02', title: '进阶单元', order: 2, plannedDate: '2026-09-08', day: dayAt(1), status: 'in-progress' },
    { id: 'U-01', title: '基础单元', order: 1, plannedDate: '2026-09-01', day: dayAt(0), status: 'done', doneDate: '2026-09-02' },
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

  it('有 plan → 摘要行（完成 X/Y + 节奏）+ day 卡四态 chip（day 与真实 examDays 对上）；无 day 单元不进 day 卡', () => {
    mock.plan.units = PLAN_WITH.units;
    const html = renderPanorama();
    expect(html).toContain('Plan: 1/5 done');   // 摘要行：完成 X/Y（1 done / 5 total）
    expect(html).toContain('days behind');      // 节奏：U-02 该 09-08 完成（N 随今天漂移，不断言）
    const dayA = dayAt(0);
    const dayB = dayAt(1);
    if (!dayA) {
      // 退化：主题无 examDays → 夹具无 day 可映射，chip 零 DOM；摘要行照有（day 与计划信号分家）
      expect(html).not.toContain('基础单元');
      expect(html).not.toContain('进阶单元');
      return;
    }
    // day 分组键：day 卡头就是真实 examDays 的 day（夹具同源取值，两侧真实对上才出 chip）
    expect(html).toContain(`>${dayA}</h2>`);
    if (dayB && dayB !== dayA) expect(html).toContain(`>${dayB}</h2>`);
    expect(html).toContain('Done');             // chip 状态：完成（U-01 @dayA）
    expect(html).toContain('Paused');           // chip 状态：搁置（U-03 @dayB）
    expect(html).toContain('Planned');          // chip 状态：计划中（U-04 @dayA）
    // chip 状态：在学（U-02 @dayB）——「In progress」与图例 dotInProgress 的 en 文案同词，
    // 用「单元标题紧邻状态」的 SSR 邻接断言锚到 chip 上（图例里没有单元标题）
    expect(html).toContain('进阶单元</span><span class="shrink-0">In progress</span>');
    expect(html).toContain('基础单元');          // chip 单元标题（数据原文，非 i18n）
    expect(html).toContain('搁置单元');
    // 组内排序：输入序乱（U-04 在 U-01 前、U-03 在 U-02 前），day 卡 chip 按 order 输出
    expect(html.indexOf('基础单元')).toBeLessThan(html.indexOf('排程单元')); // dayA 组：U-01(1) < U-04(4)
    expect(html.indexOf('进阶单元')).toBeLessThan(html.indexOf('搁置单元')); // dayB 组：U-02(2) < U-03(3)
    expect(html).not.toContain('无日单元');      // 无 day 映射的单元不进 day 卡
  });
});
