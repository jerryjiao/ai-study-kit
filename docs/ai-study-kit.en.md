# Study Coach · the `/ask-coach` command

[简体中文](ai-study-kit.md) · **English** · [Español](ai-study-kit.es.md) · [Русский](ai-study-kit.ru.md)

ai-study-kit has many features — quiz app, courses, flashcards, wrong-question grilling, podcasts, deployment — which itself becomes a burden for a learner: **what exactly should I do today?** `/ask-coach` answers that. It's the repo's built-in main-entry skill: install it once, start every study session from it, and let it scan your state, recommend, and execute with you — no need to memorize the toolchain.

**The command names are the menu** — the ai-study-kit plugin (name is permanent) installs five commands: `/ask-coach` is the main entry (state snapshot + recommendation + guided execution; everything else routes from here), plus four direct-entry thin commands — `/study-coach` coached tutoring (F10), `/study-doctor` one-stop health check, `/study-recap` wrong-question deep-dive (F4), `/study-podcast` podcast (F5). The full command surface and intent-routing table live in `skills/ask-coach/SKILL.md`.

---

## Installation

The skill sources live in the repo under `skills/` (single source of truth: the `ask-coach` main entry + four thin commands `study-coach` / `study-doctor` / `study-recap` / `study-podcast` that share the main entry's `references/`). Two install paths:

**① Plugin marketplace (zcode / Claude Code, recommended)**: the repo ships its own marketplace manifest (`.claude-plugin/marketplace.json`; `scripts/sync-plugin.mjs` generates `plugins/ai-study-kit/` from the source). Add the marketplace `https://github.com/jerryjiao/ai-study-kit` in your client and install the `ai-study-kit` plugin — skill updates arrive with marketplace refreshes, **no manual reinstall** (versions follow repo releases). **After a plugin update, opening `/ask-coach` in an older project reports the version gap and guides you through the F13 upgrade** (data-safe, fills the gaps — see F13; the kit snapshot self-reports its version via `kit-version.json`). **The plugin name is ai-study-kit for life; the commands are the ask-coach family** (renamed from `/ai-study-kit` in v0.13, Sept 2026 — marketplace names are permanent, so the plugin name stays).

**② Manual install (any client honoring `~/.agents/skills/`)**:

```bash
# from the ai-study-kit repo root (installs all five skills; thin commands rely on the main entry's references/)
pnpm run skill:install          # copies to ~/.agents/skills/{ask-coach,study-coach,study-doctor,study-recap,study-podcast}
pnpm run skill:install -- --link   # symlink variant (auto-updates with git pull)

# other clients: custom destination
bash scripts/install-skill.sh --dest ~/.claude/skills

# uninstall
pnpm run skill:uninstall
```

After installing, restart the CLI (or open a new session) and type `/ask-coach`. It also works uninstalled: just tell your agent to read `skills/ask-coach/SKILL.md` and follow it.

---

## How it works

Every invocation runs the same three steps:

1. **Scan state** (read-only, ≤1 min) — theme, question/card/course/deep-dive inventory, answering progress, ungraduated wrong questions, due flashcards, lessons completed, weak oral-recitation targets (derived from the attempts ledger), tutoring sessions and exam deadline, AI config, backend online or not, kit version drift (your project vs the plugin snapshot — lagging or unknown version leads to the F13 upgrade, see below); with a knowledge graph location provided it also carries graph signals (per-node mastery four-states, prerequisite relations — see F12).
2. **Report + recommend** — one snapshot table + one recommended action with a reason + a numbered menu.
3. **Execute with you** — once you pick, it follows that flow's playbook in `skills/ask-coach/references/` step by step, then checks the "done" criteria.

Without an explicit intent, the recommendation takes the first hit in order: environment checks (version drift) sit ahead of the study entries — align the feature layer first; your data is never at risk. The study-side head runs "flashcards → sprint → resume tutoring": reviews are debt that accrues daily, the sprint is the harvest window within a week of the exam, and tutoring can resume anytime. The full 11-condition list with the per-row rationale is in the "recommendation algorithm" section of `skills/ask-coach/SKILL.md`.

## The thirteen flows

The thirteen flows group into four lines, numbered as the menu: **teaching** F10 coached tutoring · F11 pre-deadline sprint · F12 knowledge-graph projection; **exam prep** F3 daily study · F4 wrong-question grilling · F5 make a podcast; **content** F2 new theme · F6 generate/extend course · F7 edit content; **ops** F1 bootstrap · F13 upgrade · F8 verify & release · F9 deploy. Each flow's playbook (purpose / prerequisites / steps / done criteria) lives in `skills/ask-coach/references/` — that directory is the single source of truth for F1–F13 details; this page only gives the overview.

Plus two ops entries: **health check** (`/study-doctor` — one-stop orchestration of the four quality gates + environment probes, with a pass/fail report and fix order) and **diagnostics** (progress not syncing, course 404, CLI config errors, scan hits… a symptom → root cause → action lookup table).

---

## Design notes

- **A routing skill, not another CLI**: it introduces no new runtime — it encodes "read state → recommend → run existing commands/flows" as agent-followable instructions. All underlying capabilities already exist in the repo (three AI CLIs, sync scripts, verification gates).
- **State before advice**: the coach is forbidden from recommending on vibes — every snapshot field has a probe command (`skills/ask-coach/references/state.md`), and progress statistics match `apps/quiz-app/src/lib/progress.ts` exactly (tombstone filtering, random-sandbox exclusion, wrong-graduation thresholds, SRS due).
- **Methodology embedded**: the recommendation order is [`methodology.en.md`](./methodology.en.md) "syllabus → materials → quizzes" made executable; the F2 flow forces MISSION (with the exam-point table) / RESOURCES before any course or question generation — authoring isn't free-form JSON writing, it's point-by-point production against the table, closed out by three green gates (qa / scan / four-alignment).

## Extending

To add a flow: add a section (purpose / prerequisites / steps / done criteria) in the flow playbooks under `skills/ask-coach/references/`, plus a row in `SKILL.md`'s menu and intent-routing table. Then run `pnpm run sync:plugin` to regenerate the plugin artifacts (manual-install users additionally rerun `pnpm run skill:install`). To add a thin command: create a new directory under `skills/` with a thin SKILL.md (~15 lines, sharing `../ask-coach/references/`) — sync-plugin picks it up automatically.

## FAQ

**Q: Is installing it mandatory?**
A: No — but then you have to figure out "what next" yourself every time. Installed, it's a one-sentence entry point.

**Q: Will it touch my data?**
A: Steps 1/2 are strictly read-only. Step 3 writes files / runs commands only for the flow you pick, and the playbooks flag the red lines (sync artifacts are hand-edit-forbidden, progress files are hand-edit-forbidden).

**Q: Does it survive switching AI CLIs?**
A: Yes. The skill is markdown instructions + reference docs; any client supporting the skills-directory convention can install it (`--dest` to point it there).
