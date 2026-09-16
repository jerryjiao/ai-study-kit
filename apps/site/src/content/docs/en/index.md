---
title: "Open-Source AI Study Coach: Drills Any Topic Until You Truly Know It"
description: ai-study-kit is an open-source AI study coach — tell your AI “I want to learn X” and it aligns the exam points, writes the questions and lessons, then drills you until it sticks. No question bank required. Self-hosted, MIT licensed, no account, your data.
template: splash
hero:
  # H1 and the SERP <title> both carry the AI-coach claim (2026-09-16: no "quiz app" positioning); search keywords live in the description.
  # tagline 2026-09-16: zero-prep flip (#75) — "say one line" leads; own-questions / no-AI are honest facts, not the opener.
  title: An AI coach that drills you until you've got it
  tagline: 'Tell your AI “I want to learn X” — the coach aligns the exam points with you, writes the questions and lessons, then drills you until it sticks. No question bank required: wrong answers get explained by exam point and reviews schedule themselves. Free and open source.'
  image:
    html: |
      <div class="ask-hero-chat">
        <div class="ask-hero-chat-row user"><span>I want to learn git and Linux basics</span></div>
        <div class="ask-hero-chat-row coach"><span>Done. Exam points aligned — questions, cards and lessons are ready. Let's drill.</span></div>
      </div>
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
      {"@type":"WebSite","name":"ai-study-kit","url":"https://aistudykit.dev/en/","inLanguage":"en","description":"Open-source AI study coach: tell your AI “I want to learn X” — it aligns exam points, writes questions and lessons, then drills you until it sticks"},
      {"@type":"SoftwareApplication","name":"ai-study-kit","url":"https://aistudykit.dev/en/","applicationCategory":"EducationalApplication","operatingSystem":"Web","description":"Open-source AI study coach, self-hostable: lessons, quizzes, flashcards, wrong-answer deep-dives and spaced repetition aligned around the same exam points, with cross-device sync.","offers":{"@type":"Offer","price":0,"priceCurrency":"USD"},"license":"https://opensource.org/licenses/MIT","codeRepository":"https://github.com/jerryjiao/ai-study-kit","author":{"@type":"Organization","name":"ai-study-kit contributors"}},
      {"@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"Is ai-study-kit free?","acceptedAnswer":{"@type":"Answer","text":"Yes. MIT-licensed open source, no accounts, no subscriptions, no telemetry."}},
      {"@type":"Question","name":"How is it different from Anki?","acceptedAnswer":{"@type":"Answer","text":"Reviews run the Anki-compatible SM-2 scheduler (learning steps, graduation, lapse decay), but the loop also covers the quiz side — grading, wrong-answer deep-dives and course pages around the same exam points. It is not an Anki plugin."}},
      {"@type":"Question","name":"Where does my data live?","acceptedAnswer":{"@type":"Answer","text":"In local mode progress stays in your browser; deploy the small bundled server and progress is a single progress.json file on your own machine. No third party is ever involved."}},
      {"@type":"Question","name":"Which LLM providers are supported?","acceptedAnswer":{"@type":"Answer","text":"Any OpenAI-compatible API (OpenAI, Zhipu GLM, DeepSeek, Kimi, Qwen, Doubao and more), configured in your own .env. The quiz app and flashcards also work with no AI at all."}},
      {"@type":"Question","name":"How do I deploy it?","acceptedAnswer":{"@type":"Answer","text":"Static frontend plus a small Hono server: pnpm build && pnpm exec pm2 start on any Node host — or run purely locally with pnpm dev."}},
      {"@type":"Question","name":"What question types are supported?","acceptedAnswer":{"@type":"Answer","text":"Single-choice, multiple-choice (all-correct grading) and true/false, stored as plain JSON — no lock-in."}},
      {"@type":"Question","name":"Can I use my own question bank?","acceptedAnswer":{"@type":"Answer","text":"You don't have to. Tell the built-in /ask-coach “I want to learn X”: it aligns an exam outline with you, then drafts questions, cards and lessons to match. Prefer your own? Questions are plain JSON per theme — import past papers anytime."}},
      {"@type":"Question","name":"Can I turn my study material into a podcast?","acceptedAnswer":{"@type":"Answer","text":"Yes. Any material — lessons, questions, wrong-answer deep-dives — can be synthesized into a two-host audio show with a transcript. Generated with your own API key, in four languages, for passive review on your commute or while exercising."}}
      ]}
      ]}
