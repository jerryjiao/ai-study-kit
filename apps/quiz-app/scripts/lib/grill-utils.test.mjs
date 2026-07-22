/**
 * grill-utils.test.mjs — grill 工具函数测试。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHTML, extractWrongAnswers, joinWrongQuestions, clusterFileName,
  wrapClusterHTML, wrapIndexHTML,
} from './grill-utils.mjs';

// ── escapeHTML ────────────────────────────────────────────

test('escapeHTML: 转义特殊字符', () => {
  assert.equal(escapeHTML('<a>&"\''), '&lt;a&gt;&amp;&quot;&#39;');
});

// ── extractWrongAnswers ──────────────────────────────────

test('extractWrongAnswers: streak=0 是错题', () => {
  const progress = { answers: { 'Q1': { streak: 0, submittedAt: 1 } } };
  const r = extractWrongAnswers(progress);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'Q1');
});

test('extractWrongAnswers: streak 达阈值不算错题', () => {
  const progress = {
    answers: {
      'Q1': { streak: 1, wrongCount: 1, submittedAt: 1 },  // threshold=1, streak=1 不算错题
      'Q2': { streak: 0, wrongCount: 1, submittedAt: 1 },  // 错题
      'Q3': { streak: 2, wrongCount: 2, submittedAt: 1 },  // threshold=2, 不算错题
      'Q4': { streak: 1, wrongCount: 2, submittedAt: 1 },  // threshold=2, streak=1 算错题
    },
  };
  const r = extractWrongAnswers(progress);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.id).sort(), ['Q2', 'Q4']);
});

test('extractWrongAnswers: wrongCount=3 时 threshold=3', () => {
  const progress = {
    answers: {
      'Q1': { streak: 2, wrongCount: 3, submittedAt: 1 },  // threshold=3, streak=2 算错题
      'Q2': { streak: 3, wrongCount: 3, submittedAt: 1 },  // 已毕业
    },
  };
  const r = extractWrongAnswers(progress);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'Q1');
});

test('extractWrongAnswers: 墓碑标记的不算', () => {
  const progress = {
    answers: {
      'Q1': { streak: 0, submittedAt: 100, deletedAt: 200 },  // 已删
      'Q2': { streak: 0, submittedAt: 300, deletedAt: 200 },  // 复活后再错，算错题
    },
  };
  const r = extractWrongAnswers(progress);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'Q2');
});

test('extractWrongAnswers: streak undefined 不算错题（未答/未判分）', () => {
  const progress = { answers: { 'Q1': { submittedAt: 1 } } };
  assert.equal(extractWrongAnswers(progress).length, 0);
});

test('extractWrongAnswers: 空对象/缺字段不崩', () => {
  assert.deepEqual(extractWrongAnswers(null), []);
  assert.deepEqual(extractWrongAnswers({}), []);
  assert.deepEqual(extractWrongAnswers({ answers: {} }), []);
});

// ── joinWrongQuestions ────────────────────────────────────

test('joinWrongQuestions: 关联题库', () => {
  const wrong = [{ id: 'Q1', record: {} }, { id: 'Q2', record: {} }];
  const questions = [
    { id: 'Q1', question: '题干 1', options: { A: 'a' }, answer: ['A'] },
    { id: 'Q3', question: '题干 3' },  // Q2 不在题库
  ];
  const r = joinWrongQuestions(wrong, questions);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'Q1');
  assert.equal(r[0].question.question, '题干 1');
});

test('joinWrongQuestions: 全部题库已删时返回空', () => {
  const wrong = [{ id: 'OLD', record: {} }];
  const r = joinWrongQuestions(wrong, [{ id: 'NEW' }]);
  assert.equal(r.length, 0);
});

// ── clusterFileName ───────────────────────────────────────

test('clusterFileName: 标准格式 cluster-NN-slug.html', () => {
  assert.equal(clusterFileName(1, 'git reset'), 'cluster-01-git-reset.html');
  assert.equal(clusterFileName(10, 'HTTP 状态码'), 'cluster-10-http-状态码.html');
});

test('clusterFileName: 编号补零', () => {
  assert.match(clusterFileName(1, 'x'), /^cluster-01-/);
  assert.match(clusterFileName(9, 'x'), /^cluster-09-/);
  assert.match(clusterFileName(10, 'x'), /^cluster-10-/);
});

test('clusterFileName: 空 topic 用默认 slug', () => {
  assert.match(clusterFileName(1, ''), /^cluster-01-cluster\.html$/);
});

// ── wrapClusterHTML ───────────────────────────────────────

test('wrapClusterHTML: 基本结构', () => {
  const html = wrapClusterHTML({
    mainContent: '<h2>核心</h2><p>内容</p>',
    topic: 'Test',
    ids: ['Q1', 'Q2'],
  });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<title>错题精讲 · Test<\/title>/);
  assert.match(html, /assets\/styles\.css/);
  assert.match(html, /对应题目：Q1、Q2/);
  assert.match(html, /grill-wrong\.mjs/);
  assert.match(html, /<h2>核心<\/h2>/);
});

test('wrapClusterHTML: topic HTML 转义', () => {
  const html = wrapClusterHTML({
    mainContent: 'x', topic: 'A<B>', ids: [],
  });
  assert.match(html, /<title>错题精讲 · A&lt;B&gt;<\/title>/);
});

test('wrapClusterHTML: 课程链接', () => {
  const html = wrapClusterHTML({
    mainContent: 'x', topic: 'T', ids: [],
    lessonLinks: [{ file: '0001-x.html', title: '第一课' }],
  });
  assert.match(html, /相关课程/);
  assert.match(html, /0001-x\.html/);
  assert.match(html, /第一课/);
});

// ── wrapIndexHTML ─────────────────────────────────────────

test('wrapIndexHTML: 有 cluster 时渲染卡片', () => {
  const html = wrapIndexHTML([
    { topic: 'Topic A', file: 'cluster-01-a.html', count: 3 },
    { topic: 'Topic B', file: 'cluster-02-b.html', count: 1 },
  ], 'test-theme');
  assert.match(html, /错题学习中心/);
  assert.match(html, /test-theme/);
  assert.match(html, /Topic A/);
  assert.match(html, /cluster-01-a\.html/);
  assert.match(html, /3 题/);
});

test('wrapIndexHTML: 无 cluster 时显示提示', () => {
  const html = wrapIndexHTML([], 'test');
  assert.match(html, /暂无错题/);
});
