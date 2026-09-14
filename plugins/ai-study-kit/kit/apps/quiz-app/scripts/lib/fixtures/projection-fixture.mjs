// projection-fixture.mjs — 投影契约样例的输入面（graph-bridge.test.mjs 用它重建入库 fixture，
// 防契约漂移；knowflow 仓消费的是 mastery-projection.fixture.json 这份**输出**样例）。
//
// 场景：dev-intro 同构的三考点主题接一个三概念 knowflow 图——
//   concepts/staging.md ↔ EP-01 暂存区（题库 mastered）
//   concepts/revert.md  ↔ EP-02 revert（题库 weak）
//   concepts/branch.md  ↔ EP-03 分支（题 untouched）
//   concepts/作用域.md   未映射（纯口头通道：3 问全对 → mastered）
//   entities/git.md     未映射且无流水（untouched 中性样例）
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** knowflow 图样例（graph.json，两节点带映射、两节点未映射 + 一条前置边）。 */
export const graphFixture = { path: join(HERE, 'projection', 'wiki', 'graph', 'graph.json') };

/** 映射样例（study/records/graph-map.json 所在主题目录）+ 排布表考点名。 */
export const graphMapFixture = {
  dir: join(HERE, 'projection', 'theme'),
  epNames: { 'EP-01': '暂存区', 'EP-02': 'revert', 'EP-03': '分支' },
};

/** 题库四态（masteryByExamPoint 输出的相关字段，v1.1 判据的代表性切片）。 */
export const pointsFixture = [
  { ep: 'EP-01', status: 'mastered' },
  { ep: 'EP-02', status: 'weak' },
  { ep: 'EP-03', status: 'untouched' },
];

/** 口头答题流水样例（单一事实源 = 主题目录里的 oral-attempts.json，CLI dogfood 与纯函数测试同份）：
 *  EP 前缀 / 裸名 / 图节点路径 / 未解析裸名 四种目标引用各一。 */
export const oralFixture = JSON.parse(
  readFileSync(join(graphMapFixture.dir, 'study', 'records', 'oral-attempts.json'), 'utf-8')
);
