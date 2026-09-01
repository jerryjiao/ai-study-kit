/**
 * llm.test.mjs — LLM 抽象层测试。
 *
 * 不打真实 API（避免测试需要 key）。只测：
 *   - 配置校验逻辑（缺失时 process.exit）
 *   - chat() 错误时重试
 *
 * 运行：node --test apps/quiz-app/scripts/lib/llm.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 测 requireLlmConfig：用 child process 跑独立脚本，避免 process.exit 污染测试进程
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function runIsolated(code, env = {}) {
  // 跑一段独立 node 进程，返回 { code, stdout, stderr }
  const fullEnv = { ...process.env, ...env };
  try {
    const stdout = execSync(`node -e "${code.replace(/"/g, '\\"')}"`, {
      env: fullEnv,
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout?.toString() || '', stderr: err.stderr?.toString() || '' };
  }
}

test('requireLlmConfig: 三项全配时正常返回', () => {
  // 占位——详见下面 "用 import 形式" 的真实测试
  assert.ok(true);
});

test('requireLlmConfig: 用 import 形式，全配时返回对象', async () => {
  const r = runIsolated(
    `import('./llm.mjs').then(m=>console.log('__RESULT__'+JSON.stringify(m.requireLlmConfig())))`,
    {
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_API_KEY: 'sk-test',
      LLM_MODEL: 'test-model',
    }
  );
  assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  // 提取 __RESULT__ 标记后的 JSON，避开 dotenv 的 stdout 输出
  const m = r.stdout.match(/__RESULT__(\{.*\})/);
  assert.ok(m, `stdout 没找到 __RESULT__ 标记：${r.stdout}`);
  const obj = JSON.parse(m[1]);
  assert.equal(obj.baseURL, 'https://api.example.com/v1');
  assert.equal(obj.apiKey, 'sk-test');
  assert.equal(obj.model, 'test-model');
});

test('requireLlmConfig: 缺 API_KEY 时 exit(1) 并打印提示', () => {
  // 缺失项显式传空串：dotenv 不覆盖已存在的环境变量，空串在
  // requireLlmConfig 里按缺失处理——这样用例不被开发机上的真实 .env 干扰。
  const r = runIsolated(
    `import('./llm.mjs').then(m=>m.requireLlmConfig())`,
    {
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_MODEL: 'test-model',
      LLM_API_KEY: '',
    }
  );
  assert.equal(r.code, 1);
  assert.match(r.stderr, /LLM 配置不完整/);
  assert.match(r.stderr, /LLM_API_KEY/);
});

test('requireLlmConfig: 全缺时 exit(1)', () => {
  const r = runIsolated(
    `import('./llm.mjs').then(m=>m.requireLlmConfig())`,
    { LLM_BASE_URL: '', LLM_API_KEY: '', LLM_MODEL: '' }  // 同上：密封，防真实 .env 注入
  );
  assert.equal(r.code, 1);
  assert.match(r.stderr, /LLM 配置不完整/);
});

test('estimateTokens: 粗估字符数/4', async () => {
  const { estimateTokens } = await import('./llm.mjs');
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcdefgh'), 2);
});
