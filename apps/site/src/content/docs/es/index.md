---
title: Convierte cualquier banco de preguntas en un ciclo completo de estudio
description: Andamiaje open source donde práctica, cursos, tarjetas y repetición espaciada se mantienen alineados en torno a los mismos puntos de examen
template: splash
hero:
  title: Un coach de IA te entrena hasta dominarlo
  tagline: 'Las preguntas las reúnes tú o las escribe la IA. Los errores se explican por punto de examen, los repasos se programan solos y el progreso se sincroniza entre dispositivos. Gratis y open source: instala el plugin y dile a tu IA «quiero aprender X».'
  image:
    html: |
      <div class="ask-shot">
        <div class="ask-shot-bar"><i></i><i></i><i></i></div>
        <div class="ask-shot-body">
          <div class="ask-shot-tabs">
            <span class="on">Práctica</span><span>Tarjetas</span><span>Cursos</span><span>Erróneas</span>
          </div>
          <div class="ask-shot-q">En git, ¿cuál es el primer paso para llevar un cambio del directorio de trabajo al repositorio?</div>
          <div class="ask-shot-opt"><i></i>A. git push</div>
          <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
          <div class="ask-shot-opt"><i></i>C. git commit</div>
          <div class="ask-shot-ana">
            Directorio de trabajo → área de preparación (git add) → repositorio (git commit) → remoto (git push). El modelo de tres áreas es el modelo mental central de git.
          </div>
          <div class="ask-shot-meta"><i></i>Pregunta 3 / 24 · racha de 5</div>
        </div>
      </div>
  actions:
    - text: Probar la demo
      link: /demo/
      variant: primary
      icon: rocket
    - text: Inicio rápido
      link: /es/get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
---

<section class="ask-lead">
  <p class="ask-lead-strip">
    <span>Las preguntas viven en un único JSON</span>
    <span>Los cursos son HTML autónomo</span>
    <span>Las tarjetas usan SM-2 compatible con Anki</span>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Un kit, seis artefactos de estudio</h2>
    <p>Lo que explican los cursos, evalúan las preguntas y fijan las tarjetas son los mismos puntos de conocimiento</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>Práctica</b><span>Opción única, múltiple y V/F; calificación al enviar; la múltiple debe ser toda correcta</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>Cursos</b><span>HTML autónomo con diagramas ASCII y avisos destacados</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>Tarjetas</b><span>Los conceptos clave como tarjetas: pregunta delante, detalle detrás</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>Análisis de erróneas</b><span>La IA agrupa tus fallos por punto de examen y explica cada uno</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>Repetición espaciada</b><span>SM-2 programa los repasos; las tarjetas vencidas se ponen en cola solas</span></div>
    <div class="ask-feat"><div class="ico">🎧</div><b>Podcasts</b><span>Cualquier material de estudio se convierte en un audio a dos voces para el camino</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>¿Para quién es esto?</h2>
    <p>El repo incluye un tema de ejemplo de git y Linux; para uso real, cambia por tu propio banco de preguntas</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>Qué haces</th><th>Te encaja</th></tr>
      <tr><td>Dev aprendiendo una tecnología nueva, React o K8s</td><td class="y">✅ Convierte los docs en preguntas y fíjalas con tarjetas</td></tr>
      <tr><td>Estudiante preparando un examen o certificación</td><td class="y">✅ Banco de preguntas real + análisis de erróneas con IA</td></tr>
      <tr><td>Preparando entrevistas</td><td class="y">✅ Escribe tus propias preguntas; la IA genera cursos y repasos</td></tr>
      <tr><td>Aprendiendo cualquier cosa con puntos de examen: cumplimiento, procesos, terminología</td><td class="y">✅ Si se puede descomponer en preguntas y respuestas, se puede estudiar</td></tr>
      <tr><td>Solo quieres un banco de preguntas ya hecho</td><td>❌ No incluye preguntas; escríbelas tú o generálalas con IA</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>¿Por qué no las herramientas existentes?</h2>
    <p>Anki no tiene app de práctica ni análisis de erróneas; Quizlet es SaaS cerrado y se queda tus datos</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare matrix">
      <tr><th>Herramienta</th><th>Práctica</th><th>Cursos</th><th>Tarjetas SRS</th><th>Análisis</th><th>Código abierto</th></tr>
      <tr><td class="tool">Anki</td><td>✗</td><td>✗</td><td class="y">✓</td><td>✗</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>✗</td><td>Parcial</td><td>✗</td><td>✗</td></tr>
      <tr><td class="tool">Notion</td><td>✗</td><td>Notas</td><td>✗</td><td>✗</td><td>✗</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Dos comandos y se lo pasas al coach</h2>
    <p>El plugin trae el código completo de la app — sin clonar, sin comandos que memorizar</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>Añade el marketplace<code>/plugin marketplace add https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>Instala ai-study-kit<code>Luego dile a tu IA «quiero aprender X» (o /ask-coach)</code></div>
    <div class="ask-step"><div class="n">3</div>El coach toma el mando<code>Escanea tu progreso → elige lo próximo → te guía</code></div>
  </div>
  <p class="ask-more">
    ¿Prefieres ejecutarlo localmente? <a href="/es/get-started/">Ruta con clone en Primeros pasos</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>¿No sabes qué tocar hoy?</h2>
    <p>Cambiar de tema, generar cursos, practicar, repasar erróneas, desplegar — nada de eso hay que memorizarlo; el /ask-coach integrado decide el siguiente paso</p>
  </div>
  <div class="ask-flow">
    <span class="node">Escanea tu estado de aprendizaje</span><span class="arr">→</span>
    <span class="node">Recomienda lo único que toca hacer ahora</span><span class="arr">→</span>
    <span class="node">Te guía en la ejecución</span>
  </div>
  <p class="ask-more">
    <code>pnpm run skill:install</code> lo añade a tu CLI de IA; cada sesión empieza ahí ·
    <a href="/es/ai/ai-study-kit/">Cómo funciona /ask-coach</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Más que una herramienta de práctica</h2>
    <p>Incorpora una metodología destilada de la práctica real de estudio</p>
  </div>
  <div class="ask-flow">
    <span class="node">El temario define el alcance</span><span class="arr">→</span>
    <span class="node">Los materiales construyen conceptos</span><span class="arr">→</span>
    <span class="node">Las preguntas validan el dominio</span>
  </div>
  <p class="ask-more">
    <a href="/es/method/methodology/">Lee la metodología completa</a>
  </p>
</section>
