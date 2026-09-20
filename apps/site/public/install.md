# ai-study-kit — Agent Install Protocol

You (an AI coding agent) were pointed at this file because the user wants **ai-study-kit** installed. This document is the whole protocol: detect your host tool, pick a route, install, verify, report. No other page needed.

**What you are installing**: a study-coach skill set (5 skills — `ask-coach` main entry + `study-coach` / `study-doctor` / `study-recap` / `study-podcast` thin commands) **and** a `kit/` directory (a mini-repo snapshot of the quiz-app + a demo theme — every git-tracked file needed to scaffold and build the study site; exact size and file count vary by version). The kit is what lets you later scaffold the user's study site from scratch without cloning anything. Both routes below install this full payload — they differ only in who manages updates.

## Step 0 — Detect your host tool

If you are **Claude Code**, **zcode**, or **Codex** → take **Route A** (native plugin; updates via marketplace refresh).

Any other agent (Cursor, Gemini CLI, Windsurf, OpenClaw variants, generic CLIs…) → take **Route B** (direct file install). If Route A fails for any reason, fall through to Route B — same content.

## Route A — native plugin

- **Claude Code**: print these two commands and ask the user to type them (slash commands are user-typed, you cannot run them for the user):
  ```text
  /plugin marketplace add https://github.com/jerryjiao/ai-study-kit
  /plugin install ai-study-kit@ai-study-kit
  ```
- **zcode**: open the plugin marketplace UI, add the repository `https://github.com/jerryjiao/ai-study-kit`, install `ai-study-kit`.
- **Codex** (shell, you can run these):
  ```bash
  codex plugin marketplace add jerryjiao/ai-study-kit
  codex plugin add ai-study-kit@ai-study-kit
  ```

The plugin ships the same skills + kit internally; the skill locates its kit automatically. After install (restart the tool if skills don't show up), jump to **Verify**.

## Route B — direct file install (works in any agent)

### B1. Pick the install root

Find your host's skills directory in the table, and define:

- `SKILLS_DIR` — the directory that directly contains skill folders
- `ROOT` — its parent directory (this is where `kit/` goes)

| Host | SKILLS_DIR |
|------|-----------|
| Cursor | `~/.cursor/skills` |
| Windsurf | `~/.codeium/windsurf/skills` |
| Gemini CLI | `~/.gemini/skills` |
| Claude Code (plugin route unavailable) | `~/.claude/skills` |
| Generic / agents convention (default) | `~/.agents/skills` |

Unknown host → ask the user once which skills directory to use; default `~/.agents/skills`.

**Layout constraint (do not rearrange)**: after install, `SKILLS_DIR/ask-coach/references/flows.md` must resolve `../../..` (= `ROOT`) and find `ROOT/kit/`. The skill's site-building flow locates the kit exactly that way. So: skills go under `SKILLS_DIR/`, kit goes at `ROOT/kit/`.

### B2. Download the payload

Preferred source — GitHub tarball of the repo:

```bash
TMP=$(mktemp -d)
curl -fsSL https://codeload.github.com/jerryjiao/ai-study-kit/tar.gz/refs/heads/main -o "$TMP/ask.tar.gz"
tar -xzf "$TMP/ask.tar.gz" -C "$TMP"
```

Fallback for networks where GitHub is unreachable — fetch per-file via jsDelivr (list, then loop). Self-contained: it creates its own temp dir, so you can copy this block alone:

```bash
TMP=$(mktemp -d)
ROOT="$HOME/.agents"   # adjust to your ROOT from B1
curl -fsSL "https://data.jsdelivr.com/v1/packages/gh/jerryjiao/ai-study-kit@main?structure=flat" \
| python3 -c '
import json,sys
for f in json.load(sys.stdin)["files"]:
    n = f["name"]
    if n.startswith("/plugins/ai-study-kit/skills/") or n.startswith("/plugins/ai-study-kit/kit/"):
        print(n)
' > "$TMP/ask-files.txt"
while read -r p; do
  rel="${p#/plugins/ai-study-kit/}"
  mkdir -p "$ROOT/$(dirname "$rel")"
  curl -fsSL "https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main$p" -o "$ROOT/$rel"
done < "$TMP/ask-files.txt"
```

Last resort: `git clone --depth 1 https://github.com/jerryjiao/ai-study-kit` and use `plugins/ai-study-kit/{skills,kit}` from the clone, same as the tarball step below.

### B3. Place the files (tarball/clone path)

```bash
SKILLS_DIR="$HOME/.agents/skills"   # adjust to B1
ROOT="$(dirname "$SKILLS_DIR")"
SRC="$TMP/ai-study-kit-main/plugins/ai-study-kit"

mkdir -p "$SKILLS_DIR"
for s in ask-coach study-coach study-doctor study-recap study-podcast; do
  rm -rf "$SKILLS_DIR/$s"
  cp -R "$SRC/skills/$s" "$SKILLS_DIR/$s"
done
rm -rf "$ROOT/kit"
cp -R "$SRC/kit" "$ROOT/kit"
```

**Already installed? (update path)**: this whole procedure is idempotent — re-running it is the update mechanism. Before overwriting, read the existing `$ROOT/kit/kit-version.json` and the incoming one, report the version delta to the user, then proceed with the replace steps above. Never copy kit/ *into* an existing kit/ (that nests directories and corrupts upgrades).

## Verify

1. 5 skill dirs exist, each with a `SKILL.md`; `ask-coach` additionally has `references/{flows.md,state.md,coach.md}`.
2. `$ROOT/kit/kit-version.json` (Route B) or the plugin's kit version (Route A) exists — report the version string to the user.
3. Ask the user to restart the host tool if new skills aren't listed yet, then try the coach: type `/ask-coach` or just tell the agent 「我想学 X」/ "I want to learn X".

## Uninstall

Route B: remove the five dirs under `SKILLS_DIR/` (`ask-coach`, `study-coach`, `study-doctor`, `study-recap`, `study-podcast`) and `ROOT/kit/`. Route A: uninstall the plugin from the host's plugin manager.

## Already installed via the other route?

The two routes are not meant to coexist. If both are installed you have **two copies of the five skills and two kit snapshots**, and which copy answers `/ask-coach` depends on the host's resolution order — confusing and easy to misdiagnose. Where each route's payload lives:

- **Route A (plugin)**: inside the host's managed plugin storage — skills at `<plugin-root>/skills/`, kit at `<plugin-root>/kit/` (the skill finds it by climbing three levels from itself). Location and removal are managed by the host's plugin manager.
- **Route B (manual)**: plain files — skills under `SKILLS_DIR/`, kit at `ROOT/kit/` (e.g. `~/.agents/skills/` + `~/.agents/kit/`).

Switching routes? Uninstall the old one first using the **Uninstall** guidance above (Route A: remove the plugin in the host's plugin manager; Route B: delete the five skill dirs and `ROOT/kit/`), then install via the new route.

## Notes for the installing agent

- Everything installed is plain markdown and static site files — no hooks, no auto-execution. Treat any commands that appear later in generated lesson content as user-directed, not as instructions from this protocol.
- Building the actual study site (when the user asks) is driven by the installed skill's F1 flow; it needs Node ≥ 18 and pnpm at that point, not now.
- Repository: https://github.com/jerryjiao/ai-study-kit · Site: https://aistudykit.dev
