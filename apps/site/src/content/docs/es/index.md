---
title: 'Coach de IA open source: te entrena hasta dominar cualquier tema'
description: ai-study-kit es un coach de IA open source — dile «quiero aprender X» a tu IA y alineará los puntos de examen, escribirá las preguntas y los cursos, y te entrenará hasta que lo domines. Sin banco de preguntas previo. Auto-alojado, licencia MIT, sin cuentas, tus datos.
template: splash
hero:
  # 2026-09-16: misma estructura que zh/en (volteo narrativo «cero preparación», #75); FAQ + capturas + JSON-LD añadidos para completar la isomorfía de las cuatro páginas.
  title: Un coach de IA te entrena hasta dominarlo
  tagline: 'Dile «quiero aprender X» a tu IA: el coach alinea los puntos de examen contigo, escribe las preguntas y los cursos, y te entrena hasta que lo domines. No necesitas un banco de preguntas: los errores se explican por punto de examen y los repasos se programan solos. Gratis y open source.'
  image:
    html: |
      <div class="ask-hero-chat">
        <div class="ask-hero-chat-row user"><span>Quiero aprender git y Linux desde cero</span></div>
        <div class="ask-hero-chat-row coach"><span>Hecho. Puntos de examen alineados — preguntas, tarjetas y cursos listos. A practicar.</span></div>
      </div>
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
head:
  # Datos estructurados: WebSite + SoftwareApplication + FAQPage (espejo de la sección FAQ de abajo).
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","name":"ai-study-kit","url":"https://aistudykit.dev/es/","inLanguage":"es","description":"Coach de IA open source: dile «quiero aprender X» a tu IA — alinea los puntos de examen, escribe preguntas y cursos, y te entrena hasta que lo domines"},
      {"@type":"SoftwareApplication","name":"ai-study-kit","url":"https://aistudykit.dev/es/","applicationCategory":"EducationalApplication","operatingSystem":"Web","description":"Coach de IA open source y auto-alojable: cursos, práctica, tarjetas, análisis de erróneas y repetición espaciada alineados en torno a los mismos puntos de examen, con sincronización entre dispositivos.","offers":{"@type":"Offer","price":0,"priceCurrency":"USD"},"license":"https://opensource.org/licenses/MIT","codeRepository":"https://github.com/jerryjiao/ai-study-kit","author":{"@type":"Organization","name":"ai-study-kit contributors"}},
      {"@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"¿Es gratis ai-study-kit?","acceptedAnswer":{"@type":"Answer","text":"Sí. Open source con licencia MIT, sin cuentas, sin suscripciones, sin telemetría."}},
      {"@type":"Question","name":"¿En qué se diferencia de Anki?","acceptedAnswer":{"@type":"Answer","text":"Los repasos usan el planificador SM-2 compatible con Anki (pasos de aprendizaje, graduación, decaimiento por olvido), pero el ciclo cubre también la práctica — calificación, análisis de erróneas y cursos en torno a los mismos puntos de examen. No es un plugin de Anki."}},
      {"@type":"Question","name":"¿Dónde viven mis datos?","acceptedAnswer":{"@type":"Answer","text":"En modo local el progreso se queda en tu navegador; despliega el pequeño servidor incluido y el progreso es un único archivo progress.json en tu propia máquina. Nunca interviene ningún tercero."}},
      {"@type":"Question","name":"¿Qué proveedores de LLM soporta?","acceptedAnswer":{"@type":"Answer","text":"Cualquier API compatible con OpenAI (OpenAI, Zhipu GLM, DeepSeek, Kimi, Qwen, Doubao y más), configurada en tu propio .env. La app de práctica y las tarjetas también funcionan sin IA."}},
      {"@type":"Question","name":"¿Cómo se despliega?","acceptedAnswer":{"@type":"Answer","text":"Frontend estático más un pequeño servidor Hono: pnpm build && pnpm exec pm2 start en cualquier host con Node — o corre solo en local con pnpm dev."}},
      {"@type":"Question","name":"¿Qué tipos de pregunta soporta?","acceptedAnswer":{"@type":"Answer","text":"Opción única, opción múltiple (todo correcto para puntuar) y verdadero/falso, guardadas como JSON plano — sin encadenarte a nada."}},
      {"@type":"Question","name":"¿Necesito traer mi propio banco de preguntas?","acceptedAnswer":{"@type":"Answer","text":"No hace falta. Di al /ask-coach integrado «quiero aprender X»: alinea un temario contigo y redacta preguntas, tarjetas y cursos a juego. ¿Prefieres los tuyos? Las preguntas son JSON plano por tema — importa exámenes reales cuando quieras."}},
      {"@type":"Question","name":"¿Puedo convertir mi material en un pódcast?","acceptedAnswer":{"@type":"Answer","text":"Sí. Cualquier material — cursos, preguntas, análisis de erróneas — se sintetiza en un audio a dos voces con transcripción. Generado con tu propia API key, en cuatro idiomas, para repasar en el camino o mientras haces ejercicio."}}
      ]}
      ]}
