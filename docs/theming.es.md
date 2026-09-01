# Configuración de presentación del tema (theme-config.json)

[简体中文](theming.md) · [English](theming.en.md) · **Español** · [Русский](theming.ru.md)

Toda la personalización de la capa de presentación de la app de práctica — orden de la página de inicio, nombres visibles, despliegue de subtemas, insignias de origen, capas núcleo/extensión, insignias de profundidad de los puntos de examen, colores de las tarjetas — vive en el `theme-config.json` del paquete de tema, **sin tocar ni una línea de código de la app**. El archivo es totalmente opcional: sin él, la app corre con la semántica de respaldo y jamás da error.

Ejemplo completo: [`examples/dev-intro/theme-config.json`](../examples/dev-intro/theme-config.json).

---

## Pipeline de sincronización

Antes de dev / build / test, `sync-examples.mjs` copia `examples/<theme>/theme-config.json` a `apps/quiz-app/src/data/theme-config.json` (producto de sincronización: prohibido editarlo a mano, los cambios se sobreescriben). Los temas que no traen este archivo sincronizan una configuración vacía `{}` y la app funciona como siempre.

---

## Referencia de campos

Todos los campos son opcionales: lo que falte, cae a su respaldo:

| Campo | Tipo | Función | Respaldo sin configuración |
|---|---|---|---|
| `topicLabels` | `{topicId: nombre visible}` | nombre visible en la UI de los grupos grandes (el topic id es el identificador estable de la capa de datos; toda la presentación pasa por aquí) | mostrar el topic id tal cual |
| `topicOrder` | `[topicId]` | orden de estudio de los grupos grandes (de menos a más profundo); los topics no listados caen al final en orden alfabético | todo en orden alfabético |
| `subtopics` | `{topicId: [nombre completo del subtema]}` | tabla de subtemas ordenados por profundidad de punto de examen; los grupos configurados despliegan una navegación de segundo nivel en la página de inicio | sin despliegue (una tarjeta entera por grupo) |
| `sourceLabels` | `{source: nombre corto}` | nombre visible de las insignias de origen de las tarjetas de pregunta | mostrar el source tal cual |
| `sourceLayers` | `{source: núcleo\|extensión}` | mapeo origen → capa de prioridad de estudio | sin concepto de capa (`layerOf` devuelve null) |
| `layerTopics` | `[topicId]` | qué grupos grandes tienen capas (alcance de los chips de capa de la página de práctica / insignias de profundidad de la página de inicio) | ningún tema tiene capas |
| `lessonTopics` | `{"<nombre de archivo de lección>": topicId}` | mapeo directo lección → conjunto de preguntas: al terminar una lección en la página del curso, el botón «practicar las preguntas de esta lección» salta al conjunto correspondiente | enlace directo solo si el nombre de archivo (sin `.html`) coincide exactamente con un topic del banco; si no, el botón no se renderiza |
| `epDepth` | `{nombre base del punto: 掌握\|理解\|了解}` | insignia de profundidad del punto de examen para los subtemas; antes de consultar la tabla se pela el sufijo de bloque (`线性表一` → `线性表`) | sin insignia |
| `topicStyles` | `{topicId: {cls, childCls, icon}}` | colores de las tarjetas de grupo (cadenas de clases Tailwind) + nombre de icono | estilo por defecto |

Una configuración mínima se ve así (solo nombres visibles y orden de dos grupos):

```json
{
  "topicLabels": {
    "git-basics": "Git 基础",
    "linux-commands": "Linux 命令"
  },
  "topicOrder": ["git-basics", "linux-commands"]
}
```

---

## Semántica de respaldo (principio de diseño)

La configuración es **puramente aditiva**: cada campo actúa de forma independiente, toda ausencia tiene un respaldo definido y una configuración incompleta jamás provoca error. El criterio central es **dentro del plan** (progreso principal) — `isPlanned = capa de origen ≠ extensión`: en los temas sin `sourceLayers` configurado, todas las preguntas cuentan automáticamente como dentro del plan, y el denominador del progreso / los contadores de la página de inicio / el conjunto aleatorio no cambian de criterio.

---

## Nombres de iconos

`topicStyles.icon` recibe un nombre en forma de cadena (p. ej. `"Boxes"`, `"Layers"`); la app lo resuelve a un componente de lucide a través de la tabla de mapeo con lista blanca de `apps/quiz-app/src/lib/themeConfig.ts` — la configuración es datos, los componentes son código y la tabla es el puente. Los nombres no registrados caen a `Boxes`; para ampliar los iconos disponibles, amplía esa tabla (por la restricción de tree-shaking solo se empaquetan los componentes de la lista blanca).

---

## Convención de nomenclatura de subtemas

El nombre completo de un `subtopic` es `{topicId}·{nombre visible}{sufijo de bloque en numerales chinos}`, p. ej. `git-basics·工作流`, o al partir en bloques por volumen de preguntas `xxx·线性表一` / `xxx·线性表二`. El prefijo debe ser un identificador ASCII completo (`[a-z0-9-]`); el separador admite las tres grafías históricas `·` `:` `-` — la UI pela el prefijo por el borde del identificador ASCII, para no tomar por separador un guion propio del nombre del topic. Los bloques de una misma base se ordenan por numeral chino (一<二<…<十一, con tabla de consulta; `localeCompare` no es fiable con numerales chinos).

---

## Capas (núcleo/extensión)

La capa es el atributo de **prioridad de estudio** de una pregunta, derivado de su source, y se presenta como insignia en la tarjeta + chip de filtrado en la página de práctica; no ocupa una dimensión de navegación. Mientras el interruptor «práctica extra de extensión» del panel de ajustes esté apagado (por defecto lo está), el concepto de capa directamente no existe: los chips no se renderizan, los enlaces directos `&layer=` no funcionan y todas las listas contienen solo preguntas dentro del plan; encendido, vuelve al comportamiento «núcleo por defecto, chip de tres estados (todo / núcleo / extensión)». Un bloque de subtema con 0 preguntas dentro del plan y >0 de extensión es un «bloque de extensión pura» — invisible con el interruptor apagado, y con la insignia gris «extensión N» cuando está encendido.
