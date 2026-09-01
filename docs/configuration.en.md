# Configuration · the `.env` guide

[简体中文](configuration.md) · **English** · [Español](configuration.es.md) · [Русский](configuration.ru.md)

`.env` configuration for the three AI CLIs. There's little to configure: pick one LLM provider (OpenAI / GLM / DeepSeek / Kimi / Qwen / Doubao), and add TTS (GLM-TTS only, currently) if you want podcasts. Everything speaks the OpenAI-compatible protocol, so switching providers is three variables.

---

## TL;DR

```bash
cp .env.example .env
# edit .env — at minimum:
# LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   (or any provider below)
# LLM_API_KEY=your-key
# LLM_MODEL=glm-4.6                                   (or the matching model name)
```

Then verify with `node apps/quiz-app/scripts/teach-generate.mjs --theme dev-intro`.

---

## Choosing an LLM provider

All providers connect through the OpenAI-compatible protocol — the code switches via the `openai` npm package's `baseURL` parameter.

### Recommended in China

| Provider | baseURL | Recommended model | Notes |
|----------|---------|-------------------|-------|
| **Zhipu GLM** (recommended) | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6` | strong Chinese, cheap and stable, TTS on the same key |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | cheapest in China, strong at code |
| **Moonshot Kimi** | `https://api.moonshot.cn/v1` | `moonshot-v1-32k` | long context |
| **Alibaba Qwen** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | Alibaba ecosystem |
| **ByteDance Doubao** | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` | ByteDance ecosystem |

### Recommended elsewhere

| Provider | baseURL | Recommended model |
|----------|---------|-------------------|
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` (value) / `gpt-4o` (quality) |

### Claude / Gemini and other non-OpenAI protocols

Not natively supported today. Connect through an OpenAI-compatible proxy:

- **LiteLLM Proxy**: open source, self-hosted, unifies 100+ provider protocols
- **OpenRouter**: SaaS, one interface, usage-based billing

Native Anthropic / Google adapters may come later.

---

## Wrong-answer server (SERVER, optional)

`grill-wrong.mjs` pulls wrong answers from the quiz-app backend's `/api/progress`, defaulting to local `http://localhost:8787`. Point a local CLI at your deployed server by changing this:

```bash
SERVER=https://your-server.example.com node apps/quiz-app/scripts/grill-wrong.mjs --theme your-theme
```

The other CLIs (teach / podcast) don't fetch over the network; they don't use this variable.

---

## Output language (STUDY_LANG, optional)

The **generated content** language of the three AI CLIs, supporting `zh` (default) / `en` / `es` / `ru`:

```bash
STUDY_LANG=en   # set in .env, or ad hoc: STUDY_LANG=es node ...
```

The `--lang` CLI flag takes precedence over this env var. It only affects generated course/deep-dive/podcast content and fixed HTML strings; CLI logs stay in Chinese. Podcast TTS multilingual support depends on the provider (verify with `--no-tts` first). Details in the "Output language" section of [`ai-cli-guide.en.md`](./ai-cli-guide.en.md).

---

## TTS provider (only podcast-generate needs it)

Currently only **GLM-TTS** (Zhipu) is supported. OpenAI TTS / ElevenLabs may come later.

### Configuration

```bash
TTS_PROVIDER=glm-tts              # default, can be omitted
GLM_TTS_API_KEY=your-glm-key      # reused automatically from LLM_API_KEY if your LLM is GLM
TTS_MALE_VOICE=male                # optional, default male
TTS_FEMALE_VOICE=female            # optional, default female
```

### Voice options

GLM-TTS voice values (see the [official docs](https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts)):

| Voice value | Style |
|-------------|-------|
| `male` / `female` | generic male/female (CLI defaults, recommended start) |
| `彤彤` / `小陈` / `锤锤` / `jam` / `kazi` / `douji` / `luodo` | specific voices |

Different voices may need different account tiers — test `male`/`female` first.

### Don't want to configure TTS?

Run podcast-generate with `--no-tts`: script and transcript only; synthesize later with other tools (NotebookLM, online TTS).

---

## Full .env template

See [`.env.example`](https://github.com/jerryjiao/ai-study-kit/blob/main/.env.example). Copy and fill:

```bash
cp .env.example .env
```

---

## How configuration loads

- On CLI start, `scripts/lib/llm.mjs` auto-loads `.env` from two locations: the repo root (`ai-study-kit/.env`) and `apps/quiz-app/.env`. The root wins.
- If any required field is missing, the CLI prints exactly what's missing and how to configure it, then `exit(1)` — it never fails halfway.
- API keys never enter git (`.env` is already in `.gitignore`).

---

## Verifying your configuration

Verify the LLM config:

```bash
node -e "
import('./apps/quiz-app/scripts/lib/llm.mjs').then(async (m) => {
  const r = await m.chat([{ role: 'user', content: 'Reply with just: OK' }]);
  console.log('LLM response:', r);
});
"
```

Expect output like `LLM response: OK`. On error, read the message — usually an invalid key or a wrong baseURL.

Verify TTS:

```bash
node -e "
import('./apps/quiz-app/scripts/lib/tts.mjs').then(async (m) => {
  const r = await m.synthesize({ text: 'test', gender: 'female' });
  console.log('TTS bytes:', r.audio.length);
});
"
```

Expect `TTS bytes: <number>` (tens to hundreds of thousands).

---

## Common configuration errors

| Error message | Cause | Fix |
|---------------|-------|-----|
| `LLM 配置不完整` | `.env` missing fields | check that `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` are all set |
| `401 Unauthorized` | invalid or expired API key | regenerate the key |
| `404 Not Found` | wrong baseURL | check the provider docs; mind the trailing `/v1` or `/v4` |
| `model not found` | wrong model name | check the provider docs; available models vary by account tier |
| `音色id不存在` (TTS) | unsupported voice value | fall back to `male`/`female` |
| `connect ETIMEDOUT` | reaching overseas services from China | switch to a domestic provider, or use a proxy |

---

## Security notes

- `.env` is in `.gitignore` and never enters git
- **Never** write API keys into code or docs
- If a key leaks into a commit, revoke it in the provider console immediately and generate a new one
- When deploying, use server environment variables or a secret manager — don't upload the `.env` file
