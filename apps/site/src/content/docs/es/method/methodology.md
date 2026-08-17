---
title: Metodología
description: El temario define el alcance, los materiales construyen conceptos, las preguntas validan el dominio
---

Este kit de herramientas codifica un patrón de aprendizaje destilado de la práctica real: **el temario define el alcance → los materiales de referencia construyen conceptos → las preguntas validan el dominio**, con la IA asistiendo en cada capa. Este es el patrón neutralizado que puedes aplicar a cualquier tema.

---

## El patrón central: temario → materiales → preguntas

Un dominio ofrece tres tipos de material, **de naturaleza y prioridad distintas**:

| Material | Papel | Ejemplos | Autoridad |
|----------|------|----------|-----------|
| **Temario / programa del examen** | Define **qué aprender y con qué profundidad** | Programas de curso, convocatorias de certificación, listas de preguntas de entrevista, objetivos de aprendizaje tipo OKR | **La única autoridad** |
| **Materiales de referencia** | Construyen el **sistema de conceptos** | Libros de texto clásicos, documentación oficial, cursos abiertos, blogs de calidad, explicaciones de un tutor IA | Alta (cede ante el temario en caso de conflicto) |
| **Preguntas de práctica** | **Validan** el dominio | Exámenes reales, simulacros, preguntas escritas por ti, tarjetas, cuaderno de erróneas | Media (las preguntas pueden estar sesgadas) |

**Ideas clave**: el temario es la <strong>autoridad</strong>; los materiales y las preguntas son <strong>herramientas</strong>. Cuando los tres discrepan sobre un concepto, gana el temario — que algo aparezca en preguntas o materiales no significa que el temario lo exija, y lo que el temario exige hay que aprenderlo aunque tu banco de preguntas no lo cubra.

### Qué aprender y cuándo

- **Si el temario lo lista, hay que cubrirlo** — es un requisito duro para certificaciones, exámenes y entrevistas.
- **Si no lo lista, no lo fuerces** — la señal es «puedes saltarlo», no «aprende todo lo relacionado».
- **Si un punto del temario tiene niveles** (L1 introducción / L2 avanzado / L3 dominio) — prepara tu nivel objetivo; no apuntes a ciegas al máximo.

---

## El ciclo completo de aprendizaje (5 pilares)

La herramienta alinea cinco artefactos en torno a los mismos puntos de conocimiento:

1. **App de práctica**: entrenamiento, calificación, cuaderno de erróneas, sincronización automática del progreso entre dispositivos.
2. **Lecciones de curso** (salida de teach): conceptos dispersos ensartados en explicaciones sistemáticas — una mini-web HTML autónoma.
3. **Tarjetas (SRS)**: anclas de memoria para los conceptos clave, repetición espaciada SM-2 + pasos de aprendizaje de Anki.
4. **Análisis de erróneas** (salida de grill): tras practicar, los fallos de alta frecuencia se agrupan y se expanden — no solo la respuesta correcta, sino <strong>por qué te equivocaste</strong> y dónde están las fronteras confusas.
5. **Podcasts de repaso** (salida de podcast): convierten cursos/preguntas/erróneas en audio a dos voces para trayectos y entrenamientos.

**La IA participa en cada capa**:

- Redacción de preguntas: la IA ayuda a generar variantes, adaptar preguntas y analizar errores.
- Enseñanza: la IA (el flujo teach) estructura los materiales en HTML de curso.
- Tarjetas: la IA destila los conceptos clave en tarjetas.
- Análisis: la IA agrupa y expande las erróneas.
- Podcasts: la IA sintetiza el diálogo a dos voces.

---

## Visión general del flujo

```
        ┌──────────────────────┐
        │ Temario (autoridad)  │
        └──────────┬───────────┘
                   │ define puntos + nivel
                   ▼
   ┌──────────────────────────────┐
   │  Materiales de referencia    │ ← libros / docs / cursos / tutor IA
   └───────────────┬──────────────┘
                   │ estructuración asistida por IA
                   ▼
   ┌──────────────────────────────┐
   │  cursos HTML (teach)         │ ← sistemáticos, autónomos
   └───────────────┬──────────────┘
                   │ alineación cuádruple
                   ▼
   ┌──────────────────────────────┐
   │  Práctica + tarjetas + análisis │ ← mismos puntos en todos
   └───────────────┬──────────────┘
                   │ seguir practicando
                   ▼
   ┌──────────────────────────────┐
   │  Acierto = señal de aprendizaje │
   └──────────────────────────────┘
                   ↓
   Erróneas → agrupación (grill) → reforzar → rehacer
```

Ver [Alineación cuádruple](/ai-study-kit/es/method/four-alignment/) para las reglas de alineación y [Verificación bidireccional](/ai-study-kit/es/maintain/bidirectional-check/) para el comprobador automatizado.

---

## Una palabra para autores de temas

Para aplicar esta metodología a tu propio tema (K8s, React, vocabulario, cualquier asignatura):

1. **Define primero el temario** — no empieces a hacer preguntas. Sabe qué aprendes y hasta qué profundidad. Hasta «desplegar un clúster K8s de forma autónoma» es mejor que nada.
2. **Busca materiales con autoridad** — primero documentación oficial y libros de texto clásicos. No dejes que un tutor IA diserte de la nada; la IA también necesita entrada autoritativa.
3. **Produce cursos con el flujo teach** — exige mantener `RESOURCES.md` (una lista de recursos externos) que la IA consulta antes de generar.
4. **Valida con preguntas** — reales, simulacros o escritas por ti; la clave es que sea <strong>cuantificable</strong>. El acierto no es el objetivo, es una señal de diagnóstico.
5. **Expande los errores** — no te quedes con la respuesta correcta; pregunta «por qué me equivoqué, dónde está la confusión, cómo sería una variante».

---

## Lecturas complementarias

- [Alineación cuádruple](/ai-study-kit/es/method/four-alignment/) — las reglas de alineación en detalle
- [Verificación bidireccional](/ai-study-kit/es/maintain/bidirectional-check/) — script de verificación automatizada
- [Guía de los CLI de IA](/ai-study-kit/es/ai/ai-cli/) — uso de los CLI teach / grill / podcast
- `examples/dev-intro/` — un ejemplo completo de git + Linux mostrando el ciclo alineado completo
