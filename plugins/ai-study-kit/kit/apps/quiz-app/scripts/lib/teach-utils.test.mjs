/**
 * teach-utils.test.mjs — teach 工具函数测试。
 *
 * 运行：node --test apps/quiz-app/scripts/lib/teach-utils.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, slugify, validateCourseSpec, wrapLessonHTML, buildOutlinePrompt, buildLessonPrompt, normalizeOutline, parseResourcesMd, mergeResources } from './teach-utils.mjs';

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

// ── RESOURCES.md 出处回链（解析 + 合并）──────────────────────

test('parseResourcesMd: 认加粗标题+冒号+URL 形态（本仓库 RESOURCES.md 写法）', () => {
  const md = [
    '# Resources · dev-intro 示例',
    '',
    '- **Pro Git Book**（官方，免费）：https://git-scm.com/book/zh/v2',
    '  - 中文版，完整覆盖 git 全部概念。', // 子说明行不带 URL，不产出
    '- **Linux man pages**：终端里 `man ls` / `man chmod`', // 无 URL，不产出
    '- **Learn Git Branching**（交互式）：https://learngitbranching.js.org/?locale=zh_CN',
  ].join('\n');
  assert.deepEqual(parseResourcesMd(md), [
    { title: 'Pro Git Book', url: 'https://git-scm.com/book/zh/v2' },
    { title: 'Learn Git Branching', url: 'https://learngitbranching.js.org/?locale=zh_CN' },
  ]);
});

test('parseResourcesMd: 认 markdown 链接形态；空/无匹配回空数组', () => {
  const md = '看 [官方文档](https://example.com/docs) 和 [教程](https://t.example.com)';
  assert.deepEqual(parseResourcesMd(md), [
    { title: '官方文档', url: 'https://example.com/docs' },
    { title: '教程', url: 'https://t.example.com' },
  ]);
  assert.deepEqual(parseResourcesMd(''), []);
  assert.deepEqual(parseResourcesMd('# 没有链接的文档'), []);
});

test('mergeResources: URL 去重 spec 在前保序；缺字段条目丢弃', () => {
  const specRes = [
    { title: 'Pro Git Book（中文版，官方免费）', url: 'https://git-scm.com/book/zh/v2' },
    { title: 'git 官方文档', url: 'https://git-scm.com/docs' },
  ];
  const mdRes = [
    { title: 'Pro Git Book', url: 'https://git-scm.com/book/zh/v2' }, // 与 spec 同 URL，去重
    { title: 'Linux 命令大全（runoob）', url: 'https://www.runoob.com/linux/linux-command-manual.html' },
    { title: '残缺条目' }, // 无 url 丢弃
  ];
  assert.deepEqual(mergeResources(specRes, mdRes), [
    { title: 'Pro Git Book（中文版，官方免费）', url: 'https://git-scm.com/book/zh/v2' },
    { title: 'git 官方文档', url: 'https://git-scm.com/docs' },
    { title: 'Linux 命令大全（runoob）', url: 'https://www.runoob.com/linux/linux-command-manual.html' },
  ]);
});

test('wrapLessonHTML: 传 sources 时页脚前渲染出处块，不传时无该块', () => {
  const base = { mainContent: '<h2>x</h2><p>y</p>', title: 'T', lessonNum: 1, total: 2 };
  const withSrc = wrapLessonHTML({ ...base, sources: [{ title: 'Docs', url: 'https://e.com/d?a=1&b=2' }] });
  assert.match(withSrc, /<aside class="sources">/);
  assert.match(withSrc, /📚 出处：/);
  assert.match(withSrc, /<a href="https:\/\/e\.com\/d\?a=1&amp;b=2" target="_blank" rel="noopener">Docs<\/a>/);
  const withoutSrc = wrapLessonHTML(base);
  assert.doesNotMatch(withoutSrc, /class="sources"/);
  // 出处块在正文之后、<footer> 之前
  const idxBody = withSrc.indexOf('<p>y</p>');
  const idxSrc = withSrc.indexOf('<aside class="sources">');
  const idxFooter = withSrc.indexOf('<footer>');
  assert.ok(idxBody < idxSrc && idxSrc < idxFooter);
});

// ── buildLessonPrompt（v0.13 参考正文进备课上下文）──────────────────
test('buildLessonPrompt: 带参考正文块时 prompt 含正文与「备课第一依据」口径（dry-run 断言）', () => {
  const spec = {
    mission: '学会 git 基础', audience: '新手', depth: 'beginner',
    resources: [{ title: 'Pro Git', url: 'https://git-scm.com/book' }],
  };
  const refBlock = '### Pro Git\n（来源：https://git-scm.com/book）\n第 1 章讲了版本控制的基本概念……';
  const msgs = buildLessonPrompt({ spec, topic: '暂存区', lessonNum: 1, total: 3, outline: ['暂存区', 'x', 'y'], referenceTextBlock: refBlock });
  const user = msgs[1].content;
  assert.match(user, /## 参考材料正文（抓取自上述链接，备课第一依据；材料未覆盖的内容才可用你的通用知识）/);
  assert.match(user, /第 1 章讲了版本控制的基本概念/);   // 正文内容真的进 prompt
  assert.match(user, /- Pro Git \(https:\/\/git-scm\.com\/book\)/); // URL 清单仍在
});

test('buildLessonPrompt: 无参考正文（空串）时退回纯 URL 清单，无正文节', () => {
  const spec = {
    mission: 'm', audience: 'a', depth: 'beginner',
    resources: [{ title: 'R', url: 'https://r.example' }],
  };
  const msgs = buildLessonPrompt({ spec, topic: 't', lessonNum: 1, total: 1, outline: ['t'] });
  assert.doesNotMatch(msgs[1].content, /参考材料正文/);
  assert.match(msgs[1].content, /- R \(https:\/\/r\.example\)/);
});
