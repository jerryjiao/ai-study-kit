// oralAttempts.test.ts — POST /api/oral-attempts 口述成绩实时回流端点测试（#122，v0.26）。
//
// 端点语义：教练陪练（skill F10）写主题包流水的同时把作答 POST 到这里 → 并入
// progress.oralAttempts（append-only 并集去重）→ web 全景/掌握判据刷新页面即消费。
// 校验红线：未来时间戳拒收（progress 同款红线，未来戳会永久压制真实时间的合并）；
// 单条残缺跳过不拒整请求（parseOralAttempts 同尺）；只动 oralAttempts 不冲掉既有
// answers/UI 偏好（read-merge-write，浏览器整档保存也不会冲掉回流——mergeProgress 单测）。
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Progress } from '../src/types';

// PROGRESS_FILE 在 server/index.ts 模块加载时读取——先指到临时文件再动态 import，
// 与其他 server 测试文件（progressStore 直测）互不干扰（vitest 每文件独立模块图）。
const dir = mkdtempSync(join(tmpdir(), 'quiz-oral-'));
process.env.PROGRESS_FILE = join(dir, 'progress.json');
const { app } = await import('./index');

afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

const post = (body: unknown) =>
  app.request('/api/oral-attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const getProgress = async (): Promise<Progress> =>
  (await (await app.request('/api/progress')).json()) as Progress;

describe('POST /api/oral-attempts（#122 实时回流）', () => {
  it('单条提交：并入 progress.oralAttempts（带 theme 归属），GET /api/progress 可见', async () => {
    const res = await post({ theme: 'dev-intro', target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, accepted: 1, skipped: 0 });
    const p = await getProgress();
    expect(p.oralAttempts).toEqual([
      { theme: 'dev-intro', target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
    ]);
  });

  it('批量提交：体级 theme 补缺；同四元组去重不重复计数', async () => {
    const res = await post({
      theme: 'dev-intro',
      attempts: [
        { target: 'EP-02 revert', correct: false, at: 2000, source: 'recite' },
        { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },           // 与已存同四元组 → 去重
        { theme: 'other-theme', target: 'EP-09 他主题', correct: true, at: 3000 },       // 条目级 theme 优先
        { target: 'EP-03 chmod', correct: true, at: 4000 },                               // source 缺省照收
      ],
    });
    expect(await res.json()).toEqual({ ok: true, accepted: 4, skipped: 0 });
    const p = await getProgress();
    const stored = p.oralAttempts!;
    expect(stored).toHaveLength(4);
    expect(stored.map((a) => a.at).sort((a, b) => a - b)).toEqual([1000, 2000, 3000, 4000]);
    expect(stored.find((a) => a.at === 3000)).toMatchObject({ theme: 'other-theme' });
    expect(stored.find((a) => a.at === 3000)!.source).toBeUndefined();   // 未知 source 不写键
    expect(stored.find((a) => a.at === 4000)).toMatchObject({ theme: 'dev-intro' });
  });

  it('未来时间戳拒收（at > now + 5 分钟容忍）——绝不把未来戳写进存储', async () => {
    const future = Date.now() + 10 * 60 * 1000;
    const res = await post({ theme: 'dev-intro', attempts: [
      { target: 'EP-04 相对路径', correct: true, at: future },
      { target: 'EP-04 相对路径', correct: true, at: 5000 },   // 正常时间戳照收
    ] });
    expect(await res.json()).toEqual({ ok: true, accepted: 1, skipped: 1 });
    const p = await getProgress();
    expect(p.oralAttempts?.some((a) => a.at === future)).toBe(false);
    expect(p.oralAttempts?.some((a) => a.at === 5000)).toBe(true);
  });

  it('残缺条目跳过不拒整请求（缺 target / correct 非布尔 / at 非法）', async () => {
    const res = await post({ theme: 'dev-intro', attempts: [
      { target: 'EP-05 分支模型', correct: true, at: 6000 },
      { correct: true, at: 1 },                // 缺 target
      { target: 'x', correct: 'yes', at: 2 },  // correct 非布尔
      { target: 'x', correct: true, at: NaN }, // at 非法
      null,                                    // 非对象
    ] });
    expect(await res.json()).toEqual({ ok: true, accepted: 1, skipped: 4 });
  });

  it('只动 oralAttempts：既有 answers 与 UI 偏好不被冲掉（read-merge-write）', async () => {
    const file = process.env.PROGRESS_FILE!;
    const before = JSON.parse(readFileSync(file, 'utf-8')) as Progress;
    // 模拟浏览器已答过题 + 存了主题偏好
    const seeded: Progress = {
      ...before,
      answers: { q1: { selected: ['A'], correct: true, submittedAt: 123 } },
      theme: 'dark',
      themeUpdatedAt: 456,
    };
    writeFileSync(file, JSON.stringify(seeded));
    const res = await post({ theme: 'dev-intro', target: 'EP-06 对象模型', correct: true, at: 7000 });
    expect(res.status).toBe(200);
    const after = await getProgress();
    expect(after.answers.q1?.correct).toBe(true);
    expect(after.theme).toBe('dark');
    expect(after.oralAttempts!.some((a) => a.at === 7000)).toBe(true);
  });

  it('非法体：非 JSON / 无 attempts 无 target / 超批量上限 → 400，不写盘', async () => {
    const bad1 = await app.request('/api/oral-attempts', { method: 'POST', body: '{oops' });
    expect(bad1.status).toBe(400);
    const bad2 = await post({ theme: 'dev-intro', foo: 1 });
    expect(bad2.status).toBe(400);
    const tooMany = await post({ theme: 'dev-intro', attempts: Array.from({ length: 501 }, (_, i) => ({ target: `EP-${i}`, correct: true, at: i })) });
    expect(tooMany.status).toBe(400);
    // 空批量是合法 noop（accepted 0）
    const noop = await post({ theme: 'dev-intro', attempts: [] });
    expect(await noop.json()).toEqual({ ok: true, accepted: 0, skipped: 0 });
  });
});
