<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · [English](README.en.md) · **Español** · [Русский](README.ru.md)

> Convierte cualquier banco de preguntas en un ciclo de aprendizaje completo — práctica + cursos + tarjetas + análisis a fondo de errores + repetición espaciada, con el progreso sincronizado entre dispositivos. Prueba el demo en 5 minutos; hazlo tuyo en 30.

<p align="center">
  <a href="https://jerryjiao.github.io/ai-study-kit/"><img src="https://img.shields.io/badge/web-online-blue" alt="Sitio web" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="Estado del deploy" /></a>
  <img src="https://img.shields.io/badge/i18n-4%20idiomas-blue" alt="Interfaz en 4 idiomas" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [Sitio web](https://jerryjiao.github.io/ai-study-kit/) · ▶️ [Demo en vivo](https://jerryjiao.github.io/ai-study-kit/demo/) · 📖 [Primeros pasos](https://jerryjiao.github.io/ai-study-kit/es/get-started/)

---

## 👋 Para quién es esto

| Tú eres… | Te sirve |
|------|---------|
| 🧑‍💻 **Dev aprendiendo una tecnología nueva** (React / K8s / Rust) | ✅ Convierte la documentación oficial en preguntas, practícalas y fíjalas con tarjetas |
| 📚 **Estudiando para un examen** (asignatura / oposición / certificación) | ✅ Tu banco de preguntas real + análisis generados por IA sobre tus erróneas |
| 🎯 **Preparando entrevistas** (fundamentos / diseño de sistemas) | ✅ Redacta tus propias preguntas, deja que la IA genere los cursos y repasa con SRS |
| 🗂️ **Aprendiendo cualquier cosa con «puntos de examen»** (cumplimiento / procesos / terminología) | ✅ Si se puede descomponer en «pregunta + respuesta», se puede estudiar |
| ❌ Buscas un banco de preguntas ya hecho («500 preguntas de Java») | ❌ Esto es un **andamiaje**: no incluye ni una pregunta real — tú traes las preguntas o las generas con IA |

**En una frase**: esto es un **andamiaje**, no un banco de preguntas. Tú traes las preguntas; la herramienta las convierte en una app de estudio con cursos, tarjetas y análisis de errores.

---

## 🤖 Forma recomendada de empezar: instala el plugin — sin clonar nada

Instala todo el kit en tu agente de IA (zcode / Claude Code). **Sin clonar el repo y sin memorizar comandos** — el plugin incluye una instantánea completa y construible de la app, y el agente te acompaña de cero a un sitio de estudio funcionando, generando preguntas y cursos por el camino:

```
/plugin marketplace add https://github.com/jerryjiao/ai-study-kit
# instala ai-study-kit y dile «quiero aprender X» (o /ai-study-kit) en una nueva sesión
```

Tu proyecto de estudio (copia de la app + tus paquetes de tema) vive por completo en tu propio directorio y sobrevive a las actualizaciones del plugin. Nueve flujos cubiertos de principio a fin: arranque, tema nuevo, estudio diario, repaso de errores, pódcast, generación de cursos, verificación y despliegue — ver [`docs/ai-study-kit.md`](docs/ai-study-kit.md).

¿Solo quieres ver cómo es? Sigue la ruta de clonación de abajo.

---

## 🚀 Prueba el demo en 5 minutos (ruta clone, para desarrolladores)

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# abre http://localhost:5173
```

**Lo que verás** (el tema de ejemplo dev-intro: git + bases de Linux):

| Pestaña superior | Qué muestra |
|---------|-------------|
| **Práctica** | 10 preguntas de git/Linux (opción múltiple simple / múltiple / V-F), corregidas al instante. Las erróneas van al cuaderno de errores; las acertadas muestran la explicación |
| **Tarjetas** | 4 tarjetas de repetición espaciada SM-2. Califícalas again / hard / good / easy — el algoritmo es compatible con Anki |
| **Cursos** | 2 lecciones HTML autónomas (las tres zonas de git; directorios y permisos de Linux) con diagramas ASCII y recuadros de aviso |

> Es solo un demo. **Ningún contenido de dev-intro es para ti** — lo reemplazarás por el tema que realmente estés estudiando.

---

## 🧭 ¿No sabes qué hacer ahora? `/ai-study-kit`

Con el plugin instalado arriba (o con `pnpm run skill:install` en `~/.agents/skills/`), cada sesión de estudio puede empezar aquí.

Primero **escanea tu estado de estudio** (tema actual, inventario de preguntas/tarjetas/cursos, progreso, tarjetas vencidas, cantidad de erróneas, configuración de IA); luego **te recomienda la única cosa más útil de hacer ahora** — empezar un tema nuevo, repasar tarjetas vencidas, practicar preguntas o convertir tus erróneas acumuladas en un análisis a fondo — y al elegir, **te guía paso a paso**. Nueve guías cubren desde inicializar el proyecto hasta desplegarlo. (Las guías están escritas en chino; ver [`docs/ai-study-kit.md`](docs/ai-study-kit.md).)

---

## 🔧 Hazlo tuyo en 30 minutos

Ejemplo práctico: aprender **bases de React**. Solo tocas archivos bajo `examples/` — **sin tocar el código de `apps/quiz-app/`**.

### Paso 1 · Copia el directorio del tema (1 min)

```bash
cp -r examples/dev-intro examples/react-basics
```

> **¿No quieres meter contenido en el repo del kit?** El paquete de tema puede vivir en tu propio proyecto: `cp -r examples/dev-intro /ruta/a/tu-proyecto/theme/react-basics`, y luego pasa esa ruta donde se espere `EXAMPLE_THEME` (un valor con separadores de ruta se trata como paquete de tema externo — los cuatro scripts lo entienden: sincronía de build / generación de cursos / repasos de errores). El repo del kit queda puro y se usa solo como herramienta — ver [`docs/adr/0004`](docs/adr/0004-external-theme-packs.md).

### Paso 2 · Escribe tus preguntas (10 min)

Edita `examples/react-basics/questions.json` — reemplaza las preguntas de git/Linux por las tuyas de React. El esquema es simple:

```json
{
  "id": "R-001",                      // id único global y estable (el progreso se guarda por él)
  "type": "single",                    // single | multi | judge
  "source": "react-basics",            // etiqueta del origen de la pregunta
  "topic": "react-basics",             // agrupación por tema (la página de inicio agrupa por esto)
  "question": "¿Qué devuelve useState en React?",
  "options": {
    "A": "El valor actual del estado",
    "B": "Una función que actualiza el estado",
    "C": "Un array [state, setState]",
    "D": "Un objeto { state, setState }"
  },
  "answer": ["C"],
  "analysis": "useState devuelve un array de dos elementos: el estado actual y la función que lo actualiza. Suele usarse con destructuring: const [count, setCount] = useState(0)."
}
```

Todos los campos, incluidos los opcionales `day` (etiqueta de día de estudio) y `examPoint` (id del punto de examen — el chequeo de alineación cuádruple los concilia con la tabla de puntos de la MISSION), están en la interfaz `Question` de [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts).

### Paso 3 · Escribe tus tarjetas (5 min)

Edita `examples/react-basics/flashcards.json`:

```json
{
  "id": "FC-R-01",
  "front": "¿Cuál es el valor de retorno de useState?",
  "back": "Un array [state, setState].\n\nUso: const [count, setCount] = useState(0).",
  "source": "react-basics",
  "topic": "react-basics"
}
```

### Paso 4 · Cambia de tema (1 min)

```bash
EXAMPLE_THEME=react-basics pnpm dev
# recarga el navegador — tus preguntas de React ya están dentro
```

### Paso 5 · (Opcional) Cursos + presentación del inicio (10 min)

- **Cursos**: reemplaza `examples/react-basics/lessons/*.html` por los tuyos (la IA puede ayudar — ver la sección siguiente). La entrada de cursos sigue automáticamente el tema activo (`EXAMPLE_THEME`), sin tocar código.
- **Presentación**: edita `examples/react-basics/theme-config.json` — un archivo opcional que controla el orden de agrupación del inicio (`topicOrder`), los nombres visibles (`topicLabels`), la expansión de subtemas (`subtopics`), las insignias de origen (`sourceLabels`), las capas núcleo/ampliación (`sourceLayers` + `layerTopics`), las insignias de profundidad (`epDepth`) y los colores e iconos de las tarjetas (`topicStyles`). Sin él, la app retrocede con elegancia: ids de tema crudos, orden alfabético, sin subtemas. Referencia completa de campos y ejemplos: [`docs/theming.md`](docs/theming.md).

### Paso 6 · Valida (2 min)

```bash
pnpm run scan       # escaneo de marcas (0 coincidencias = limpio)
pnpm test           # los 5 archivos de tests deben pasar
pnpm run build      # el build debe funcionar
python3 scripts/bidirectional-check.py examples/react-basics/  # chequeo de alineación cuádruple (concilia con la tabla de puntos de examen de la MISSION)
```

**Listo.** En ningún momento tocaste código React — solo JSON y HTML.

### Deja que un agente de IA escriba las preguntas (opcional)

¿No quieres redactar JSON a mano? Instala `/ai-study-kit` (sección «🧭 ¿No sabes qué hacer ahora?» más arriba) y pide que genere un banco de preguntas para react-basics. El agente sigue un flujo disciplinado: primero alinea contigo una **tabla de puntos de examen** en MISSION.md — qué se examina, con qué profundidad, cuántas preguntas de cada tipo, cuántas tarjetas — y tras tu confirmación genera preguntas y tarjetas punto por punto, cerrando con las tres puertas de calidad (`qa` / `scan` / alineación cuádruple); solo entrega si todo está en verde. El camino manual sigue siendo el principal: ambos caminos producen lo mismo, y la tabla de puntos es el contrato entre tú y el agente.

---

## 🤖 Ir más allá: deja que la IA genere cursos / análisis de errores / pódcast

A estas alturas ya tienes una app funcional. El valor real de ai-study-kit es el **ciclo completo de aprendizaje asistido por IA** — no redactas a mano los cursos ni los análisis de errores: los genera la IA.

El repositorio incluye tres herramientas de línea de comandos con IA:

| CLI | Qué hace | Entrada | Salida |
|-----|-------|------|------|
| **`teach-generate.mjs`** | Estructura una especificación de tema en cursos HTML de varias secciones | `examples/<theme>/course-spec.json` | `lessons/0001-*.html` etc. |
| **`grill-wrong.mjs`** | Tras una ronda de práctica, agrupa tus erróneas por punto de examen y desarrolla cada grupo a fondo | erróneas obtenidas de `/api/progress` | `wrong-questions/cluster-*.html` |
| **`podcast-generate.mjs`** | Convierte cualquier material de estudio en un pódcast de dos locutores | cualquier material (HTML/MD/JSON) | `.wav` + guion JSON + transcripción MD |

**Funciona con cualquier LLM compatible con OpenAI**: Zhipu GLM (recomendado en China continental) / OpenAI / DeepSeek / Kimi / Qwen / Doubao. El TTS admite por ahora GLM-TTS.

### Configuración

```bash
cp .env.example .env
# edita .env — como mínimo LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
# detalles en docs/configuration.md (en chino)
```

### Ejecutar los tres CLI

```bash
# arranca primero el backend de quiz-app (grill-wrong lo necesita)
pnpm run server

# 1. generar cursos
node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics

# 2. tras practicar, generar el análisis de erróneas
node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics

# 3. convertir una lección en pódcast
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/react-basics/lessons/0001-hooks.html
```

**Flujo de trabajo típico**:

```
1. Eliges un tema + reúnes recursos autorizados (libros / documentación / vídeos)
2. Escribes course-spec.json → teach-generate produce lessons/*.html (explicación sistemática)
3. Redactas las preguntas a mano → questions.json (validación con práctica)
4. Practicas → las erróneas van al cuaderno de errores
5. grill-wrong → HTML con el análisis a fondo de las erróneas
6. podcast-generate → repasa escuchando en el transporte
```

Uso completo de los CLI, parámetros y FAQ en [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) (en chino). Detalles de configuración en [`docs/configuration.md`](docs/configuration.md) (en chino).

> 💡 **La IA es opcional**: los tres CLI son capacidades incrementales. Si solo quieres el sitio de práctica + tarjetas, no configures ningún LLM — `pnpm dev` basta.

---

## 🌍 Idiomas

**Este README**: 简体中文 / [English](README.en.md) / [Español](README.es.md) / [Русский](README.ru.md) — cambia arriba.

**La interfaz**: cambio con un clic entre **中文 / English / Español / Русский** en la barra superior.

- La primera visita detecta el idioma del navegador; la preferencia se sincroniza entre dispositivos (el mismo mecanismo LWW que el tema)
- `<html lang>` y el título de la página siguen el idioma activo (amable con lectores de pantalla y traductores)
- Los diccionarios viven en [`apps/quiz-app/src/i18n/locales/`](apps/quiz-app/src/i18n/locales/); en/es/ru están anclados por tipos al conjunto de claves de zh — una clave que falte rompe la compilación, y hay tests de completitud de claves + marcadores de posición como segunda red

**Contenido generado por IA**: los tres CLI aceptan un idioma de salida:

```bash
node apps/quiz-app/scripts/teach-generate.mjs   --theme X --lang en  # cursos en inglés
node apps/quiz-app/scripts/grill-wrong.mjs      --theme X --lang es  # análisis de erróneas en español
node apps/quiz-app/scripts/podcast-generate.mjs --input Y --lang ru  # diálogos del pódcast en ruso
# o define STUDY_LANG=en en .env como default (admite zh/en/es/ru)
```

`--lang` afecta al contenido generado y a los textos fijos del HTML generado (navegación, pie, `<html lang>`). Los registros del CLI siguen en chino; el banco de preguntas nunca se traduce. Ver la sección «输出语言» de [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md).

> **El idioma de tus preguntas y tarjetas** lo decide tu data — lo que escribas en `examples/<theme>/*.json` es lo que se muestra. ¿Quieres un sitio 100 % en español? Redacta las preguntas en español y genera los cursos con `--lang es`. La herramienta no te encasilla.

---

## 🎯 Por qué esta herramienta

| Sin ai-study-kit | Con ai-study-kit |
|-------------------|-----------------|
| **Anki**: tarjetas excelentes, pero sin sitio de práctica, sin análisis de erróneas, sin cursos | 5 artefactos de estudio en una sola app, todos alineados con el mismo conjunto de puntos de examen |
| **Quizlet**: tiene preguntas y tarjetas, pero es SaaS cerrado — tus datos no están en tus manos | Open source MIT; los datos quedan en local + tu servidor; sincronización sin cuentas |
| **Notas en Notion**: sirven para registrar, pero sin práctica ni algoritmo de repetición espaciada | SM-2 compatible con Anki + pasos de aprendizaje de Anki integrados |
| **PDF / Word con preguntas**: solo lectura — sin corrección ni estadísticas | corrección automática, cuaderno de erróneas, estadísticas de precisión, planificación SRS |
| **Preguntar directo a ChatGPT**: conocimiento disperso, sin ruta de aprendizaje | la IA estructura el conocimiento disperso en cursos + preguntas + tarjetas |

**El diferenciador central**: el **ciclo de alineación cuádruple** — los puntos de examen que enseñan los cursos, que evalúan las preguntas, que fijan las tarjetas y que desarrollan los análisis de erróneas son el mismo conjunto (ver [docs/four-alignment.md](docs/four-alignment.md), [versión en español en la web](https://jerryjiao.github.io/ai-study-kit/es/method/four-alignment/)). Terminas una lección y las preguntas correspondientes ya están ahí; fallas una y el análisis está a un comando de distancia.

---

## 📚 Documentación

> La documentación del repositorio está escrita en chino. La [web](https://jerryjiao.github.io/ai-study-kit/) está disponible en cuatro idiomas —chino, inglés, español y ruso— y su portada abre automáticamente la versión que coincide con el idioma de tu navegador; las páginas centrales están traducidas y el resto cae al chino con un aviso. La traducción automática del navegador funciona bastante bien con estos documentos.

| Documento | Qué aprenderás |
|------|-----------|
| [Primeros pasos](https://jerryjiao.github.io/ai-study-kit/es/get-started/) | demo en 5 minutos + hazlo tuyo |
| [Methodology](https://jerryjiao.github.io/ai-study-kit/es/method/methodology/) | temario → materiales → preguntas |
| [Four alignment](https://jerryjiao.github.io/ai-study-kit/es/method/four-alignment/) | cómo se mantienen sincronizados cursos / preguntas / tarjetas / análisis |
| [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) | uso completo de los tres CLI de IA (en chino) |
| [`docs/ai-study-kit.md`](docs/ai-study-kit.md) | `/ai-study-kit`: instalación, enrutado, extensión (en chino) |
| [`docs/configuration.md`](docs/configuration.md) | `.env`: proveedores de LLM + TTS (en chino) |
| [`docs/bidirectional-check.md`](docs/bidirectional-check.md) | verificaciones cruzadas automatizadas (en chino) |
| [`AGENTS.md`](AGENTS.md) | convenciones de colaboración con IA: estructura / comandos / reglas (en chino) |
| [`examples/dev-intro/`](examples/dev-intro/) | ejemplo completo: preguntas + tarjetas + cursos + análisis |

---

## 🛠️ Comandos de desarrollo

```bash
# raíz del repositorio
pnpm install          # instalar dependencias
pnpm run dev          # arrancar (frontend :5173 + backend :8787)
pnpm run build        # construir (sync:examples + sync:study + tsc + vite)
pnpm test             # correr los 5 archivos de tests (130 casos)
pnpm run scan         # escaneo de marcas
pnpm run server       # arrancar solo el backend
pnpm start            # build + server
pnpm run skill:install    # instalar el comando /ai-study-kit
pnpm run check:alignment  # chequeo de alineación cuádruple (por defecto dev-intro; acepta un directorio de tema)

# dentro de apps/quiz-app/
npm run qa            # control de calidad del banco de preguntas (opción más larga / distribución de respuestas)
npm run sync:examples # sincronizar manualmente examples → src/data
npm run sync:study    # sincronizar manualmente examples → public/study
```

### Despliegue en producción

```bash
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# puerto personalizado
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

Los detalles de despliegue (fijación del cwd de pm2, cómo funciona la sincronización entre dispositivos, …) están en [`AGENTS.md`](AGENTS.md) (en chino).

---

## 🤝 Contribuir

Los PR y las issues son bienvenidos. Por favor:

1. Ejecuta `pnpm run scan` y verifica que esté limpio
2. Ejecuta `pnpm test` y verifica que todo pase
3. Si cambiaste algún artefacto (cursos / preguntas / tarjetas / análisis), corre también el [`bidirectional-check`](docs/bidirectional-check.md)
4. Sigue [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 Licencia

[MIT](LICENSE) © contribuidores de ai-study-kit

---

## 🙏 Agradecimientos

- La estructura del paquete de contenidos (MISSION → RESOURCES → lessons) y la disciplina de redacción de preguntas (opciones de longitud pareja, sin pistas de formato) se toman prestadas del [teach skill de Matt Pocock](https://github.com/mattpocock); el rastro de la decisión está en `docs/adr/0001-agent-authored-questions-not-cli.md`
- El algoritmo de repetición espaciada sigue [la implementación SM-2 de Anki](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- El conocimiento de git del tema de ejemplo proviene del [libro Pro Git](https://git-scm.com/book/en/v2) (oficial, gratuito)
