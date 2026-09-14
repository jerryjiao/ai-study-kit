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

Los tres CLI de IA admiten `--json`: los registros legibles por humanos bajan a stderr y stdout entrega un único JSON de resultado (manifiesto de rutas de productos), pensado para que otros agentes / canalizaciones de scripts lo consuman (misma convención que `mastery-report --json`). Los caminos noop (p. ej. ahora no hay erróneas) también emiten JSON (`status: "noop"`), para que la canalización pueda ramificar.

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
- diagrama de mecanismo: mínimo un SVG en línea por lección — imagen grande, poco texto, solo el mecanismo (nodos + flechas para flujo / jerarquía / contraste)
- retroenlaces de fuentes: cada lección cierra con un bloque `📚 Fuentes` que enumera los enlaces autorizados — los recursos = los `resources` de `course-spec.json` fusionados con el `RESOURCES.md` del tema (la lista de recursos autorizados que conviene mantener en el flujo de teach), deduplicados por URL; la lista fusionada alimenta tanto las referencias de preparación del LLM como el pie de página (la cara de artefacto del principio «los conceptos se construyen con material de referencia»)
- captura del cuerpo de las referencias (v0.13): al generar el curso se captura el **texto de la página** de esos enlaces y se incorpora al contexto de preparación del LLM (el principio «los conceptos se construyen con material de referencia» pasa de la capa de citas a la de contenido — el texto capturado es la primera base de preparación); una caché local deduplica por URL (`apps/quiz-app/node_modules/.cache/teach-resources/`) para no repetir capturas al regenerar; si una fuente falla, se degrada a citar solo el URL sin interrumpir la generación
- enlaces prev/next que encadenan las lecciones

### Uso

```bash
pnpm run ai:teach -- --theme react-basics
pnpm run ai:teach -- --theme X --lessons 5   # 覆盖 lessonsCount
pnpm run ai:teach -- --theme X --lang en     # 课程用英语产
pnpm run ai:teach -- --theme X --json        # 机器可读输出（agent 消费）
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
7. **también produce el perfil del aprendiz**: el LLM registra además, por punto de examen, las causas de error (wrongReasons / advice) en `examples/<theme>/study/records/profile.json` (legible por máquinas; los clústeres que compartan algún id de pregunta se fusionan en el mismo punto y se acumulan). El perfil es un dato privado del aprendiz y nunca se publica con el build; la próxima ejecución de `mastery-report` o la sonda de `/ai-study-kit` lo recogen automáticamente, de modo que la recomendación se concreta: «EP-03 fallado 2 veces, causa: poca soltura combinando bits de permisos».

### Uso

```bash
# 前提：quiz-app 后端要跑着，且你已经刷过题、答过错题
pnpm run server  # 另一个终端

