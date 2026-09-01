# Metodología

[简体中文](methodology.md) · [English](methodology.en.md) · **Español** · [Русский](methodology.ru.md)

Este kit de herramientas destila una práctica real de aprendizaje. La versión en una línea: **el temario define qué se evalúa → los materiales de referencia construyen los conceptos → las preguntas de práctica validan el resultado**. Las tres cosas tienen su propia fuente de autoridad y el orden no se puede alterar: ponerse a responder preguntas antes de definir el temario, o practicar al aire conceptos sin ningún respaldo en materiales, es esfuerzo desperdiciado. A continuación, el patrón general despojado de todo vínculo con un dominio concreto: sirve para cualquier tema.

---

## El patrón central: temario → materiales → preguntas

Al estudiar un dominio te encuentras con tres tipos de material, de naturaleza y prioridad distintas:

| Material | Papel | Ejemplos | Autoridad |
|----------|-------|----------|-----------|
| **Temario / programa del examen** | Define **qué aprender y con qué profundidad** | Programas de curso, convocatorias de certificación, listas de preguntas de entrevista, objetivos de aprendizaje tipo OKR | **La única autoridad** |
| **Materiales de referencia** | Construyen el **sistema de conceptos** | Libros de texto clásicos, documentación oficial, cursos abiertos, blogs de calidad, explicaciones de un tutor IA | Alta (cede ante el temario en caso de conflicto) |
| **Preguntas de práctica** | **Validan** el dominio | Exámenes reales, simulacros, preguntas escritas por ti, tarjetas, cuaderno de erróneas | Media (las preguntas pueden estar sesgadas) |

El temario es la autoridad; los materiales de referencia y las preguntas de práctica son herramientas. Cuando los tres discrepan sobre un mismo concepto, gana el temario: que algo aparezca en preguntas o materiales no significa que el temario lo exija, y lo que el temario exige hay que aprenderlo aunque tu banco de preguntas no lo cubra.

### Qué aprender y cuándo

- **Si el temario lo lista, hay que cubrirlo** — un requisito duro de certificaciones, exámenes y entrevistas.
- **Si no lo lista, no lo fuerces** — la señal es «puedes saltarlo», no «debes estudiar todo lo relacionado».
- **Si un punto tiene niveles** (p. ej. L1 introducción / L2 avanzado / L3 dominio) — prepárate para tu nivel objetivo; no apuntes a ciegas al más alto.

---

## El ciclo completo de aprendizaje

La herramienta organiza cinco tipos de artefactos en torno a un mismo conjunto de puntos de examen, más una línea de coach y una huella de aprendizaje:

### Los cinco artefactos

1. **App de práctica (quiz-app)** — responder preguntas, calificar, recolectar erróneas, sincronización automática del progreso entre dispositivos.
2. **Lecciones de curso (salida del CLI teach)** — conceptos dispersos de los materiales ensartados en explicaciones sistemáticas, una mini-web HTML autónoma. Una lección solo cuenta en el progreso cuando marcas explícitamente «✓ completada» — abrirla no cuenta, terminarla sí.
3. **Tarjetas (SRS)** — anclas de memoria para los conceptos clave, con repetición espaciada mediante el algoritmo SM-2 + pasos de aprendizaje de Anki.
4. **Análisis a fondo de erróneas (salida del CLI grill)** — los fallos de alta frecuencia se agrupan en clústeres y cada uno se excava a fondo: por qué te equivocaste y dónde está la frontera de lo confuso, no solo la respuesta correcta.
5. **Podcasts de repaso (salida del CLI podcast)** — cursos, preguntas y análisis de erróneas convertidos en audio a dos voces (presentador y presentadora) para repasar en trayectos y entrenamientos.

### La línea de coach: `/ai-study-kit`

Con tantas funciones, «¿qué toca hacer exactamente hoy?» se vuelve una carga en sí misma. El coach de estudio `/ai-study-kit` se encarga del enrutamiento: cada vez sondea primero tu estado de aprendizaje en modo solo lectura, luego te da una acción recomendada con su razón, y una vez elegida te guía por el playbook. Dos de sus flujos corresponden directamente a las afirmaciones más profundas de esta metodología:

- **F10 tutoría acompañada** — la lección es unidireccional; la tutoría es un diálogo: explica a fondo cada punto de examen (qué es / por qué / cuándo se usa), evalúa en el momento y corrige el error en el momento. Es el complemento interactivo de «construir conceptos con materiales de referencia».
- **F11 sprint preexamen** — a ≤ 7 días de la fecha del examen se abre la ventana de cosecha: cosecha solo lo ya aprendido (frases ancla, archivo de erróneas), no añadas lecciones nuevas; memoriza a fondo y valida con un simulacro.

