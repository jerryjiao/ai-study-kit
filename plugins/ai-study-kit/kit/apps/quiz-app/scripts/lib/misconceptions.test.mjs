// misconceptions.test.mjs — 口述错因台账：解析 / 构建 / 追加 / 状态派生 / 消费视图 / 装载（node:test）。
// #132 数据面夹具①（spec #131 / #128 决议）：append-only 纪律、observed/diagnosis 分立、
// 裸名永不强归 EP、坏文件宽容降级、写端拒覆盖坏文件、重复不制造新成绩、状态纯派生不改写。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseMisconceptions, buildMisconceptionEntry, appendMisconceptions,
  deriveMisconceptionStatuses, misconceptionView, readMisconceptions, misconceptionsPath,
} from './misconceptions.mjs';

const EPNAMES = { 'EP-01': '暂存区', 'EP-03': 'chmod' };
const NOW = 1_790_000_000_000; // 隔离夹具注入时间（真实写入口径必传 Date.now()，红线同口述流水）

// ── parseMisconceptions：宽容解析 ──────────────────────────

const fullEntry = {
  theme: 'dev-intro', target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep',
  observed: { text: '把 4 说成读权限', at: NOW - 1000, source: 'recall' },
  diagnosis: { text: '权限位对应记反', at: NOW - 1000 },
  questionId: 'GIT-005', status: 'open',
};

test('parse: 完整条目逐字段解析；最小条目（无 diagnosis/questionId/归属字段）照收', () => {
  const { entries, skipped } = parseMisconceptions(JSON.stringify([
    fullEntry,
    { theme: 'dev-intro', target: '补零权限位', observed: { text: '077 说成 77', at: NOW - 500, source: 'recite' } },
  ]));
  assert.equal(skipped, 0);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].observed, { text: '把 4 说成读权限', at: NOW - 1000, source: 'recall' });
  assert.deepEqual(entries[0].diagnosis, { text: '权限位对应记反', at: NOW - 1000 });
  // 无归属字段的残条：ep/node/name 落空、via 归 null、status 缺省 open——消费端按名字兜底
  assert.deepEqual(
    { ep: entries[1].ep, node: entries[1].node, name: entries[1].name, via: entries[1].via, status: entries[1].status },
    { ep: null, node: null, name: null, via: null, status: 'open' },
  );
});

test('parse: 坏 JSON / 非数组 → 空台账 + broken（读端当空、写端拒覆盖）', () => {
  for (const bad of ['{oops', '{"a":1}', 'null']) {
    const r = parseMisconceptions(bad);
    assert.deepEqual({ entries: r.entries, skipped: r.skipped }, { entries: [], skipped: 0 });
    assert.equal(r.broken, true);
  }
  assert.equal(parseMisconceptions('').broken, false);
  assert.deepEqual(parseMisconceptions(''), { entries: [], skipped: 0, broken: false });
});

test('parse: 残条跳过计数——缺 target / observed 不全 / source 非法 / diagnosis 半缺 / status 非法', () => {
  const { entries, skipped } = parseMisconceptions(JSON.stringify([
    { observed: { text: 'x', at: 1, source: 'recall' } },                          // 缺 target
    { target: 'EP-03', observed: { at: 1, source: 'recall' } },                     // observed 缺 text
    { target: 'EP-03', observed: { text: 'x', source: 'recall' } },                 // observed 缺 at
    { target: 'EP-03', observed: { text: 'x', at: 1, source: 'quiz' } },            // source 不在三枚举
    { target: 'EP-03', observed: { text: 'x', at: 1, source: 'case' }, diagnosis: { text: 'y' } }, // diagnosis 缺 at
    { target: 'EP-03', observed: { text: 'x', at: 1, source: 'case' }, status: 'closed' },         // status 非法
    { target: 'EP-03', observed: { text: 'x', at: 1, source: 'case' }, questionId: 5 },            // questionId 非串
    null,                                                                            // 非对象
    { target: 'EP-03', observed: { text: 'ok', at: 2, source: 'recite' } },         // 合法
  ]));
  assert.equal(skipped, 8);
  assert.equal(entries.length, 1);
});

// ── buildMisconceptionEntry：写入口径的唯一正门 ──────────────

test('build: EP 前缀解析落盘（via=ep）；裸名命中排布表 → via=name 且带 ep；图节点直引 → via=node', () => {
  const graphNodes = { byId: new Map([['concepts/作用域.md', { id: 'concepts/作用域.md', label: '作用域' }]]), byLabel: new Map() };
  const ep = buildMisconceptionEntry({ theme: 't', target: 'EP-03 chmod', observedText: 'a', observedAt: NOW, observedSource: 'recall', resolve: { epNames: EPNAMES }, now: NOW });
  assert.deepEqual({ ep: ep.ep, via: ep.via }, { ep: 'EP-03', via: 'ep' });
  const name = buildMisconceptionEntry({ theme: 't', target: '暂存区', observedText: 'a', observedAt: NOW, observedSource: 'recall', resolve: { epNames: EPNAMES }, now: NOW });
  assert.deepEqual({ ep: name.ep, via: name.via }, { ep: 'EP-01', via: 'name' });
  const node = buildMisconceptionEntry({ theme: 't', target: 'concepts/作用域.md', observedText: 'a', observedAt: NOW, observedSource: 'recall', resolve: { graphNodes }, now: NOW });
  assert.deepEqual({ ep: node.ep, node: node.node, via: node.via }, { ep: null, node: 'concepts/作用域.md', via: 'node' });
});