pnpm run ai:grill -- --theme react-basics
pnpm run ai:grill -- --max-clusters 5                # 最多分 5 簇
pnpm run ai:grill -- --lang es                       # 精讲用西语产
pnpm run ai:grill -- --json                          # 机器可读输出（agent 消费）
SERVER=http://my-server:8787 pnpm run ai:grill       # 拉远端错题
```

### Reglas de graduación de erróneas (idénticas a las de quiz-app)

| wrongCount | Umbral | Significado |
|------------|--------|-------------|
| 1 | 1 acierto | errónea nueva; con un acierto se saca de la lista |
| 2 | 2 aciertos | fallada dos veces; necesita 2 aciertos consecutivos para graduarse |
| 3+ | 3 aciertos | errónea de alta frecuencia; necesita 3 aciertos consecutivos para graduarse |

---

## mastery-report — informe de dominio por punto de examen (sin IA)

Herramienta complementaria de grill: **deriva de forma determinista** el dominio de cada punto de examen (el `examPoint` de las preguntas, EP-NN) a partir del banco de preguntas + el progreso de respuestas, sin LLM. La comparten personas y agentes: las personas leen la tabla, los agentes consumen `--json` (la línea «puntos débiles» de la sonda de `/ai-study-kit` sale de aquí).

### Criterios (cuatro estados)

| Estado | Criterio |
|--------|----------|
| dominado | todas las preguntas del punto respondidas, todas correctas en el último intento, sin erróneas sin graduar, y todas las tarjetas mapeadas graduadas |
| débil | tiene erróneas sin graduar, o algún fallo en el último intento |
| en curso | respondido parcialmente y sin evidencia negativa, o todo correcto pero con tarjetas mapeadas aún sin graduar |
| sin empezar | ninguna pregunta respondida |

Componente de graduación de tarjetas: las tarjetas de `flashcards.json` pueden llevar un `examPoint` opcional (EP-NN, el mismo espacio de nombres que las preguntas); en un punto mapeado, el dominio exige además que esas tarjetas estén graduadas en el SRS (`phase = review`). Los puntos sin mapeo no se ven afectados: el criterio retrocede a preguntas solamente. El panel «dominio por punto de examen» de la página principal de la web app muestra en vivo estos mismos criterios (`src/lib/mastery.ts`).

El informe se une con el perfil del aprendiz (`study/records/profile.json`, producido por grill): cada fila de punto lleva sus causas de error y el consejo. Los nombres de los puntos se analizan de la tabla de reparto de MISSION.md.
### Cuatro estados orales (v0.14, campo `oral` de `--json`)

Cada objetivo oral del registro de intentos orales (`study/records/oral-attempts.json`, detalle por pregunta añadido por la capa de chat) — todos los puntos de la tabla de reparto ∪ los puntos desnudos que aparezcan en el registro (conceptos nuevos aprendidos en chat, aún sin preguntas) — recibe un cuatro estados de **canal puramente oral**, calculado sin LLM:

| Estado | Criterio |
|--------|----------|
| Dominado | precisión ponderada reciente ≥ 0.85 (últimos 5 intentos con pesos 0.5/0.7/0.85/0.95/1.0, normalizados por la suma de pesos; los topes de 0.5/0.8 tras 1/2 respuestas lo hacen inalcanzable — un acierto por suerte no demuestra nada) |
| Débil | el intento más reciente falló (evidencia negativa primero), o puntuación ponderada < 0.5 |
| En progreso | hay respuestas, sin negativos, puntuación por debajo de la línea de dominio (p. ej. 2/2 correctas = 0.8) |
| Sin empezar | sin entradas en el registro |

`oral.weakRanked` permite al agente nombrar los objetivos orales débiles; al fusionar con el canal de preguntas manda la **evidencia negativa** (cualquier débil → débil), el canal de preguntas decide cuando tiene datos, y sin respuestas el canal oral como mucho eleva el punto a «en progreso» (la verificación llega resolviendo preguntas). El criterio existente de puntos de examen (tabla anterior) no cambia.
### Proyección del grafo de conocimiento (v0.14, `--graph` / `--write-projection`)

Con `--graph <ruta de graph.json>` (o la variable de entorno `KNOWFLOW_GRAPH_JSON`) el informe carga el grafo de conocimiento externo de knowflow y, combinado con el mapeo punto de examen↔nodo (`study/records/graph-map.json`, propuesto por el agente y confirmado por quien aprende), produce un **archivo de proyección de solo lectura**:

```bash
pnpm run mastery -- --graph /ruta/knowflow/graph/graph.json --write-projection
# → escribe mastery-projection.json junto a graph.json:
#   { version: 1, generatedAt, source, nodes: [{ id, mastery, oral: { asked, correct } }] }
```

El campo `graph` de `--json` aporta las señales del grafo: cuatro estados por nodo (nodos mapeados = estado del canal de preguntas fusionado con el oral, evidencia negativa primero; nodos sin mapear = canal puramente oral), recuentos mapeados y el resultado de la proyección. **Sin grafo / sin mapeo = degradación silenciosa** a la vista pura de puntos de examen (`graph.loaded = false`): no es un error; graph.json y las páginas de conocimiento jamás se modifican ni se les escribe de vuelta (el puente de proyección de ADR-0005).

**Prerrequisitos y orden de recomendación (`graph.weakPrereqs` / `graph.weakOrdered`)**: cuando las aristas del grafo llevan etiquetas de relación (vocabulario del etiquetador de relaciones de knowflow), el informe mapea las relaciones de clase prerrequisito (prerrequisito/dependencia/fuente/referencia/base/uso/parte-de/derivación) al orden de aprendizaje «aprender `to` primero» — `weakPrereqs` da la cadena de prerrequisitos de cada punto débil (con el estado de dominio de cada prerrequisito) y `weakOrdered` da un orden de recomendación que respeta los prerrequisitos (primero los prerrequisitos, de forma transitiva; los ciclos y las aristas sin etiqueta no participan). Los motivos de recomendación pasan de «practica EP-12» a «el prerrequisito EP-01 sigue débil, repásalo primero». Sin grafo / sin mapeo / sin aristas de prerrequisito → estos campos no aparecen, degradación silenciosa.




### Uso

```bash
pnpm run mastery                                # tabla legible por humanos (por defecto dev-intro)
pnpm run mastery -- --theme react-basics       # elegir tema (también admite rutas de paquetes externos)
pnpm run mastery -- --json                     # legible por máquinas (sonda de agentes)
pnpm run mastery -- --progress /tmp/p.json     # elegir archivo de progreso (por defecto apps/quiz-app/progress.json;
                                               #  para el progreso del servidor, antes curl -sf $SERVER/api/progress -o /tmp/p.json)
pnpm run mastery -- --panorama                  # panorama de puntos (v0.13): señales visto/practicado/dominado
                                               #  agrupadas por day + líneas de resumen (visto = registros de estudio
                                               #  ∪ lecciones completadas; practicado = respuestas o el registro de intentos orales;
                                               #  dominado = criterio de cuatro estados). Añade --json para agentes;
                                               #  la tarjeta «reportar progreso» del skill sale de aquí
```

Que no exista el archivo de progreso simplemente significa progreso vacío (todo sin empezar); no es un error.

---

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

# 机器可读输出（agent 消费）
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --no-tts --json
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
