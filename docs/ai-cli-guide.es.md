# Guía de CLI con IA · las tres herramientas de línea de comandos

[简体中文](ai-cli-guide.md) · [English](ai-cli-guide.en.md) · **Español** · [Русский](ai-cli-guide.ru.md)

ai-study-kit incluye tres CLI de IA que convierten el material de estudio en tres productos del ciclo: `teach-generate` produce cursos, `grill-wrong` produce análisis a fondo de erróneas y `podcast-generate` produce podcasts de repaso. Todos funcionan con tus propias API keys de LLM/TTS y soportan cualquier servicio con protocolo compatible OpenAI (OpenAI / Zhipu GLM / DeepSeek / Kimi / Qwen / Doubao, etc.).

Los tres CLI tienen un comando abreviado en la raíz del repositorio; esta guía usa las formas cortas (equivalentes a `node apps/quiz-app/scripts/<script>.mjs`):

| Comando abreviado | Script | Salida |
|-------------------|--------|--------|
| `pnpm run ai:teach` | `teach-generate.mjs` | HTML de curso (`lessons/*.html`) |
| `pnpm run ai:grill` | `grill-wrong.mjs` | HTML de análisis de erróneas (`study/wrong-questions/*.html`) |
| `pnpm run ai:podcast` | `podcast-generate.mjs` | guion de podcast + transcripción + audio (`podcast-out/`) |

---

## Inicio rápido

### 1. Configura una API key

```bash
cp .env.example .env
# 编辑 .env，至少配 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三项
```

Las opciones completas de proveedor y sus explicaciones están en [`configuration.es.md`](./configuration.es.md).

### 2. Arranca el backend de quiz-app (grill lo necesita)

```bash
pnpm run server  # 在另一个终端，跑 :8787
```

### 3. Ejecuta los tres CLI

```bash
# A. 生成课程（从 course-spec.json）
pnpm run ai:teach -- --theme dev-intro

# B. 生成错题精讲（从服务器拉错题）
pnpm run ai:grill -- --theme dev-intro

# C. 生成播客（从任一学习素材）
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html
```

---

## teach-generate — genera un curso

Convierte la especificación del tema (mission + resources + audience) en un curso HTML autónomo de varias lecciones.

### Entrada

`examples/<theme>/course-spec.json`:

```json
{
  "theme": "react-basics",
  "mission": "学完能独立写一个 React 组件库",
  "audience": "有 JS 基础、第一次学 React 的开发者",
  "depth": "beginner",                          // beginner | intermediate | advanced
  "lessonsCount": 3,                            // 想要几节课
  "outline": ["Hooks 基础", "状态管理", "组件设计"],  // 可选，不填让 LLM 自动拆
  "resources": [                                // 可选，权威材料链接
    { "title": "React 官方文档", "url": "https://react.dev" }
  ]
}
```

### Salida

`examples/<theme>/lessons/0001-<slug>.html`, `0002-<slug>.html`…:

- cada lección es HTML autónomo (comparten `../assets/styles.css` por enlace)
- estructura: h1 + meta + lead + varios h2 + callouts (punto clave / aviso / truco) + quiz-anchor
- enlaces prev/next que encadenan las lecciones

### Uso

```bash
pnpm run ai:teach -- --theme react-basics
pnpm run ai:teach -- --theme X --lessons 5   # 覆盖 lessonsCount
pnpm run ai:teach -- --theme X --lang en     # 课程用英语产
```

