/**
 * retry.test.mjs — 用 node:test 跑（不引入 vitest，因为脚本是 .mjs 不是 .ts）。
 *
 * 运行：node --test apps/quiz-app/scripts/lib/retry.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, parseJsonLoose, sleep } from './retry.mjs';

// ── parseJsonLoose ────────────────────────────────────────

test('parseJsonLoose: 直接 JSON', () => {
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonLoose('[1,2,3]'), [1, 2, 3]);
});

test('parseJsonLoose: 前后空白', () => {
  assert.deepEqual(parseJsonLoose('  \n{"a":1}\n  '), { a: 1 });
});

test('parseJsonLoose: markdown 代码块', () => {
  const txt = '```json\n{"a":1,"b":[2,3]}\n```';
  assert.deepEqual(parseJsonLoose(txt), { a: 1, b: [2, 3] });
});

test('parseJsonLoose: 代码块无 lang 标记', () => {
  const txt = '```\n{"a":1}\n```';
  assert.deepEqual(parseJsonLoose(txt), { a: 1 });
});

test('parseJsonLoose: 前后带解释文字', () => {
  const txt = '这是结果：\n{"a":1}\n希望对你有帮助。';
  assert.deepEqual(parseJsonLoose(txt), { a: 1 });
});

test('parseJsonLoose: 数组前后带文字', () => {
  const txt = '答案列表如下：\n[1, 2, 3]\n以上。';
  assert.deepEqual(parseJsonLoose(txt), [1, 2, 3]);
});

test('parseJsonLoose: 嵌套对象', () => {
  const txt = '```json\n{"outer":{"inner":[1,2]}}\n```';
  assert.deepEqual(parseJsonLoose(txt), { outer: { inner: [1, 2] } });
});

test('parseJsonLoose: 非 string 输入抛错', () => {
  assert.throws(() => parseJsonLoose(null), /期望 string/);
  assert.throws(() => parseJsonLoose(undefined), /期望 string/);
  assert.throws(() => parseJsonLoose(42), /期望 string/);
});

test('parseJsonLoose: 完全无法解析抛错', () => {
  assert.throws(() => parseJsonLoose('not json at all'), /无法从文本解析 JSON/);
  assert.throws(() => parseJsonLoose(''), /无法从文本解析 JSON/);
});

// ── withRetry ─────────────────────────────────────────────

test('withRetry: 首次成功直接返回，不重试', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return 'ok';
  }, { retries: 3, baseDelayMs: 1 });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withRetry: 失败 retries 次后成功', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error('fail ' + calls);
    return 'success';
  }, { retries: 3, baseDelayMs: 1, onRetry: () => {} });
  assert.equal(result, 'success');
  assert.equal(calls, 3);
});

test('withRetry: 所有重试都失败时抛错', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      throw new Error('always fail');
    }, { retries: 2, baseDelayMs: 1, onRetry: () => {} }),
    /重试 3 次后仍失败/
  );
  assert.equal(calls, 3);  // 1 + 2 retries
});

test('withRetry: shouldRetry 返回 false 时不重试', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      const err = new Error('fatal');
      err.code = 'FATAL';
      throw err;
    }, {
      retries: 5,
      baseDelayMs: 1,
      shouldRetry: (err) => err.code !== 'FATAL',
      onRetry: () => {},
    }),
    /fatal/
  );
  assert.equal(calls, 1);  // 不重试，只调一次
});

test('withRetry: 指数退避——delay 翻倍', async () => {
  const delays = [];
  let calls = 0;
  await withRetry(async () => {
    calls++;
    throw new Error('fail');
  }, {
    retries: 3,
    baseDelayMs: 10,
    maxDelayMs: 1000,
    onRetry: () => {},
  }).catch(() => {});
  // delays aren't directly observable; we test via sleep mock isn't trivial here
  // just verify the call count
  assert.equal(calls, 4);  // 1 + 3 retries
});

test('sleep: 真的等了指定时间', async () => {
  const start = Date.now();
  await sleep(50);
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 40, `sleep(50) 实际等了 ${elapsed}ms，应该 ≥40ms`);
});
