# Coach de estudio · el comando `/ask-coach`

[简体中文](ai-study-kit.md) · [English](ai-study-kit.en.md) · **Español** · [Русский](ai-study-kit.ru.md) · [日本語](ai-study-kit.ja.md)

ai-study-kit tiene muchas funciones — app de práctica, cursos, tarjetas, repaso a fondo de erróneas, podcasts, despliegue — y eso, para quien estudia, se convierte en una carga: **¿qué toca hacer exactamente hoy?** `/ask-coach` existe para responder a eso. Es el skill de entrada principal que trae el propio repositorio: lo instalas una vez, empiezas cada sesión de estudio desde él, y dejas que escanee tu estado, te recomiende y ejecute contigo — sin memorizar la cadena de herramientas.

**Los nombres de los comandos son el menú** — el plugin ai-study-kit (nombre permanente) instala cinco comandos: `/ask-coach` es la entrada principal (instantánea de estado + recomendación + ejecución guiada; el resto se enruta desde aquí), más cuatro comandos finos de entrada directa — `/study-coach` tutoría acompañada (F10), `/study-doctor` chequeo integral, `/study-recap` análisis de erróneas (F4), `/study-podcast` podcast (F5). El mapa completo de comandos y la tabla de enrutamiento por intención están en `skills/ask-coach/SKILL.md`.

---

## Instalación

Los códigos fuente de los skills viven en el repositorio bajo `skills/` (fuente única de verdad: la entrada principal `ask-coach` + cuatro comandos finos `study-coach` / `study-doctor` / `study-recap` / `study-podcast` que comparten los `references/` de la entrada principal). Dos rutas de instalación:

**① Marketplace de plugins (zcode / Claude Code, recomendado)**: el repositorio trae su propio manifiesto de marketplace (`.claude-plugin/marketplace.json`; `scripts/sync-plugin.mjs` genera `plugins/ai-study-kit/` a partir del código fuente). Añade el marketplace `https://github.com/jerryjiao/ai-study-kit` en tu cliente e instala el plugin `ai-study-kit` — las actualizaciones del skill llegan con cada refresco del marketplace, **sin reinstalación manual** (las versiones siguen los releases del repositorio). **Tras actualizar el plugin, abrir `/ask-coach` en un proyecto antiguo informa del desfase de versión y te guía por la actualización F13** (segura para los datos, rellena los huecos — ver F13; la instantánea del kit autoinforma su versión vía `kit-version.json`). **El nombre del plugin es ai-study-kit de por vida; los comandos son la familia ask-coach** (renombrado desde `/ai-study-kit` en v0.13, septiembre de 2026 — los nombres de marketplace son permanentes, así que el del plugin no cambia).

**② Instalación manual (cualquier cliente que respete `~/.agents/skills/`)**:

```bash
# 从 ai-study-kit 仓库根目录（装全部五个 skill； los comandos finos dependen de los references/ de la entrada principal）
pnpm run skill:install          # copia a ~/.agents/skills/{ask-coach,study-coach,study-doctor,study-recap,study-podcast}
pnpm run skill:install -- --link   # 符号链接版（随仓库 git pull 自动更新）

# 其他客户端：自定义目标目录
bash scripts/install-skill.sh --dest ~/.claude/skills

# 卸载
pnpm run skill:uninstall
```

Tras instalar, reinicia el CLI (o abre una sesión nueva) y escribe `/ask-coach`. También funciona sin instalar: pídele directamente a tu agente que lea `skills/ask-coach/SKILL.md` y lo siga.

---

## Cómo funciona

Cada invocación sigue siempre tres pasos:

1. **Sondeo del estado** (solo lectura, ≤1 min) — tema, inventario de preguntas/tarjetas/cursos/análisis, progreso de respuestas, erróneas sin graduarse, tarjetas vencidas, lecciones completadas, objetivos orales débiles del interrogatorio (derivados del registro de intentos), sesiones de tutoría y fecha del examen, configuración de IA, backend en línea o no, desfase de versión del kit (tu proyecto vs la instantánea del plugin — versión atrasada o desconocida conduce a la actualización F13, ver abajo); si se indica la ruta al grafo de conocimiento, también las señales del grafo (cuatro estados por nodo, relaciones de prerrequisito — ver F12).
2. **Informe + recomendación** — una tabla de instantánea + una acción recomendada con su razón + un menú numerado.
3. **Ejecución acompañada** — una vez elegida la opción, sigue el playbook del flujo correspondiente en `skills/ask-coach/references/` paso a paso y, al terminar, verifica contra los «criterios de cierre».