Sin `--theme`, el valor por defecto es `dev-intro`. Referencia: [`examples/dev-intro/course-spec.json`](https://github.com/jerryjiao/ai-study-kit/blob/main/examples/dev-intro/course-spec.json).

---

## grill-wrong — genera el análisis a fondo de erróneas

Tus respuestas erróneas del servidor, agrupadas por punto de examen con un LLM y expandidas a fondo clúster por clúster.

### Flujo

1. `GET /api/progress` obtiene tu lista de erróneas (la variable de entorno `SERVER` selecciona el backend)
2. se une con `examples/<theme>/questions.json` para obtener el enunciado completo
3. el LLM agrupa las erróneas por «punto de examen» (p. ej. «git reset vs revert» ×3, «códigos de estado HTTP» ×2)
4. por clúster, el LLM produce un HTML de análisis profundo (tabla de diferencias clave + diagrama de decisión + avisos de errores frecuentes + entrenamiento con variantes)
5. se escribe en `examples/<theme>/study/wrong-questions/cluster-NN-<slug>.html` (lo producido en la ubicación antigua `wrong-questions/` se reconoce y migra automáticamente)
6. se actualiza `examples/<theme>/study/wrong-questions/index.html`, la portada del centro de erróneas

### Uso

```bash
# 前提：quiz-app 后端要跑着，且你已经刷过题、答过错题
pnpm run server  # 另一个终端

pnpm run ai:grill -- --theme react-basics
pnpm run ai:grill -- --max-clusters 5                # 最多分 5 簇
pnpm run ai:grill -- --lang es                       # 精讲用西语产
SERVER=http://my-server:8787 pnpm run ai:grill       # 拉远端错题
```

### Reglas de graduación de erróneas (idénticas a las de quiz-app)

| wrongCount | Umbral | Significado |
|------------|--------|-------------|
| 1 | 1 acierto | errónea nueva; con un acierto se saca de la lista |
| 2 | 2 aciertos | fallada dos veces; necesita 2 aciertos consecutivos para graduarse |
| 3+ | 3 aciertos | errónea de alta frecuencia; necesita 3 aciertos consecutivos para graduarse |

---

## podcast-generate — genera un podcast de repaso

Convierte cualquier material de estudio (HTML de curso / preguntas / análisis de erróneas) en un podcast dialogado con presentador y presentadora.

### Entrada

`--input` recibe un archivo; el script detecta el formato automáticamente:

| Formato | Tratamiento |
|---------|-------------|
| `.html` | se quitan las etiquetas, se extraen el título y el cuerpo |
| `.md` | tal cual |
| `.json` (questions.json) | cada pregunta se formatea como «enunciado + opciones + respuesta + explicación» |
| `.txt` | tal cual |

### Salida (trío de piezas, escrito en `podcast-out/`)

| Archivo | Contenido |
|---------|-----------|
| `<slug>-script.json` | guion del diálogo (estructurado: title / source / generatedAt / array script) |
| `<slug>-transcript.md` | transcripción en Markdown (marcas 👩 presentadora / 👨 presentador) |
| `<slug>.wav` | audio sintetizado a dos voces (salvo con `--no-tts`) |

### Uso

```bash
# 基础用法
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html

# 控制段数和风格
pnpm run ai:podcast -- --input examples/dev-intro/questions.json \
  --segments 15 --style interview

# 只产脚本不合成音频（省 TTS 成本）
pnpm run ai:podcast -- \
  --input examples/dev-intro/study/wrong-questions/cluster-01-*.html --no-tts

# 对白用其他语言产（先 --no-tts 验证脚本，见下方「输出语言」）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --lang ru --no-tts
```

### Opciones de estilo (`--style`)

| Valor | Estilo |
|-------|--------|
| `conversational` (por defecto) | conversación relajada entre dos: se complementan, se preguntan, ponen ejemplos |
| `lecture` | un presentador lleva la voz cantante y el otro complementa, pregunta y resume |
| `interview` | uno hace de experto y el otro de entrevistador que pregunta |

### Configuración de TTS

La síntesis de audio necesita un proveedor TTS configurado (GLM-TTS por defecto); mira [`configuration.es.md`](./configuration.es.md). El modo `--no-tts` produce solo el guion + la transcripción, sin llamar a TTS — más barato, o sintetiza después con otras herramientas (NotebookLM etc.).

---

## Idioma de salida (`--lang` / `STUDY_LANG`)

Los tres CLI permiten especificar el idioma de salida del **contenido generado**:

```bash
pnpm run ai:teach   -- --theme X --lang en   # 英语课程
pnpm run ai:grill   -- --theme X --lang es   # 西语错题精讲
pnpm run ai:podcast -- --input Y --lang ru   # 俄语播客对白

# 或统一走环境变量（.env 可配）
STUDY_LANG=en pnpm run ai:teach -- --theme X
```

Soporta `zh` (por defecto) / `en` / `es` / `ru`. El registro de lenguas vive en [`scripts/lib/langs.mjs`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/scripts/lib/langs.mjs); añadir una lengua nueva es añadir una entrada al registro.

Convenciones de comportamiento:

- `--lang` solo afecta al **contenido generado** (cuerpo del curso, esquema, cuerpo del análisis, diálogos/títulos del podcast) y a los textos fijos del HTML generado (navegación lección anterior/siguiente, pie de página, atributo `<html lang>`, nombres de los presentadores en la transcripción);
- los logs/errores de los propios CLI siguen en chino (quien los opera es el mantenedor);
- el texto original del banco (enunciados/opciones) nunca se traduce — las citas dentro del análisis quedan literales, a propósito: las preguntas y explicaciones deben coincidir con las que practicaste;
- **aviso sobre el podcast**: el TTS por ahora solo integra GLM-TTS; que un diálogo no chino llegue a sintetizarse depende del soporte multilingüe del proveedor. Recomendación: revisa primero el guion con `--lang X --no-tts` y sintetiza el audio cuando confirmes que el TTS lo soporta.

Los idiomas de la UI de la app de práctica (conmutador zh/EN/ES/RU en la barra superior) son otro mecanismo; véase la sección «Multilingüe» del README.

---

## Se puede usar sin IA

Los tres CLI son **capacidad incremental**, no un requisito. Si solo quieres usar ai-study-kit como app de práctica + tarjetas, puedes perfectamente no configurar LLM ni correr CLI: `pnpm dev` basta. Las capacidades asistidas por IA — lecciones de curso, análisis profundo de erróneas, podcasts de repaso — se desbloquean todas con una sola API key.

---

## Filosofía de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Proveedor LLM | protocolo compatible OpenAI + baseURL | un solo código cubre el 95 % de los proveedores nacionales e internacionales (OpenAI/GLM/DeepSeek/Kimi/Qwen/Doubao) |
| Interfaz de configuración | tres variables de `.env` (`LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL`) | lo mínimo, gestión en un solo archivo |
| Robustez | `parseJsonLoose` + 3 reintentos con retroceso exponencial + errores claros | los LLM devuelven a menudo «JSON falso» o limitan peticiones; hay que tolerarlo |
| Tests | funciones puras extraídas a `lib/`, unit-test con `node:test` | la llamada al LLM no es unit-testeable, pero toda la lógica de alrededor sí se prueba |
| Sin atadura a un cliente de IA | CLI en lugar de un agent skill | sirven para usuarios de ZCode / Claude Code / Cursor, e incluso para CI |

La estructura del espacio de trabajo del tema (`MISSION.md` / `RESOURCES.md` / `lessons/`) y parte de la disciplina de redacción de preguntas (opciones de igual longitud, el formato no da pistas) provienen del flujo de trabajo del skill teach; nuestro agradecimiento.

El trasfondo metodológico completo está en [`methodology.es.md`](./methodology.es.md); los tres CLI son su plasmación en ingeniería.

---

## Preguntas frecuentes

**P: Al correr un CLI salta «LLM 配置不完整» (configuración LLM incompleta)**
R: A `.env` le faltan campos. Copia `.env.example` como `.env` y rellena los tres: `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`. Detalles en [`configuration.es.md`](./configuration.es.md).

**P: El JSON que devuelve el LLM no se deja parsear**
R: `parseJsonLoose` ya tolera mucho (extrae `{...}`, quita bloques de código markdown). Si aun así falla, la salida del LLM se desvió de grave — prueba otro model (`gpt-4o-mini` / `glm-4.6` / `deepseek-chat` son todos estables).

**P: La síntesis TTS es lentísima**
R: GLM-TTS tarda ~5-10 s por segmento; un diálogo de 12 segmentos, ~2 min. Si quieres rapidez, usa `--no-tts` para producir solo el guion y sintetiza después con otra herramienta.

**P: La calidad del curso/análisis generado es pobre**
R: Ajusta los campos `audience` / `depth` / `resources` de `course-spec.json` — cuanto más concreta la audiencia y mejores los recursos, mejor la salida. También puedes tocar `--segments` (podcast) o `--lessons` (teach) para controlar el grano.

**P: Quiero conectar Claude / Gemini / otro proveedor con protocolo no OpenAI**
R: La capa de abstracción actual solo soporta protocolos compatibles con OpenAI. Claude y Gemini tienen proxies compatibles con OpenAI (LiteLLM Proxy, OpenRouter); conéctalos a través de uno de ellos. Puede que más adelante lleguen adaptadores nativos.
