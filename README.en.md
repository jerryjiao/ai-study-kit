<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · **English** · [Español](README.es.md) · [Русский](README.ru.md)

> Turn any question set into a complete learning loop — practice + courses + flashcards + wrong-answer deep-dives + spaced repetition, with progress synced across devices. See the demo in 5 minutes, make it yours in 30.

<p align="center">
  <a href="https://jerryjiao.github.io/ai-study-kit/"><img src="https://img.shields.io/badge/website-online-blue" alt="Website" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="Deploy status" /></a>
  <img src="https://img.shields.io/badge/i18n-4%20languages-blue" alt="UI in 4 languages" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [Website](https://jerryjiao.github.io/ai-study-kit/) · ▶️ [Live demo](https://jerryjiao.github.io/ai-study-kit/demo/) · 📖 [Quick start](https://jerryjiao.github.io/ai-study-kit/en/get-started/)

---

## 👋 Who is this for

| You are… | Fit |
|------|---------|
| 🧑‍💻 **A developer learning a new stack** (React / K8s / Rust) | ✅ Distill official docs into questions, drill them, lock them in with flashcards |
| 📚 **Studying for an exam** (coursework / entrance / certification) | ✅ Your real question set + AI-generated deep-dives on wrong answers |
| 🎯 **Prepping for interviews** (fundamentals / system design) | ✅ Write your own questions, let AI generate the courses, revise with SRS |
| 🗂️ **Learning anything with "test points"** (compliance / processes / terminology) | ✅ If it can be broken down into "question + answer", you can study it |
| ❌ Looking for a ready-made question bank ("500 Java questions") | ❌ This is a **scaffold** and ships with zero real questions — you bring the questions, or generate them with AI |

**In one sentence**: this is a **scaffold**, not a question bank. You bring the questions; the tool turns them into a study app with courses, flashcards, and wrong-answer analysis.

---

## 🤖 Recommended way to start: install the plugin — no clone needed

Install the whole kit into your AI agent (zcode / Claude Code). **No repo cloning, no commands to memorize** — the plugin ships a complete buildable app snapshot, and the agent walks you from zero to a running study site, generating questions and courses along the way:

```
/plugin marketplace add https://github.com/jerryjiao/ai-study-kit
# install ai-study-kit, then say "I want to learn X" (or /ai-study-kit) in a new session
```

Your study project (app copy + your theme packs) lives entirely in your own directory and survives plugin upgrades. Ten flows covered end to end: bootstrap, new theme, daily study, wrong-question grilling, podcasts, course generation, live walkthrough, verification, deploy — see [`docs/ai-study-kit.md`](docs/ai-study-kit.md).

Just want to see what it looks like first? Take the clone route below.

---

## 🚀 See the demo in 5 minutes (clone route, for developers)

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit
pnpm install
pnpm dev
# open http://localhost:5173
```

**What you'll see** (the dev-intro sample theme: git + Linux basics):

| Top tab | What it shows |
|---------|-------------|
| **Practice** | 10 git/Linux questions (single / multi / true-false), graded the moment you click. Wrong answers go to the wrong-question book; right answers show the explanation |
| **Flashcards** | 4 SM-2 spaced-repetition cards. Rate them again / hard / good / easy — the algorithm is compatible with Anki |
| **Courses** | 2 self-contained HTML lessons (git's three areas; Linux directories & permissions) with ASCII diagrams and callouts |

> It's just a demo. **None of the dev-intro content is meant for you** — you'll swap in the topic you're actually studying.

---

## 🧭 Not sure what to do next? `/ai-study-kit`

Once the plugin is installed above (or via `pnpm run skill:install` into `~/.agents/skills/`), every study session can start here.

It first **scans your study state** (current theme, question/card/course inventory, answering progress, due flashcards, wrong count, AI config), then **recommends the single most useful thing to do right now** — start a new theme, review due flashcards, drill questions, or turn your accumulated wrong answers into a deep-dive — and once you pick, it **walks you through it step by step**. Ten playbooks cover everything from initializing the project to deploying it. (The playbook is written in Chinese; see [`docs/ai-study-kit.md`](docs/ai-study-kit.md).)

---

## 🔧 Make it yours in 30 minutes

Worked example: learning **React basics**. You only touch files under `examples/` — **no changes to the `apps/quiz-app/` code**.

### Step 1 · Copy the theme directory (1 min)

```bash
cp -r examples/dev-intro examples/react-basics
```

> **Don't want to put content inside the kit repo?** A theme pack can live in your own project directory: `cp -r examples/dev-intro /path/to/your-project/theme/react-basics`, then pass that path wherever `EXAMPLE_THEME` is expected (a value containing path separators is treated as an external theme pack — all four scripts understand it: build sync / course generation / wrong-question deep-dives). The kit repo stays pristine and is used purely as a tool — see [`docs/adr/0004`](docs/adr/0004-external-theme-packs.md).

### Step 2 · Write your questions (10 min)

Edit `examples/react-basics/questions.json` — replace the git/Linux questions with your React ones. The schema is simple:

```json
{
  "id": "R-001",                      // globally unique, stable id (progress is keyed on it)
  "type": "single",                    // single | multi | judge
  "source": "react-basics",            // question-source tag
  "topic": "react-basics",             // topic grouping (the home page groups by it)
  "question": "What does useState return in React?",
  "options": {
    "A": "The current state value",
    "B": "A function that updates state",
    "C": "An array [state, setState]",
    "D": "An object { state, setState }"
  },
  "answer": ["C"],
  "analysis": "useState returns a two-element array: the current state and an updater function. Usually destructured as const [count, setCount] = useState(0)."
}
```

See the `Question` interface in [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts) for all fields, including the optional `day` study-day tag and `examPoint` exam-point id — the four-way alignment check reconciles them against the exam-point table in MISSION.md.

### Step 3 · Write your flashcards (5 min)

Edit `examples/react-basics/flashcards.json`:

```json
{
  "id": "FC-R-01",
  "front": "What is the return value of useState?",
  "back": "An array [state, setState].\n\nUsage: const [count, setCount] = useState(0).",
  "source": "react-basics",
  "topic": "react-basics"
}
```

### Step 4 · Switch the theme (1 min)

```bash
EXAMPLE_THEME=react-basics pnpm dev
# refresh the browser — your React questions are in
```

### Step 5 · (Optional) Courses + home-page presentation (10 min)

- **Courses**: replace `examples/react-basics/lessons/*.html` with your own (AI can help — see the next section). The courses entry follows the active theme (`EXAMPLE_THEME`) automatically — no code changes needed.
- **Presentation**: edit `examples/react-basics/theme-config.json` — an optional file that drives home-page grouping order (`topicOrder`), display names (`topicLabels`), subtopic expansion (`subtopics`), source badges (`sourceLabels`), core/extension layers (`sourceLayers` + `layerTopics`), exam-point depth badges (`epDepth`), and card colors & icons (`topicStyles`). Without it the app falls back gracefully: raw topic ids, alphabetical order, no subtopics. Full field reference and examples: [`docs/theming.md`](docs/theming.md).

### Step 6 · Validate (2 min)

```bash
pnpm run scan       # brand scan (0 hits = clean)
pnpm test           # all 5 test files must pass
pnpm run build      # build must succeed
python3 scripts/bidirectional-check.py examples/react-basics/  # four-way alignment check (reconciles against the exam-point table in MISSION.md)
```

**Done.** You never touched any React code — just JSON and HTML.

### Let an AI agent write the questions for you (optional)

Don't want to hand-write JSON? Install `/ai-study-kit` (the "🧭 Not sure what to do next?" section above), then just ask it to generate a question bank for react-basics. The agent follows a disciplined flow: it first aligns an **exam-point table** with you in MISSION.md — what to examine, how deep, how many of each question type, how many flashcards — then writes questions and flashcards point by point, and finishes by running the `qa` / `scan` / four-way-alignment quality gates; nothing is delivered until they're all green. The manual path stays the primary one — both paths produce the same artifacts, and the exam-point table is the contract between you and the agent.

---

## 🤖 Going further: let AI generate courses / wrong-answer deep-dives / podcasts

At this point you have a working practice app. The real value of ai-study-kit is the **AI-assisted complete learning loop** — you don't hand-write courses or wrong-answer deep-dives, AI generates them.

Three AI command-line tools ship with the repo:

| CLI | What it does | Input | Output |
|-----|-------|------|------|
| **`teach-generate.mjs`** | Structures a topic spec into multi-section HTML courses | `examples/<theme>/course-spec.json` | `lessons/0001-*.html` etc. |
| **`grill-wrong.mjs`** | After a practice run, clusters your wrong answers by test point and expands each into a deep-dive | wrong questions pulled from `/api/progress` | `wrong-questions/cluster-*.html` |
| **`podcast-generate.mjs`** | Turns any study material into a two-host podcast | any material (HTML/MD/JSON) | `.wav` + script JSON + transcript MD |

**Works with any OpenAI-compatible LLM**: Zhipu GLM (recommended in mainland China) / OpenAI / DeepSeek / Kimi / Qwen / Doubao. TTS currently supports GLM-TTS.

### Configuration

```bash
cp .env.example .env
# edit .env — at minimum LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
# see docs/configuration.md (Chinese)
```

### Running the three CLIs

```bash
# start the quiz-app backend first (grill-wrong needs it)
pnpm run server

# 1. generate courses
node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics

# 2. after a practice run, generate wrong-answer deep-dives
node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics

# 3. turn a lesson into a podcast
node apps/quiz-app/scripts/podcast-generate.mjs \
  --input examples/react-basics/lessons/0001-hooks.html
```

**Typical workflow**:

```
1. Pick a topic + gather authoritative resources (books / docs / videos)
2. Write course-spec.json → teach-generate produces lessons/*.html (systematic teaching)
3. You write questions by hand → questions.json (practice validation)
4. Drill → wrong answers land in the wrong-question book
5. grill-wrong → wrong-answer deep-dive HTML
6. podcast-generate → review by listening on your commute
```

Full CLI usage, parameters and FAQ: [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) (Chinese). Configuration details: [`docs/configuration.md`](docs/configuration.md) (Chinese).

> 💡 **AI is optional**: the three CLIs are incremental. If all you want is the practice site + flashcards, skip the LLM config entirely — `pnpm dev` is enough.

---

## 🌍 Multi-language

**This README**: 简体中文 / [English](README.en.md) / [Español](README.es.md) / [Русский](README.ru.md) — switch at the top.

**The UI**: one-click switch between **中文 / English / Español / Русский** in the top bar.

- First visit picks your browser language; the preference syncs across devices afterwards (same LWW mechanism as the theme preference)
- `<html lang>` and the page title follow the switch (friendly to screen readers and translation tools)
- Dictionaries live in [`apps/quiz-app/src/i18n/locales/`](apps/quiz-app/src/i18n/locales/); en/es/ru are type-anchored to zh's key set — a missing key fails the build, with key-completeness + placeholder tests as a second net

**AI-generated content**: all three CLIs take an output language, for non-Chinese learners:

```bash
node apps/quiz-app/scripts/teach-generate.mjs   --theme X --lang en  # English courses
node apps/quiz-app/scripts/grill-wrong.mjs      --theme X --lang es  # Spanish wrong-answer deep-dives
node apps/quiz-app/scripts/podcast-generate.mjs --input Y --lang ru  # Russian podcast dialogue
# or set STUDY_LANG=en in .env as the default (zh/en/es/ru supported)
```

`--lang` affects generated content and the fixed strings of generated HTML (nav, footer, `<html lang>`). CLI logs stay in Chinese; the question bank itself is never translated. See the “输出语言” section of [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md).

> **The language of your questions and flashcards** is decided by your data — whatever you write in `examples/<theme>/*.json` is what gets displayed. Want an all-English study site? Write questions in English and generate courses with `--lang en`. The tool doesn't lock you in.

---

## 🎯 Why this tool

| Without ai-study-kit | With ai-study-kit |
|-------------------|-----------------|
| **Anki**: great flashcards, but no practice site, no wrong-answer deep-dives, no courses | 5 study artifacts in one app, all aligned on the same set of test points |
| **Quizlet**: has questions and cards, but closed-source SaaS — your data isn't in your hands | MIT open source; data stays local + on your server; sync with no accounts |
| **Notion notes**: capture, but no drilling and no spaced-repetition algorithm | Anki-compatible SM-2 + Anki learning steps built in |
| **PDF / Word question dumps**: read-only — no grading, no accuracy stats | auto-grading, wrong-question book, accuracy stats, SRS scheduling |
| **Just asking ChatGPT**: scattered knowledge, no learning path | AI structures scattered knowledge into systematic courses + questions + flashcards |

**The core differentiator**: the **four-way alignment loop** — the test points taught in courses, tested by questions, memorized via flashcards, and expanded in wrong-answer deep-dives are all the same set (see [docs/four-alignment.md](docs/four-alignment.md), [English version on the website](https://jerryjiao.github.io/ai-study-kit/en/method/four-alignment/)). Finish a lesson and the matching questions are right there; get one wrong and the deep-dive is one command away.

---

## 📚 Documentation

> The repo docs are written in Chinese. The [website](https://jerryjiao.github.io/ai-study-kit/) is available in four languages — Chinese, English, Spanish and Russian — and its homepage auto-opens the version matching your browser; the core pages are translated, the rest fall back to Chinese with a notice bar. Browser translation handles the rest well enough.

| Doc | What you'll learn |
|------|-----------|
| [Quick start](https://jerryjiao.github.io/ai-study-kit/en/get-started/) | 5-minute demo + making it yours (English) |
| [Methodology](https://jerryjiao.github.io/ai-study-kit/en/method/methodology/) | syllabus → materials → questions (English) |
| [Four alignment](https://jerryjiao.github.io/ai-study-kit/en/method/four-alignment/) | how courses / questions / cards / deep-dives stay in sync (English) |
| [`docs/ai-cli-guide.md`](docs/ai-cli-guide.md) | full usage of the three AI CLIs (Chinese) |
| [`docs/ai-study-kit.md`](docs/ai-study-kit.md) | `/ai-study-kit`: install, routing, extension (Chinese) |
| [`docs/configuration.md`](docs/configuration.md) | `.env`: LLM + TTS providers (Chinese) |
| [`docs/bidirectional-check.md`](docs/bidirectional-check.md) | automated cross-checks, questions ↔ courses ↔ cards (Chinese) |
| [`AGENTS.md`](AGENTS.md) | AI-collaboration conventions: structure / commands / hard rules (Chinese) |
| [`examples/dev-intro/`](examples/dev-intro/) | complete sample: questions + cards + courses + deep-dives |

---

## 🛠️ Dev commands

```bash
# repo root
pnpm install          # install dependencies
pnpm run dev          # start (frontend :5173 + backend :8787)
pnpm run build        # build (sync:examples + sync:study + tsc + vite)
pnpm test             # run the 5 test files (130 cases)
pnpm run scan         # brand-leak scan
pnpm run server       # start the backend alone
pnpm start            # build + server
pnpm run skill:install    # install the /ai-study-kit command
pnpm run check:alignment  # four-way alignment check (defaults to dev-intro; pass a theme dir)

# inside apps/quiz-app/
npm run qa            # question-bank quality check (longest-option / answer distribution)
npm run sync:examples # manually sync examples → src/data
npm run sync:study    # manually sync examples → public/study
```

### Production deployment

```bash
cd apps/quiz-app
pnpm install && pnpm run build
pnpm exec pm2 start ecosystem.config.cjs
pnpm exec pm2 save

# custom port
PORT=80 pnpm exec pm2 start ecosystem.config.cjs
```

Deployment details (pm2 cwd pinning, how cross-device sync works, …) are in [`AGENTS.md`](AGENTS.md) (Chinese).

---

## 🤝 Contributing

PRs and issues are welcome. Please:

1. Run `pnpm run scan` and make sure it's clean
2. Run `pnpm test` and make sure everything passes
3. If you changed any artifact (courses / questions / cards / deep-dives), run the [`bidirectional-check`](docs/bidirectional-check.md) as well
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

[MIT](LICENSE) © ai-study-kit contributors

---

## 🙏 Acknowledgements

- The content-pack workspace structure (MISSION → RESOURCES → lessons) and the question-writing discipline (equal-length options, no formatting tells) borrow from [Matt Pocock's teach skill](https://github.com/mattpocock); the decision trail is in `docs/adr/0001-agent-authored-questions-not-cli.md`
- The spaced-repetition algorithm follows [Anki's SM-2 implementation](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- The git knowledge in the sample theme draws on the [Pro Git book](https://git-scm.com/book/en/v2) (official, free)