Sin una intención explícita, la recomendación toma el primer acierto en orden: las comprobaciones de entorno (desfase de versión) van antes que los apartados de estudio — primero alinear la capa funcional; tus datos nunca están en riesgo. La cabeza del lado de estudio es «tarjetas → sprint → retomar tutoría»: el repaso es una deuda que se acumula a diario, el sprint es la ventana de cosecha de la semana previa al examen, y la tutoría se puede retomar en cualquier momento. Las 11 condiciones completas, con la razón de cada una, están en la sección «algoritmo de recomendación» de `skills/ask-coach/SKILL.md`.

## Los trece flujos

Los trece flujos se agrupan en cuatro líneas, numerados como el menú: **enseñanza** F10 tutoría acompañada · F11 sprint preexamen · F12 proyección del grafo de conocimiento; **preparación de examen** F3 estudio diario · F4 repaso a fondo de erróneas · F5 hacer un podcast; **contenido** F2 nuevo tema · F6 generar/ampliar curso · F7 editar contenido; **operaciones** F1 inicializar el proyecto · F13 actualizar · F8 verificar y publicar · F9 desplegar. El playbook de cada flujo (propósito / prerrequisitos / pasos / criterios de cierre) vive en `skills/ask-coach/references/` — ese directorio es la fuente única de verdad del detalle de F1–F13; esta página solo ofrece el mapa general.

Además, dos entradas de operaciones: el **chequeo** (`/study-doctor` — orquestación integral de las cuatro puertas de calidad + sondas de entorno, con informe de estado y orden de reparación) y el **diagnóstico** (progreso que no sincroniza, 404 de cursos, errores de configuración del CLI, aciertos del scan… una tabla de consulta rápida síntoma → causa raíz → solución).

---

## Notas de diseño

- **Un skill de enrutamiento, no otro CLI más**: no introduce ningún runtime nuevo; solo codifica «leer estado → recomendar → ejecutar comandos/flujos existentes» como instrucciones que un agente puede seguir. Todas las capacidades subyacentes ya existen en el repositorio (los tres CLI de IA, los scripts de sincronización, las puertas de verificación).
- **El estado antes del consejo**: el coach tiene prohibido recomendar por intuición — cada campo de la instantánea tiene su comando de sondeo (`skills/references/state.md`) y los criterios estadísticos del progreso coinciden exactamente con `apps/quiz-app/src/lib/progress.ts` (filtrado de tombstones, la caja de arena aleatoria fuera del progreso principal, umbrales de graduación de erróneas, vencimiento SRS).
- **Metodología embebida**: el orden del algoritmo de recomendación es la puesta en práctica del «temario → materiales → preguntas» de [`methodology.es.md`](./methodology.es.md); el flujo F2 obliga a escribir primero MISSION (con la tabla de distribución de puntos) y RESOURCES antes de permitir generar cursos y preguntas — producir preguntas no es escribir JSON a pelo, es producirlas punto por punto contra la tabla y cerrar con las tres puertas (qa / scan / cuatro alineaciones) en verde.

## Extensión

Para añadir un flujo nuevo: añade una sección (propósito / prerrequisitos / pasos / criterios de cierre) en los playbooks de flujo de `skills/ask-coach/references/`, más una fila en el menú y en la tabla de enrutamiento por intención de `SKILL.md`. Al terminar, ejecuta `pnpm run sync:plugin` para regenerar los artefactos del plugin (quienes lo instalaron manualmente deben además correr `pnpm run skill:install` para redistribuirlo). Para añadir un comando fino: crea un directorio nuevo en `skills/` con un SKILL.md corto (~15 líneas, comparte `../ask-coach/references/`) — sync:plugin lo incorpora automáticamente.

## Preguntas frecuentes

**P: ¿Es obligatorio instalarlo?**
R: No, pero entonces cada vez tendrás que pensar tú «¿qué viene después?». Instalado, es un punto de entrada de una sola frase.

**P: ¿Va a tocar mis datos?**
R: Los pasos 1/2 son estrictamente de solo lectura. El paso 3 escribe archivos / ejecuta comandos únicamente para el flujo que elijas, y los playbooks marcan las líneas rojas (los artefactos de sincronización están prohibidos de editar a mano, igual que los archivos de progreso).

**P: ¿Sigue funcionando si cambio de AI CLI?**
R: Sí. El skill son instrucciones en markdown + documentación de referencia; cualquier cliente que soporte la convención del directorio skills puede instalarlo (apunta ahí con `--dest`).
