<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png" width="128" alt="ai-study-kit logo" />
</p>

# ai-study-kit

[简体中文](README.md) · **English** · [Español](README.es.md) · [Русский](README.ru.md)

**Install in one sentence**: send this line to your AI — Claude Code, zcode, Cursor, any tool — and it follows the protocol to install the coach and the site source. No clone, no commands to memorize:

```text
Install ai-study-kit from https://aistudykit.dev/install.md
```

<p align="center">
  <a href="https://aistudykit.dev/"><img src="https://img.shields.io/badge/website-online-blue" alt="Website" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml"><img src="https://github.com/jerryjiao/ai-study-kit/actions/workflows/deploy-site.yml/badge.svg" alt="Deploy status" /></a>
  <img src="https://img.shields.io/badge/i18n-4%20languages-blue" alt="UI in 4 languages" />
  <a href="https://github.com/jerryjiao/ai-study-kit/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/jerryjiao/ai-study-kit/commits/main/"><img src="https://img.shields.io/github/last-commit/jerryjiao/ai-study-kit" alt="last commit" /></a>
</p>

🌐 [Website](https://aistudykit.dev/) · ▶️ [Live demo](https://aistudykit.dev/demo/) · 📖 [Quick start](https://aistudykit.dev/en/get-started/)

**In one sentence**: tell your AI "I want to learn X" — the coach aligns the exam points with you, writes the questions and lessons, then drills you until it sticks. No question bank required; the tool turns the rest into a complete study app with lessons, flashcards and wrong-answer analysis.

---

## 👋 Who is this for

| What you are doing | Does it fit |
|--------------------|-------------|
| 🧑‍💻 **A developer learning a new stack** (React / K8s / Rust) | ✅ AI distills the docs into quizzes; drill with flashcards |
| 📚 **A student preparing for an exam** (degree / certification) | ✅ Got past papers? Import them. Don't? AI writes questions from your exam points |
| 🎯 **Interview prep** (fundamentals / system design) | ✅ Say what it's for — AI writes lessons and questions, then walks you through your wrong answers |
| 🗂️ **Anything with "exam points"** (compliance / processes / terminology) | ✅ If it can be split into Q&A, it can be learned |
| ❌ You just want a ready-made question bank (like "500 Java questions") | ❌ No stock questions here — but AI can generate a set from your exam points (with your own API key) |

Want to kick the tires first? Take the clone route below.

---

## 🚀 Run the demo (clone route, for developers)

```bash
git clone https://github.com/jerryjiao/ai-study-kit
cd ai-study-kit && pnpm install && pnpm dev
# open http://localhost:5173
```

It ships with a git + Linux example theme: **quizzes** (single/multi/true-false, graded on submit, wrong answers tracked), **flashcards** (SM-2 spaced repetition, Anki-compatible algorithm), **lessons** (self-contained HTML pages with diagrams and callouts). This is just a demo — for real use, swap in your own theme (next section).

---

## 🧭 Not sure what to study next? `/ask-coach`

After installing the plugin (or `pnpm run skill:install` into `~/.agents/skills/`), every study session starts here. Five commands: `/ask-coach` asks the coach what's next (snapshot + recommendation + guided execution), `/study-coach` sits you down to study, `/study-doctor` runs a health check, `/study-recap` jumps into wrong-answer review, `/study-podcast` jumps into podcast generation.

`/ask-coach` first **scans your study state** (progress, due flashcards, wrong answers, lessons completed, AI config), then **recommends the single most useful thing to do right now**, and once you pick, it **walks you through it step by step** — from project init to deploy, thirteen flows covered. See [`docs/ai-study-kit.en.md`](docs/ai-study-kit.en.md).

---

## 🔧 Make it your own theme

Say you're learning **React basics**. Everything happens under `examples/`, no app code touched:

1. **Copy the theme directory**: `cp -r examples/dev-intro examples/react-basics` (it can also live outside the repo — a path with separators is an external theme pack, see [`docs/adr/0004`](docs/adr/0004-external-theme-packs.md))
2. **Edit the questions** `questions.json`: each question is plain JSON — prompt + options + answer + analysis (full schema in the `Question` interface of [`apps/quiz-app/src/types.ts`](apps/quiz-app/src/types.ts)):

   ```json
   {
     "id": "R-001",
     "type": "single",
     "source": "react-basics",
     "topic": "react-basics",
     "question": "What does useState return in React?",
     "options": {
       "A": "The current state value",
       "B": "A function that updates the state",
       "C": "An array [state, setState]",
       "D": "An object { state, setState }"
     },
     "answer": ["C"],
     "analysis": "useState returns a two-element array: the current state and an update function. Usually destructured: const [count, setCount] = useState(0)."
   }
   ```

3. **Edit the flashcards** `flashcards.json`: prompt on the front, details on the back — just as simple
4. **Switch**: `EXAMPLE_THEME=react-basics pnpm dev` — refresh and it's live
5. **(Optional) lessons & home presentation**: lessons go in `lessons/*.html`; home grouping/labels go in `theme-config.json` (see [`docs/theming.en.md`](docs/theming.en.md)); graceful fallback without one
6. **Four checks**: `pnpm run scan` (zero leaks) + `pnpm test` + `pnpm run build` + `python3 scripts/bidirectional-check.py examples/react-basics/` (four-way alignment)

**Don't want to write questions by hand?** With `/ask-coach` installed, just say "generate a question set for react-basics" — the agent first aligns with you on an **exam-point table** in MISSION.md (what's covered, how deep, how many questions per type, how many cards), then writes questions and cards point by point after your confirmation, and runs the three quality gates (`qa` / `scan` / four-way alignment) before delivering. The manual path stays the main path; the table is the contract between you and the agent.

