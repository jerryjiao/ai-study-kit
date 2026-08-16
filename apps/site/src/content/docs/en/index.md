---
title: ai-study-kit
description: An open-source scaffold that turns any quiz set into a complete learning loop
template: splash
header:
  tagline: Turn any quiz set into a complete learning loop
  actions:
    - text: ⚡ Try the demo
      link: /ai-study-kit/demo/
      variant: primary
      icon: rocket
    - text: Quick start
      link: /ai-study-kit/en/get-started/
      variant: secondary
      icon: right-arrow
---

<div class="ask-hero">
  <div>
    <span class="ask-hero-badge">Open source · MIT · clone &amp; run</span>
    <h1>Bring your own questions, <br /><span class="ask-gradient-text">get a full learning app</span></h1>
    <p class="ask-sub">
      Quizzes, courses, flashcards, wrong-question deep-dives and spaced repetition — all
      aligned around the same knowledge points, with cross-device progress sync. This is a
      scaffold, not a question bank: anything that can be broken into Q&amp;A can be learned.
    </p>
    <div class="ask-cta-row">
      <a class="ask-cta-primary" href="/ai-study-kit/demo/">⚡ Try the demo</a>
      <a class="ask-cta-ghost" href="/ai-study-kit/en/get-started/">Quick start →</a>
    </div>
  </div>
  <div class="ask-shot">
    <div class="ask-shot-bar"><i></i><i></i><i></i></div>
    <div class="ask-shot-body">
      <div class="ask-shot-tabs">
        <span class="on">Quiz</span><span>Flashcards</span><span>Courses</span><span>Wrong</span>
      </div>
      <div class="ask-shot-q">In git, what is the first step to get a working-directory change into the repository?</div>
      <div class="ask-shot-opt"><i></i>A. git push</div>
      <div class="ask-shot-opt ok"><i></i>B. git add ✓</div>
      <div class="ask-shot-opt"><i></i>C. git commit</div>
      <div class="ask-shot-ana">
        Working dir → staging (git add) → repository (git commit) → remote (git push). The three-area model is git's core mental model.
      </div>
    </div>
  </div>
</div>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>One app, five learning artifacts</h2>
    <p>What the course teaches, the quiz tests, the cards drill and the deep-dives explain — same knowledge points</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico">✅</div><b>Quizzes</b><span>Single/multi/true-false, graded instantly; multi-choice must be fully correct</span></div>
    <div class="ask-feat"><div class="ico">📖</div><b>Courses</b><span>Self-contained HTML lessons with ASCII diagrams and callouts</span></div>
    <div class="ask-feat"><div class="ico">🎴</div><b>Flashcards</b><span>Memory anchors for core concepts — front prompt, back details</span></div>
    <div class="ask-feat"><div class="ico">🔍</div><b>Deep-dives</b><span>AI clusters your wrong answers by exam point and expands each</span></div>
    <div class="ask-feat"><div class="ico">⏱️</div><b>Spaced repetition</b><span>Anki-compatible SM-2 with learning steps, due cards queued automatically</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Who is this for</h2>
    <p>A scaffold, not a bank: bring your own questions, get a learning app</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>You are</th><th>Does it fit</th></tr>
      <tr><td>🧑‍💻 A developer learning a new stack</td><td class="y">✅ Distill docs into quizzes, drill with cards</td></tr>
      <tr><td>📚 A student revising for exams</td><td class="y">✅ Real question banks + AI deep-dives</td></tr>
      <tr><td>🎯 Preparing for interviews</td><td class="y">✅ Your own questions + AI courses + SRS</td></tr>
      <tr><td>🗂️ Learning anything with exam points</td><td class="y">✅ If it can be Q&amp;A, it can be learned</td></tr>
      <tr><td>Wanting a ready-made question bank</td><td>❌ No stock questions — bring your own</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Why not existing tools</h2>
    <p>Anki has no quiz app, Quizlet keeps your data, Notion notes can't be drilled</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>Tool</th><th>Quizzes</th><th>Courses</th><th>SRS cards</th><th>Deep-dives</th><th>Open source</th></tr>
      <tr><td class="tool">Anki</td><td>—</td><td>—</td><td class="y">✓</td><td>—</td><td class="y">✓</td></tr>
      <tr><td class="tool">Quizlet</td><td class="y">✓</td><td>—</td><td>Partial</td><td>—</td><td>—</td></tr>
      <tr><td class="tool">Notion</td><td>—</td><td>Notes</td><td>—</td><td>—</td><td>—</td></tr>
      <tr class="us"><td class="tool">ai-study-kit</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓ MIT</td></tr>
    </table>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Three commands, see it in the browser</h2>
    <p>No AI setup, no database — clone and run</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step"><div class="n">1</div>Clone the repo<code>git clone https://github.com/jerryjiao/ai-study-kit</code></div>
    <div class="ask-step"><div class="n">2</div>Install deps<code>pnpm install</code></div>
    <div class="ask-step"><div class="n">3</div>Start<code>pnpm dev → http://localhost:5173</code></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>More than a quiz tool</h2>
    <p>A learning methodology distilled from real practice is built in</p>
  </div>
  <div class="ask-flow">
    <span class="node">Syllabus defines scope</span><span class="arr">→</span>
    <span class="node">Materials build concepts</span><span class="arr">→</span>
    <span class="node">Quizzes validate mastery</span>
  </div>
  <p style="text-align: center; margin-top: 1.4rem;">
    <a href="/ai-study-kit/en/method/methodology/">Read the methodology →</a>
  </p>
</section>
