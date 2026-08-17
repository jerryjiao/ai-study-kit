---
title: Inicio rápido
description: Pon la demo en marcha en cinco minutos y mira la práctica, las tarjetas y los cursos
---

## ¿Para quién es esto?

| Qué haces | Te encaja |
|------|---------|
| 🧑‍💻 **Dev aprendiendo una tecnología nueva** (React / K8s / Rust) | ✅ Convierte la documentación oficial en preguntas y fíjalas con tarjetas |
| 📚 **Estudiando para un examen** (asignatura / certificación) | ✅ Banco de preguntas real + análisis de erróneas generados por IA |
| 🎯 **Preparando entrevistas** | ✅ Escribe tus propias preguntas + cursos generados por IA, con SRS |
| 🗂️ **Aprendiendo cualquier cosa con «puntos de examen»** (cumplimiento, procesos, terminología) | ✅ Si se puede descomponer en preguntas y respuestas, se puede estudiar |
| ❌ Buscas un banco de preguntas ya hecho | ❌ Esto es un **andamiaje**, no un banco — recopila exámenes reales o genera preguntas con IA |

**En una frase**: esto es un andamiaje, no un banco de preguntas. Las preguntas pueden ser exámenes reales que recopiles o preguntas que escribas con una IA; en cuanto estén en JSON, la herramienta añade cursos, tarjetas, análisis de erróneas y planificación de repasos.

¿No quieres clonar? [Prueba la demo online](/ai-study-kit/demo/) — funcionalidad completa, el progreso se guarda solo en tu navegador.

## La demo en 5 minutos

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

> Es solo una demo. **No vas a usar nada del contenido de dev-intro** — lo cambiarás por lo que de verdad estés aprendiendo. Ver [Hazlo tuyo](/ai-study-kit/es/your-theme/).

## Funciona sin IA

Los tres CLI de IA son capacidades incrementales. Si solo quieres la app de práctica + tarjetas, sáltate toda la configuración de LLM — con `pnpm dev` basta.

Para ir más allá:

- [Hazlo tuyo](/ai-study-kit/es/your-theme/) — convierte la demo en tu propio tema en 30 minutos
- [Metodología](/ai-study-kit/es/method/methodology/) — por qué es «temario → materiales → preguntas»
- [Guía de los CLI de IA](/ai-study-kit/es/ai/ai-cli/) — deja que la IA genere cursos, análisis y podcasts