test('build: 裸名解析不到 → via=null 永不强归 EP（消费端标「未定位」，不猜归属）', () => {
  const bare = buildMisconceptionEntry({ theme: 't', target: '补零权限位', observedText: '077 说成 77', observedAt: NOW, observedSource: 'recite', resolve: { epNames: EPNAMES }, now: NOW });
  assert.deepEqual({ ep: bare.ep, node: bare.node, via: bare.via, name: bare.name }, { ep: null, node: null, via: null, name: '补零权限位' });
});

test('build: 拒写守卫——未来时间戳 / diagnosis 半缺 / source 出枚举 / 空事实', () => {
  const base = { theme: 't', target: 'EP-03', observedText: 'a', observedAt: NOW, observedSource: 'recall', now: NOW };
  assert.throws(() => buildMisconceptionEntry({ ...base, observedAt: NOW + 1 }), /未来时间戳/);
  assert.throws(() => buildMisconceptionEntry({ ...base, diagnosisText: 'r', now: NOW }), /缺一即缺/);
  assert.throws(() => buildMisconceptionEntry({ ...base, observedSource: 'quiz' }), /recall/);
  assert.throws(() => buildMisconceptionEntry({ ...base, observedText: '  ' }), /observed.text/);
  assert.throws(() => buildMisconceptionEntry({ ...base, diagnosisText: 'r', diagnosisAt: NOW + 1 }), /未来时间戳/);
});

// ── appendMisconceptions：append-only 读-改-写 ──────────────

test('append: 空文件新建数组；已有合法文件追加在尾；完全同一笔观察去重不追加', () => {
  const e1 = buildMisconceptionEntry({ theme: 't', target: 'EP-03', observedText: 'a', observedAt: NOW, observedSource: 'recall', now: NOW });
  const first = appendMisconceptions(null, e1);
  assert.equal(first.appended, true);
  assert.equal(first.total, 1);
  const e2 = buildMisconceptionEntry({ theme: 't', target: 'EP-03', observedText: 'b', observedAt: NOW + 1000, observedSource: 'recall', now: NOW + 1000 });
  const second = appendMisconceptions(first.text, e2);
  assert.equal(second.appended, true);
  assert.equal(second.total, 2);
  assert.deepEqual(JSON.parse(second.text).map((x) => x.observed.text), ['a', 'b']); // 追加在尾、不改旧条
  const dup = appendMisconceptions(second.text, JSON.parse(second.text)[1]);          // 同一笔观察重放
  assert.deepEqual({ appended: dup.appended, deduped: dup.deduped, total: dup.total }, { appended: false, deduped: true, total: 2 });
  assert.equal(dup.text, second.text); // 内容零变化——重复不凭记录次数制造新成绩
});

test('append: 坏文件拒写（不静默重置学习者数据）；残条宽容保留', () => {
  const e = buildMisconceptionEntry({ theme: 't', target: 'EP-03', observedText: 'a', observedAt: NOW, observedSource: 'recall', now: NOW });
  assert.throws(() => appendMisconceptions('{oops', e), /拒绝写回覆盖/);
  const withResidual = JSON.stringify([{ target: 'EP-03' }, fullEntry]); // 首条残缺会被 parse 跳过
  const r = appendMisconceptions(withResidual, e);
  assert.equal(r.appended, true);
  assert.equal(JSON.parse(r.text).length, 2); // 残条宽容保留（历史不丢），新条照加
});

// ── deriveMisconceptionStatuses：状态纯派生（不改写输入） ────

/** 手构台账条目（带落盘归属的规范形态；写入口径的正门是 buildMisconceptionEntry，上面已单测）。 */
const entry = (over = {}) => {
  const { target = 'EP-03 chmod', observedText = 'a', observedAt = NOW, cause = null, ep = 'EP-03', node = null, name = 'chmod', via = 'ep' } = over;
  return {
    theme: 't', target, ep, node, name, via,
    observed: { text: observedText, at: observedAt, source: 'recall' },
    diagnosis: cause != null ? { text: cause, at: observedAt } : null,
    questionId: null, status: 'open',
  };
};
const att = (target, correct, at) => ({ target, correct, at, source: 'recall' });

test('derive: open——无后续口述，或最近一次后续口述仍答错', () => {
  const e = entry();
  assert.equal(deriveMisconceptionStatuses([e], [], { epNames: EPNAMES })[0].status, 'open');
  const still = deriveMisconceptionStatuses([e], [att('EP-03 chmod', false, NOW + 5)], { epNames: EPNAMES });
  assert.equal(still[0].status, 'open');
});

