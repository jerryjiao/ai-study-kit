import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readProgress, writeProgress } from './progressStore';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'quiz-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('progressStore', () => {
  it('文件不存在时返回空进度', () => {
    expect(readProgress(join(dir, 'p.json'))).toEqual({ version: 1, answers: {}, read: {} });
  });
  it('写入后可读回', () => {
    const f = join(dir, 'p.json');
    writeProgress(f, { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 9 } } });
    expect(readProgress(f).answers.q1.correct).toBe(true);
  });
  it('写入是原子的（不残留临时文件）', () => {
    const f = join(dir, 'p.json');
    writeProgress(f, { version: 1, answers: {} });
    expect(existsSync(f + '.tmp')).toBe(false);
    expect(existsSync(f)).toBe(true);
  });
  it('损坏的 JSON 时返回空进度而非抛错', () => {
    const f = join(dir, 'p.json');
    writeFileSync(f, '{not json');
    expect(readProgress(f)).toEqual({ version: 1, answers: {}, read: {} });
  });
  it('拒绝非法 payload（version 错误）抛错', () => {
    const f = join(dir, 'p.json');
    expect(() => writeProgress(f, { version: 999, answers: {} } as never)).toThrow();
  });
  it('read 字段可随 Progress 一起持久化', () => {
    const f = join(dir, 'p.json');
    writeProgress(f, { version: 1, answers: {}, read: { q1: 100 } });
    const p = readProgress(f);
    expect(p.read).toEqual({ q1: 100 });
  });
  it('无 read 字段的旧数据通过校验', () => {
    const f = join(dir, 'p.json');
    writeFileSync(f, JSON.stringify({ version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 1 } } }));
    const p = readProgress(f);
    expect(p.answers.q1.correct).toBe(true);
    expect(p.read).toBeUndefined();
  });

  // merge 语义：writeProgress 改为 read-merge-write 后，必须保留已有题、不互相覆盖
  it('二次写入保留已有题（merge 而非覆盖）', () => {
    const f = join(dir, 'p.json');
    writeProgress(f, { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 9 } } });
    writeProgress(f, { version: 1, answers: { q2: { selected: ['B'], correct: false, submittedAt: 10 } } });
    const p = readProgress(f);
    expect(Object.keys(p.answers).sort()).toEqual(['q1', 'q2']); // 两次写入的题都在
  });

  it('多设备并发写不同题最终都保留（防 race）', () => {
    const f = join(dir, 'p.json');
    // A 设备写 D2 题，B 设备写 D3 题
    writeProgress(f, { version: 1, answers: { d2q1: { selected: ['A'], correct: true, submittedAt: 100 } } });
    writeProgress(f, { version: 1, answers: { d3q1: { selected: ['B'], correct: true, submittedAt: 101 } } });
    const p = readProgress(f);
    expect(p.answers.d2q1).toBeDefined();
    expect(p.answers.d3q1).toBeDefined();
  });

  it('同题按 submittedAt 取较新（旧覆盖不到新）', () => {
    const f = join(dir, 'p.json');
    // 先写较新记录，再写较旧记录，应保留较新者
    writeProgress(f, { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 200 } } });
    writeProgress(f, { version: 1, answers: { q1: { selected: ['B'], correct: false, submittedAt: 100 } } });
    const p = readProgress(f);
    expect(p.answers.q1.correct).toBe(true);   // 较新（200）的记录胜出
    expect(p.answers.q1.selected).toEqual(['A']);
  });

  // —— 墓碑删除端到端：修复「重做本题集」等 reset 操作经 writeProgress 后真正生效 ——
  // 这是该 bug 的核心回归测试。writeProgress 是 read-merge-write，直接删 key 会被旧快照补回。
  // 墓碑让删除意图携带时间戳参与 merge 定序，删除才能持久化到磁盘。

  it('resetAnswersByIds 后 writeProgress：题目不再复活（核心回归）', () => {
    const f = join(dir, 'p.json');
    // 1. 先答 q1、q2（写盘）
    writeProgress(f, { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 50 } } });
    writeProgress(f, { version: 1, answers: { q2: { selected: ['A'], correct: false, submittedAt: 60, streak: 0 } } });
    // 2. 模拟"重做本题集"：前端 resetAnswersByIds 后 POST 墓碑快照（incoming 只有 q1 的墓碑）
    //    注意：incoming 不含 q2——但 q2 在磁盘上。merge 不应把 q2 补回吗？
    //    不补回：前端 resetAnswersByIds 也会给 q2 打墓碑，所以 incoming 应含 q2 墓碑。
    //    这里测的是"incoming 是完整快照"的真实场景。
    writeProgress(f, { version: 1, answers: {
      q1: { selected: [], correct: null, submittedAt: 100, deletedAt: 100 },
      q2: { selected: [], correct: null, submittedAt: 100, deletedAt: 100 },
    } });
    const p = readProgress(f);
    // 旧实现：q1/q2 被旧快照补回（correct=true/false）。修复后：墓碑胜出。
    expect(p.answers.q1.deletedAt).toBe(100);
    expect(p.answers.q2.deletedAt).toBe(100);
  });

  it('墓碑新于旧记录，但旧记录无 deletedAt 字段：墓碑仍胜（向后兼容老磁盘数据）', () => {
    const f = join(dir, 'p.json');
    // 磁盘上是老数据（无 deletedAt 字段）
    writeFileSync(f, JSON.stringify({ version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 50 } } }));
    // incoming 是墓碑快照
    writeProgress(f, { version: 1, answers: { q1: { selected: [], correct: null, submittedAt: 100, deletedAt: 100 } } });
    const p = readProgress(f);
    expect(p.answers.q1.deletedAt).toBe(100);  // 墓碑胜，老记录被覆盖
  });

  it('reset 后又答题：复活生效（reset 后再答 q1 不被旧墓碑永久封印）', () => {
    const f = join(dir, 'p.json');
    // 1. 写墓碑
    writeProgress(f, { version: 1, answers: { q1: { selected: [], correct: null, submittedAt: 100, deletedAt: 100 } } });
    // 2. 又答了 q1（新记录时间戳 > 墓碑）
    writeProgress(f, { version: 1, answers: { q1: { selected: ['B'], correct: true, submittedAt: 200 } } });
    const p = readProgress(f);
    expect(p.answers.q1.deletedAt).toBeUndefined();  // 复活
    expect(p.answers.q1.correct).toBe(true);
  });

  it('read 墓碑经 writeProgress 持久化（resetRead 不复活）', () => {
    const f = join(dir, 'p.json');
    // 1. 写 read 进度
    writeProgress(f, { version: 1, answers: {}, read: { q1: 50, q2: 50 } });
    // 2. 模拟"重看本题集"：readTombstones 打墓碑
    writeProgress(f, { version: 1, answers: {}, read: { q1: 50, q2: 50 }, readTombstones: { q1: 100, q2: 100 } });
    const p = readProgress(f);
    expect(p.readTombstones?.q1).toBe(100);
    expect(p.readTombstones?.q2).toBe(100);
  });

  it('多 tab 并发：A reset 题1 + B 答题2，磁盘两意图都保留', () => {
    const f = join(dir, 'p.json');
    // 基线：磁盘有 q1
    writeProgress(f, { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 50 } } });
    // A 设备 POST：q1 打墓碑
    writeProgress(f, { version: 1, answers: { q1: { selected: [], correct: null, submittedAt: 100, deletedAt: 100 } } });
    // B 设备 POST：答了 q2（B 的快照不含 q1，但磁盘已有 q1 墓碑——merge 不丢）
    writeProgress(f, { version: 1, answers: { q2: { selected: ['B'], correct: false, submittedAt: 110, streak: 0 } } });
    const p = readProgress(f);
    expect(p.answers.q1.deletedAt).toBe(100);    // A 的删除保留
    expect(p.answers.q2.correct).toBe(false);    // B 的答题保留
  });
});
