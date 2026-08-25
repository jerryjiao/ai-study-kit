/**
 * teach-utils.test.mjs — teach 工具函数测试。
 *
 * 运行：node --test apps/quiz-app/scripts/lib/teach-utils.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, slugify, validateCourseSpec, wrapLessonHTML, buildOutlinePrompt, normalizeOutline } from './teach-utils.mjs';

// ── escapeHTML ────────────────────────────────────────────

test('escapeHTML: 转义 & < > " \'', () => {
  assert.equal(escapeHTML('a&b<c>"d"\'e\''), 'a&amp;b&lt;c&gt;&quot;d&quot;&#39;e&#39;');
});

test('escapeHTML: 非 string 转 string 后转义', () => {
  assert.equal(escapeHTML(42), '42');
  assert.equal(escapeHTML(null), 'null');
});

test('escapeHTML: 无特殊字符原样返回', () => {
  assert.equal(escapeHTML('hello world'), 'hello world');
  assert.equal(escapeHTML('中文测试'), '中文测试');
});

// ── slugify ───────────────────────────────────────────────

test('slugify: 英文标题', () => {
  assert.equal(slugify('Hook Basics'), 'hook-basics');
  assert.equal(slugify('React useState & useEffect'), 'react-usestate-useeffect');
});

test('slugify: 中文标题保留', () => {
  assert.equal(slugify('Hook 基础'), 'hook-基础');
  assert.equal(slugify('状态管理入门'), '状态管理入门');
});

test('slugify: 空格/点/·转 -', () => {
  assert.equal(slugify('a b c'), 'a-b-c');
  assert.equal(slugify('a.b.c'), 'a-b-c');
  assert.equal(slugify('a·b·c'), 'a-b-c');
});

test('slugify: 多个连续分隔符合并', () => {
  assert.equal(slugify('a   b'), 'a-b');
  assert.equal(slugify('a - b'), 'a-b');
});

test('slugify: 去首尾 -', () => {
  assert.equal(slugify('--abc--'), 'abc');
});

test('slugify: 空串/纯符号 → "lesson"', () => {
  assert.equal(slugify(''), 'lesson');
  assert.equal(slugify('   '), 'lesson');
  assert.equal(slugify('!!!'), 'lesson');
});

test('slugify: 限长 40', () => {
  const long = 'a'.repeat(60);
  const r = slugify(long);
  assert.equal(r.length, 40);
});

test('slugify: 小写化', () => {
  assert.equal(slugify('REACT'), 'react');
});

// ── validateCourseSpec ────────────────────────────────────

test('validateCourseSpec: 全字段合法', () => {
  const r = validateCourseSpec({
    theme: 'react', mission: 'x', audience: 'dev', depth: 'beginner',
  });
  assert.equal(r.ok, true);
});

test('validateCourseSpec: 缺字段', () => {
  const r = validateCourseSpec({ theme: 'react' });
  assert.equal(r.ok, false);
  assert.ok(r.missing.includes('mission'));
  assert.ok(r.missing.includes('audience'));
  assert.ok(r.missing.includes('depth'));
});

test('validateCourseSpec: depth 非法', () => {
  const r = validateCourseSpec({
    theme: 'react', mission: 'x', audience: 'dev', depth: 'god-tier',
  });
  assert.equal(r.ok, false);
  assert.match(r.missing[0], /must be one of/);
});

test('validateCourseSpec: depth 合法值都通过', () => {
  for (const d of ['beginner', 'intermediate', 'advanced']) {
    const r = validateCourseSpec({
      theme: 'x', mission: 'x', audience: 'x', depth: d,
    });
    assert.equal(r.ok, true);
  }
});

// ── wrapLessonHTML ────────────────────────────────────────

test('wrapLessonHTML: 基本结构', () => {
  const html = wrapLessonHTML({
    mainContent: '<p>hello</p>',
    title: 'Test',
    lessonNum: 1,
    total: 3,
  });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<title>Test<\/title>/);
  assert.match(html, /assets\/styles\.css/);
  assert.match(html, /<p>hello<\/p>/);
  assert.match(html, /teach-generate\.mjs/);
});

test('wrapLessonHTML: 标题 HTML 转义', () => {
  const html = wrapLessonHTML({
    mainContent: 'x', title: 'A<B>&C', lessonNum: 1, total: 1,
  });
  assert.match(html, /<title>A&lt;B&gt;&amp;C<\/title>/);
  assert.match(html, /<h1>A&lt;B&gt;&amp;C<\/h1>/);
});

test('wrapLessonHTML: 有上一课/下一课链接', () => {
  const html = wrapLessonHTML({
    mainContent: 'x', title: 'T', lessonNum: 2, total: 3,
    prevFile: '0001-a.html', nextFile: '0003-c.html', nextTitle: 'C 课',
  });
  assert.match(html, /href="0001-a\.html"/);
  assert.match(html, /href="0003-c\.html"/);
  assert.match(html, /C 课/);
});

test('wrapLessonHTML: 第一课无 prev 链接', () => {
  const html = wrapLessonHTML({
    mainContent: 'x', title: 'T', lessonNum: 1, total: 3,
  });
  assert.doesNotMatch(html, /上一课/);
});

test('wrapLessonHTML: 最后一课无 next 链接', () => {
  const html = wrapLessonHTML({
    mainContent: 'x', title: 'T', lessonNum: 3, total: 3,
  });
  assert.doesNotMatch(html, /下一课/);
});

// ── buildOutlinePrompt ────────────────────────────────────

test('buildOutlinePrompt: 包含 mission/audience/depth', () => {
  const p = buildOutlinePrompt({
    mission: '学会 React', audience: '前端开发', depth: 'beginner',
    resources: [{ title: 'React 文档', url: 'https://react.dev' }],
  }, 3);
  assert.match(p.system, /3 节课/);
  assert.match(p.user, /学会 React/);
  assert.match(p.user, /前端开发/);
  assert.match(p.user, /beginner/);
  assert.match(p.user, /React 文档/);
});

test('buildOutlinePrompt: 无资源时降级提示', () => {
  const p = buildOutlinePrompt({
    mission: 'x', audience: 'y', depth: 'beginner',
  }, 2);
  assert.match(p.user, /无指定资源/);
});

// ── normalizeOutline ──────────────────────────────────────

test('normalizeOutline: 长度匹配直接返回', () => {
  const r = normalizeOutline(['a', 'b', 'c'], 3);
  assert.deepEqual(r, ['a', 'b', 'c']);
});

test('normalizeOutline: LLM 多产了取前 N 个', () => {
  const r = normalizeOutline(['a', 'b', 'c', 'd', 'e'], 3);
  assert.deepEqual(r, ['a', 'b', 'c']);
});

test('normalizeOutline: LLM 少产了补齐占位', () => {
  const r = normalizeOutline(['a'], 3);
  assert.equal(r.length, 3);
  assert.equal(r[0], 'a');
  assert.match(r[1], /第 2 课/);
  assert.match(r[2], /第 3 课/);
});

test('normalizeOutline: 空数组补齐全部', () => {
  const r = normalizeOutline([], 2);
  assert.equal(r.length, 2);
});

test('normalizeOutline: 元素转 string', () => {
  const r = normalizeOutline([42, 99], 2);
  assert.deepEqual(r, ['42', '99']);
});

test('normalizeOutline: 非数组抛错', () => {
  assert.throws(() => normalizeOutline('not array', 3), /不是数组/);
  assert.throws(() => normalizeOutline(null, 3), /不是数组/);
});
