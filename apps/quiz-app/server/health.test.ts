import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './index';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 与 server/index.ts 同一解析序：server/ 向上三级（仓库根 / kit 根）先 package.json
// 再 kit-version.json，都没有 → unknown。测试读同一来源实测断言，不写死版本号。
function resolveExpectedVersion(): string {
  const anchor = join(__dirname, '../../..');
  for (const name of ['package.json', 'kit-version.json']) {
    try {
      const v = JSON.parse(readFileSync(join(anchor, name), 'utf-8'))?.version;
      if (typeof v === 'string' && v) return v;
    } catch {
      // 文件缺失/损坏 → 下一来源
    }
  }
  return 'unknown';
}

describe('GET /api/health', () => {
  it('返回 ok=true，version 按解析序实测，theme 非空且不带路径', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; version: string; theme: string };
    // 老调用方只认 ok，必须保持 true
    expect(body.ok).toBe(true);
    // version = 按同一解析序读出的实测值（仓库 checkout 形态下即仓库根 package.json）
    expect(body.version).toBe(resolveExpectedVersion());
    // theme：非空字符串或 "unknown"；只报主题名，绝不带 dir 或任何路径
    expect(typeof body.theme).toBe('string');
    expect(body.theme.length).toBeGreaterThan(0);
    expect(body.theme).not.toContain('/');
    expect(body.theme).not.toContain('\\');
  });
});