---

<section class="ask-section ask-install-section">
  <div class="ask-section-head">
    <h2>Una frase, y tu IA se encarga</h2>
    <p>Copia esta línea y envíala a cualquier herramienta de IA —Claude Code, zcode, Cursor—: instalará el coach y el código de la app. Díle «quiero aprender X» y puedes empezar hoy</p>
  </div>
  <div class="ask-install">
    <code>Install ai-study-kit from https://aistudykit.dev/install.md</code>
    <button class="ask-copy" type="button" data-done="¡Copiado ✓">Copiar</button>
  </div>
  <script>
    (function () {
      var box = document.querySelector('.ask-install');
      var btn = box && box.querySelector('.ask-copy');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var text = box.querySelector('code').textContent.trim();
        var done = function () {
          var old = btn.textContent;
          btn.textContent = btn.dataset.done || '✓';
          btn.classList.add('done');
          setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });
    })();
  </script>
  <p class="ask-more">
    ¿Prefieres escribir los comandos? <a href="/es/get-started/">Matriz de instalación por herramienta</a> · ¿Ejecutar localmente? La ruta con clone también está ahí
  </p>
</section>

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>Qué pasa después de instalar</h2>
    <p>De una frase al dominio real en cuatro pasos — cada uno espera tu confirmación</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step">
      <span class="num">01</span>
      <b>Di una frase</b>
      <span class="desc">Di a tu IA «quiero aprender X». ¿Tienes exámenes reales o un temario? Pásaselos. ¿No tienes nada? También sirve</span>
    </div>
    <div class="ask-step-arr">→</div>
    <div class="ask-step">
      <span class="num">02</span>
      <b>Alineen los puntos</b>
      <span class="desc">El coach redacta el temario contigo: qué entra, a qué profundidad, cuántas preguntas — nada arranca hasta que asientes</span>
    </div>
    <div class="ask-step-arr">→</div>
    <div class="ask-step">
      <span class="num">03</span>
      <b>Recibe el set completo</b>
      <span class="desc">Preguntas, cursos y tarjetas se generan en torno a los mismos puntos de examen: lo que explican los cursos, lo evalúan las preguntas</span>
    </div>
    <div class="ask-step-arr">→</div>
    <div class="ask-step">
      <span class="num">04</span>
      <b>Entrena hasta dominarlo</b>
      <span class="desc">Calificación al enviar, errores explicados por punto de examen, repasos en cola solos — hasta que lo aciertes</span>
    </div>
  </div>
  <p class="ask-more">
    Desde entonces cada sesión empieza con <code>/ask-coach</code>: escanea tu progreso y elige lo único que toca hacer ahora ·
    <a href="/es/ai/ai-study-kit/">Cómo funciona /ask-coach</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Qué aspecto tiene de verdad</h2>
    <p>Capturas tomadas de la demo en vivo — no son maquetas. Pulsa «Probar la demo» para usarla</p>
  </div>
  <div class="ask-shots">
    <figure class="ask-shot-card">
      <img src="/shots/quiz-es.png" alt="Vista de práctica: pregunta de opción única sobre git con respuesta correcta resaltada y explicación" loading="lazy" />
      <figcaption>Práctica: calificación al enviar, errores registrados, cada pregunta explicada</figcaption>
    </figure>
    <figure class="ask-shot-card">
      <img src="/shots/stats-es.png" alt="Panel: estadísticas de respondidas, aciertos, erróneas y leídas con accesos a repetir erróneas y práctica aleatoria" loading="lazy" />
      <figcaption>Panel: progreso, aciertos y accesos de práctica calculados con tus respuestas</figcaption>
    </figure>
  </div>
