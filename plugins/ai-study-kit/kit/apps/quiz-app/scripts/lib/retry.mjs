/**
 * retry.mjs — 重试 + JSON 解析容错。
 *
 * LLM 调用经常失败：网络超时、API 限流、JSON 输出格式错（LLM 有时返回带 markdown
 * 代码块的"假 JSON"）。本模块提供：
 *   - withRetry(fn, opts)：自动重试，指数退避
 *   - parseJsonLoose(text)：容错 JSON 解析（提取 {...} 或 [...]，去 markdown 代码块）
 *
 * 设计原则：失败时清晰报错（带最后一次错误信息），不静默吞掉。
 */

/**
 * 指数退避重试。
 *
 * @template T
 * @param {() => Promise<T>} fn  要重试的异步函数
 * @param {object} opts
 * @param {number} [opts.retries=3]    最多重试次数（不含首次）
 * @param {number} [opts.baseDelayMs=1000]  首次失败后退避基数
 * @param {number} [opts.maxDelayMs=8000]   退避上限
 * @param {(err: Error, attempt: number) => boolean} [opts.shouldRetry]  自定义"该不该重试"判断；默认对所有错误重试
 * @param {(msg: string) => void} [opts.onRetry]  重试前回调（打印日志用）
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const {
    retries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    shouldRetry = () => true,
    onRetry = (msg) => console.error(`  ↻ ${msg}`),
  } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (!shouldRetry(err, attempt)) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const msg = `${err.name || 'Error'}: ${err.message || err}（attempt ${attempt + 1}/${retries + 1}，${delay}ms 后重试）`;
      onRetry(msg);
      await sleep(delay);
    }
  }
  // 失败时抛最后一次错误，附带清晰上下文
  const err = new Error(`重试 ${retries + 1} 次后仍失败：${lastErr?.message || lastErr}`);
  err.cause = lastErr;
  throw err;
}

/** 睡眠 ms 毫秒。 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 容错 JSON 解析。
 *
 * LLM 经常返回带 markdown 代码块的"假 JSON"，如：
 *   ```json\n{ "foo": "bar" }\n```
 * 或前后带解释文字：
 *   这是结果：\n[1, 2, 3]\n希望对你有帮助。
 *
 * 本函数按顺序尝试：
 *   1. 直接 JSON.parse
 *   2. 去掉 markdown 代码块后再 parse
 *   3. 提取第一个 {...} 或 [...] 子串再 parse
 *
 * @param {string} text
 * @returns {*} 解析后的值
 * @throws {Error} 所有策略都失败时抛 Error（含原 text 前 200 字符）
 */
export function parseJsonLoose(text) {
  if (typeof text !== 'string') {
    throw new Error(`parseJsonLoose: 期望 string，收到 ${typeof text}`);
  }
  const trimmed = text.trim();

  // 策略 1：直接 parse
  try {
    return JSON.parse(trimmed);
  } catch { /* 继续尝试 */ }

  // 策略 2：去 markdown 代码块
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* 继续尝试 */ }
  }

  // 策略 3：提取第一个 {...} 或 [...]
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch { /* 继续尝试 */ }
  }
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch { /* 继续尝试 */ }
  }

  throw new Error(
    `parseJsonLoose: 无法从文本解析 JSON。前 200 字符：${trimmed.slice(0, 200)}`
  );
}