### La huella de aprendizaje: `study/`

Los productos de aprendizaje del paquete de tema viven unificados bajo `study/`, cada uno de los cuatro tipos en su sitio:

| Directorio | Contenido | Naturaleza |
|------------|-----------|------------|
| `study/records/` | Archivo de progreso de la tutoría (registro punto por punto, frases ancla) | Privado del estudiante, **nunca se publica con el sitio estático** |
| `study/notes/` | Notas de etapa (producto de la tutoría, se pasa el testigo a la práctica) | Se distribuye con el paquete de tema |
| `study/wrong-questions/` | Análisis a fondo de erróneas (salida de grill) | Se distribuye con el paquete de tema |
| `study/sprint/` | Paquete de sprint preexamen (frases de memorización rápida / avisos de errores frecuentes / listas de memorización obligatoria / checklist) | Se distribuye con el paquete de tema |

La IA participa en cada capa: redacción de preguntas (un agente las produce punto por punto desde el temario — véase el flujo F2 de [`ai-study-kit.es.md`](./ai-study-kit.es.md)), enseñanza (teach), tutoría (F10, enseñanza dialogada), confección de tarjetas (destilación de conceptos del curso), excavación de erróneas (grill) y síntesis de podcasts (podcast). Cómo mantener todos estos productos en torno a un mismo conjunto de puntos de examen es el principio de las [`cuatro alineaciones`](./four-alignment.es.md).

---

## Visión general del flujo

```
        ┌───────────────────────┐
        │  Temario (autoridad)  │
        └───────────┬───────────┘
                    │ define puntos + nivel
                    ▼
   ┌─────────────────────────────┐
   │  Materiales de referencia   │ ← libros / docs / cursos / tutor IA
   └──────────────┬──────────────┘
                  │ estructuración asistida por IA
                  ▼
   ┌─────────────────────────────┐
   │  Curso HTML (teach)         │ ← explicación sistemática + diálogo tutorado F10
   └──────────────┬──────────────┘
                  │ cuatro alineaciones (abajo)
                  ▼
   ┌─────────────────────────────┐
   │  Preguntas + tarjetas +     │ ← un mismo punto de examen
   │  análisis de erróneas       │   cubierto por todos los artefactos
   └──────────────┬──────────────┘
                  │ práctica continua
                  ▼
   ┌─────────────────────────────┐
   │  Tasa de acierto = efecto   │
   │  del aprendizaje            │
   └─────────────────────────────┘
                  ↓
   Erróneas → análisis por clústeres (grill) → reforzar → rehacer
   Examen cerca → cosecha del sprint (F11) → validación con simulacro
```

---

## Una palabra para autores de temas

Aplica esta metodología a tu propio tema (K8s, React, vocabulario de inglés, cualquier asignatura):

1. **Define primero el temario** — no empieces a responder preguntas sin más. Piensa qué aprender y hasta qué nivel, y escríbelo en `examples/<theme>/MISSION.md`. Hasta un objetivo tan grueso como «quiero poder desplegar un clúster de K8s por mi cuenta» es mejor que nada.
2. **Reúne materiales con autoridad** — prioriza documentación oficial y libros de texto clásicos, y guarda los enlaces en `examples/<theme>/RESOURCES.md`. El tutor IA también necesita entrada autoritativa; no dejes que diserte de la nada.
3. **Genera el curso** — pon objetivos, audiencia, profundidad y enlaces a materiales en `examples/<theme>/course-spec.json` y ejecuta `pnpm run ai:teach`.
4. **Valida con preguntas** — valen exámenes reales, simulacros o preguntas escritas por ti; la clave es que sea **cuantificable**. La tasa de acierto no es el fin, es una señal de diagnóstico.
5. **Excava en las erróneas** — no te quedes con la respuesta correcta; pregúntate «por qué fallé, dónde está la confusión, cómo sería una variante». Deja que se acumulen y deja que el CLI grill las agrupe y las explique a fondo.

No hace falta recorrer el flujo a mano: con el coach `/ai-study-kit` instalado, basta decir «quiero aprender X» y el flujo F2 de nuevo tema te llevará por los pasos anteriores en orden.

---

## Lecturas complementarias

- [`four-alignment.es.md`](./four-alignment.es.md) — las reglas detalladas del principio de las cuatro alineaciones
- [`bidirectional-check.es.md`](./bidirectional-check.es.md) — el script de verificación bidireccional automatizada
- [`ai-cli-guide.es.md`](./ai-cli-guide.es.md) — uso de los CLI teach / grill / podcast
- `examples/dev-intro/` — el ejemplo completo del tema git + Linux, para ver qué pinta tiene el ciclo de las cuatro alineaciones
