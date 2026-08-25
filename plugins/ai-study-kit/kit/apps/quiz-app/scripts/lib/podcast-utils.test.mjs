/**
 * podcast-utils.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHTML, parseInputSource, validateDialogScript, renderTranscript,
  podcastSlug, buildPodcastPrompt,
} from './podcast-utils.mjs';

// ── escapeHTML ────────────────────────────────────────────
test('escapeHTML', () => {
  assert.equal(escapeHTML('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
});

// ── parseInputSource ──────────────────────────────────────

test('parseInputSource: HTML 去标签', () => {
  const r = parseInputSource('lesson.html', `
    <!DOCTYPE html><html><head><title>第 1 课</title>
    <style>body { color: red; }</style></head>
    <body><h1>标题</h1><p>第一段。</p><p>第二段 &amp; 更多。</p></body></html>
  `);
  assert.equal(r.sourceTitle, '第 1 课');
  assert.equal(r.sourceType, 'html');
  assert.match(r.sourceText, /标题/);
  assert.match(r.sourceText, /第一段/);
  assert.match(r.sourceText, /第二段 & 更多/);
  assert.doesNotMatch(r.sourceText, /<[^>]+>/);
  assert.doesNotMatch(r.sourceText, /color: red/);
});

test('parseInputSource: questions.json 特判', () => {
  const r = parseInputSource('q.json', JSON.stringify([
    {
      id: 'Q1', question: '1+1=?', options: { A: '1', B: '2' },
      answer: ['B'], analysis: '加法',
    },
  ]));
  assert.equal(r.sourceType, 'questions.json');
  assert.match(r.sourceText, /Q1/);
  assert.match(r.sourceText, /1\+1/);
  assert.match(r.sourceText, /A\. 1/);
  assert.match(r.sourceText, /答案：B/);
  assert.match(r.sourceText, /解析：加法/);
});

test('parseInputSource: 普通 JSON 当原文', () => {
  const r = parseInputSource('data.json', '{"foo": "bar"}');
  assert.equal(r.sourceType, 'json');
  assert.equal(r.sourceText, '{"foo": "bar"}');
});

test('parseInputSource: Markdown 原样', () => {
  const r = parseInputSource('note.md', '# 标题\n\n正文。');
  assert.equal(r.sourceType, 'md');
  assert.equal(r.sourceText, '# 标题\n\n正文。');
});

test('parseInputSource: 纯文本原样', () => {
  const r = parseInputSource('readme.txt', 'hello world');
  assert.equal(r.sourceText, 'hello world');
});

test('parseInputSource: 无扩展名走默认', () => {
  const r = parseInputSource('README', 'hi');
  assert.equal(r.sourceType, 'text');
});

// ── validateDialogScript ─────────────────────────────────

test('validateDialogScript: 合法脚本通过', () => {
  const r = validateDialogScript([
    { speaker: 'female', text: 'hello' },
    { speaker: 'male', text: 'hi' },
  ]);
  assert.equal(r.ok, true);
});

test('validateDialogScript: 非数组失败', () => {
  assert.equal(validateDialogScript(null).ok, false);
  assert.equal(validateDialogScript({}).ok, false);
});

test('validateDialogScript: 空数组失败', () => {
  assert.equal(validateDialogScript([]).ok, false);
});

test('validateDialogScript: speaker 非法失败', () => {
  const r = validateDialogScript([{ speaker: 'robot', text: 'x' }]);
  assert.equal(r.ok, false);
  assert.match(r.error, /必须是 'male' 或 'female'/);
});

test('validateDialogScript: text 空/非 string 失败', () => {
  assert.equal(validateDialogScript([{ speaker: 'male', text: '' }]).ok, false);
  assert.equal(validateDialogScript([{ speaker: 'male', text: 42 }]).ok, false);
  assert.equal(validateDialogScript([{ speaker: 'male', text: null }]).ok, false);
});

// ── renderTranscript ──────────────────────────────────────

test('renderTranscript: 渲染 Markdown', () => {
  const md = renderTranscript([
    { speaker: 'female', text: '大家好。' },
    { speaker: 'male', text: '今天聊 git。' },
  ], '测试标题');
  assert.match(md, /# 测试标题/);
  assert.match(md, /\*\*👩 女主播\*\*：大家好。/);
  assert.match(md, /\*\*👨 男主播\*\*：今天聊 git。/);
});

// ── podcastSlug ───────────────────────────────────────────

test('podcastSlug', () => {
  assert.equal(podcastSlug('React Hooks 入门'), 'react-hooks-入门');
  assert.equal(podcastSlug('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(podcastSlug(''), 'podcast');
  assert.equal(podcastSlug('!!!'), 'podcast');
});

// ── buildPodcastPrompt ────────────────────────────────────

test('buildPodcastPrompt: 基本字段', () => {
  const p = buildPodcastPrompt('素材内容', '素材标题', { targetSegments: 8 });
  assert.match(p.system, /8 段/);
  assert.match(p.user, /素材标题/);
  assert.match(p.user, /素材内容/);
});

test('buildPodcastPrompt: 风格 hint', () => {
  const p1 = buildPodcastPrompt('x', 'y', { style: 'interview' });
  assert.match(p1.system, /专家/);
  assert.match(p1.system, /采访者/);
});

test('buildPodcastPrompt: 素材过长截断', () => {
  const longText = 'a'.repeat(8000);
  const p = buildPodcastPrompt(longText, 'long');
  assert.match(p.user, /素材过长，已截断/);
});
