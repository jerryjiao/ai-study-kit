#!/usr/bin/env bash
# install-skill.sh — install the ai-study-kit skills (ask-coach + thin commands) + shared
# references layer + kit snapshot into your AI CLI's skills directory.
#
# Default target: ~/.agents/skills/<skill-name>  (zcode / agents convention; one dir per skill under skills/)
# Other CLIs:     pass --dest, e.g.  --dest ~/.claude/skills
#
# Shared layer:   skills/references/ (state.md probe protocol + contracts.md, shared by all
#                 five skills; no SKILL.md of its own) installs to DEST_BASE/references so
#                 sibling skills reach it as ../references/.
#
# Kit placement: skills locate their kit by climbing ../../.. (= install root), so the kit
# snapshot goes to $(dirname DEST_BASE)/kit — default ~/.agents/kit.
#
# Usage:
#   bash scripts/install-skill.sh                  # copy-install all skills + shared references + kit under ~/.agents
#   bash scripts/install-skill.sh --link           # symlink instead of copy (auto-updates with repo)
#   bash scripts/install-skill.sh --dest DIR       # skills into DIR/<skill-name>, kit into $(dirname DIR)/kit
#   bash scripts/install-skill.sh --uninstall      # remove skills + kit from default dest
#   bash scripts/install-skill.sh --uninstall --dest DIR
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_BASE="$REPO_ROOT/skills"
DEST_BASE="${HOME}/.agents/skills"
MODE="copy"
ACTION="install"

# kit 快照：skill 的 F1 流靠「向上三级 = 安装根」定位 kit（references/flows.md），
# 因此 kit 装在 DEST_BASE 的父目录下（默认 ~/.agents/kit），与插件根约定同构。
KIT_SRC="$REPO_ROOT/plugins/ai-study-kit/kit"

# 共享协议层：state.md/contracts.md 是五 skill 公共单源，无 SKILL.md 不走 skill 发现循环，
# 单独装到 DEST_BASE/references（薄命令与 ask-coach 都以 ../references/ 引用）。
SHARED_SRC="$SRC_BASE/references"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest)       DEST_BASE="${2:?--dest needs a directory}"; shift 2 ;;
    --link)       MODE="link"; shift ;;
    --uninstall)  ACTION="uninstall"; shift ;;
    -h|--help)    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)            echo "unknown flag: $1 (see --help)" >&2; exit 2 ;;
  esac
done

DEST_BASE="${DEST_BASE%/}"              # 去尾斜杠，dirname 才能取到父目录
ROOT_BASE="$(dirname "$DEST_BASE")"     # kit 落点：skills 目录的父目录（默认 ~/.agents）
KIT_DEST="$ROOT_BASE/kit"

# 多 skill 源发现：skills/ 下每个含 SKILL.md 的目录（ask-coach 主入口 + coach/study-doctor/study-recap 薄命令）。
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
  # 共享协议层对称清理（与 skill 目录同级的 references/，本安装器管理）
  shared_dest="$DEST_BASE/references"
  if [[ -e "$shared_dest" || -L "$shared_dest" ]]; then
    rm -rf "$shared_dest"
    echo "✅ uninstalled: $shared_dest"
  else
    echo "nothing to uninstall at $shared_dest"
  fi
  # kit 与 skills 对称清理（只删本安装器管理的 kit 目录；--dest 时同样取父目录）
  if [[ -e "$KIT_DEST" || -L "$KIT_DEST" ]]; then
    rm -rf "$KIT_DEST"
    echo "✅ uninstalled: $KIT_DEST"
  else
    echo "nothing to uninstall at $KIT_DEST"
  fi
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

# 共享协议层跟装：五个 SKILL.md 都引用 ../references/state.md，漏装即断链（#12）。
if [[ ! -d "$SHARED_SRC" ]]; then
  echo "error: shared references missing at $SHARED_SRC — run this script from an ai-study-kit checkout" >&2
  exit 1
fi
shared_dest="$DEST_BASE/references"
rm -rf "$shared_dest"
if [[ "$MODE" == "link" ]]; then
  ln -s "$SHARED_SRC" "$shared_dest"
  echo "✅ linked: $shared_dest -> $SHARED_SRC"
else
  cp -R "$SHARED_SRC" "$shared_dest"
  echo "✅ installed: $shared_dest"
fi

# kit 快照跟装（--link 模式同样 link）。先清再拷：往已存在的 kit 上叠加会把新快照嵌套成
# kit/kit 毁掉后续升级（同 install.md B3 的告诫）。
if [[ ! -d "$KIT_SRC" ]]; then
  echo "error: kit snapshot missing at $KIT_SRC — run 'pnpm run sync:plugin' (or check your checkout)" >&2
  exit 1
fi
mkdir -p "$ROOT_BASE"
rm -rf "$KIT_DEST"
if [[ "$MODE" == "link" ]]; then
  ln -s "$KIT_SRC" "$KIT_DEST"
  echo "✅ linked: $KIT_DEST -> $KIT_SRC"
else
  cp -R "$KIT_SRC" "$KIT_DEST"
  echo "✅ installed: $KIT_DEST"
fi

echo
echo "Installed ${#installed[@]} skills: ${installed[*]}"
kit_version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$KIT_DEST/kit-version.json" 2>/dev/null | head -1 || true)"
echo "Kit snapshot: $KIT_DEST${kit_version:+  (kit v$kit_version)}"
echo "Main entry: /ask-coach  (status snapshot → recommendation → guided execution)"
echo "Update later by re-running this script (refreshes skills + kit); remove with --uninstall"
