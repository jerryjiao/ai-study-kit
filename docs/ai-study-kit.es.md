# Coach de estudio · el comando `/ai-study-kit`

[简体中文](ai-study-kit.md) · [English](ai-study-kit.en.md) · **Español** · [Русский](ai-study-kit.ru.md)

ai-study-kit tiene muchas funciones — app de práctica, cursos, tarjetas, repaso a fondo de erróneas, podcasts, despliegue — y eso, para quien estudia, se convierte en una carga: **¿qué toca hacer exactamente hoy?** `/ai-study-kit` existe para responder a eso. Es el skill de enrutamiento que trae el propio repositorio: lo instalas una vez, empiezas cada sesión de estudio desde él, y dejas que escanee tu estado, te recomiende y ejecute contigo — sin memorizar la cadena de herramientas.

---

## Instalación

El código fuente del skill vive en el repositorio, en `skills/ai-study-kit/` (fuente única de verdad). Dos rutas de instalación:

**① Marketplace de plugins (zcode / Claude Code, recomendado)**: el repositorio trae su propio manifiesto de marketplace (`.claude-plugin/marketplace.json`; `scripts/sync-plugin.mjs` genera `plugins/ai-study-kit/` a partir del código fuente). Añade el marketplace `https://github.com/jerryjiao/ai-study-kit` en tu cliente e instala el plugin `ai-study-kit` — las actualizaciones del skill llegan con cada refresco del marketplace, **sin reinstalación manual** (las versiones siguen los releases del repositorio).

**② Instalación manual (cualquier cliente que respete `~/.agents/skills/`)**:

```bash
# 在 ai-study-kit 仓库根目录
pnpm run skill:install          # 复制安装到 ~/.agents/skills/ai-study-kit
pnpm run skill:install -- --link   # 符号链接版（随仓库 git pull 自动更新）

# 其他客户端：自定义目标目录
bash scripts/install-skill.sh --dest ~/.claude/skills

# 卸载
pnpm run skill:uninstall
```

Tras instalar, reinicia el CLI (o abre una sesión nueva) y escribe `/ai-study-kit`. También funciona sin instalar: pídele directamente a tu agente que lea `skills/ai-study-kit/SKILL.md` y lo siga.

---

## Cómo funciona

Cada invocación sigue siempre tres pasos:

1. **Sondeo del estado** (solo lectura, ≤1 min) — tema, inventario de preguntas/tarjetas/cursos/análisis, progreso de respuestas, erróneas sin graduarse, tarjetas vencidas, lecciones completadas, sesiones de tutoría y fecha del examen, configuración de IA, backend en línea o no.
2. **Informe + recomendación** — una tabla de instantánea + una acción recomendada con su razón + un menú numerado.
3. **Ejecución acompañada** — una vez elegida la opción, sigue el playbook de `skills/ai-study-kit/references/flows.md` paso a paso y, al terminar, verifica contra los «criterios de cierre».

Sin una intención explícita, la recomendación toma el primer acierto en orden (versión completa en `skills/ai-study-kit/SKILL.md`). El orden de los tres primeros es «tarjetas → sprint → retomar tutoría»: el repaso es una deuda que se acumula a diario, el sprint es la ventana de cosecha de la semana previa al examen, y la tutoría se puede retomar en cualquier momento:

| Orden | Condición | Recomendación |
|-------|-----------|---------------|
| 1 | El repositorio no existe | **F1** inicializar el proyecto (primero pon la app de práctica en marcha) |
| 2 | El tema activo es el demo dev-intro y tienes algo propio que aprender | **F2** nuevo tema (las preguntas git/Linux del demo no son tu material de estudio) |
| 3 | Tarjetas vencidas > 0 | **F3** estudio diario (primero liquida el repaso — la memoria se está desvaneciendo; el conocimiento nuevo puede esperar) |
| 4 | ≤ 7 días para el deadline de MISSION.md | **F11** sprint preexamen (la ventana de repetición intensiva ya está abierta; sin deadline configurado esta fila nunca se activa, y la instantánea ya muestra ⚠) |
| 5 | Hay una sesión de tutoría en curso | **F10** tutoría acompañada, retomar la sesión (informa el nombre + los pendientes; **solo corre con tu visto bueno**: retomar es una sugerencia, no una orden) |
| 6 | Erróneas sin graduarse ≥ 3 | **F4** repaso a fondo de erróneas (agrupado y excavado con LLM) |
| 7 | Hay preguntas sin responder y lecciones sin completar | **F3** estudio diario (primero conceptos, luego práctica — lee la lección del día según el calendario; una lección solo cuenta cuando marcas «✓ completada», abrirla no cuenta) |
| 8 | Hay preguntas sin responder y lecciones completas | **F3** estudio diario (los conceptos están listos; practica directamente para validar) |
| 9 | Todas las preguntas respondidas y tasa de acierto ≥ 80 % | **F5** hacer un podcast (consolidación pasiva) o **F2** nuevo tema |
| 10 | Todas las preguntas respondidas y tasa de acierto < 80 % | **F4** repaso a fondo de erróneas; si sigue sin llegar, **F6** reforzar el curso (la calidad de las lecciones no basta) |

