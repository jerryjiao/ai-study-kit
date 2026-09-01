# AI CLI Guide · the three AI command-line tools

[简体中文](ai-cli-guide.md) · **English** · [Español](ai-cli-guide.es.md) · [Русский](ai-cli-guide.ru.md)

ai-study-kit ships three AI CLIs that turn study material into loop artifacts: `teach-generate` produces courses, `grill-wrong` produces wrong-question deep-dives, and `podcast-generate` produces review podcasts. All driven by your own LLM/TTS API keys, and all work with any OpenAI-compatible service (OpenAI / Zhipu GLM / DeepSeek / Kimi / Qwen / Doubao, etc.).

Each CLI has a shortcut at the repo root; this guide uses the short forms (equivalent to `node apps/quiz-app/scripts/<script>.mjs`):

| Shortcut | Script | Output |
|----------|--------|--------|
| `pnpm run ai:teach` | `teach-generate.mjs` | course HTML (`lessons/*.html`) |
| `pnpm run ai:grill` | `grill-wrong.mjs` | deep-dive HTML (`study/wrong-questions/*.html`) |
| `pnpm run ai:podcast` | `podcast-generate.mjs` | podcast script + transcript + audio (`podcast-out/`) |

---

## Quick start

### 1. Configure an API key

```bash
cp .env.example .env
# edit .env — at minimum LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
```

Full provider options: [`configuration.en.md`](./configuration.en.md).

### 2. Start the quiz-app backend (needed by grill)

```bash
pnpm run server  # in another terminal, serves :8787
```

### 3. Run the three CLIs

```bash
# A. generate a course (from course-spec.json)
pnpm run ai:teach -- --theme dev-intro

# B. generate wrong-question deep-dives (pulls wrong answers from the server)
pnpm run ai:grill -- --theme dev-intro

# C. generate a podcast (from any study material)
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html
```

---

## teach-generate — generate a course

Turns a theme spec (mission + resources + audience) into a multi-lesson, self-contained HTML course.

### Input

`examples/<theme>/course-spec.json`:

```json
{
  "theme": "react-basics",
  "mission": "Be able to independently build a React component library",
  "audience": "Developers with JS basics, first time with React",
  "depth": "beginner",                          // beginner | intermediate | advanced
  "lessonsCount": 3,                            // how many lessons you want
  "outline": ["Hooks basics", "State management", "Component design"],  // optional; LLM splits automatically if omitted
  "resources": [                                // optional, authoritative material links
    { "title": "React official docs", "url": "https://react.dev" }
  ]
}
```

### Output

`examples/<theme>/lessons/0001-<slug>.html`, `0002-<slug>.html`…:

- each lesson is self-contained HTML (sharing `../assets/styles.css`)
- structure: h1 + meta + lead + multiple h2 + callouts (key point / warning / tip) + quiz-anchor
- prev/next links chain lessons together

### Usage

```bash
pnpm run ai:teach -- --theme react-basics
pnpm run ai:teach -- --theme X --lessons 5   # override lessonsCount
pnpm run ai:teach -- --theme X --lang en     # produce the course in English
```

