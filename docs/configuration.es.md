# Configuración · la guía de `.env`

[简体中文](configuration.md) · [English](configuration.en.md) · **Español** · [Русский](configuration.ru.md)

Configuración de `.env` para los tres CLI de IA. Hay poco que configurar: elige un proveedor LLM (OpenAI / GLM / DeepSeek / Kimi / Qwen / Doubao) y, si quieres podcasts, añade TTS (por ahora solo GLM-TTS). Todo habla el protocolo compatible con OpenAI: cambiar de proveedor son tres variables.

---

## TL;DR

```bash
cp .env.example .env
# 编辑 .env，至少配三项：
# LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4   (或下面任一)
# LLM_API_KEY=your-key
# LLM_MODEL=glm-4.6                                   (或对应 model 名)
```

Al terminar, verifica con `node apps/quiz-app/scripts/teach-generate.mjs --theme dev-intro`.

---

## Elección del proveedor LLM

Todos los proveedores se conectan por el protocolo compatible con OpenAI — el código conmuta con el parámetro `baseURL` del paquete npm `openai`.

### Recomendados en China

| Proveedor | baseURL | model recomendado | Notas |
|-----------|---------|-------------------|-------|
| **Zhipu GLM** (recomendado) | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6` | bueno en chino, barato y estable, TTS con la misma key |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | el más barato de China, fuerte en código |
| **Moonshot Kimi** | `https://api.moonshot.cn/v1` | `moonshot-v1-32k` | contexto largo |
| **Alibaba Qwen (Tongyi)** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | ecosistema Alibaba |
| **ByteDance Doubao** | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` | ecosistema ByteDance |

### Recomendados fuera de China

| Proveedor | baseURL | model recomendado |
|-----------|---------|-------------------|
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` (relación calidad-precio) / `gpt-4o` (calidad) |

### Claude / Gemini y otros protocolos no OpenAI

Hoy no hay soporte nativo de sus protocolos. Conéctalos mediante un proxy compatible con OpenAI:

- **LiteLLM Proxy**: código abierto, autoalojado, unifica los protocolos de 100+ proveedores
- **OpenRouter**: SaaS, interfaz única, pago por uso

Puede que más adelante lleguen adaptadores nativos de Anthropic / Google.

---

## Servidor de erróneas (SERVER, opcional)

`grill-wrong.mjs` tira de `/api/progress` en el backend de quiz-app para obtener tus erróneas; por defecto se conecta al local `http://localhost:8787`. Cambia esta variable para apuntar el CLI local a tu propio servidor desplegado en línea:

```bash
SERVER=https://your-server.example.com node apps/quiz-app/scripts/grill-wrong.mjs --theme your-theme
```

Los otros CLI (teach / podcast) no tiran de datos por red; esta variable no les hace falta.

---

## Idioma de salida (STUDY_LANG, opcional)

El idioma del **contenido generado** por los tres CLI de IA; soporta `zh` (por defecto) / `en` / `es` / `ru`:

```bash
STUDY_LANG=en   # .env 里配，或跑 CLI 时临时 STUDY_LANG=es node ...
```

El parámetro de línea de comandos `--lang` prevalece sobre esta variable de entorno. Solo afecta al contenido generado de cursos/análisis/podcasts y a los textos fijos del HTML; los logs del CLI siguen en chino. El soporte multilingüe del TTS del podcast depende del proveedor (recomendado probar antes con `--no-tts`). Detalles en la sección «Idioma de salida» de [`docs/ai-cli-guide.es.md`](./ai-cli-guide.es.md).

---

## Configuración del proveedor TTS (solo la necesita podcast-generate)

Por ahora solo se soporta **GLM-TTS** (Zhipu). OpenAI TTS / ElevenLabs llegarán más adelante.

### Configuración

```bash
TTS_PROVIDER=glm-tts              # 默认值，可省略
GLM_TTS_API_KEY=your-glm-key      # 如果 LLM 用的就是 GLM，会自动复用 LLM_API_KEY
TTS_MALE_VOICE=male                # 可选，默认 male
TTS_FEMALE_VOICE=female            # 可选，默认 female
```

### Opciones de voz

Valores de voice que soporta GLM-TTS (detalles en la [documentación oficial](https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts)):

| Valor de voice | Estilo |
|----------------|--------|
| `male` / `female` | voces masculina/femenina genéricas (por defecto en el CLI, buen punto de partida) |
| `彤彤` / `小陈` / `锤锤` / `jam` / `kazi` / `douji` / `luodo` | nombres de voces concretas |

Las voces concretas pueden exigir distintos niveles de cuenta: prueba primero con `male`/`female` y cuando pase, prueba las específicas.

### ¿No quieres configurar TTS?

Ejecuta podcast-generate con `--no-tts`: produce solo el guion del diálogo y la transcripción, y sintetizas el audio después con otras herramientas (NotebookLM, sitios de TTS en línea).

---

## Plantilla completa de .env

Mira [`.env.example`](https://github.com/jerryjiao/ai-study-kit/blob/main/.env.example). Copia y rellena:

```bash
cp .env.example .env
```

---

## Cómo se carga la configuración

- Al arrancar un CLI, `scripts/lib/llm.mjs` carga automáticamente el `.env` de dos sitios: la raíz del repositorio (`ai-study-kit/.env`) y `apps/quiz-app/.env`. La raíz tiene prioridad.
- Si falta algún campo obligatorio, el CLI imprime con claridad qué falta y cómo configurarlo, y luego `exit(1)` — nunca falla a mitad de camino.
- Las API keys jamás entran en git (`.gitignore` ya excluye `.env`).

---

## Verifica tu configuración

Ejecuta este comando para verificar la configuración del LLM:

```bash
node -e "
import('./apps/quiz-app/scripts/lib/llm.mjs').then(async (m) => {
  const r = await m.chat([{ role: 'user', content: '回复\"OK\"两个字' }]);
  console.log('LLM response:', r);
});
"
```

Se espera una salida tipo `LLM response: OK`. Si falla, lee el mensaje de error — normalmente una key inválida o un baseURL mal escrito.

Verificación del TTS:

```bash
node -e "
import('./apps/quiz-app/scripts/lib/tts.mjs').then(async (m) => {
  const r = await m.synthesize({ text: '测试', gender: 'female' });
  console.log('TTS bytes:', r.audio.length);
});
"
```

Se espera `TTS bytes: <número>` (de decenas a cientos de miles).

---

## Errores de configuración comunes

| Mensaje de error | Causa | Solución |
|------------------|-------|----------|
| `LLM 配置不完整` (configuración LLM incompleta) | a `.env` le faltan campos | comprueba que `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` estén todos rellenos |
| `401 Unauthorized` | API key inválida o caducada | regenera la key |
| `404 Not Found` | baseURL mal escrito | mira la documentación del proveedor; cuida el `/v1` o `/v4` final |
| `model not found` | nombre de model erróneo | mira la documentación del proveedor; según el nivel de cuenta hay distintos models disponibles |
| `音色id不存在` (el id de voz no existe, TTS) | valor de voice erróneo o no soportado | vuelve al seguro `male`/`female` |
| `connect ETIMEDOUT` | acceder a OpenAI y otros servicios en el extranjero desde China | cambia a un proveedor de China, o configura un proxy |

---

## Notas de seguridad

- `.env` está en `.gitignore` y jamás entra en git
- **Nunca** escribas API keys en código o documentación
- Si una key se cuela accidentalmente en un commit, revócala de inmediato en la consola del proveedor y genera una nueva
- Al desplegar a un servidor, usa variables de entorno del servidor o un secret manager; no transmitas el archivo `.env`