## Los once flujos

| # | Flujo | Cuándo usarlo | Comandos clave |
|---|-------|---------------|----------------|
| F1 | Inicializar el proyecto | poner el demo en marcha desde cero | `pnpm install && pnpm dev` |
| F2 | Nuevo tema | convertir lo que quieres aprender en un ciclo completo | temario + tabla de distribución de puntos → materiales → `teach-generate` → producir preguntas/tarjetas según la tabla → cambiar de tema → verificar |
| F3 | Estudio diario | «¿qué estudio hoy?» | tarjetas vencidas → estudiar lecciones → practicar → rehacer erróneas |
| F4 | Repaso a fondo de erróneas | ≥3 erróneas acumuladas | `pnpm run ai:grill -- --theme <t>` |
| F5 | Hacer un podcast | consolidar en trayectos/entrenamiento | `pnpm run ai:podcast -- --input <file>` |
| F6 | Generar/ampliar curso | añadir explicaciones de curso | `pnpm run ai:teach -- --theme <t>` |
| F7 | Editar contenido | cambiar preguntas/cursos/tarjetas/calendario | cadena de operaciones de las cuatro alineaciones + verificación |
| F8 | Verificar y publicar | puerta de calidad previa al release | `pnpm run scan` / `test` / `build` + `scripts/bidirectional-check.py` |
| F9 | Desplegar | subir al servidor en la nube | pm2 (arrancar desde `apps/quiz-app/`) |
| F10 | Tutoría acompañada | enseñar cada punto por diálogo hasta dominarlo + evaluar en el momento + continuar entre días | conjunto mínimo de puntos desde la tabla → explicación en tres partes + frases ancla → evaluar por modo → guardar punto por punto en `study/records/` → pasar el testigo a F3 |
| F11 | Sprint preexamen | ≤ 7 días para el examen, o pides «sprint / preexamen / intensivo» | cosechar frases de records + archivo de erróneas → paquete de sprint de cuatro piezas en `study/sprint/` → pasar el testigo al simulacro de F3 |

Además, una entrada de **diagnóstico**: progreso que no sincroniza, 404 de cursos, errores de configuración del CLI, aciertos del scan… una tabla de consulta rápida síntoma → causa raíz → solución.

---

## Notas de diseño

- **Un skill de enrutamiento, no otro CLI más**: no introduce ningún runtime nuevo; solo codifica «leer estado → recomendar → ejecutar comandos/flujos existentes» como instrucciones que un agente puede seguir. Todas las capacidades subyacentes ya existen en el repositorio (los tres CLI de IA, los scripts de sincronización, las puertas de verificación).
- **El estado antes del consejo**: el coach tiene prohibido recomendar por intuición — cada campo de la instantánea tiene su comando de sondeo (`skills/ai-study-kit/references/state.md`) y los criterios estadísticos del progreso coinciden exactamente con `apps/quiz-app/src/lib/progress.ts` (filtrado de tombstones, la caja de arena aleatoria fuera del progreso principal, umbrales de graduación de erróneas, vencimiento SRS).
- **Metodología embebida**: el orden del algoritmo de recomendación es la puesta en práctica del «temario → materiales → preguntas» de [`methodology.es.md`](./methodology.es.md); el flujo F2 obliga a escribir primero MISSION (con la tabla de distribución de puntos) y RESOURCES antes de permitir generar cursos y preguntas — producir preguntas no es escribir JSON a pelo, es producirlas punto por punto contra la tabla y cerrar con las tres puertas (qa / scan / cuatro alineaciones) en verde.

## Extensión

Para añadir un flujo nuevo: añade una sección de playbook (propósito / prerrequisitos / pasos / criterios de cierre) en `skills/ai-study-kit/references/flows.md`, más una fila en el menú y en la tabla de enrutamiento por intención de `SKILL.md`. Al terminar, ejecuta `pnpm run sync:plugin` para regenerar los artefactos del plugin (quienes lo instalaron manualmente deben además correr `pnpm run skill:install` para redistribuirlo).

## Preguntas frecuentes

**P: ¿Es obligatorio instalarlo?**
R: No, pero entonces cada vez tendrás que pensar tú «¿qué viene después?». Instalado, es un punto de entrada de una sola frase.

**P: ¿Va a tocar mis datos?**
R: Los pasos 1/2 son estrictamente de solo lectura. El paso 3 escribe archivos / ejecuta comandos únicamente para el flujo que elijas, y los playbooks marcan las líneas rojas (los artefactos de sincronización están prohibidos de editar a mano, igual que los archivos de progreso).

**P: ¿Sigue funcionando si cambio de AI CLI?**
R: Sí. El skill son instrucciones en markdown + documentación de referencia; cualquier cliente que soporte la convención del directorio skills puede instalarlo (apunta ahí con `--dest`).