---

## 🤖 Let AI produce lessons / wrong-answer deep-dives / podcasts

The repo ships three AI command-line tools (any OpenAI-compatible LLM works; TTS currently GLM-TTS):

| CLI | What it does | Output |
|-----|--------------|--------|
| `teach-generate.mjs` | Turns a topic spec into multi-lesson HTML courses | `lessons/*.html` |
| `grill-wrong.mjs` | Clusters wrong answers by exam point and expands each | `wrong-questions/*.html` + per-point error profile |
| `podcast-generate.mjs` | Synthesizes any study material into a two-host audio show | `.wav` + script JSON + transcript |

Configure with `cp .env.example .env`, then fill at least `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL` (see [`docs/configuration.en.md`](docs/configuration.en.md)); usage and flags in [`docs/ai-cli-guide.en.md`](docs/ai-cli-guide.en.md).

> 💡 **Works without AI too.** The three CLIs are incremental capabilities. If you just want the quiz app + flashcards, skip the LLM entirely — `pnpm dev` is enough.

---

## 🌍 Multi-language

This README ships in four languages (switch via the language bar); the **UI** switches between 中文 / English / Español / Русский in one click — detected from the browser on first visit, preference synced across devices; **AI-generated content** takes `--lang zh|en|es|ru`. Dictionaries and checks live in [`apps/quiz-app/src/i18n/`](apps/quiz-app/src/i18n/).

---

## 🎯 Why this tool

| Without ai-study-kit | With ai-study-kit |
|----------------------|-------------------|
| **Anki** nails flashcards but has no quiz app, no wrong-answer deep-dives, no lessons | 6 learning artifacts in one app, aligned around the same exam points |
| **Quizlet** has questions and cards but is closed-source SaaS that keeps your data | Open source MIT; data on your machine + your server; cross-device sync without accounts |
| **Notion notes** record but don't drill; no spaced-repetition algorithm | Built-in Anki-compatible SM-2 with Anki learning steps |
| **Quiz PDFs / Word docs** can't grade you or track accuracy | Auto-grading, wrong-answer book, accuracy stats, SRS scheduling |
| **Asking ChatGPT directly** scatters knowledge with no learning path | AI structures scattered knowledge into courses + questions + flashcards |

**The core differentiator**: the **four-way alignment loop** — the exam points taught in courses, tested by questions, drilled via flashcards and expanded in wrong-answer deep-dives are all the same set (see [`docs/four-alignment.en.md`](docs/four-alignment.en.md)).

---

## 📚 Documentation

Every doc ships in four languages with a language bar on top (简体中文 / English / Español / Русский).

| Doc | What it teaches |
|-----|-----------------|
| [`docs/methodology.en.md`](docs/methodology.en.md) | study methodology: outline → materials → quizzes |
| [`docs/four-alignment.en.md`](docs/four-alignment.en.md) | how courses / questions / cards / deep-dives stay in sync |
| [`docs/bidirectional-check.en.md`](docs/bidirectional-check.en.md) | automated cross-checks (questions ↔ lessons ↔ flashcards) |
| [`docs/ai-cli-guide.en.md`](docs/ai-cli-guide.en.md) | the three AI CLIs (teach/grill/podcast) in full |
| [`docs/ai-study-kit.en.md`](docs/ai-study-kit.en.md) | `/ask-coach`: install, commands, routing, extensions |
| [`docs/configuration.en.md`](docs/configuration.en.md) | `.env` configuration (LLM + TTS providers) |
| [`docs/theming.en.md`](docs/theming.en.md) | theme presentation config, theme-config.json field reference |
| [`AGENTS.md`](AGENTS.md) | AI collaboration conventions (structure / commands / hard limits) |
| [`examples/dev-intro/`](examples/dev-intro/) | full git+Linux example: questions + cards + lessons + deep-dives |

---

## 🛠️ Development & deploy

```bash
pnpm install        # install dependencies
pnpm run dev        # local dev (frontend :5173 + backend :8787)
pnpm test           # tests
pnpm run scan       # zero-leak scan
pnpm run check:alignment  # four-way alignment check
pnpm run skill:install    # install the coach commands into ~/.agents/skills/
```

Full command table, production deploy (pm2) and cross-device sync internals: [`AGENTS.md`](AGENTS.md) and the [site docs](https://aistudykit.dev/en/).

---

## 🤝 Contributing

PRs and issues welcome. Before opening a PR, please:

1. Run `pnpm run scan` — zero leaks
2. Run `pnpm test` — all green
3. Changed any artifact (lessons / questions / cards / deep-dives)? Run [`bidirectional-check`](docs/bidirectional-check.en.md) as well
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

[MIT](LICENSE) © ai-study-kit contributors

---

## 🙏 Acknowledgements

- The content-pack workspace structure (MISSION → RESOURCES → lessons) and the question-writing discipline (equal-length options, no formatting tells) borrow from [Matt Pocock's teach skill](https://github.com/mattpocock); the decision trail is in [`docs/adr/0001-agent-authored-questions-not-cli.md`](docs/adr/0001-agent-authored-questions-not-cli.md)
- The data loop (interaction traces → learner facts → better recommendations) and the oral-mastery formula (recency-weighted accuracy with confidence caps, deterministic, no LLM) are inspired by [DeepTutor](https://github.com/HKUDS/DeepTutor); the decision trail is in [`docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md`](docs/adr/0005-projection-bridge-not-mastery-in-knowflow.md)
- The spaced-repetition algorithm references [Anki's SM-2 implementation](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- The example theme's (dev-intro) git content references the [Pro Git Book](https://git-scm.com/book/en/v2) (official, free)
