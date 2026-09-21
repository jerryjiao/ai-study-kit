<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · [English](README.en.md) · **Español** · [Русский](README.ru.md)

**Instala con una frase**: envía esta línea a tu IA —Claude Code, zcode, Cursor, cualquier herramienta— y seguirá el protocolo para instalar el coach y el código del sitio. Sin clonar, sin comandos que memorizar:

```text
Install ai-study-kit from https://aistudykit.dev/install.md
```

<p align="center">
  <a href="https://aistudykit.dev/"><img src="https://img.shields.io/badge/web-online-blue" alt="Sitio web" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="Estado del deploy" /></a>
  <img src="https://img.shields.io/badge/i18n-4%20idiomas-blue" alt="Interfaz en 4 idiomas" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [Sitio web](https://aistudykit.dev/) · ▶️ [Demo en vivo](https://aistudykit.dev/demo/) · 📖 [Primeros pasos](https://aistudykit.dev/es/get-started/)

**En una frase**: dile «quiero aprender X» a tu IA —el coach alinea los puntos de examen contigo, escribe las preguntas y los cursos, y te entrena hasta que lo domines—. No necesitas traer un banco de preguntas; la herramienta convierte el resto en una app de estudio completa con cursos, tarjetas y análisis de errores.

---

## 👋 Para quién es esto

| Qué haces | Te sirve |
|-----------|----------|
| 🧑‍💻 **Dev aprendiendo una tecnología nueva** (React / K8s / Rust) | ✅ La IA convierte la documentación en preguntas; practica y fija con tarjetas |
| 📚 **Estudiando para un examen** (asignatura / oposición / certificación) | ✅ ¿Tienes exámenes reales? Impórtalos. ¿No? La IA escribe preguntas desde tus puntos de examen |
| 🎯 **Preparando entrevistas** (fundamentos / diseño de sistemas) | ✅ Di para qué es —la IA genera cursos y preguntas y te guía por tus erróneas |
| 🗂️ **Aprendiendo cualquier cosa con «puntos de examen»** (cumplimiento / procesos / terminología) | ✅ Si se puede descomponer en «pregunta + respuesta», se puede estudiar |
| ❌ Buscas un banco de preguntas ya hecho («500 preguntas de Java») | ❌ Aquí no hay preguntas de fábrica — pero la IA puede generar un set desde tus puntos de examen (con tu propia API key) |

¿Quieres probarlo antes? Sigue la ruta de clonación de abajo.

---

## 🚀 Prueba el demo (ruta clone, para desarrolladores)

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm install && pnpm dev
# abre http://localhost:5173
```

Incluye un tema de ejemplo de git + Linux: **práctica** (opción simple/múltiple/V-F, corregida al enviar, erróneas registradas), **tarjetas** (repetición espaciada SM-2, algoritmo compatible con Anki), **cursos** (lecciones HTML autónomas con diagramas y avisos). Es solo un demo — para uso real, cambia a tu propio tema (siguiente sección).

---

## 🧭 ¿No sabes qué hacer ahora? `/ask-coach`

Con el plugin instalado (o con `pnpm run skill:install` en `~/.agents/skills/`), cada sesión de estudio empieza aquí. Cinco comandos: `/ask-coach` pregunta al coach qué tocar (instantánea + recomendación + ejecución guiada), `/study-coach` entra directo a estudiar, `/study-doctor` corre un chequeo integral, `/study-recap` entra directo al repaso de erróneas, `/study-podcast` entra directo a la generación de pódcast.

`/ask-coach` primero **escanea tu estado de estudio** (progreso, tarjetas vencidas, erróneas, lecciones completadas, configuración de IA), luego **te recomienda lo único más útil de hacer ahora** y, al elegir, **te guía paso a paso** — de inicializar el proyecto a desplegarlo, trece flujos cubiertos. Ver [`docs/ai-study-kit.es.md`](docs/ai-study-kit.es.md).

---

## 🔧 Hazlo tuyo: tu propio tema

Ejemplo: aprender **bases de React**. Solo tocas archivos bajo `examples/`, sin tocar el código de la app:

1. **Copia el directorio del tema**: `cp -r examples/dev-intro examples/react-basics` (también puede vivir fuera del repo — una ruta con separadores es un paquete de tema externo, ver [`docs/adr/0004`](docs/adr/0004-external-theme-packs.md))
2. **Edita las preguntas** `questions.json`: cada pregunta es JSON plano — enunciado + opciones + respuesta + explicación (esquema completo en la interfaz `Question` de [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts)):

   ```json
   {
     "id": "R-001",
     "type": "single",
     "source": "react-basics",
     "topic": "react-basics",
     "question": "¿Qué devuelve useState en React?",
     "options": {
       "A": "El valor actual del estado",
       "B": "Una función que actualiza el estado",
       "C": "Un array [state, setState]",
       "D": "Un objeto { state, setState }"
     },
     "answer": ["C"],
     "analysis": "useState devuelve un array de dos elementos: el estado actual y la función que lo actualiza. Suele usarse con destructuring."
   }
   ```

3. **Edita las tarjetas** `flashcards.json`: pregunta delante, detalle detrás — igual de simple
4. **Cambia**: `EXAMPLE_THEME=react-basics pnpm dev` — recarga y ya está dentro
5. **(Opcional) cursos y presentación**: los cursos van en `lessons/*.html`; la agrupación y nombres del inicio en `theme-config.json` (ver [`docs/theming.es.md`](docs/theming.es.md)); sin él, retroceso elegante
6. **Cuatro verificaciones**: `pnpm run scan` (cero marcas) + `pnpm test` + `pnpm run build` + `python3 scripts/bidirectional-check.py examples/react-basics/` (alineación cuádruple)

**¿No quieres redactar preguntas a mano?** Con `/ask-coach` instalado, pide «genera un banco de preguntas para react-basics» — el agente primero alinea contigo una **tabla de puntos de examen** en MISSION.md (qué se examina, con qué profundidad, cuántas preguntas por tipo, cuántas tarjetas), luego genera preguntas y tarjetas punto por punto tras tu confirmación, y cierra con las tres puertas de calidad (`qa` / `scan` / alineación cuádruple) antes de entregar. El camino manual sigue siendo el principal; la tabla es el contrato entre tú y el agente.

---

## 🤖 Deja que la IA genere cursos / análisis de erróneas / pódcast

El repositorio incluye tres herramientas de línea de comandos con IA (cualquier LLM compatible con OpenAI sirve; el TTS admite por ahora GLM-TTS):

| CLI | Qué hace | Salida |
|-----|----------|--------|
| `teach-generate.mjs` | Estructura una especificación de tema en cursos HTML de varias secciones | `lessons/*.html` |
| `grill-wrong.mjs` | Agrupa tus erróneas por punto de examen y desarrolla cada grupo | `wrong-questions/*.html` + perfil de errores por punto |
| `podcast-generate.mjs` | Convierte cualquier material de estudio en un audio a dos voces | `.wav` + guion JSON + transcripción |

Configura con `cp .env.example .env` y rellena al menos `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL` (ver [`docs/configuration.es.md`](docs/configuration.es.md)); uso y parámetros en [`docs/ai-cli-guide.es.md`](docs/ai-cli-guide.es.md).

> 💡 **La IA es opcional**: los tres CLI son capacidades incrementales. Si solo quieres el sitio de práctica + tarjetas, no configures ningún LLM — `pnpm dev` basta.

---

## 🌍 Idiomas

Este README existe en cuatro idiomas (cambia con la barra superior); la **interfaz** alterna con un clic entre 中文 / English / Español / Русский — detecta el idioma del navegador en la primera visita y sincroniza la preferencia entre dispositivos; el **contenido generado por IA** acepta `--lang zh|en|es|ru`. Los diccionarios y sus verificaciones viven en [`apps/quiz-app/src/i18n/`](apps/quiz-app/src/i18n/).

---

## 🎯 Por qué esta herramienta

| Sin ai-study-kit | Con ai-study-kit |
|-------------------|-----------------|
| **Anki**: tarjetas excelentes, pero sin sitio de práctica, sin análisis de erróneas, sin cursos | 6 artefactos de estudio en una sola app, alineados con los mismos puntos de examen |
| **Quizlet**: tiene preguntas y tarjetas, pero es SaaS cerrado — tus datos no están en tus manos | Open source MIT; datos en local + tu servidor; sincronización sin cuentas |
| **Notas en Notion**: registran pero no practican; sin algoritmo de repetición espaciada | SM-2 compatible con Anki + pasos de aprendizaje de Anki integrados |
| **PDF / Word con preguntas**: solo lectura — sin corrección ni estadísticas | corrección automática, cuaderno de erróneas, estadísticas de precisión, planificación SRS |
| **Preguntar directo a ChatGPT**: conocimiento disperso, sin ruta de aprendizaje | la IA estructura el conocimiento disperso en cursos + preguntas + tarjetas |

**El diferenciador central**: el **ciclo de alineación cuádruple** — los puntos de examen que enseñan los cursos, que evalúan las preguntas, que fijan las tarjetas y que desarrollan los análisis de erróneas son el mismo conjunto (ver [`docs/four-alignment.es.md`](docs/four-alignment.es.md)).

---

## 📚 Documentación

Toda la documentación existe en cuatro idiomas, con un selector de idioma arriba (简体中文 / English / Español / Русский).

| Documento | Qué aprenderás |
|------|-----------|
| [`docs/methodology.es.md`](docs/methodology.es.md) | metodología de estudio: temario → materiales → preguntas |
| [`docs/four-alignment.es.md`](docs/four-alignment.es.md) | cómo se mantienen sincronizados cursos / preguntas / tarjetas / análisis |
| [`docs/bidirectional-check.es.md`](docs/bidirectional-check.es.md) | verificaciones cruzadas automatizadas (preguntas ↔ cursos ↔ tarjetas) |
| [`docs/ai-cli-guide.es.md`](docs/ai-cli-guide.es.md) | uso completo de los tres CLI de IA |
| [`docs/ai-study-kit.es.md`](docs/ai-study-kit.es.md) | `/ask-coach`: instalación, comandos, enrutado, extensión |
| [`docs/configuration.es.md`](docs/configuration.es.md) | `.env`: proveedores de LLM + TTS |
| [`docs/theming.es.md`](docs/theming.es.md) | configuración de presentación: referencia de campos de theme-config.json |
| [`AGENTS.md`](AGENTS.md) | convenciones de colaboración con IA: estructura / comandos / reglas (en chino) |
| [`examples/dev-intro/`](examples/dev-intro/) | ejemplo completo de git+Linux: preguntas + tarjetas + cursos + análisis |

---

## 🛠️ Desarrollo y despliegue

```bash
pnpm install        # instalar dependencias
pnpm run dev        # desarrollo local (frontend :5173 + backend :8787)
pnpm test           # tests
pnpm run scan       # escaneo de marcas
pnpm run check:alignment  # chequeo de alineación cuádruple
pnpm run skill:install    # instala los comandos del coach en ~/.agents/skills/
```

Tabla completa de comandos, despliegue en producción (pm2) y el funcionamiento de la sincronización entre dispositivos: [`AGENTS.md`](AGENTS.md) y la [documentación web](https://aistudykit.dev/es/).

---

## 🤝 Contribuir

Los PR y las issues son bienvenidos. Por favor:

1. Ejecuta `pnpm run scan` y verifica que esté limpio
2. Ejecuta `pnpm test` y verifica que todo pase
3. Si cambiaste algún artefacto (cursos / preguntas / tarjetas / análisis), corre también el [`bidirectional-check`](docs/bidirectional-check.es.md)
4. Sigue [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 Licencia

[MIT](LICENSE) © contribuidores de ai-study-kit

---

## 🙏 Agradecimientos

- La estructura del paquete de contenidos (MISSION → RESOURCES → lessons) y la disciplina de redacción de preguntas (opciones de longitud pareja, sin pistas de formato) se toman prestadas del [teach skill de Matt Pocock](https://github.com/mattpocock); el rastro de la decisión está en [`docs/adr/0001-agent-authored-questions-not-cli.md`](docs/adr/0001-agent-authored-questions-not-cli.md)
- El bucle de datos (rastros de interacción → hechos del estudiante → mejores recomendaciones) y la fórmula de dominio oral (precisión ponderada por recencia con topes de confianza, determinista, sin LLM) están inspirados en [DeepTutor](https://github.com/HKUDS/DeepTutor); el rastro de la decisión está en [`docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md`](docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md)
- La disciplina de voz del coach (la base de registro coloquial de `skills/references/voice.md`) se destila y reescribe a partir del skill [辞达（cida）](https://github.com/mizzlelover/cida) de 谁是专家（mizzlelover）, con licencia MIT; el rastro de la decisión está en [`docs/adr/0008-distill-rewrite-not-runtime-dep.md`](docs/adr/0008-distill-rewrite-not-runtime-dep.md)
- El algoritmo de repetición espaciada sigue [la implementación SM-2 de Anki](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- El conocimiento de git del tema de ejemplo proviene del [libro Pro Git](https://git-scm.com/book/en/v2) (oficial, gratuito)
