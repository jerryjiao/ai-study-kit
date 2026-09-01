# Verificación bidireccional · el script de comprobación

[简体中文](bidirectional-check.md) · [English](bidirectional-check.en.md) · **Español** · [Русский](bidirectional-check.ru.md)

El principio de las cuatro alineaciones solo tiene dientes si es verificable automáticamente. El repositorio incluye [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py), que convierte las tres direcciones «preguntas → curso», «temario → preguntas» y «cobertura de tarjetas» en un solo comando. Lo semántico («el curso lo enseña mal») sigue requiriendo revisión humana (las reglas, en [`four-alignment.es.md`](./four-alignment.es.md)).

---

## Inicio rápido

```bash
pnpm run check:alignment                          # 仓库根执行，默认扫 examples/dev-intro/
pnpm run check:alignment -- examples/my-topic/    # 扫指定主题

# 或直接跑 Python
python3 scripts/bidirectional-check.py examples/my-topic/
```

**Códigos de salida**: `0` = todo verde (△ «apenas mencionado» cuenta como aviso y no bloquea); `1` = existe algún ✗ (no enseñado / no cubierto / conciliación que no cuadra); `2` = el directorio del tema no existe. Se puede enganchar directamente en CI / scripts como puerta de calidad.

Ejemplo de salida (modo contrato) — salida real del script, se muestra sin traducir:

```
扫描主题: examples/dev-intro
  题数: 10 / 闪卡: 4 / 课程文件: ['git-basics.html', 'linux-basics.html']
  考点排布表: 4 个考点（契约模式）

方向 1 · 题 → 课
  ✓ 暂存区: 课程 14 次命中
方向 2 · 大纲 → 题（排布表对账）
  ✓ EP-01 暂存区: single×3, multi×1, judge×1 共 5 题，day D1 一致
  ✓ 闪卡数对账: 表合计 = 实际 = 4 张
方向 3 · 闪卡覆盖
  ✓ 暂存区: 闪卡已覆盖
  ○ 相对路径: 排布表声明 0 卡（了解级不配卡），跳过

结论: 全绿（△ 为略提警告，不算失败）
```

---

## Modo contrato: la tabla de distribución de puntos de examen

Cuando el MISSION.md del tema trae una sección `## 考点排布表` (tabla de distribución de puntos de examen), entra el modo contrato — los puntos de examen salen de la tabla en lugar de las palabras clave incorporadas, así que **cambiar de tema no exige tocar el script**:

```markdown
## 考点排布表

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | 暂存区 | 掌握 | single×3, multi×1, judge×1 | D1 | 1 |
```

(La tabla es un contrato de datos y se mantiene en chino: las columnas son punto id / punto de examen / profundidad / tipo de pregunta×cantidad / día / número de tarjetas.)

- **La columna 考点 (punto de examen) lleva la palabra clave central**: las direcciones 1/3 hacen correspondencia por subcadena sobre ella (recuento sobre el texto del curso sin espacios; front/back/topic de las tarjetas), así que debe ser una palabra que de verdad aparezca en el curso y en los enunciados.
- **深度 (profundidad)**: 掌握 (dominio) / 理解 (comprensión) / 了解 (familiarización) — referencia para humanos, no interviene en el juicio de la máquina.
- **闪卡数 (número de tarjetas) 0 = el temario declara que ese punto no lleva tarjetas**: la dirección 3 se salta el punto (habitual en nivel de familiarización); la suma de la columna de tarjetas de todas las filas debe igualar el número real de flashcards.json.

Reglas de juicio del modo contrato:

- **Dirección 1 (preguntas → curso)**: la palabra clave de cada punto debe aparecer ≥3 veces en el HTML del curso (sin espacios) para contar como cubierto; 1-2 veces es △ apenas mencionado; 0 veces es ✗, hay que ampliar el curso.
- **Dirección 2 (temario → preguntas, conciliación)**: una pregunta cuyo `examPoint` cita un id de punto inexistente es ✗; las que no llevan etiqueta solo reciben un aviso △ y quedan fuera de la conciliación (el campo no es obligatorio en sí, pero en modo contrato se recomienda etiquetar todas). El número real de preguntas y la distribución de tipos de cada punto deben igualar la columna «题型×题量» (tipo de pregunta×cantidad); el `day` de la pregunta debe igualar el day de la fila del punto; los totales de tarjetas concilian. Cualquier discrepancia es ✗.
- **Dirección 3 (cobertura de tarjetas)**: para los puntos con ≥1 tarjeta declarada, la palabra clave debe aparecer en el front / back / topic de alguna tarjeta.

---

## Modo de respaldo (sin tabla)

Los temas cuyo MISSION.md no tiene tabla recaen en el escaneo de términos de alta frecuencia: el script cuenta, sobre enunciados + explicaciones, los conceptos con **palabras clave incorporadas** (los términos de puntos de git/Linux de dev-intro) que aparecen ≥3 veces, ejecuta las direcciones 1/3 y añade un aviso ⚠. Los temas antiguos no se ven afectados, pero se recomienda añadir la tabla — el modo de respaldo no tiene la conciliación de la dirección 2 y sus palabras clave son las de dev-intro.

---

## Cuándo ejecutarlo

Obligatorio tras cualquier cambio en un artefacto (detalles en «Cuándo ejecutar las comprobaciones» de [`four-alignment.es.md`](./four-alignment.es.md)):

1. tras generar un curso nuevo
2. tras cambiar el examPoint / day / la cantidad de preguntas
3. tras editar flashcards.json
4. tras una tanda de análisis de erróneas del CLI grill

---

## Limitaciones del script

El script hace un **escaneo de grano grueso** y no sustituye la revisión humana. Caza huecos duros del tipo «el curso no enseña X en absoluto» o «la cantidad de preguntas no cuadra con el temario», pero no caza «el curso enseña X pero lo enseña mal», ni «pregunta y curso usan la misma palabra con significados distintos». Trátalo como la **primera línea de defensa**; la alineación semántica compleja sigue siendo cosa del autor del tema.

Las pruebas de caja negra del contrato están en `apps/quiz-app/scripts/lib/bidirectional-contract.test.mjs` (tres temas fixture: conciliación correcta con tabla / respaldo sin tabla / bloqueo por conciliación que no cuadra), y `pnpm test` las ejecuta automáticamente.

La fuente de verdad es [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py) en el repositorio.