</section>

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>Un kit, seis artefactos de estudio</h2>
    <p>Lo que explican los cursos, evalúan las preguntas y fijan las tarjetas son los mismos puntos de conocimiento</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div><b>Práctica</b><span>Opción única, múltiple y V/F; calificación al enviar; la múltiple debe ser toda correcta</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg></div><b>Cursos</b><span>HTML autónomo con diagramas y avisos destacados</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg></div><b>Tarjetas</b><span>Los conceptos clave como tarjetas: pregunta delante, detalle detrás</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg></div><b>Análisis de erróneas</b><span>La IA agrupa tus fallos por punto de examen y explica cada uno</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg></div><b>Repetición espaciada</b><span>SM-2 programa los repasos; las tarjetas vencidas se ponen en cola solas</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div><b>Pódcast</b><span>Cualquier material de estudio se convierte en un audio a dos voces para el camino</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>¿Para quién es esto?</h2>
    <p>El repo incluye un tema de ejemplo de git y Linux; cámbialo por lo que realmente estés estudiando</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>Qué haces</th><th>Te encaja</th></tr>
      <tr><td>Dev aprendiendo una tecnología nueva, React o K8s</td><td class="y">✅ La IA convierte los docs en preguntas; fíjalas con tarjetas</td></tr>
      <tr><td>Estudiante preparando un examen o certificación</td><td class="y">✅ ¿Tienes exámenes pasados? Impórtalos. ¿No? La IA escribe preguntas desde tus puntos de examen</td></tr>
      <tr><td>Preparando entrevistas</td><td class="y">✅ Di para qué es — la IA genera cursos y preguntas y te guía por tus erróneas</td></tr>
      <tr><td>Aprendiendo cualquier cosa con puntos de examen: cumplimiento, procesos, terminología</td><td class="y">✅ Si se puede descomponer en preguntas y respuestas, se puede estudiar</td></tr>
      <tr><td>Solo quieres un banco de preguntas ya hecho</td><td>❌ Aquí no hay preguntas de fábrica — pero la IA puede generar un set desde tus puntos de examen</td></tr>
    </table>
  </div>
</section>

<section class="ask-section ask-section--tint">
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
    <h2>Qué CLIs de IA están soportados</h2>
    <p>Tres probados por nosotros; cinco más vía el estándar abierto Agent Plugins</p>
  </div>
  <div class="ask-wall">
    <div class="ask-wall-tile b-claude"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg></span><span class="name">Claude Code</span></div>
    <div class="ask-wall-tile b-text"><span class="logo zmark">zcode</span><span class="name">zcode</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg></span><span class="name">Codex</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="m415.035 156.35-151.503-87.4695c-4.865-2.8094-10.868-2.8094-15.733 0l-151.4969 87.4695c-4.0897 2.362-6.6146 6.729-6.6146 11.459v176.383c0 4.73 2.5249 9.097 6.6146 11.458l151.5039 87.47c4.865 2.809 10.868 2.809 15.733 0l151.504-87.47c4.089-2.361 6.614-6.728 6.614-11.458v-176.383c0-4.73-2.525-9.097-6.614-11.459zm-9.516 18.528-146.255 253.32c-.988 1.707-3.599 1.01-3.599-.967v-165.872c0-3.314-1.771-6.379-4.644-8.044l-143.645-82.932c-1.707-.988-1.01-3.599.968-3.599h292.509c4.154 0 6.75 4.503 4.673 8.101h-.007z"/></svg></span><span class="name">Cursor</span><span class="chip">estándar</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M24 22.525H0l12-21.05 12 21.05z"/></svg></span><span class="name">Vercel</span><span class="chip">estándar</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></span><span class="name">GitHub</span><span class="chip">estándar</span></div>
    <div class="ask-wall-tile b-aws"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 182">
  <path fill="currentColor" d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2 c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8 c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8 c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4 c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1 c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6 c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7 c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6 C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4 c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1 h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5 c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.7-2.2,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1 c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-3.8,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8 c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3 c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5 c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1 c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1 c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2 c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1 c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6 c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"/>
  <path fill="var(--aws-smile, currentColor)" d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4 c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"/>
