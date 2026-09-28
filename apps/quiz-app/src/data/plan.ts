import type { PlanFile } from '../types';
import raw from './plan.json';

// 学习计划（构建期由 scripts/sync-examples.mjs 从 examples/<theme>/plan.json 同步而来；
// 主题无计划/文件损坏时为空计划回退 { units: [] }，消费端按无计划面回退）。
// 单一事实来源 = examples/<theme>/plan.json（可选主题数据，不进 progress——完成态由
// status/doneDate 字段承载），本文件是运行期 import 的入口。类型契约见 src/types.ts
// （PlanFile/PlanUnit），分层决策与 day 命名空间契约见 docs/adr/0009。
export const plan = raw as unknown as PlanFile;
