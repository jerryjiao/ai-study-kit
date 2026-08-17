---
title: Turn any quiz set into a complete learning loop
description: An open-source study scaffold where quizzes, courses, flashcards and spaced repetition stay aligned around the same exam points
template: splash
hero:
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
      link: /ai-study-kit/demo/
      variant: primary
      icon: rocket
    - text: Quick start
      link: /ai-study-kit/en/get-started/
      variant: secondary
      icon: right-arrow
    - text: GitHub
      link: https://github.com/jerryjiao/ai-study-kit
      variant: secondary
      icon: github
---

<section class="ask-lead">
  <p>
    This project turns one study path into a web app you can deploy yourself: a syllabus
    defines what to learn, reference materials explain the concepts, and quizzes tell you
    whether they stuck. The question bank is a JSON file, lessons are self-contained HTML,
    and flashcards run an Anki-compatible SM-2 scheduler.
  </p>
  <p>
    Not ready to install anything? Answer a few questions in the
    <a href="/ai-study-kit/demo/">online demo</a> first. If it works for you, clone the repo,
    swap in your own topic, and it becomes the thing you are studying.
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
    <table class="ask-compare">
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
    <h2>Not sure what to study today?</h2>
    <p>Swap the theme, generate lessons, quiz, deep-dive, deploy — no need to memorize any of it; the built-in /study-coach picks what comes next</p>
  </div>
  <div class="ask-flow">
    <span class="node">Scans your learning state</span><span class="arr">→</span>
    <span class="node">Recommends the one thing to do</span><span class="arr">→</span>
    <span class="node">Walks you through it</span>
  </div>
  <p class="ask-more">
    <code>pnpm run skill:install</code> adds it to your AI CLI; every session starts there ·
    <a href="/ai-study-kit/en/ai/study-coach/">How /study-coach works</a>
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
    <a href="/ai-study-kit/en/method/methodology/">Read the full methodology</a>
  </p>
</section>