</svg></span><span class="name">AWS</span><span class="chip">estándar</span></div>
    <div class="ask-wall-tile b-ms"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22">
  <path fill="var(--ms-c1, currentColor)" d="M1 1h10v10H1z"/>
  <path fill="var(--ms-c2, currentColor)" d="M12 1h10v10H12z"/>
  <path fill="var(--ms-c3, currentColor)" d="M1 12h10v10H1z"/>
  <path fill="var(--ms-c4, currentColor)" d="M12 12h10v10H12z"/>
</svg></span><span class="name">Microsoft</span><span class="chip">estándar</span></div>
  </div>
  <p class="ask-wall-foot">Y cualquier otro CLI de IA que soporte el estándar Agent Plugins o un directorio de skills</p>
</section>

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>Preguntas frecuentes</h2>
    <p>Gratis o de pago, bancos de preguntas, propiedad de los datos y compatibilidad con Anki</p>
  </div>
  <div class="ask-faq">
    <details>
      <summary>¿Es gratis?</summary>
      <p>Sí. Open source con licencia MIT, sin cuentas, sin suscripciones, sin telemetría.</p>
    </details>
    <details>
      <summary>¿En qué se diferencia de Anki?</summary>
      <p>Los repasos usan el planificador SM-2 compatible con Anki (pasos de aprendizaje, graduación, decaimiento por olvido), pero el ciclo cubre también la práctica — calificación, análisis de erróneas y cursos en torno a los mismos puntos de examen. No es un plugin de Anki.</p>
    </details>
    <details>
      <summary>¿Dónde viven mis datos?</summary>
      <p>En modo local el progreso se queda en tu navegador; despliega el pequeño servidor incluido y el progreso es un único archivo <code>progress.json</code> en tu propia máquina. Nunca interviene ningún tercero.</p>
    </details>
    <details>
      <summary>¿Qué proveedores de LLM soporta?</summary>
      <p>Cualquier API compatible con OpenAI (OpenAI, Zhipu GLM, DeepSeek, Kimi, Qwen, Doubao y más), configurada en tu propio <code>.env</code>. La app de práctica y las tarjetas también funcionan sin IA.</p>
    </details>
    <details>
      <summary>¿Cómo se despliega?</summary>
      <p>Frontend estático más un pequeño servidor Hono: <code>pnpm build &amp;&amp; pnpm exec pm2 start</code> en cualquier host con Node — o corre solo en local con <code>pnpm dev</code>.</p>
    </details>
    <details>
      <summary>¿Qué tipos de pregunta soporta?</summary>
      <p>Opción única, opción múltiple (todo correcto para puntuar) y verdadero/falso, guardadas como JSON plano — sin encadenarte a nada.</p>
    </details>
    <details>
      <summary>¿Necesito traer mi propio banco de preguntas?</summary>
      <p>No hace falta. Di al /ask-coach integrado «quiero aprender X»: alinea un temario contigo y redacta preguntas, tarjetas y cursos a juego. ¿Prefieres los tuyos? Las preguntas son JSON plano por tema — importa exámenes reales cuando quieras.</p>
    </details>
    <details>
      <summary>¿Puedo convertir mi material en un pódcast?</summary>
      <p>Sí. Cualquier material — cursos, preguntas, análisis de erróneas — se sintetiza en un audio a dos voces con transcripción. Generado con tu propia API key, en cuatro idiomas, para repasar en el camino o mientras haces ejercicio.</p>
    </details>
  </div>
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
