// resource-fetch.test.mjs — teach 参考正文抓取器单测（node:test）。
// 全程注入假 fetch + 临时目录缓存，不碰真网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchResources, extractReadableText } from './resource-fetch.mjs';

const html = (body) => `<!DOCTYPE html><html><head><title>T</title><style>body{color:red}</style>
<script>console.log('x')</script></head><body><nav>菜单</nav>${body}<footer>页脚</footer></body></html>`;

// 假 fetch：按 URL 分发响应；调用次数可查（验证缓存命中不重抓）
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) throw new Error('no route');
    if (route instanceof Error) throw route;
    if (typeof route === 'number') return { ok: false, status: route, text: async () => '' };
    return { ok: true, status: 200, text: async () => route };
  };
  impl.calls = calls;
  return impl;
}

test('fetchResources：逐源抓取 + 提取正文 + 落缓存', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-'));
  try {
    const f = fakeFetch({ 'https://a.example/docs': html('<h1>标题</h1><p>正文段落。</p>') });
    const { fetched, failed } = await fetchResources(
      [{ title: 'A 文档', url: 'https://a.example/docs' }],
      { cacheDir: dir, fetchImpl: f }
    );
    assert.equal(failed.length, 0);
    assert.equal(fetched.length, 1);
    assert.equal(fetched[0].fromCache, false);
    assert.ok(fetched[0].text.includes('正文段落。'));
    assert.ok(!fetched[0].text.includes('console.log'));   // script 剥离
    assert.ok(!fetched[0].text.includes('color:red'));     // style 剥离
    // 缓存文件已落盘（sha1(url).txt，内容 = 提取后的正文）
    const files = readdirSync(dir);
    assert.equal(files.length, 1);
    assert.match(files[0], /^[0-9a-f]{40}\.txt$/);
    assert.ok(readFileSync(join(dir, files[0]), 'utf-8').includes('正文段落。'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('缓存命中不重抓：第二次同 URL 零 fetch 调用', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-'));
  try {
    const f = fakeFetch({ 'https://a.example/x': html('<p>内容</p>') });
    const once = await fetchResources([{ title: 'A', url: 'https://a.example/x' }], { cacheDir: dir, fetchImpl: f });
    assert.equal(once.fetched[0].fromCache, false);
    assert.equal(f.calls.length, 1);

    // 换一个全新 fetch（证明零调用 = 走了缓存而不是复用内存）
    const f2 = fakeFetch({ 'https://a.example/x': html('<p>不该被抓到</p>') });
    const twice = await fetchResources([{ title: 'A', url: 'https://a.example/x' }], { cacheDir: dir, fetchImpl: f2 });
    assert.equal(f2.calls.length, 0);
    assert.equal(twice.fetched[0].fromCache, true);
    assert.ok(twice.fetched[0].text.includes('内容'));
    assert.ok(!twice.fetched[0].text.includes('不该被抓到'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('URL 去重：同 URL 多条目只抓一次', async () => {
  const f = fakeFetch({ 'https://a.example/dup': html('<p>去重</p>'), 'https://b.example/other': html('<p>别的</p>') });
  const { fetched } = await fetchResources(
    [
      { title: '规范叫法', url: 'https://a.example/dup' },
      { title: '别名', url: 'https://a.example/dup' },
      { title: '别的', url: 'https://b.example/other' },
    ],
    { fetchImpl: f }
  );
  assert.equal(f.calls.length, 2); // dup 一次 + other 一次
  assert.equal(fetched.length, 2);
});

test('单源失败降级：失败源进 failed、其余照常，不抛错', async () => {
  const f = fakeFetch({
    'https://good.example/': html('<p>好源</p>'),
    'https://dead.example/': new Error('connection reset'),
    'https://404.example/': 404,
  });
  const { fetched, failed } = await fetchResources(
    [
      { title: '好', url: 'https://good.example/' },
      { title: '死链', url: 'https://dead.example/' },
      { title: '404', url: 'https://404.example/' },
    ],
    { fetchImpl: f }
  );
  assert.equal(fetched.length, 1);
  assert.equal(failed.length, 2);
  assert.equal(failed[0].title, '死链');
  assert.match(failed[1].error, /HTTP 404/);
});

test('无 cacheDir 也能跑（纯抓取，不落盘）', async () => {
  const f = fakeFetch({ 'https://a.example/nc': html('<p>无缓存</p>') });
  const { fetched } = await fetchResources([{ title: 'A', url: 'https://a.example/nc' }], { fetchImpl: f });
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].fromCache, false);
});

test('extractReadableText：剥 script/style/标签、解码实体、截断到上限', () => {
  const text = extractReadableText(
    html('<h2>节标题</h2><p>a &amp; b &lt;tag&gt; &#20013;&#x6587;</p>' + '<p>长</p>'.repeat(500)),
    200
  );
  assert.ok(text.includes('a & b <tag> 中文'));
  assert.ok(!text.includes('<p>'));
  assert.ok(text.length <= 210); // maxText 截断
});

test('空输入与空资源列表：空结果不抛错', async () => {
  const { fetched, failed } = await fetchResources([], { fetchImpl: fakeFetch({}) });
  assert.deepEqual(fetched, []);
  assert.deepEqual(failed, []);
  const empty = await fetchResources(null, { fetchImpl: fakeFetch({}) });
  assert.deepEqual(empty.fetched, []);
  assert.equal(extractReadableText(''), '');
});
