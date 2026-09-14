# Study Coach · the `/ask-coach` command

[简体中文](ai-study-kit.md) · **English** · [Español](ai-study-kit.es.md) · [Русский](ai-study-kit.ru.md)

ai-study-kit has many features — quiz app, courses, flashcards, wrong-question grilling, podcasts, deployment — which itself becomes a burden for a learner: **what exactly should I do today?** `/ask-coach` answers that. It's the repo's built-in main-entry skill: install it once, start every study session from it, and let it scan your state, recommend, and execute with you — no need to memorize the toolchain.

**The command names are the menu** — the ai-study-kit plugin (name is permanent) installs four commands:

| Command | What it does |
|---------|--------------|
| `/ask-coach` | Ask the coach: state snapshot + recommendation + guided execution (main entry; everything else routes from here) |
| `/coach` | Sit down and study: direct tutoring entry (F10 open/resume; opening reports "what to practice today + why") |
| `/study-doctor` | One-stop health check: four quality gates + environment probes, pass/fail report + fix order |
| `/study-recap` | Direct wrong-question deep-dive entry (F4, once prerequisites check out) |

---

## Installation

The skill sources live in the repo under `skills/` (single source of truth: the `ask-coach` main entry + three thin commands `coach` / `study-doctor` / `study-recap` that share the main entry's `references/`). Two install paths:

**① Plugin marketplace (zcode / Claude Code, recommended)**: the repo ships its own marketplace manifest (`.claude-plugin/marketplace.json`; `scripts/sync-plugin.mjs` generates `plugins/ai-study-kit/` from the source). Add the marketplace `https://github.com/jerryjiao/ai-study-kit` in your client and install the `ai-study-kit` plugin — skill updates arrive with marketplace refreshes, **no manual reinstall** (versions follow repo releases). **After a plugin update, opening `/ask-coach` in an older project reports the version gap and guides you through the F13 upgrade** (data-safe, fills the gaps — see the flow table; the kit snapshot self-reports its version via `kit-version.json`). **The plugin name is ai-study-kit for life; the commands are the ask-coach family** (renamed from `/ai-study-kit` in v0.13, Sept 2026 — marketplace names are permanent, so the plugin name stays).

**② Manual install (any client honoring `~/.agents/skills/`)**:

```bash
# from the ai-study-kit repo root (installs all four skills; thin commands rely on the main entry's references/)
pnpm run skill:install          # copies to ~/.agents/skills/{ask-coach,coach,study-doctor,study-recap}
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
3. **Execute with you** — once you pick, it follows the playbook in `skills/ask-coach/references/flows.md` step by step, then checks the "done" criteria.

Without an explicit intent, the recommendation takes the first hit in order (full version in `skills/ask-coach/SKILL.md`). The top three study entries run "flashcards → sprint → resume tutoring": reviews are debt that accrues daily, the sprint is the harvest window within a week of the exam, and tutoring can resume anytime (version drift sits ahead of the study entries — align the feature layer first; your data is never at risk):

| Order | Condition | Recommendation |
|-------|-----------|----------------|
| 1 | Repo doesn't exist | **F1** bootstrap the project (get the quiz app running first) |
| 2 | Project kit version lagging or unknown | **F13** upgrade (align the feature layer first — new features are silently degraded while drifting; data-safe, a few minutes) |
| 3 | Active theme is the dev-intro demo and you have your own topic | **F2** new theme (the demo's git/Linux questions aren't your study material) |
| 4 | Due flashcards > 0 | **F3** daily study (clear reviews first — memory is decaying; new knowledge can wait) |
| 5 | ≤ 7 days to the MISSION.md deadline | **F11** pre-deadline sprint (the short-window intensive-repetition window is open; no deadline configured → this row never matches and the snapshot shows ⚠) |
| 6 | Tutoring session in progress | **F10** coached tutoring, resume (report session name + open todo count, **runs only with your nod**: resuming is a suggestion, not an order) |
| 7 | Ungraduated wrong questions ≥ 3 | **F4** wrong-question grilling (LLM-clustered deep-dive) |
| 8 | Unanswered questions & lessons not done | **F3** daily study (build concepts before drilling — read the day's lesson; a lesson counts only after you click "✓ done", opening doesn't count) |
| 9 | Unanswered questions & lessons done | **F3** daily study (concepts are in place, drill to validate) |
| 10 | All questions answered & accuracy ≥ 80% | **F5** make a podcast (passive consolidation) or **F2** new theme |
| 11 | All questions answered & accuracy < 80% | **F4** grilling; still short of the bar → **F6** patch the course (lesson quality isn't enough) |

## The thirteen flows

| # | Flow | When | Key commands |
|---|------|------|--------------|
| F1 | Bootstrap | Get the demo running from zero | `pnpm install && pnpm dev` |
| F2 | New theme | Turn what you want to learn into a full loop | syllabus + exam-point table → materials → `teach-generate` → author questions/cards per table → switch theme → verify |
| F3 | Daily study | "What do I study today" | due flashcards → read lessons → drill → redo wrong |
| F4 | Wrong-question grilling | ≥3 wrong questions piled up | `pnpm run ai:grill -- --theme <t>` |
| F5 | Make a podcast | Commute/workout consolidation | `pnpm run ai:podcast -- --input <file>` |
| F6 | Generate/extend course | Add lesson explanations | `pnpm run ai:teach -- --theme <t>` |
| F7 | Edit content | Change questions/lessons/cards/schedule | four-alignment chain + checks |
| F8 | Verify & release | Pre-release quality gate | `pnpm run scan` / `test` / `build` + `scripts/bidirectional-check.py` |
| F9 | Deploy | Put it on a cloud server | pm2 (start from `apps/quiz-app/`) |
| F10 | Coached tutoring | Teach each exam point through dialogue + quiz on the spot + resume across days | minimal exam-point set from the table → three-part explanation + anchor phrase → quiz by mode → persist per point into `study/records/` (oral Q&As go into the oral-attempts.json ledger) → hand over to F3 |
| F11 | Pre-deadline sprint | ≤ 7 days to the exam, or you say "sprint / pre-exam / cram" | harvest records phrases + wrong-question archives → four-piece sprint package + print version into `study/sprint/` → hand over to F3 mock exam |
| F12 | Knowledge-graph projection | You have a knowflow knowledge base (graph.json) and want mastery coloring and exam-point edges visible on the graph | build/confirm the exam-point↔node mapping (`study/records/graph-map.json`, proposed by the agent, confirmed by you item by item) → `pnpm run mastery -- --graph <graph.json> --write-projection` writes the read-only projection; no graph / no mapping degrades silently and knowledge pages are never written back |
| F13 | Upgrade | The plugin updated and your project lags behind (version drift / unknown version) | back up progress → re-copy the kit (progress preserved) → fill in missing file templates → walk each contract gap (exam-point table / examPoint tags / card mapping — guided, never ghost-written) → close with the health check |

Plus two ops entries: **health check** (`/study-doctor` — one-stop orchestration of the four quality gates + environment probes, with a pass/fail report and fix order) and **diagnostics** (progress not syncing, course 404, CLI config errors, scan hits… a symptom → root cause → action lookup table).

---

## Design notes

- **A routing skill, not another CLI**: it introduces no new runtime — it encodes "read state → recommend → run existing commands/flows" as agent-followable instructions. All underlying capabilities already exist in the repo (three AI CLIs, sync scripts, verification gates).
- **State before advice**: the coach is forbidden from recommending on vibes — every snapshot field has a probe command (`skills/ask-coach/references/state.md`), and progress statistics match `apps/quiz-app/src/lib/progress.ts` exactly (tombstone filtering, random-sandbox exclusion, wrong-graduation thresholds, SRS due).
- **Methodology embedded**: the recommendation order is [`methodology.en.md`](./methodology.en.md) "syllabus → materials → quizzes" made executable; the F2 flow forces MISSION (with the exam-point table) / RESOURCES before any course or question generation — authoring isn't free-form JSON writing, it's point-by-point production against the table, closed out by three green gates (qa / scan / four-alignment).

## Extending

To add a flow: add a playbook section (purpose / prerequisites / steps / done criteria) in `skills/ask-coach/references/flows.md`, plus a row in `SKILL.md`'s menu and intent-routing table. Then run `pnpm run sync:plugin` to regenerate the plugin artifacts (manual-install users additionally rerun `pnpm run skill:install`). To add a thin command: create a new directory under `skills/` with a thin SKILL.md (~15 lines, sharing `../ask-coach/references/`) — sync-plugin picks it up automatically.

## FAQ

**Q: Is installing it mandatory?**
A: No — but then you have to figure out "what next" yourself every time. Installed, it's a one-sentence entry point.

**Q: Will it touch my data?**
A: Steps 1/2 are strictly read-only. Step 3 writes files / runs commands only for the flow you pick, and the playbooks flag the red lines (sync artifacts are hand-edit-forbidden, progress files are hand-edit-forbidden).

**Q: Does it survive switching AI CLIs?**
A: Yes. The skill is markdown instructions + reference docs; any client supporting the skills-directory convention can install it (`--dest` to point it there).