`--theme` defaults to `dev-intro`. Reference: [`examples/dev-intro/course-spec.json`](https://github.com/jerryjiao/ai-study-kit/blob/main/examples/dev-intro/course-spec.json).

---

## grill-wrong — generate wrong-question deep-dives

Pulls your wrong answers from the server, clusters them by exam point with an LLM, then deeply expands each cluster.

### Flow

1. `GET /api/progress` fetches your wrong-question list (`SERVER` env var selects the backend)
2. joins `examples/<theme>/questions.json` for full question text
3. the LLM clusters wrong questions by exam point (e.g. "git reset vs revert" ×3, "HTTP status codes" ×2)
4. per cluster the LLM writes a deep-dive HTML (core-differences table + decision flowchart + pitfall warnings + variant drills)
5. written to `examples/<theme>/study/wrong-questions/cluster-NN-<slug>.html` (output in the legacy `wrong-questions/` location is recognized and migrated automatically)
6. updates `examples/<theme>/study/wrong-questions/index.html`, the wrong-question hub

### Usage

```bash
# prerequisite: the quiz-app backend must be running, and you must have drilled and gotten things wrong
pnpm run server  # another terminal

pnpm run ai:grill -- --theme react-basics
pnpm run ai:grill -- --max-clusters 5                # at most 5 clusters
pnpm run ai:grill -- --lang es                       # deep-dives in Spanish
SERVER=http://my-server:8787 pnpm run ai:grill       # pull wrong answers from a remote server
```

### Wrong-question graduation rules (same as quiz-app)

| wrongCount | Threshold | Meaning |
|------------|-----------|---------|
| 1 | 1 correct answer | new wrong question; one correct answer removes it |
| 2 | 2 correct answers | missed twice; needs 2 consecutive correct answers to graduate |
| 3+ | 3 correct answers | high-frequency; needs 3 consecutive correct answers to graduate |

---

## podcast-generate — generate a review podcast

Turns any study material (course HTML / questions / deep-dives) into a two-host dialogue podcast.

### Input

`--input` takes one file; the script auto-detects the format:

| Format | Handling |
|--------|----------|
| `.html` | tags stripped, title and body extracted |
| `.md` | as-is |
| `.json` (questions.json) | each question formatted as "stem + options + answer + analysis" |
| `.txt` | as-is |

### Output (three pieces, written to `podcast-out/`)

| File | Contents |
|------|----------|
| `<slug>-script.json` | dialogue script (structured: title / source / generatedAt / script array) |
| `<slug>-transcript.md` | Markdown transcript (👩 female host / 👨 male host markers) |
| `<slug>.wav` | synthesized two-host audio (unless `--no-tts`) |

### Usage

```bash
# basic usage
pnpm run ai:podcast -- --input examples/dev-intro/lessons/git-basics.html

# control segments and style
pnpm run ai:podcast -- --input examples/dev-intro/questions.json \
  --segments 15 --style interview

# script only, skip audio synthesis (saves TTS cost)
pnpm run ai:podcast -- \
  --input examples/dev-intro/study/wrong-questions/cluster-01-*.html --no-tts

# produce the dialogue in another language (verify the script first with --no-tts, see "Output language")
pnpm run ai:podcast -- --input examples/dev-intro/questions.json --lang ru --no-tts
```

### Style options (`--style`)

| Value | Style |
|-------|-------|
| `conversational` (default) | relaxed two-person chat, complementing / questioning / giving examples |
| `lecture` | one host leads, the other asks follow-ups and summarizes |
| `interview` | one plays the expert, the other the interviewer |

### TTS configuration

Audio synthesis needs a TTS provider configured (GLM-TTS by default) — see [`configuration.en.md`](./configuration.en.md). `--no-tts` produces only script + transcript without calling TTS — cheaper, or synthesize later with other tools (NotebookLM etc.).

---

## Output language (`--lang` / `STUDY_LANG`)

All three CLIs accept an output language for **generated content**:

```bash
pnpm run ai:teach   -- --theme X --lang en   # English course
pnpm run ai:grill   -- --theme X --lang es   # Spanish deep-dives
pnpm run ai:podcast -- --input Y --lang ru   # Russian podcast dialogue

# or uniformly via env var (settable in .env)
STUDY_LANG=en pnpm run ai:teach -- --theme X
```

Supported: `zh` (default) / `en` / `es` / `ru`. The registry lives in [`scripts/lib/langs.mjs`](https://github.com/jerryjiao/ai-study-kit/blob/main/apps/quiz-app/scripts/lib/langs.mjs); adding a language is one registry entry.

Behavior notes:

- `--lang` affects **generated content** (course body, outline, deep-dive body, podcast dialogue/titles) and the fixed strings of generated HTML (prev/next navigation, footer, the `<html lang>` attribute, host names in transcripts);
- the CLIs' own logs/errors stay in Chinese (the operator is the maintainer);
- question text (stems/options) is never translated — quotes inside deep-dives stay verbatim, deliberately: questions must match what you drilled;
- **podcast caveat**: TTS currently only integrates GLM-TTS; whether non-Chinese dialogue can be synthesized depends on the provider's multilingual support. Verify the script first with `--lang X --no-tts`, then synthesize.

The quiz-app UI's languages (top-bar zh/EN/ES/RU switch) are a separate mechanism — see the README's "Multilingual" section.

---

## Usable without AI

The three CLIs are **incremental capability**, not a requirement. To just use ai-study-kit as a quiz + flashcard app, skip the LLM entirely — `pnpm dev` is enough. Courses, wrong-answer analysis and review podcasts unlock with one API key.

---

## Design philosophy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM provider | OpenAI-compatible protocol + baseURL | one codebase covers 95% of providers (OpenAI/GLM/DeepSeek/Kimi/Qwen/Doubao) |
| Configuration | three `.env` vars (`LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL`) | minimal, single-file management |
| Robustness | `parseJsonLoose` + 3 retries with exponential backoff + clear errors | LLMs return fake JSON and rate-limit; must tolerate |
| Testing | pure functions extracted to `lib/`, unit-tested with `node:test` | LLM calls aren't unit-testable, everything around them is |
| No AI-client lock-in | CLIs rather than an agent skill | ZCode / Claude Code / Cursor users all work, even CI |

The theme workspace structure (`MISSION.md` / `RESOURCES.md` / `lessons/`) and part of the question-writing discipline (equal-length options, no format giveaways) come from the teach skill workflow — with thanks.

Full methodology background: [`methodology.en.md`](./methodology.en.md); the three CLIs are its engineering embodiment.

---

## FAQ

**Q: Running a CLI errors with "LLM 配置不完整" (incomplete LLM config)**
A: `.env` is missing fields. Copy `.env.example` to `.env` and fill the three: `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`. See [`configuration.en.md`](./configuration.en.md).

**Q: The LLM's JSON fails to parse**
A: `parseJsonLoose` already tolerates a lot (extracts `{...}`, strips markdown fences). If it still fails, the output is severely off — try another model (`gpt-4o-mini` / `glm-4.6` / `deepseek-chat` are all stable).

**Q: TTS synthesis is slow**
A: GLM-TTS takes ~5-10 s per segment; a 12-segment dialogue ~2 min. For speed, use `--no-tts` and synthesize elsewhere.

**Q: Generated course/deep-dive quality is poor**
A: tune `course-spec.json`'s `audience` / `depth` / `resources` — the more specific the audience and resources, the better the output. `--segments` (podcast) and `--lessons` (teach) control granularity.

**Q: I want Claude / Gemini / another non-OpenAI provider**
A: The current abstraction only supports OpenAI-compatible protocols. Claude and Gemini both have OpenAI-compatible proxies (LiteLLM Proxy, OpenRouter) — connect through one. Native adapters may come later.
