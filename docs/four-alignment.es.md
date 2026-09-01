# Principio de las cuatro alineaciones

[简体中文](four-alignment.md) · [English](four-alignment.en.md) · **Español** · [Русский](four-alignment.ru.md)

Al estudiar cualquier tema, cuatro artefactos deben permanecer alineados en torno a **un mismo conjunto de puntos de conocimiento**: el curso (explicación), las preguntas (práctica), las tarjetas (anclas de memoria) y el análisis a fondo de erróneas (excavación de los fallos). Son cuatro archivos independientes del repositorio: si editas uno, los otros tres no se mueven. La desalineación no lanza ningún error — solo deja huecos de aprendizaje silenciosos: preguntas que evalúan lo que nunca se enseñó, lecciones terminadas sin nada que practicar, conceptos que hay que memorizar sin tarjeta alguna.

---

## Qué son los cuatro artefactos

| # | Artefacto | Ubicación del archivo | Qué hace |
|---|-----------|-----------------------|----------|
| 1 | **Curso** | `examples/<theme>/lessons/*.html` | Explica conceptos de forma sistemática, construye modelos mentales |
| 2 | **Preguntas** | `examples/<theme>/questions.json` | Práctica y validación, calificación, recolección de erróneas |
| 3 | **Tarjetas** | `examples/<theme>/flashcards.json` | Anclas de memoria con repetición espaciada para los conceptos clave |
| 4 | **Análisis a fondo de erróneas** | `examples/<theme>/study/wrong-questions/cluster-*.html` | Expansión en profundidad de los fallos de alta frecuencia |

Los cuatro artefactos no están aislados: cooperan en torno a un mismo conjunto de puntos de examen. El curso explica un concepto, una pregunta lo evalúa, una tarjeta ayuda a fijarlo y el análisis a fondo excava sus fronteras confusas justo cuando fallas.

---

## Por qué la alineación es obligatoria (dos pozos reales)

Este principio nace de tropiezos reales, no de escrúpulos teóricos.

### Pozo 1: preguntas sobre lo que el curso nunca enseñó (hueco preguntas → curso)

En una ocasión el banco de preguntas tenía 20 preguntas sobre «semisumadores» y el curso correspondiente no mencionaba el concepto para nada. Al llegar a esas preguntas no dabas pie con bola, sin idea de qué se estaba evaluando.

- **Causa raíz**: las preguntas estaban agrupadas mecánicamente por módulo, sin comprobar la cobertura del curso.
- **Arreglo**: el curso completó los conceptos que faltaban y se añadió verificación automatizada (abajo).

### Pozo 2: lecciones sin preguntas que practicar (hueco curso → preguntas)

El curso dedicó una sección entera a una metodología central, pero las preguntas relacionadas no llegaron — quien estudió no tuvo nada que practicar, y quien practicó no lo había estudiado.

- **Causa raíz**: las etiquetas de agrupación de las preguntas no se partieron según el contenido del curso.
- **Arreglo**: alinear la agrupación `topic` de las preguntas (y las etiquetas de calendario `day` opcionales) con el curso, más verificación bidireccional.

---

## Las tres comprobaciones de alineación

La alineación se comprueba en ambas direcciones, más una capa de cobertura de tarjetas.

### Dirección 1: preguntas → curso (lo que la pregunta evalúa, el curso debe enseñarlo)

Extrae de los enunciados los términos de puntos de examen de alta frecuencia (conceptos con ≥3 apariciones) y comprueba uno a uno la cobertura en el HTML del curso (número de apariciones literales sobre el texto sin espacios):

- **≥3 veces**: ✓ cubierto
- **1-2 veces**: △ apenas mencionado, hay que ampliarlo
- **0 veces**: ✗ no enseñado, hay que añadirlo

### Dirección 2: curso → preguntas (lo que el curso enseña, las preguntas deben practicarlo)

Extrae los conceptos clave del HTML del curso y comprueba si el banco de preguntas tiene la práctica correspondiente:

- Muy tratado en el curso, 0 preguntas relacionadas en el banco → falta práctica; añade preguntas para ese punto
- Preguntas relacionadas dispersas en otros grupos → ajusta su `topic` (o sus etiquetas `day`) para que estudio y práctica cierren dentro del mismo grupo

### Dirección 3: cobertura de tarjetas

Cada concepto clave del curso (términos de examen con ≥3 apariciones) debería estar cubierto por ≥1 tarjeta (coincidencia en front / back):

- Concepto enseñado en el curso sin tarjeta → falta el ancla de memoria
- Concepto de una tarjeta que el curso nunca menciona → tarjeta desvinculada; o enseñas el concepto o eliminas la tarjeta

---

## Cuándo ejecutar las comprobaciones

Obligatorio tras cualquier cambio en un artefacto:

1. **Tras generar un curso nuevo** — ¿qué puntos cubre? ¿Esos puntos tienen preguntas? ¿Hay tarjetas que los cubran?
2. **Tras cambiar la agrupación topic / day de las preguntas** — reagrupar puede desacoplar curso y preguntas.
3. **Tras editar flashcards.json** — añadir o quitar tarjetas puede desvincularlas del curso.
4. **Tras una tanda de análisis de erróneas del CLI grill** — todo punto analizado debe poder trazarse hasta el curso correspondiente (verificación inversa erróneas → curso).

---

## Las cuatro alineaciones del ejemplo dev-intro

Abre `examples/dev-intro/` para ver un ejemplo completo de las cuatro alineaciones:

| Punto de conocimiento | Curso | Pregunta | Tarjeta | Análisis a fondo |
|-----------------------|-------|----------|---------|------------------|
| **las tres áreas de git** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **commit y deshacer en git** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `study/wrong-questions/cluster-01-git-提交与撤销操作.html` |
| **permisos chmod** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | `study/wrong-questions/cluster-02-linux-权限与路径.html` |
| **ruta relativa `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

No todo punto de conocimiento necesita cobertura completa de los cuatro artefactos, pero los **fallos de alta frecuencia** sí deben tenerlos todos (como commit y deshacer en git) — ese es el escenario de salida central del CLI grill.

---

## Lecturas complementarias

- [`bidirectional-check.es.md`](./bidirectional-check.es.md) — el script de verificación automatizada que convierte las direcciones anteriores en código Python
- [`methodology.es.md`](./methodology.es.md) — el marco metodológico completo
- [`ai-cli-guide.es.md`](./ai-cli-guide.es.md) — cómo producir contenido alineado con los CLI teach / grill
