// graph-bridge.test.mjs — 投影桥：映射装载 / 图装载 / 投影构建 / schema 稳定性（node:test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGraphMap, loadKnowledgeGraph, buildProjection, projectionPathFor } from './graph-bridge.mjs';

// ── loadGraphMap ───────────────────────────────────────────

test('graphMap: 合法映射装出三向索引；坏条目跳过', () => {
  const root = mkdtempSync(join(tmpdir(), 'gmap-'));
  const recDir = join(root, 'study', 'records');
  mkdirSync(recDir, { recursive: true });
  writeFileSync(join(recDir, 'graph-map.json'), JSON.stringify({
    version: 1, updatedAt: '2026-09-14',
    mappings: [
      { node: 'concepts/staging.md', ep: 'EP-01', label: '暂存区' },
      { node: 'concepts/HEAD.md', ep: 'EP-02' },                        // 无 label
      { node: '', ep: 'EP-03' },                                        // 坏：空 node
      { node: 'concepts/x.md', ep: 'EPIX' },                            // 坏：EP 格式
      null,                                                             // 坏：非对象
    ],
  }));
  const gm = loadGraphMap(root);
  assert.equal(gm.version, 1);
  assert.equal(gm.byNode.size, 2);
  assert.equal(gm.byNode.get('concepts/staging.md').ep, 'EP-01');
  assert.equal(gm.byLabel.get('暂存区').node, 'concepts/staging.md');
  assert.deepEqual([...gm.byEp.get('EP-02').map((m) => m.node)], ['concepts/HEAD.md']);
  rmSync(root, { recursive: true, force: true });
});

test('graphMap: 文件不存在 / 坏 JSON / 缺 mappings → null（静默降级）', () => {
  const root = mkdtempSync(join(tmpdir(), 'gmap0-'));
  assert.equal(loadGraphMap(root), null);
  writeFileSync(join(root, 'graph-map.json'), '{oops');
  assert.equal(loadGraphMap(root), null);
  rmSync(root, { recursive: true, force: true });
});

// ── loadKnowledgeGraph ─────────────────────────────────────

const GRAPH = {
  nodes: [
    { id: 'concepts/staging.md', label: '暂存区', category: 'concepts' },
    { id: 'concepts/commit.md', label: '提交', category: 'concepts' },
    { id: 'entities/git.md', label: 'git', category: 'entities' },
  ],
  edges: [
    { id: 0, from: 'concepts/staging.md', to: 'concepts/commit.md', relation: '前置' },
    { id: 1, from: 'concepts/commit.md', to: 'entities/ghost.md' },  // 幽灵节点 → 过滤
  ],
  stats: { total_nodes: 3 },
};

test('knowledgeGraph: 装节点与边；幽灵边过滤；relation 原样透传；多余字段剥掉', () => {
  const p = join(tmpdir(), `graph-${Date.now()}.json`);
  writeFileSync(p, JSON.stringify(GRAPH));
  const g = loadKnowledgeGraph(p);
  assert.deepEqual(g.nodes, [
    { id: 'concepts/staging.md', label: '暂存区' },
    { id: 'concepts/commit.md', label: '提交' },
    { id: 'entities/git.md', label: 'git' },
  ]);
  assert.deepEqual(g.edges, [{ from: 'concepts/staging.md', to: 'concepts/commit.md', relation: '前置' }]);
  rmSync(p, { force: true });
});

test('knowledgeGraph: 路径空 / 文件不存在 / 坏 JSON / nodes 缺失 → null', () => {
  assert.equal(loadKnowledgeGraph(null), null);
  assert.equal(loadKnowledgeGraph('/nonexistent/graph.json'), null);
  const p = join(tmpdir(), `bad-${Date.now()}.json`);
  writeFileSync(p, '{oops');
  assert.equal(loadKnowledgeGraph(p), null);
  writeFileSync(p, '{"edges":[]}');
  assert.equal(loadKnowledgeGraph(p), null);
  rmSync(p, { force: true });
});

// ── buildProjection ────────────────────────────────────────

const POINTS = [
  { ep: 'EP-01', status: 'mastered' },   // 题库已掌握
  { ep: 'EP-02', status: 'weak' },       // 题库弱
  { ep: 'EP-03', status: 'untouched' },  // 题没刷过
];
const GMAP = {
  version: 1,
  byNode: new Map([
    ['concepts/staging.md', { node: 'concepts/staging.md', ep: 'EP-01', label: '暂存区' }],
    ['concepts/revert.md', { node: 'concepts/revert.md', ep: 'EP-02', label: 'revert' }],
    ['concepts/branch.md', { node: 'concepts/branch.md', ep: 'EP-03', label: '分支' }],
  ]),
  byLabel: new Map(), byEp: new Map(),
};
const NOW = '2026-09-14T00:00:00.000Z';
const att = (target, correct, at) => ({ target, correct, at, source: 'recall' });