test('derive: corrected——同身份后续口述最近一次答对（裸名口述命中同 EP 也同键）', () => {
  const e = entry();
  const fixed = deriveMisconceptionStatuses([e], [
    att('EP-03 chmod', true, NOW + 5),
    att('EP-03 chmod', false, NOW + 9),
    att('EP-03 chmod', true, NOW + 20), // 最近一次答对
  ], { epNames: EPNAMES });
  assert.equal(fixed[0].status, 'corrected');
  const viaBareName = deriveMisconceptionStatuses([e], [att('chmod', true, NOW + 5)], { epNames: EPNAMES }); // 裸名命中排布表 → 同 EP
  assert.equal(viaBareName[0].status, 'corrected');
  const earlierOnly = deriveMisconceptionStatuses([e], [att('EP-03 chmod', true, NOW - 5)], { epNames: EPNAMES }); // 答对在观察之前不算
  assert.equal(earlierOnly[0].status, 'open');
});

test('derive: recurred——同身份同根因更晚条目接续（diagnosis 一字不差沿用 = 可判定接续）', () => {
  const e1 = entry({ observedAt: NOW, cause: '权限位对应记反' });
  const e2 = entry({ observedText: '又把 2 说成写', observedAt: NOW + 5000, cause: '权限位对应记反' }); // 同根因复发（协议：diagnosis 沿用原文）
  const e3 = entry({ observedText: '另一回事', observedAt: NOW + 6000, cause: '完全另一个根因' });      // 不同根因 = 独立条目
  const d = deriveMisconceptionStatuses([e1, e2, e3], [], { epNames: EPNAMES });
  assert.deepEqual(d.map((x) => x.status), ['recurred', 'open', 'open']); // e1 被接续；e2/e3 各自独立 open
  assert.equal(e1.status, 'open'); // 不改写输入——旧条目原样，派生态只在返回值里
});

test('derive: 未定位条目按名字聚合——同裸名后续答对判 corrected，不与 EP 串用', () => {
  const bare = entry({ target: '补零权限位', ep: null, name: '补零权限位', via: null });
  const d = deriveMisconceptionStatuses([bare], [att('补零权限位', true, NOW + 5)], { epNames: EPNAMES });
  assert.equal(d[0].status, 'corrected');
  const epAnswerOnly = deriveMisconceptionStatuses([bare], [att('EP-03 chmod', true, NOW + 5)], { epNames: EPNAMES });
  assert.equal(epAnswerOnly[0].status, 'open'); // 别的 EP 答对不代清裸名条目
});

// ── misconceptionView：去重 + 三桶 + 计数 ────────────────────

test('view: EP / 图节点 / 未定位三桶；手编重复条目去重不虚增', () => {
  const ep1 = entry({ observedAt: NOW, cause: 'r1' });
  const node1 = entry({ target: 'concepts/作用域.md', ep: null, node: 'concepts/作用域.md', name: '作用域', via: 'node' });
  const bare1 = entry({ target: '补零权限位', ep: null, name: '补零权限位', via: null, observedText: '077' });
  const handDup = JSON.parse(JSON.stringify(ep1)); // 手编重复（append 已挡，视图再兜一道）
  const v = misconceptionView(deriveMisconceptionStatuses([ep1, node1, bare1, handDup], [], { epNames: EPNAMES }));
  assert.equal(v.total, 3);
  assert.deepEqual(Object.keys(v.byEp), ['EP-03']);
  assert.deepEqual(Object.keys(v.byNode), ['concepts/作用域.md']);
  assert.equal(v.unlocated.length, 1);
  assert.deepEqual(v.unlocated[0].observed.text, '077');
  assert.deepEqual({ open: v.open, corrected: v.corrected, recurred: v.recurred }, { open: 3, corrected: 0, recurred: 0 });
});

// ── readMisconceptions：装载 + 读端主题隔离 ──────────────────

test('read: 文件缺失/坏 JSON → 空台账；条目 theme 过滤——他主题同号 EP 不串用、缺 theme 宽容收', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ask-mis-'));
  try {
    assert.deepEqual(readMisconceptions(dir, 'my-theme'), []);
    mkdirSync(join(dir, 'study', 'records'), { recursive: true });
    const p = misconceptionsPath(dir);
    writeFileSync(p, JSON.stringify([
      { theme: 'my-theme', target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep', observed: { text: '本主题条目', at: NOW, source: 'recall' }, diagnosis: null, questionId: null, status: 'open' },
      { theme: 'other-theme', target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep', observed: { text: '他主题条目（同号 EP-03，不得串入）', at: NOW + 1, source: 'recall' }, diagnosis: null, questionId: null, status: 'open' },
      { target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep', observed: { text: '缺 theme 宽容收', at: NOW + 2, source: 'recall' }, diagnosis: null, questionId: null, status: 'open' },
    ]));
    const got = readMisconceptions(dir, 'my-theme');
    assert.deepEqual(got.map((e) => e.observed.text), ['本主题条目', '缺 theme 宽容收']);
    writeFileSync(p, '{oops');
    assert.deepEqual(readMisconceptions(dir, 'my-theme'), []); // 坏文件 = 空台账静默
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