---

<section class="ask-section ask-install-section">
  <div class="ask-section-head">
    <h2>One sentence, hand it to your AI</h2>
    <p>Copy this line and send it to any AI tool — Claude Code, zcode, Cursor — it installs the coach and the site source. Tell it “I want to learn X” and you can start drilling today</p>
  </div>
  <div class="ask-install">
    <code>Install ai-study-kit from https://aistudykit.dev/install.md</code>
    <button class="ask-copy" type="button" data-done="Copied ✓">Copy</button>
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
    Prefer typing commands yourself? <a href="/en/get-started/">Per-tool install matrix</a> · Want to run locally? The clone route lives there too
  </p>
</section>

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>What happens after install</h2>
    <p>Four steps from one sentence to drilling</p>
  </div>
  <div class="ask-steps">
    <div class="ask-step">
      <span class="num">01</span>
      <b>Say what you want to learn</b>
      <span class="desc">Tell your AI “I want to learn X”; got past papers or a syllabus? Hand them over — got nothing? That works too</span>
    </div>
    <div class="ask-step">
      <span class="num">02</span>
      <b>Agree on the exam points</b>
      <span class="desc">The coach settles scope with you first: what's covered, how deep, how many questions — nothing starts until you nod</span>
    </div>
    <div class="ask-step">
      <span class="num">03</span>
      <b>Get the full set</b>
      <span class="desc">Questions, lessons and flashcards are built around the same exam points: what the lessons teach, the quizzes test</span>
    </div>
    <div class="ask-step">
      <span class="num">04</span>
      <b>Drill until it sticks</b>
      <span class="desc">Graded on submit, wrong answers explained by exam point, reviews queue up on schedule</span>
    </div>
  </div>
  <p class="ask-more">
    From then on every session starts with <code>/ask-coach</code>: it scans your progress and picks the one thing to do now ·
    <a href="/en/ai/ai-study-kit/">How /ask-coach works</a>
  </p>
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

<section class="ask-section ask-section--tint">
  <div class="ask-section-head">
    <h2>One toolkit, six learning artifacts</h2>
    <p>What the lessons teach, the quizzes test and the cards drill are the same knowledge points</p>
  </div>
  <div class="ask-feats">
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div><b>Quizzes</b><span>Single, multi and true/false, graded on submit; multi must be fully correct</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg></div><b>Lessons</b><span>Self-contained HTML pages with diagrams and callouts</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg></div><b>Flashcards</b><span>Core concepts as cards, prompt on the front, details on the back</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg></div><b>Deep-dives</b><span>AI clusters wrong answers by exam point and explains each one</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg></div><b>Spaced repetition</b><span>SM-2 schedules reviews; due cards queue up on their own</span></div>
    <div class="ask-feat"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div><b>Podcasts</b><span>Any study material becomes a two-host audio show for your commute</span></div>
  </div>
</section>

<section class="ask-section">
  <div class="ask-section-head">
    <h2>Who is this for</h2>
    <p>The repo ships a git and Linux example theme; swap in whatever you're actually studying</p>
  </div>
  <div class="ask-compare-wrap">
    <table class="ask-compare">
      <tr><th>What you are doing</th><th>Does it fit</th></tr>
      <tr><td>A developer learning a new stack, say React or K8s</td><td class="y">✅ AI distills the docs into quizzes; drill with cards</td></tr>
      <tr><td>A student preparing for an exam</td><td class="y">✅ Got past papers? Import them. Don't? AI writes questions from your exam points</td></tr>
      <tr><td>Getting ready for interviews</td><td class="y">✅ Say what it's for — AI writes lessons and questions, then walks you through your wrong answers</td></tr>
      <tr><td>Learning anything with exam points, compliance or processes</td><td class="y">✅ If it can be Q&amp;A, it can be learned</td></tr>
      <tr><td>You just want a ready-made question bank</td><td>❌ No stock questions here — but AI can generate a set from your exam points</td></tr>
    </table>
  </div>
