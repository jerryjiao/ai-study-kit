---
title: Alineación cuádruple
description: Cursos, preguntas, tarjetas y análisis de erróneas deben permanecer alineados en torno a los mismos puntos de conocimiento
---

Al estudiar cualquier tema, cuatro artefactos deben permanecer alineados en torno a <strong>los mismos puntos de conocimiento</strong> — el curso (explicación), la pregunta (práctica), la tarjeta (ancla de memoria) y el análisis de erróneas (forense del error). Cualquier deriva entre ellos crea huecos de aprendizaje silenciosos.

---

## Los cuatro artefactos

| # | Artefacto | Ubicación | Qué hace |
|---|----------|----------|--------------|
| 1 | **Cursos** | `examples/<theme>/lessons/*.html` | Explican conceptos de forma sistemática, construyen modelos mentales |
| 2 | **Preguntas** | `examples/<theme>/questions.json` | Práctica y validación, calificación, cuaderno de erróneas |
| 3 | **Tarjetas** | `examples/<theme>/flashcards.json` | Anclas de memoria por repetición espaciada para conceptos clave |
| 4 | **Análisis** | `examples/<theme>/wrong-questions/cluster-*.html` | Expanden en profundidad los fallos de alta frecuencia |

No están aislados — se coordinan en torno a <strong>un mismo conjunto de puntos de examen</strong>. El curso explica un concepto, la pregunta lo evalúa, la tarjeta lo ancla y el análisis excava sus confusiones cuando fallas.

---

## Por qué la alineación es obligatoria (dos pozos reales)

Este principio viene de dolor real, no de escrúpulo teórico:

### Pozo 1: pregunta sin curso (hueco pregunta → curso)

Un día la práctica tenía 20 preguntas sobre «semisumadores» y la lección correspondiente nunca cubrió el concepto. Los usuarios las encaraban sin idea de qué se evaluaba.

**Causa raíz**: las preguntas se asignaron mecánicamente a un día por «módulo» sin comprobar la cobertura del curso.
**Arreglo**: enseñar el concepto que faltaba y añadir la verificación bidireccional (abajo).

### Pozo 2: curso sin pregunta (hueco curso → pregunta)

La lección de un día enseñaba un método central, pero todas las preguntas relacionadas estaban programadas en otro día. Aprender sin nada que practicar, o practicar lo que nunca se aprendió.

**Causa raíz**: las «etiquetas de día» de las preguntas no estaban partidas por los límites de las lecciones.
**Arreglo**: las etiquetas de día deben seguir el contenido de las lecciones, con verificación bidireccional.

---

## Las tres comprobaciones de alineación

**La alineación es bidireccional más una capa de cobertura**:

### Dirección 1: pregunta → curso (si la práctica de un día lo cubre, el curso de ese día debe enseñarlo)

Extrae palabras de puntos de examen de alta frecuencia de las preguntas del día (conceptos con ≥3 apariciones) y comprueba la cobertura en el HTML de la lección correspondiente:

- **Cobertura = menciones literales en la lección** (sin espacios)
- **≥3**: ✓ cubierto
- **1–2**: △ mencionado — ampliarlo
- **0**: ✗ no enseñado — hay que añadirlo

### Dirección 2: curso → pregunta (si el curso lo enseña, la práctica debe programarlo ese día)

Extrae los conceptos clave del HTML de la lección y comprueba si aparecen en las preguntas de ese día:

- Muy enseñado pero 0 preguntas ese día → preguntas mal programadas; revisar moduleMap / etiquetas de día
- Enseñado pero con preguntas relacionadas dispersas en otros días → moverlas o cruzar referencias

### Dirección 3: cobertura de tarjetas

Cada concepto clave del día (≥3 menciones) debería tener ≥1 tarjeta que lo cubra (coincidencia anverso/reverso):

- Concepto del curso sin tarjeta → falta el ancla de memoria
- Concepto de la tarjeta ausente en el curso → tarjeta desvinculada; enséñalo o elimina la tarjeta

---

## Cuándo ejecutar las comprobaciones

Tras cualquier cambio en los artefactos:

1. **Tras generar lecciones nuevas** — ¿qué puntos quedan cubiertos? ¿Están programados en el día correcto? ¿Hay tarjetas?
2. **Tras cambiar moduleMap / etiquetas de día** — reprogramar puede desincronizar curso y práctica.
3. **Tras editar flashcards.json** — cambios en tarjetas pueden desincronizarlas del curso.
4. **Tras una pasada de grill-wrong-questions** — los puntos del análisis deben trazarse al curso de ese día (comprobación inversa análisis → curso).

---

## Un ejemplo trabajado: dev-intro

Abre `examples/dev-intro/` para un ejemplo completo alineado:

| Punto de conocimiento | Curso | Pregunta | Tarjeta | Análisis |
|-----------------|--------|------|------|-----------|
| **las tres áreas de git** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git reset vs revert** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `wrong-questions/cluster-01-git-reset-vs-revert.html` |
| **permisos chmod** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | — |
| **ruta relativa `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

Nota: no todo punto necesita los cuatro artefactos. Pero los <strong>fallos de alta frecuencia</strong> deben tenerlos todos (como git reset vs revert) — ese es el producto central del flujo grill.

---

## Lecturas complementarias

- [Verificación bidireccional](/ai-study-kit/es/maintain/bidirectional-check/) — las tres direcciones como Python ejecutable
- [Metodología](/ai-study-kit/es/method/methodology/) — el marco completo
- [Guía de los CLI de IA](/ai-study-kit/es/ai/ai-cli/) — producir contenido alineado con los CLI teach / grill
