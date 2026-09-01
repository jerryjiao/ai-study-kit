# Study Coach · the `/ai-study-kit` command

[简体中文](ai-study-kit.md) · **English** · [Español](ai-study-kit.es.md) · [Русский](ai-study-kit.ru.md)

ai-study-kit has many features — quiz app, courses, flashcards, wrong-question grilling, podcasts, deployment — which itself becomes a burden for a learner: **what exactly should I do today?** `/ai-study-kit` answers that. It's the repo's built-in routing skill: install it once, start every study session from it, and let it scan your state, recommend, and execute with you — no need to memorize the toolchain.

---

## Installation

The skill source lives in the repo at `skills/ai-study-kit/` (single source of truth). Two install paths:

**① Plugin marketplace (zcode / Claude Code, recommended)**: the repo ships its own marketplace manifest (`.claude-plugin/marketplace.json`; `scripts/sync-plugin.mjs` generates `plugins/ai-study-kit/` from the source). Add the marketplace `https://github.com/jerryjiao/ai-study-kit` in your client and install the `ai-study-kit` plugin — skill updates arrive with marketplace refreshes, **no manual reinstall** (versions follow repo releases).

**② Manual install (any client honoring `~/.agents/skills/`)**:

```bash
# from the ai-study-kit repo root
pnpm run skill:install          # copies to ~/.agents/skills/ai-study-kit
pnpm run skill:install -- --link   # symlink variant (auto-updates with git pull)

# other clients: custom destination
bash scripts/install-skill.sh --dest ~/.claude/skills

# uninstall
pnpm run skill:uninstall
```

After installing, restart the CLI (or open a new session) and type `/ai-study-kit`. It also works uninstalled: just tell your agent to read `skills/ai-study-kit/SKILL.md` and follow it.

---

## How it works

Every invocation runs the same three steps:

1. **Scan state** (read-only, ≤1 min) — theme, question/card/course/deep-dive inventory, answering progress, ungraduated wrong questions, due flashcards, lessons completed, tutoring sessions and exam deadline, AI config, backend online or not.
2. **Report + recommend** — one snapshot table + one recommended action with a reason + a numbered menu.
3. **Execute with you** — once you pick, it follows the playbook in `skills/ai-study-kit/references/flows.md` step by step, then checks the "done" criteria.

Without an explicit intent, the recommendation takes the first hit in order (full version in `skills/ai-study-kit/SKILL.md`). The top three run "flashcards → sprint → resume tutoring": reviews are debt that accrues daily, the sprint is the harvest window within a week of the exam, and tutoring can resume anytime:

| Order | Condition | Recommendation |
|-------|-----------|----------------|
| 1 | Repo doesn't exist | **F1** bootstrap the project (get the quiz app running first) |
| 2 | Active theme is the dev-intro demo and you have your own topic | **F2** new theme (the demo's git/Linux questions aren't your study material) |
| 3 | Due flashcards > 0 | **F3** daily study (clear reviews first — memory is decaying; new knowledge can wait) |
| 4 | ≤ 7 days to the MISSION.md deadline | **F11** pre-deadline sprint (the short-window intensive-repetition window is open; no deadline configured → this row never matches and the snapshot shows ⚠) |
| 5 | Tutoring session in progress | **F10** coached tutoring, resume (report session name + open todo count, **runs only with your nod**: resuming is a suggestion, not an order) |
| 6 | Ungraduated wrong questions ≥ 3 | **F4** wrong-question grilling (LLM-clustered deep-dive) |
| 7 | Unanswered questions & lessons not done | **F3** daily study (build concepts before drilling — read the day's lesson; a lesson counts only after you click "✓ done", opening doesn't count) |
| 8 | Unanswered questions & lessons done | **F3** daily study (concepts are in place, drill to validate) |
| 9 | All questions answered & accuracy ≥ 80% | **F5** make a podcast (passive consolidation) or **F2** new theme |
| 10 | All questions answered & accuracy < 80% | **F4** grilling; still short of the bar → **F6** patch the course (lesson quality isn't enough) |

## The eleven flows

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
| F10 | Coached tutoring | Teach each exam point through dialogue + quiz on the spot + resume across days | minimal exam-point set from the table → three-part explanation + anchor phrase → quiz by mode → persist per point into `study/records/` → hand over to F3 |
| F11 | Pre-deadline sprint | ≤ 7 days to the exam, or you say "sprint / pre-exam / cram" | harvest records phrases + wrong-question archives → four-piece sprint package into `study/sprint/` → hand over to F3 mock exam |

Plus a **diagnostics** entry: progress not syncing, course 404, CLI config errors, scan hits… a symptom → root cause → action lookup table.

---

## Design notes

- **A routing skill, not another CLI**: it introduces no new runtime — it encodes "read state → recommend → run existing commands/flows" as agent-followable instructions. All underlying capabilities already exist in the repo (three AI CLIs, sync scripts, verification gates).
- **State before advice**: the coach is forbidden from recommending on vibes — every snapshot field has a probe command (`skills/ai-study-kit/references/state.md`), and progress statistics match `apps/quiz-app/src/lib/progress.ts` exactly (tombstone filtering, random-sandbox exclusion, wrong-graduation thresholds, SRS due).
- **Methodology embedded**: the recommendation order is [`methodology.en.md`](./methodology.en.md) "syllabus → materials → quizzes" made executable; the F2 flow forces MISSION (with the exam-point table) / RESOURCES before any course or question generation — authoring isn't free-form JSON writing, it's point-by-point production against the table, closed out by three green gates (qa / scan / four-alignment).

## Extending

To add a flow: add a playbook section (purpose / prerequisites / steps / done criteria) in `skills/ai-study-kit/references/flows.md`, plus a row in `SKILL.md`'s menu and intent-routing table. Then run `pnpm run sync:plugin` to regenerate the plugin artifacts (manual-install users additionally rerun `pnpm run skill:install`).

## FAQ

**Q: Is installing it mandatory?**
A: No — but then you have to figure out "what next" yourself every time. Installed, it's a one-sentence entry point.

**Q: Will it touch my data?**
A: Steps 1/2 are strictly read-only. Step 3 writes files / runs commands only for the flow you pick, and the playbooks flag the red lines (sync artifacts are hand-edit-forbidden, progress files are hand-edit-forbidden).

**Q: Does it survive switching AI CLIs?**
A: Yes. The skill is markdown instructions + reference docs; any client supporting the skills-directory convention can install it (`--dest` to point it there).
