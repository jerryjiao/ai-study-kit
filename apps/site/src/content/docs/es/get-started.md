---
title: Inicio rápido
description: 'Elige la ruta de instalación de tu herramienta, dile a tu IA «quiero aprender X» y el coach se encarga del resto — sitio, preguntas y despliegue'
---

Instala un plugin, dile a tu IA «quiero aprender X» y tu sitio de estudio ya está en marcha. Elige tu herramienta abajo; cada comando de aquí se ha probado de verdad.

## Instalar según tu herramienta

Los pasos de instalación cambian según la herramienta, y cada una necesita su propia copia. El plugin incluye el código fuente completo de la app, así que no hay nada que clonar.

**Claude Code** (dos pasos, ejecuta ambos)

```text
/plugin marketplace add https://github.com/jerryjiao/ai-study-kit
/plugin install ai-study-kit@ai-study-kit
```

**zcode**: abre el marketplace de plugins, añade el repositorio `https://github.com/jerryjiao/ai-study-kit` e instala ai-study-kit.

**Codex** (dos pasos, ejecuta ambos)

```text
codex plugin marketplace add jerryjiao/ai-study-kit
codex plugin add ai-study-kit@ai-study-kit
```

**Cualquier otro CLI de IA** que lea un directorio de skills puede usar el instalador incluido:

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm run skill:install   # instala en ~/.agents/skills/
# o elige destino: bash scripts/install-skill.sh --dest ~/.claude/skills
```

**Cursor, Copilot y demás** quedan cubiertos por el manifiesto estándar Agent Plugins; consulta la documentación de plugins de cada herramienta.

## Qué pasa después de instalar

Dile a tu IA «quiero aprender X», o ejecuta [`/ask-coach`](/es/ai/ai-study-kit/). El coach escanea primero tu estado de aprendizaje (tema, progreso, erróneas, tarjetas vencidas, configuración de IA), recomienda lo que más vale la pena hacer ahora y luego lo ejecuta contigo. Trece flujos cubiertos de principio a fin — arranque, temas nuevos, generación de preguntas y cursos, análisis de erróneas y despliegue.

Tu proyecto de estudio (copia de la app + tus paquetes de tema) vive por completo en tu propio directorio y sobrevive a las actualizaciones del plugin; tras una actualización, los proyectos antiguos reciben un aviso de versión, y actualizar es un pase corto que no toca tus datos.

El proyecto no trae banco de preguntas hecho. Las preguntas pueden ser exámenes reales que recopiles, o un banco completo generado por un agente de IA — instala `/ask-coach` y pídelo; el flujo está en [Hazlo tuyo](/es/your-theme/), sección «Deja que un agente de IA escriba las preguntas».

¿No quieres instalar nada? [Prueba la demo online](/demo/) — funcionalidad completa, el progreso se guarda solo en tu navegador.

## Desarrolladores: la demo en local (ruta clone)

Para curiosear el código o correr la demo en local:

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# Abre http://localhost:5173
```

**Qué verás** (el tema de ejemplo dev-intro: git + fundamentos de Linux):

| Pestaña | Qué muestra |
|-----|---------------|
| **Práctica** | 10 preguntas de git/Linux (única/múltiple/V-F), calificación al enviar, la múltiple debe ser toda correcta; los fallos van al cuaderno de erróneas |
| **Tarjetas** | 4 tarjetas de repetición espaciada SM-2, valoradas again / hard / good / easy, compatibles con Anki |
| **Cursos** | 2 lecciones HTML autónomas (las tres áreas de git, directorios y permisos de Linux) con diagramas ASCII y avisos |

> Es solo una demo. **No vas a usar nada del contenido de dev-intro** — lo cambiarás por lo que de verdad estés aprendiendo. Ver [Hazlo tuyo](/es/your-theme/).

## Funciona sin IA

Los tres CLI de IA son capacidades incrementales. Si solo quieres la app de práctica + tarjetas, sáltate toda la configuración de LLM — con `pnpm dev` basta.

Para ir más allá:

- [Hazlo tuyo](/es/your-theme/) — convierte la demo en tu propio tema en 30 minutos
- [Metodología](/es/method/methodology/) — por qué es «temario → materiales → preguntas»
- [Guía de los CLI de IA](/es/ai/ai-cli/) — deja que la IA genere cursos, análisis y podcasts
