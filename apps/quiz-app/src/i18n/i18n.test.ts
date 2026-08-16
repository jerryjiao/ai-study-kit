import { describe, it, expect } from 'vitest';
import { zh } from './locales/zh';
import { en } from './locales/en';
import { es } from './locales/es';
import { ru } from './locales/ru';

/** i18n 词典完整性测试：en/es/ru 必须覆盖 zh 的全部 key，
 *  占位符集合一致（{n} 之类丢了会导致运行时出现未替换的裸占位符或空缺值），
 *  且不允许空串。TS 已用 Record<TKey, string> 在编译期锚定 key 集，这里做运行期兜底。 */

const locales: Record<string, Record<string, string>> = { en, es, ru };
const zhDict: Record<string, string> = zh;
const zhKeys = Object.keys(zh).sort();

/** 提取占位符集合（排序后逗号拼接，便于断言 diff 可读）。 */
const placeholders = (s: string) =>
  [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('i18n locale completeness', () => {
  it('zh 基准词典非空且 key 唯一', () => {
    expect(zhKeys.length).toBeGreaterThan(50);
    expect(new Set(zhKeys).size).toBe(zhKeys.length);
  });

  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} 覆盖 zh 的全部 key（无多余无缺失）`, () => {
      expect(Object.keys(dict).sort()).toEqual(zhKeys);
    });

    it(`${name} 每条文案的占位符与 zh 一致`, () => {
      for (const key of zhKeys) {
        expect(placeholders(dict[key]), `key=${key}`).toBe(placeholders(zhDict[key]));
      }
    });

    it(`${name} 无空串文案`, () => {
      for (const key of zhKeys) {
        expect(String(dict[key]).length, `key=${key}`).toBeGreaterThan(0);
      }
    });
  }
});
