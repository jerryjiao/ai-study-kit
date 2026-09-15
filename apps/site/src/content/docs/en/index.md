---
title: Open-Source Quiz & Flashcard App · Self-Hosted · MIT
description: ai-study-kit is an open-source, self-hosted quiz and flashcard app — practice tests, lessons, wrong-answer deep-dives and Anki-compatible spaced repetition around one exam-point map. MIT licensed, no account, your data.
template: splash
hero:
  # H1 keeps the brand sentence; the SERP <title> (frontmatter title) carries the search keywords
  title: Turn any quiz set into a complete learning loop
  tagline: An open-source scaffold under MIT. Questions can be past papers you collect or ones an AI writes for you; the tool takes care of courses, flashcards, deep-dives and spaced repetition, with cross-device sync.
  image:
    html: |
      <div class="ask-shot">
        <div class="ask-shot-bar"><i></i><i></i><i></i></div>
        <div class="ask-shot-body">
          <div class="ask-shot-tabs">
            <span class="on">Quiz</span><span>Cards</span><span>Lessons</span><span>Wrong</span>
          </div>
          <div class="ask-shot-q">In git, what is the first step to get a working-directory change into the repository?</div>
          <div class="ask-shot-opt"><i></i>A. git push</div>
          <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
          <div class="ask-shot-opt"><i></i>C. git commit</div>
          <div class="ask-shot-ana">
            Working dir → staging (git add) → repository (git commit) → remote (git push). The three-area model is git's core mental model.
          </div>
          <div class="ask-shot-meta"><i></i>Question 3 / 24 · streak 5</div>
        </div>
      </div>
  actions:
    - text: Try the demo
      link: /demo/
      variant: primary
      icon: rocket
    - text: Quick start
      link: /en/get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
head:
  # Structured data: WebSite + SoftwareApplication + FAQPage (mirrors the FAQ section below).
  # FAQ rich results are limited to gov/health sites since 2023; the value here is semantic clarity and long-tail coverage.
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","name":"ai-study-kit","url":"https://aistudykit.dev/en/","inLanguage":"en","description":"Open-source quiz and flashcard app: turn any question bank into a complete learning loop"},
      {"@type":"SoftwareApplication","name":"ai-study-kit","url":"https://aistudykit.dev/en/","applicationCategory":"EducationalApplication","operatingSystem":"Web","description":"Open-source, self-hosted quiz and flashcard app: quizzes, lessons, wrong-answer deep-dives and spaced repetition aligned around the same exam points, with cross-device sync.","offers":{"@type":"Offer","price":0,"priceCurrency":"USD"},"license":"https://opensource.org/licenses/MIT","codeRepository":"https://github.com/jerryjiao/ai-study-kit","author":{"@type":"Organization","name":"ai-study-kit contributors"}},
      {"@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"Is ai-study-kit free?","acceptedAnswer":{"@type":"Answer","text":"Yes. MIT-licensed open source, no accounts, no subscriptions, no telemetry."}},
      {"@type":"Question","name":"How is it different from Anki?","acceptedAnswer":{"@type":"Answer","text":"Reviews run the Anki-compatible SM-2 scheduler (learning steps, graduation, lapse decay), but the loop also covers the quiz side — grading, wrong-answer deep-dives and course pages around the same exam points. It is not an Anki plugin."}},
      {"@type":"Question","name":"Where does my data live?","acceptedAnswer":{"@type":"Answer","text":"In local mode progress stays in your browser; deploy the small bundled server and progress is a single progress.json file on your own machine. No third party is ever involved."}},
      {"@type":"Question","name":"Which LLM providers are supported?","acceptedAnswer":{"@type":"Answer","text":"Any OpenAI-compatible API (OpenAI, Zhipu GLM, DeepSeek, Kimi, Qwen, Doubao and more), configured in your own .env. The quiz app and flashcards also work with no AI at all."}},
      {"@type":"Question","name":"How do I deploy it?","acceptedAnswer":{"@type":"Answer","text":"Static frontend plus a small Hono server: pnpm build && pnpm exec pm2 start on any Node host — or run purely locally with pnpm dev."}},
      {"@type":"Question","name":"What question types are supported?","acceptedAnswer":{"@type":"Answer","text":"Single-choice, multiple-choice (all-correct grading) and true/false, stored as plain JSON — no lock-in."}},
      {"@type":"Question","name":"Can I use my own question bank?","acceptedAnswer":{"@type":"Answer","text":"Yes: questions and flashcards are JSON files per theme. The built-in /ask-coach skill walks you from an exam outline to a full deck, and the AI CLIs can draft questions for you."}}
      ]}
      ]}
---

