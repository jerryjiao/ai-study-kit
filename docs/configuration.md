# Configuration · 配置指南

三个 AI CLI 的 `.env` 配置说明。要配的东西很少：LLM provider 任选一家（OpenAI / GLM / DeepSeek / Kimi / 通义 / 豆包），想做播客再配 TTS（当前仅 GLM-TTS）。全部走 OpenAI 兼容协议，换 provider 只改三个变量。

---

## TL;DR

```bash
cp .env.example .env
# 编辑 .env，至少配三项：
# LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   (或下面任一)
# LLM_API_KEY=your-key
# LLM_MODEL=glm-4.6                                   (或对应 model 名)
```

配完跑 `node apps/quiz-app/scripts/teach-generate.mjs --theme dev-intro` 验证。

---

## LLM Provider 选型

所有 provider 都通过 OpenAI 兼容协议接入——代码用 `openai` npm 包的 `baseURL` 参数切换。

### 国内推荐

| Provider | baseURL | 推荐 model | 特点 |
|----------|---------|-----------|------|
| **智谱 GLM**（推荐） | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6` | 中文好、便宜稳定、TTS 同 key |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | 国内最便宜、代码强 |
| **月之暗面 Kimi** | `https://api.moonshot.cn/v1` | `moonshot-v1-32k` | 长上下文 |
| **阿里通义千问** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 阿里生态 |
| **字节豆包** | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` | 字节生态 |

### 海外推荐

| Provider | baseURL | 推荐 model |
|----------|---------|-----------|
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`（性价比）/ `gpt-4o`（质量） |

### Claude / Gemini 等非 OpenAI 协议

当前不支持原生协议。通过 OpenAI 兼容代理接入：

- **LiteLLM Proxy**：开源，自部署，统一 100+ provider 协议
- **OpenRouter**：SaaS，统一接口，按用量付费

后续可能加 Anthropic / Google 原生 adapter。

---

## 错题拉取服务器（SERVER，可选）

`grill-wrong.mjs` 从 quiz-app 后端的 `/api/progress` 拉错题，默认连本地 `http://localhost:8787`。想把本地 CLI 指向线上自部署的服务器时改这里：

```bash
SERVER=https://your-server.example.com node apps/quiz-app/scripts/grill-wrong.mjs --theme your-theme
```

其他 CLI（teach / podcast）不联网拉数据，用不到这个变量。

---

## 输出语言（STUDY_LANG，可选）

三个 AI CLI 的**生成内容**语言，支持 `zh`（默认）/ `en` / `es` / `ru`：

```bash
STUDY_LANG=en   # .env 里配，或跑 CLI 时临时 STUDY_LANG=es node ...
```

命令行 `--lang` 参数优先于本环境变量。只影响生成的课程/精讲/播客内容与 HTML 固定文案，CLI 日志仍是中文；podcast 的 TTS 多语支持取决于 provider（建议先 `--no-tts`）。详见 [`docs/ai-cli-guide.md`](./ai-cli-guide.md) 的「输出语言」章节。

---

## TTS Provider 配置（仅 podcast-generate 需要）

当前只支持 **GLM-TTS**（智谱）。后续会加 OpenAI TTS / ElevenLabs。

### 配置

```bash
TTS_PROVIDER=glm-tts              # 默认值，可省略
GLM_TTS_API_KEY=your-glm-key      # 如果 LLM 用的就是 GLM，会自动复用 LLM_API_KEY
TTS_MALE_VOICE=male                # 可选，默认 male
TTS_FEMALE_VOICE=female            # 可选，默认 female
```

### 音色选项

GLM-TTS 支持的 voice 值（详见 [官方文档](https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts)）：

| Voice 值 | 风格 |
|----------|------|
| `male` / `female` | 通用男女声（CLI 默认，推荐起步） |
| `彤彤` / `小陈` / `锤锤` / `jam` / `kazi` / `douji` / `luodo` | 具体音色名 |

不同音色可能需要不同账号权限，先用 `male`/`female` 测试通过再试具体音色。

### 不想配 TTS？

用 `--no-tts` 跑 podcast-generate，只产对话脚本和逐字稿，后续用其他工具（如 NotebookLM、在线 TTS 网站）合成音频。

---

## 完整 .env 模板

见 [`.env.example`](https://github.com/jerryjiao/ai-study-kit/blob/main/.env.example)。复制并填值：

```bash
cp .env.example .env
```

---

## 配置加载机制

- 启动 CLI 时，`scripts/lib/llm.mjs` 自动加载两处 `.env`：仓库根（`ai-study-kit/.env`）和 `apps/quiz-app/.env`。前者优先。
- 缺失任何必填项时，CLI 会清晰打印缺什么、怎么配，然后 `exit(1)`——不会跑了一半失败。
- API key 永远不进 git（`.gitignore` 已排除 `.env`）。

---

## 验证配置

跑这个命令验证 LLM 配置：

```bash
node -e "
import('./apps/quiz-app/scripts/lib/llm.mjs').then(async (m) => {
  const r = await m.chat([{ role: 'user', content: '回复\"OK\"两个字' }]);
  console.log('LLM response:', r);
});
"
```

期望输出类似 `LLM response: OK`。如果报错，看错误信息——通常是 key 无效或 baseURL 写错。

TTS 验证：

```bash
node -e "
import('./apps/quiz-app/scripts/lib/tts.mjs').then(async (m) => {
  const r = await m.synthesize({ text: '测试', gender: 'female' });
  console.log('TTS bytes:', r.audio.length);
});
"
```

期望输出 `TTS bytes: 数字`（几万到几十万）。

---

## 常见配置错误

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `LLM 配置不完整` | `.env` 缺字段 | 检查 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 都填了 |
| `401 Unauthorized` | API key 无效或过期 | 重新生成 key |
| `404 Not Found` | baseURL 写错 | 检查 provider 文档，确认 baseURL 末尾 `/v1` 或 `/v4` |
| `model not found` | model 名错 | 检查 provider 文档，不同账号权限可用不同 model |
| `音色id不存在`（TTS） | voice 值错或不支持 | 改用 `male`/`female` 兜底 |
| `connect ETIMEDOUT` | 国内访问 OpenAI 等海外服务 | 换国内 provider，或配代理 |

---

## 安全提示

- `.env` 已在 `.gitignore`，永远不会进 git
- **不要**把 API key 写进代码或文档
- 如果 key 不小心提交了，立即在 provider 后台撤销并生成新的
- 部署到服务器时，用服务器的环境变量或 secret manager，不要传 `.env` 文件
