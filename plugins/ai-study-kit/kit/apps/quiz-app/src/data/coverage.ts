import type { CoverageSnapshot } from '../lib/panorama';
import raw from './coverage.json';

// 考点覆盖快照（构建期由 scripts/sync-examples.mjs 从 study/records + 进度派生，内容无关：
// 只含考点 id / 三信号布尔 / 计数，无任何个人叙述）。单一事实来源 = 学习者的 study/records
// 与 progress，本文件是运行期 import 的入口。新鲜度 = 上次 build；聊天层永远现算最新。
export const coverage = raw as unknown as CoverageSnapshot;