<section class="ask-lead">
  <p class="ask-lead-strip">
    <span>Questions live in one JSON file</span>
    <span>Lessons are self-contained HTML</span>
    <span>Flashcards run Anki-compatible SM-2</span>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>One app, five learning artifacts</h2>
    <p>What the lessons teach, the quizzes test and the cards drill are the same knowledge points</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>Quizzes</b><span>Single, multi and true/false, graded on submit; multi must be fully correct</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>Lessons</b><span>Self-contained HTML pages with ASCII diagrams and callouts</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>Flashcards</b><span>Core concepts as cards, prompt on the front, details on the back</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>Deep-dives</b><span>AI clusters wrong answers by exam point and explains each one</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>Spaced repetition</b><span>SM-2 schedules reviews; due cards queue up on their own</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Who is this for</h2>
    <p>The repo ships a git and Linux example theme; swap in your own question bank for real use</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>What you are doing</th><th>Does it fit</th></tr>
      <tr><td>A developer learning a new stack, say React or K8s</td><td class="y">✅ Distill docs into quizzes, drill with cards</td></tr>
      <tr><td>A student preparing for an exam</td><td class="y">✅ Real question banks plus AI deep-dives</td></tr>
      <tr><td>Getting ready for interviews</td><td class="y">✅ Write your own questions, AI writes the lessons</td></tr>
      <tr><td>Learning anything with exam points, compliance or processes</td><td class="y">✅ If it can be Q&amp;A, it can be learned</td></tr>
      <tr><td>You just want a ready-made question bank</td><td>❌ No stock questions; write your own or generate them</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Why not existing tools</h2>
    <p>Anki has no quiz app or deep-dives; Quizlet is closed-source SaaS and keeps your data</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare matrix">
      <tr><th>Tool</th><th>Quizzes</th><th>Lessons</th><th>SRS cards</th><th>Deep-dives</th><th>Open source</th></tr>
      <tr><td class="tool">Anki</td><td>✗</td><td>✗</td><td class="y">✓</td><td>✗</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>✗</td><td>Partial</td><td>✗</td><td>✗</td></tr>
      <tr><td class="tool">Notion</td><td>✗</td><td>Notes</td><td>✗</td><td>✗</td><td>✗</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>What it actually looks like</h2>
    <p>Screenshots captured from the live demo — not mockups. Click “Try the demo” to use it</p>
  </div>
  <div class="ask-shots">
    <figure class="ask-shot-card">
      <img src="/shots/quiz-en.png" alt="Quiz view: a git single-choice question with correct-answer highlight and per-question explanation" loading="lazy" />
      <figcaption>Quiz: graded on submit, wrong answers tracked, every question explained</figcaption>
    </figure>
    <figure class="ask-shot-card">
      <img src="/shots/stats-en.png" alt="Dashboard: answered, accuracy, wrong and read stats with retry-wrong and random-drill entry points" loading="lazy" />
      <figcaption>Dashboard: progress, accuracy and drill entries computed from your answers</figcaption>
    </figure>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Three commands, then it is in your browser</h2>
    <p>Works without any AI setup; the quiz app and flashcards need no external service</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>Clone the repo<code>git clone https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>Install dependencies<code>pnpm install</code></div>
    <div class="ask-step"><div class="n">3</div>Start the dev server<code>pnpm dev → http://localhost:5173</code></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Frequently asked questions</h2>
    <p>Free vs paid, question banks, data ownership and Anki compatibility</p>
  </div>
  <div class="ask-faq">
    <details>
      <summary>Is it free?</summary>
      <p>Yes. MIT-licensed open source, no accounts, no subscriptions, no telemetry.</p>
    </details>
    <details>
      <summary>How is it different from Anki?</summary>
      <p>Reviews run the Anki-compatible SM-2 scheduler (learning steps, graduation, lapse decay), but the loop also covers the quiz side — grading, wrong-answer deep-dives and course pages around the same exam points. It is not an Anki plugin.</p>
    </details>
    <details>
      <summary>Where does my data live?</summary>
      <p>In local mode progress stays in your browser; deploy the small bundled server and progress is a single <code>progress.json</code> file on your own machine. No third party is ever involved.</p>
    </details>
    <details>
      <summary>Which LLM providers are supported?</summary>
      <p>Any OpenAI-compatible API (OpenAI, Zhipu GLM, DeepSeek, Kimi, Qwen, Doubao and more), configured in your own <code>.env</code>. The quiz app and flashcards also work with no AI at all.</p>
    </details>
    <details>
      <summary>How do I deploy it?</summary>
      <p>Static frontend plus a small Hono server: <code>pnpm build &amp;&amp; pnpm exec pm2 start</code> on any Node host — or run purely locally with <code>pnpm dev</code>.</p>
    </details>
    <details>
      <summary>Can I use my own question bank?</summary>
      <p>Yes: questions and flashcards are JSON files per theme. The built-in /ask-coach skill walks you from an exam outline to a full deck, and the AI CLIs can draft questions for you.</p>
    </details>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Not sure what to study today?</h2>
    <p>Swap the theme, generate lessons, quiz, deep-dive, deploy — no need to memorize any of it; the built-in /ask-coach picks what comes next</p>
  </div>
  <div class="ask-flow">
    <span class="node">Scans your learning state</span><span class="arr">→</span>
    <span class="node">Recommends the one thing to do</span><span class="arr">→</span>
    <span class="node">Walks you through it</span>
  </div>
  <p class="ask-more">
    <code>pnpm run skill:install</code> adds it to your AI CLI; every session starts there ·
    <a href="/en/ai/ai-study-kit/">How /ask-coach works</a>
  </p>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>More than a quiz tool</h2>
    <p>A study methodology distilled from real practice is built in</p>
  </div>
  <div class="ask-flow">
    <span class="node">Syllabus defines scope</span><span class="arr">→</span>
    <span class="node">Materials build concepts</span><span class="arr">→</span>
    <span class="node">Quizzes validate mastery</span>
  </div>
  <p class="ask-more">
    <a href="/en/method/methodology/">Read the full methodology</a>
  </p>
</section>
