// resource-fetch.mjs — teach 备课的参考正文抓取器（「以参考材料建概念」从引用层落到内容层）。
//
// 行为契约（v0.13）：
//   - 逐源抓取参考链接页面正文，提取可读文本进 LLM 备课上下文；
//   - 本地缓存按 URL 去重（sha1(url).txt），重跑产课不重抓；
//   - 个别源失败（网络/HTTP 错误/超时）降级进 failed 列表——调用方退回传 URL 清单，产课不中断；
//   - CLI 直连 URL（fetchImpl 可注入，测试不碰真网络），不内嵌第三方抓取兜底链。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_MAX_TEXT = 6000;   // 单源正文上限（字符）——保护备课 prompt 预算
const DEFAULT_TIMEOUT = 15000;   // 单源超时（ms）

/**
 * HTML → 可读正文：剥 script/style/注释/标签、解码常见实体、折叠空白、截断。
 * 不追求 DOM 级保真——给 LLM 当参考语料，够读就行。
 * @param {string} html
 * @param {number} [maxText]
 * @returns {string}
 */
export function extractReadableText(html, maxText = DEFAULT_MAX_TEXT) {
  if (!html) return '';
  let text = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  // 实体解码：命名常用 + 数字十/十六进制
  text = text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  // 折叠空白：行内空格合并、三连换行压两行、去行尾空格
  const lines = text
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => l !== '');
  text = lines.join('\n');
  return text.length > maxText ? text.slice(0, maxText) : text;
}

/**
 * 抓取参考材料正文（逐源、按 URL 去重、带本地缓存）。
 *
 * @param {Array<{title: string, url: string}>} resources
 * @param {object} [opts]
 * @param {string|null} [opts.cacheDir]  缓存目录（null = 不落盘，纯抓取）；建不出来自动降级为无缓存
 * @param {Function} [opts.fetchImpl]    fetch 实现（默认全局 fetch；测试注入假实现）
 * @param {number} [opts.timeoutMs]      单源超时
 * @param {number} [opts.maxText]        单源正文上限（字符）
 * @returns {Promise<{fetched: Array<{title,url,text,fromCache}>, failed: Array<{title,url,error}>}>}
 *   失败源降级进 failed（含 error 原因），绝不抛错阻塞产课。
 */
export async function fetchResources(resources, {
  cacheDir = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT,
  maxText = DEFAULT_MAX_TEXT,
} = {}) {
  const fetched = [];
  const failed = [];
  const seen = new Set();

  let cache = cacheDir;
  if (cache) {
    try { mkdirSync(cache, { recursive: true }); }
    catch { cache = null; } // 目录建不出来（只读盘/权限）→ 降级为无缓存，抓取照常
  }

  for (const r of Array.isArray(resources) ? resources : []) {
    if (!r || !r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    const cacheFile = cache ? join(cache, createHash('sha1').update(r.url).digest('hex') + '.txt') : null;
    if (cacheFile && existsSync(cacheFile)) {
      try {
        fetched.push({ title: r.title, url: r.url, text: readFileSync(cacheFile, 'utf-8'), fromCache: true });
        continue;
      } catch { /* 缓存读坏当 miss，走抓取 */ }
    }
    try {
      const text = await fetchText(r.url, { fetchImpl, timeoutMs, maxText });
      if (cacheFile) {
        try { writeFileSync(cacheFile, text, 'utf-8'); } catch { /* 缓存写失败不影响本次结果 */ }
      }
      fetched.push({ title: r.title, url: r.url, text, fromCache: false });
    } catch (e) {
      failed.push({ title: r.title, url: r.url, error: (e && e.message) || String(e) });
    }
  }
  return { fetched, failed };
}

/** 单源抓取 + 提取（fetchText 抛错由调用方降级处理）。 */
async function fetchText(url, { fetchImpl, timeoutMs, maxText }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`抓取超时（>${timeoutMs}ms）`)), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'ai-study-kit-teach (+https://github.com/jerryjiao/ai-study-kit)' },
    });
    if (!res || !res.ok) throw new Error(`HTTP ${res && res.status}`);
    const body = await res.text();
    return extractReadableText(body, maxText);
  } finally {
    clearTimeout(timer);
  }
}
