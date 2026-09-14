// graph-bridge.test.mjs — 投影桥：映射装载 / 图装载 / 投影构建 / schema 稳定性（node:test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGraphMap, loadKnowledgeGraph, buildProjection, projectionPathFor, classifyRelation, buildPrereqSignals, orderEpsByPrereqs, projectEdgesToEps } from './graph-bridge.mjs';

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

// ── 前置关系：分类 / 前置链 / 推荐排序 ──────────────────

test('classifyRelation: 前置类词表命中 prerequisite；其余与缺省 related', () => {
  for (const label of ['前置', '来源', '引用', '依据', '使用', '属于', '衍生', '依赖', '数据来源']) {
    assert.equal(classifyRelation(label), 'prerequisite', label);
  }
  for (const label of ['相关', '对比', '姊妹', '链接', '', undefined, null]) {
    assert.equal(classifyRelation(label), 'related', String(label));
  }
});

const PREREQ_GRAPH = {
  nodes: [
    { id: 'concepts/a.md', label: 'A概念' },
    { id: 'concepts/b.md', label: 'B概念' },
    { id: 'concepts/c.md', label: 'C概念' },   // 未映射的前置节点
    { id: 'concepts/d.md', label: 'D概念' },
  ],
  edges: [
    { from: 'concepts/a.md', to: 'concepts/b.md', relation: '前置' },   // A 依赖 B → B 先学
    { from: 'concepts/b.md', to: 'concepts/c.md', relation: '前置' },   // B 依赖 C（未映射）
    { from: 'concepts/d.md', to: 'concepts/a.md', relation: '相关' },   // 关联边不参与
  ],
};
const PREREQ_MAP = {
  version: 1,
  byNode: new Map([
    ['concepts/a.md', { node: 'concepts/a.md', ep: 'EP-01', label: 'A概念' }],
    ['concepts/b.md', { node: 'concepts/b.md', ep: 'EP-02', label: 'B概念' }],
    ['concepts/d.md', { node: 'concepts/d.md', ep: 'EP-03', label: 'D概念' }],
  ]),
  byLabel: new Map(), byEp: new Map(),
};
const PREREQ_POINTS = [
  { ep: 'EP-01', status: 'weak' },
  { ep: 'EP-02', status: 'mastered' },
  { ep: 'EP-03', status: 'inProgress' },
];

test('prereqSignals: EP 级前置边 + 弱项前置链（未映射前置节点 mastery=null）', () => {
  const s = buildPrereqSignals({ graph: PREREQ_GRAPH, graphMap: PREREQ_MAP, points: PREREQ_POINTS });
  assert.equal(s.prereqEdges, 2);
  assert.equal(s.relatedEdges, 1);
  assert.deepEqual([...s.prereqByEp.get('EP-01')], ['EP-02']);       // EP-01 的前置是 EP-02
  assert.equal(s.prereqByEp.has('EP-03'), false);                     // 关联边不进排序
  const chain1 = s.chainByEp.get('EP-01');
  assert.deepEqual(chain1.map((x) => [x.kind, x.id, x.mastery]), [
    ['ep', 'EP-02', 'mastered'],      // 映射前置带题库四态
  ]);
  const chain2 = s.chainByEp.get('EP-02');
  assert.deepEqual(chain2.map((x) => [x.kind, x.id, x.mastery]), [
    ['node', 'concepts/c.md', null],  // 未映射前置 = 未验证（挂在 B 的 EP 上）
  ]);
  assert.equal(s.chainByEp.has('EP-03'), false);  // 无前置边的考点无链
});

test('prereqSignals: 无图 / 无映射 / 无前置边 → 静默降级', () => {
  assert.equal(buildPrereqSignals({ graph: null, graphMap: PREREQ_MAP, points: [] }), null);
  assert.equal(buildPrereqSignals({ graph: PREREQ_GRAPH, graphMap: null, points: [] }), null);
  const empty = buildPrereqSignals({ graph: { nodes: [], edges: [] }, graphMap: PREREQ_MAP, points: [] });
  assert.deepEqual(empty, { prereqEdges: 0, relatedEdges: 0, prereqByEp: new Map(), chainByEp: new Map() });
});

test('orderEpsByPrereqs: 前置排前（含传递）、非前置保持稳定、环不死循环', () => {
  const map = new Map([
    ['EP-A', new Set(['EP-B'])],
    ['EP-B', new Set(['EP-C'])],
  ]);
  assert.deepEqual(orderEpsByPrereqs(['EP-A', 'EP-B', 'EP-C'], map), ['EP-C', 'EP-B', 'EP-A']);
  assert.deepEqual(orderEpsByPrereqs(['EP-C', 'EP-A'], map), ['EP-C', 'EP-A']);  // 无约束保稳定
  const cycle = new Map([['EP-A', new Set(['EP-B'])], ['EP-B', new Set(['EP-A'])]]);
  assert.deepEqual(orderEpsByPrereqs(['EP-A', 'EP-B'], cycle), ['EP-B', 'EP-A']);
  assert.deepEqual(orderEpsByPrereqs(['EP-A', 'EP-B'], null), ['EP-A', 'EP-B']); // 无图原样
});

// ── EP 边投影（web 全景连线数据面） ──────────────────────────

test('projectEdgesToEps: 两端有映射的边投成 EP 对并去重；前置语义随 relation 分类', () => {
  const graph = {
    nodes: [
      { id: 'concepts/a.md', label: 'A' }, { id: 'concepts/b.md', label: 'B' },
      { id: 'concepts/c.md', label: 'C' }, { id: 'entities/e.md', label: 'E' },
    ],
    edges: [
      { from: 'concepts/a.md', to: 'concepts/b.md', relation: '前置' },
      { from: 'concepts/a.md', to: 'concepts/b.md', relation: '来源' },   // 同 EP 对去重（先到先得）
      { from: 'concepts/c.md', to: 'entities/e.md', relation: '相关' },   // c 无映射 → 丢
      { from: 'concepts/b.md', to: 'concepts/a.md', relation: '关联' },   // 反向 EP 对保留
    ],
  };
  const gm = { byNode: new Map([
    ['concepts/a.md', { node: 'concepts/a.md', ep: 'EP-01', label: 'A' }],
    ['concepts/b.md', { node: 'concepts/b.md', ep: 'EP-02', label: 'B' }],
    ['concepts/c.md', { node: 'concepts/c.md', ep: 'EP-03', label: 'C' }],
  ]), byLabel: new Map(), byEp: new Map() };
  const edges = projectEdgesToEps(graph, gm);
  assert.deepEqual(edges, [
    { from: 'EP-01', to: 'EP-02', prerequisite: true },
    { from: 'EP-02', to: 'EP-01', prerequisite: false },
  ]);
});

test('projectEdgesToEps: 无图 / 无映射 / 零边 / 超阈值 → null（web 回退清单）', () => {
  const gm = { byNode: new Map([['a.md', { node: 'a.md', ep: 'EP-01', label: 'A' }]]), byLabel: new Map(), byEp: new Map() };
  assert.equal(projectEdgesToEps(null, gm), null);
  assert.equal(projectEdgesToEps({ nodes: [], edges: [] }, null), null);
  assert.equal(projectEdgesToEps({ nodes: [], edges: [] }, gm), null);
  const many = { nodes: [], edges: Array.from({ length: 201 }, (_, i) => ({ from: 'x', to: 'y', relation: '相关' })) };
  assert.equal(projectEdgesToEps(many, gm, { maxEdges: 200 }), null);
});
