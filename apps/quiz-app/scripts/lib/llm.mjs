/**
 * llm.mjs — LLM 调用抽象层。
 *
 * 用 OpenAI SDK 的 baseURL 参数支持任何 OpenAI 兼容协议的 provider：
 *   - OpenAI:        https://api.openai.com/v1
 *   - 智谱 GLM:       https://open.bigmodel.cn/api/paas/v4
 *   - DeepSeek:      https://api.deepseek.com/v1
 *   - Moonshot Kimi: https://api.moonshot.cn/v1
 *   - 通义千问:        https://dashscope.aliyuncs.com/compatible-mode/v1
 *   - 字节豆包:        https://ark.cn-beijing.volces.com/api/v3
 *
 * 用户在 .env 配：
 *   LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
 *   LLM_API_KEY=your-key
 *   LLM_MODEL=glm-4.6
 *
 * 代码自动用 dotenv 加载 .env。所有三个 AI CLI（teach/grill/podcast）都通过
 * 本模块的 chat() 函数调 LLM，保证一处配置、统一行为。
 */
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withRetry, parseJsonLoose } from './retry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 位置：仓库根（脚本 __dirname 是 apps/quiz-app/scripts/lib/，往上 4 级到根）
// 也尝试 apps/quiz-app/.env，兼容只在该目录跑的场景
for (const candidate of [
  join(__dirname, '..', '..', '..', '..', '.env'),   // repo-root/.env
  join(__dirname, '..', '..', '.env'),                // apps/quiz-app/.env
]) {
  dotenv.config({ path: candidate });
}

/**
 * 校验 LLM 配置完整。缺失时打印清晰提示并退出。
 * @returns {{ baseURL: string, apiKey: string, model: string }}
 */
export function requireLlmConfig() {
  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseURL || !apiKey || !model) {
    console.error('❌ LLM 配置不完整。请在仓库根的 .env 里配置：');
    console.error('   LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4');
    console.error('   LLM_API_KEY=your-key');
    console.error('   LLM_MODEL=glm-4.6');
    console.error('');
    console.error('支持任何 OpenAI 兼容协议的 provider（OpenAI / GLM / DeepSeek / Kimi / 通义 / 豆包）。');
    console.error('详见 docs/configuration.md。');
    process.exit(1);
  }
  return { baseURL, apiKey, model };
}

/** 单例 client（懒初始化，避免每次 chat 都 new）。 */
let _client = null;
function getClient() {
  if (_client) return _client;
  const { baseURL, apiKey } = requireLlmConfig();
  _client = new OpenAI({ baseURL, apiKey, maxRetries: 0 });  // 我们自己用 withRetry
  return _client;
}

/**
 * 发一次 chat completion 请求，返回文本。
 *
 * 自动重试 3 次（网络错误、限流）。失败时抛清晰错误。
 *
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
 * @param {object} [opts]
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxTokens]  上限（不传用 model 默认）
 * @param {boolean} [opts.jsonMode=false]  启用 JSON mode（response_format=json_object）
 * @returns {Promise<string>}  LLM 返回的文本
 */
export async function chat(messages, opts = {}) {
  const { temperature = 0.7, maxTokens, jsonMode = false } = opts;
  const { model } = requireLlmConfig();
  const client = getClient();

  return withRetry(async () => {
    const params = {
      model,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };
    const res = await client.chat.completions.create(params);
    const content = res.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`LLM 返回空内容（finish_reason: ${res.choices?.[0]?.finish_reason}）`);
    }
    return content;
  }, {
    retries: 3,
    baseDelayMs: 1000,
    shouldRetry: (err) => {
      // 不重试明确的"内容策略拒绝"类错误（4xx 业务错）
      const msg = err.message || '';
      if (/content_policy|policy|invalid_api_key|authentication/i.test(msg)) return false;
      return true;
    },
  });
}

/**
 * 发 chat 并把返回 parse 成 JSON（容错）。
 *
 * 等价于 chat(messages, { jsonMode: true }) + parseJsonLoose。
 * 用 jsonMode 让 LLM 倾向返 JSON，再加 parseJsonLoose 兜底处理 markdown 代码块。
 *
 * @template T
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts]  同 chat()，外加无新增
 * @returns {Promise<T>}
 */
export async function chatJson(messages, opts = {}) {
  const text = await chat(messages, { ...opts, jsonMode: true });
  return parseJsonLoose(text);
}

/** 简易 token 用量估算（粗略，4 字符 ≈ 1 token，中英文混合误差 ±20%）。 */
export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}
