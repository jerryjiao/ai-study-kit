#!/usr/bin/env bash
# install-skill.sh — install the /ai-study-kit skill into your AI CLI's skills directory.
#
# Default target: ~/.agents/skills/ai-study-kit  (zcode / agents convention)
# Other CLIs:     pass --dest, e.g.  --dest ~/.claude/skills
#
# Usage:
#   bash scripts/install-skill.sh                  # copy-install to ~/.agents/skills
#   bash scripts/install-skill.sh --link           # symlink instead of copy (auto-updates with repo)
#   bash scripts/install-skill.sh --dest DIR       # install into DIR/ai-study-kit
#   bash scripts/install-skill.sh --uninstall      # remove from default dest
#   bash scripts/install-skill.sh --uninstall --dest DIR
set -euo pipefail

SKILL_NAME="ai-study-kit"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/skills/$SKILL_NAME"
DEST_BASE="${HOME}/.agents/skills"
MODE="copy"
ACTION="install"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest)       DEST_BASE="${2:?--dest needs a directory}"; shift 2 ;;
    --link)       MODE="link"; shift ;;
    --uninstall)  ACTION="uninstall"; shift ;;
    -h|--help)    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)            echo "unknown flag: $1 (see --help)" >&2; exit 2 ;;
  esac
done

DEST_DIR="$DEST_BASE/$SKILL_NAME"

if [[ "$ACTION" == "uninstall" ]]; then
  if [[ -e "$DEST_DIR" || -L "$DEST_DIR" ]]; then
    rm -rf "$DEST_DIR"
    echo "✅ uninstalled: $DEST_DIR"
  else
    echo "nothing to uninstall at $DEST_DIR"
  fi
  exit 0
fi

if [[ ! -f "$SRC_DIR/SKILL.md" ]]; then
  echo "error: $SRC_DIR/SKILL.md not found — run this script from an ai-study-kit checkout" >&2
  exit 1
fi

mkdir -p "$DEST_BASE"
rm -rf "$DEST_DIR"

if [[ "$MODE" == "link" ]]; then
  ln -s "$SRC_DIR" "$DEST_DIR"
  echo "✅ linked: $DEST_DIR -> $SRC_DIR"
else
  cp -R "$SRC_DIR" "$DEST_DIR"
  echo "✅ installed: $DEST_DIR"
fi

echo
echo "Next: restart your AI CLI (or start a new session), then type /$SKILL_NAME"
echo "Update later by re-running this script; remove with --uninstall"