test('projection: 未映射节点走纯口头通道（mastered 可达）；schema 稳定', () => {
  const graph = { nodes: [{ id: 'concepts/作用域.md', label: '作用域' }], edges: [] };
  const pr = buildProjection({
    graph, graphMap: null, points: [], epNames: {},
    oralAttempts: [att('作用域', true, 1), att('作用域', true, 2), att('作用域', true, 3)],
    generatedAt: NOW, source: 'ai-study-kit mastery v0.14',
  });
  assert.deepEqual(Object.keys(pr), ['version', 'generatedAt', 'source', 'nodes']);
  assert.equal(pr.version, 1);
  assert.deepEqual(pr.nodes, [
    { id: 'concepts/作用域.md', mastery: 'mastered', oral: { asked: 3, correct: 3 } },
  ]);
});

test('projection: 映射节点合流——口头负面拖垮题库掌握；口头正向不越权；题没刷过口头封顶进行中', () => {
  const graph = { nodes: [
    { id: 'concepts/staging.md', label: '暂存区' },   // EP-01 题库 mastered
    { id: 'concepts/revert.md', label: 'revert' },     // EP-02 题库 weak
    { id: 'concepts/branch.md', label: '分支' },       // EP-03 untouched
  ], edges: [] };
  const pr = buildProjection({
    graph, graphMap: GMAP, points: POINTS, epNames: {},
    oralAttempts: [
      att('EP-01 暂存区', false, 10),                  // 口头最近判错 → 负面证据优先
      att('revert', true, 20), att('revert', true, 21), // 题库 weak，口头全对不越权 → 仍 weak
      att('分支', true, 30), att('分支', true, 31), att('分支', true, 32), // 题 untouched + 口头 mastered → inProgress
    ],
    generatedAt: NOW, source: 's',
  });
  const byId = new Map(pr.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get('concepts/staging.md').mastery, 'weak');
  assert.equal(byId.get('concepts/revert.md').mastery, 'weak');
  assert.equal(byId.get('concepts/branch.md').mastery, 'inProgress');
  assert.deepEqual(byId.get('concepts/branch.md').oral, { asked: 3, correct: 3 });
});

test('projection: EP 命中的流水会计入映射到该 EP 的节点；未解析裸名不进投影', () => {
  const graph = { nodes: [
    { id: 'concepts/staging.md', label: '暂存区' },
    { id: 'concepts/无主流水.md', label: '无主流水' },
  ], edges: [] };
  const pr = buildProjection({
    graph, graphMap: GMAP, points: POINTS, epNames: { 'EP-01': '暂存区' },
    oralAttempts: [att('EP-01 暂存区', true, 1), att('没听过的概念', true, 2)],
    generatedAt: NOW, source: 's',
  });
  const byId = new Map(pr.nodes.map((n) => [n.id, n]));
  assert.deepEqual(byId.get('concepts/staging.md').oral, { asked: 1, correct: 1 });
  assert.deepEqual(byId.get('concepts/无主流水.md').oral, { asked: 0, correct: 0 });
  assert.equal(byId.get('concepts/无主流水.md').mastery, 'untouched');
  assert.equal(pr.nodes.length, 2); // 投影节点集合 = 图节点集合
});

test('projection: 空图 → 空 nodes，不抛错；可重复生成（同输入同输出）', () => {
  const args = { graph: { nodes: [], edges: [] }, graphMap: GMAP, points: POINTS, oralAttempts: [], epNames: {}, generatedAt: NOW, source: 's' };
  const a = buildProjection(args);
  const b = buildProjection(args);
  assert.deepEqual(a, b);
  assert.deepEqual(a.nodes, []);
});

// ── projectionPathFor ──────────────────────────────────────

test('projection: 默认落点 = graph.json 同目录 mastery-projection.json', () => {
  assert.equal(projectionPathFor('/wiki/graph/graph.json'), '/wiki/graph/mastery-projection.json');
});

// ── fixture 一致性（跨仓契约基物）：入库 fixture 必须能被本实现原样重建 ──

test('fixture: lib/fixtures/mastery-projection.fixture.json 与判据一致（防漂移）', async () => {
  const { graphFixture, graphMapFixture, pointsFixture, oralFixture } = await import('./fixtures/projection-fixture.mjs');
  const gm = loadGraphMap(graphMapFixture.dir);
  const graph = loadKnowledgeGraph(graphFixture.path);
  const pr = buildProjection({
    graph, graphMap: gm, points: pointsFixture, oralAttempts: oralFixture,
    epNames: graphMapFixture.epNames,
    generatedAt: '2026-09-14T00:00:00.000Z', source: 'ai-study-kit mastery v0.14',
  });
  const committed = JSON.parse(readFileSync(new URL('./fixtures/mastery-projection.fixture.json', import.meta.url), 'utf-8'));
  assert.deepEqual(pr, committed);
});
