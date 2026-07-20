#!/usr/bin/env python3
"""
brand-scan.py — Zero-leak guard for the ai-study-kit repo.

Scans all source/content files for:
  (1) Real company / brand names that must be neutralized.
  (2) Personal-context keywords that would leak the original private project
      (real exam names, role levels, the original author's name, etc.).

Exit codes:
  0 = clean (no hits)
  1 = at least one hit (prints file:line:keyword for each)

Usage:
  python3 scripts/brand-scan.py
  python3 scripts/brand-scan.py --root /path/to/repo
  python3 scripts/brand-scan.py --json   # machine-readable output

Tweak the keyword lists below for your own repo.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Keyword lists — edit these to match your project's neutralization rules.
# ---------------------------------------------------------------------------

# Real company / brand names. Match as substrings (so "中国一汽" catches "中国一汽采用..." too).
# Use full official forms to avoid false positives on common technical words.
BRAND_PATTERNS = [
    # Chinese carmakers / SOEs
    "国家电投", "一汽", "FAW", "红旗", "中国一汽",
    # Tech giants
    "华为", "腾讯", "阿里巴巴", "京东", "美团",
    "字节跳动", "抖音", "拼多多", "网易", "百度",
    "小米科技", "苹果公司", "微软", "谷歌", "亚马逊",
    # EV / auto
    "特斯拉", "比亚迪", "蔚来汽车", "理想汽车", "小鹏汽车",
    # Energy / telecom
    "中石化", "中石油", "国家电网",
    "中国移动", "中国电信", "中国联通",
]

# Personal-context keywords — leaks that would identify the original private project
# or its author. Tuned to the ai-study-kit migration. Strip these for your own fork.
PERSONAL_PATTERNS = [
    # Author name
    "Jerry", "jerry",
    # Real exam context
    "T 序列", "T-序列", "T序列",
    "T5", "T6", "T7", "T8",  # role levels from the original matrix
    "0417",  # a real exam date marker in the original question sources
    "备考", "笔试", "考试",  # generic but revealing in this context
    "简历", "岗位投向",
    "主攻岗", "保底岗",  # original UI labels
    "T·P", "TP-Pass", "tp-pass",  # original brand
    "业务架构师",  # the original learning domain
]

# Files we care about scanning. Everything else (binary, lockfile, etc.) is skipped.
SCAN_EXTENSIONS = {
    ".html", ".htm", ".md", ".json",
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".sh", ".yaml", ".yml",
}

# Directories we never scan into.
SKIP_DIRS = {
    ".git", "node_modules", "dist", ".zcode", ".playwright-mcp",
    "__pycache__", "podcast-out", ".quizbuild",
}

# Files we never scan (by exact name).
SKIP_FILES = {
    "brand-scan.py",  # this file contains the keywords itself
    "pnpm-lock.yaml",
}


def compile_pattern(words: list[str]) -> re.Pattern[str]:
    """Compile a list of literal words into one alternation regex."""
    escaped = [re.escape(w) for w in words if w]
    return re.compile("|".join(escaped))


def scan_file(path: Path, brand_re: re.Pattern, personal_re: re.Pattern) -> list[dict]:
    """Return a list of {line, kind, word} hits for one file."""
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return []

    hits = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for m in brand_re.finditer(line):
            hits.append({"line": lineno, "kind": "brand", "word": m.group(0)})
        for m in personal_re.finditer(line):
            hits.append({"line": lineno, "kind": "personal", "word": m.group(0)})
    return hits


def iter_scan_files(root: Path):
    """Yield files we should scan, skipping noise directories and binary paths."""
    for dirpath, dirnames, filenames in os.walk(root):
        # prune in-place so os.walk doesn't descend
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname in SKIP_FILES:
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SCAN_EXTENSIONS:
                continue
            yield Path(dirpath) / fname


def main() -> int:
    parser = argparse.ArgumentParser(description="Zero-leak brand + personal-context scanner.")
    parser.add_argument("--root", default=None, help="Repo root (defaults to parent of this script's dir).")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of human-readable text.")
    parser.add_argument("--no-personal", action="store_true", help="Skip personal-context patterns.")
    parser.add_argument("--no-brand", action="store_true", help="Skip brand-name patterns.")
    args = parser.parse_args()

    if args.root:
        root = Path(args.root).resolve()
    else:
        # scripts/brand-scan.py → repo root is parent of scripts/
        root = Path(__file__).resolve().parent.parent

    if not root.is_dir():
        print(f"error: root {root} is not a directory", file=sys.stderr)
        return 2

    brand_re = compile_pattern([]) if args.no_brand else compile_pattern(BRAND_PATTERNS)
    personal_re = compile_pattern([]) if args.no_personal else compile_pattern(PERSONAL_PATTERNS)

    all_hits: list[dict] = []
    for path in iter_scan_files(root):
        rel = path.relative_to(root)
        for hit in scan_file(path, brand_re, personal_re):
            all_hits.append({
                "file": str(rel),
                "line": hit["line"],
                "kind": hit["kind"],
                "word": hit["word"],
            })

    if args.json:
        print(json.dumps({"hits": all_hits, "count": len(all_hits)}, ensure_ascii=False, indent=2))
    else:
        if not all_hits:
            print(f"✅ brand-scan: clean ({root})")
        else:
            print(f"❌ brand-scan: {len(all_hits)} hit(s) in {root}\n")
            for hit in all_hits:
                print(f"  {hit['file']}:{hit['line']}  [{hit['kind']}]  {hit['word']!r}")
            print(f"\nTotal: {len(all_hits)} hit(s). Fix or move to an excluded path.")
    return 0 if not all_hits else 1


if __name__ == "__main__":
    sys.exit(main())
