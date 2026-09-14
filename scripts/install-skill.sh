#!/usr/bin/env bash
# install-skill.sh — install the ai-study-kit skills (ask-coach + thin commands) into your AI CLI's skills directory.
#
# Default target: ~/.agents/skills/<skill-name>  (zcode / agents convention; one dir per skill under skills/)
# Other CLIs:     pass --dest, e.g.  --dest ~/.claude/skills
#
# Usage:
#   bash scripts/install-skill.sh                  # copy-install all skills to ~/.agents/skills
#   bash scripts/install-skill.sh --link           # symlink instead of copy (auto-updates with repo)
#   bash scripts/install-skill.sh --dest DIR       # install into DIR/<skill-name>
#   bash scripts/install-skill.sh --uninstall      # remove from default dest
#   bash scripts/install-skill.sh --uninstall --dest DIR
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_BASE="$REPO_ROOT/skills"
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

# 多 skill 源发现：skills/ 下每个含 SKILL.md 的目录（ask-coach 主入口 + coach/doctor/recap 薄命令）。
# 不用 mapfile（bash 4+，macOS 自带 bash 3.2 没有）：while-read 进数组，3.2 兼容。
SKILLS=()
while IFS= read -r dir; do
  SKILLS+=("$dir")
done < <(find "$SRC_BASE" -mindepth 1 -maxdepth 1 -type d -exec test -f '{}/SKILL.md' ';' -print | sort)
if [[ ${#SKILLS[@]} -eq 0 ]]; then
  echo "error: no skills found under $SRC_BASE — run this script from an ai-study-kit checkout" >&2
  exit 1
fi

if [[ "$ACTION" == "uninstall" ]]; then
  for src in "${SKILLS[@]}"; do
    name="$(basename "$src")"
    dest="$DEST_BASE/$name"
    if [[ -e "$dest" || -L "$dest" ]]; then
      rm -rf "$dest"
      echo "✅ uninstalled: $dest"
    else
      echo "nothing to uninstall at $dest"
    fi
  done
  exit 0
fi

mkdir -p "$DEST_BASE"

installed=()
for src in "${SKILLS[@]}"; do
  name="$(basename "$src")"
  dest="$DEST_BASE/$name"
  rm -rf "$dest"
  if [[ "$MODE" == "link" ]]; then
    ln -s "$src" "$dest"
    echo "✅ linked: $dest -> $src"
  else
    cp -R "$src" "$dest"
    echo "✅ installed: $dest"
  fi
  installed+=("/$name")
done

echo
echo "Installed ${#installed[@]} skills: ${installed[*]}"
echo "Main entry: /ask-coach  (status snapshot → recommendation → guided execution)"
echo "Update later by re-running this script; remove with --uninstall"