</section>

<section class="ask-section ask-section--tint">
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
    <h2>Which AI CLIs are supported</h2>
    <p>Three tested by us; five more via the Agent Plugins open standard</p>
  </div>
  <div class="ask-wall">
    <div class="ask-wall-tile b-claude"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg></span><span class="name">Claude Code</span></div>
    <div class="ask-wall-tile b-text"><span class="logo zmark">zcode</span><span class="name">zcode</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg></span><span class="name">Codex</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="m415.035 156.35-151.503-87.4695c-4.865-2.8094-10.868-2.8094-15.733 0l-151.4969 87.4695c-4.0897 2.362-6.6146 6.729-6.6146 11.459v176.383c0 4.73 2.5249 9.097 6.6146 11.458l151.5039 87.47c4.865 2.809 10.868 2.809 15.733 0l151.504-87.47c4.089-2.361 6.614-6.728 6.614-11.458v-176.383c0-4.73-2.525-9.097-6.614-11.459zm-9.516 18.528-146.255 253.32c-.988 1.707-3.599 1.01-3.599-.967v-165.872c0-3.314-1.771-6.379-4.644-8.044l-143.645-82.932c-1.707-.988-1.01-3.599.968-3.599h292.509c4.154 0 6.75 4.503 4.673 8.101h-.007z"/></svg></span><span class="name">Cursor</span><span class="chip">standard</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M24 22.525H0l12-21.05 12 21.05z"/></svg></span><span class="name">Vercel</span><span class="chip">standard</span></div>
    <div class="ask-wall-tile b-text"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></span><span class="name">GitHub</span><span class="chip">standard</span></div>
    <div class="ask-wall-tile b-aws"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 182">
  <path fill="currentColor" d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2 c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8 c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8 c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4 c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1 c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6 c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7 c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6 C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4 c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1 h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5 c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.7-2.2,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1 c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-3.8,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8 c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3 c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5 c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1 c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1 c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2 c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1 c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6 c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"/>
  <path fill="var(--aws-smile, currentColor)" d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4 c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"/>
</svg></span><span class="name">AWS</span><span class="chip">standard</span></div>
    <div class="ask-wall-tile b-ms"><span class="logo"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22">
  <path fill="var(--ms-c1, currentColor)" d="M1 1h10v10H1z"/>
  <path fill="var(--ms-c2, currentColor)" d="M12 1h10v10H12z"/>
  <path fill="var(--ms-c3, currentColor)" d="M1 12h10v10H1z"/>
  <path fill="var(--ms-c4, currentColor)" d="M12 12h10v10H12z"/>
</svg></span><span class="name">Microsoft</span><span class="chip">standard</span></div>
  </div>
  <p class="ask-wall-foot">Plus any other AI CLI that supports the Agent Plugins standard or a skills directory</p>
</section>

<section class="ask-section ask-section--tint">
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
      <summary>What question types are supported?</summary>
      <p>Single-choice, multiple-choice (all-correct grading) and true/false, stored as plain JSON — no lock-in.</p>
    </details>
    <details>
      <summary>Can I use my own question bank?</summary>
      <p>You don't have to. Tell the built-in /ask-coach “I want to learn X”: it aligns an exam outline with you, then drafts questions, cards and lessons to match. Prefer your own? Questions are plain JSON per theme — import past papers anytime.</p>
    </details>
    <details>
      <summary>Can I turn my study material into a podcast?</summary>
      <p>Yes. Any material — lessons, questions, wrong-answer deep-dives — can be synthesized into a two-host audio show with a transcript. Generated with your own API key, in four languages, for passive review on your commute or while exercising.</p>
    </details>
  </div>
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
