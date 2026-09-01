# Bidirectional Check · the verification script

[简体中文](bidirectional-check.md) · **English** · [Español](bidirectional-check.es.md) · [Русский](bidirectional-check.ru.md)

The Four-Alignment principle only has teeth if it's verifiable automatically. The repo ships [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py), turning "quiz → course", "syllabus → quiz" and "flashcard coverage" into one command. Semantic issues ("the course teaches it wrong") still need human review (rules in [`four-alignment.en.md`](./four-alignment.en.md)).

---

## Quick start

```bash
pnpm run check:alignment                          # from repo root, scans examples/dev-intro/ by default
pnpm run check:alignment -- examples/my-topic/    # scan a given theme

# or run Python directly
python3 scripts/bidirectional-check.py examples/my-topic/
```

**Exit codes**: `0` = all green (△ barely-covered is a warning, doesn't block); `1` = any ✗ exists (not taught / not covered / reconciliation mismatch); `2` = theme directory missing. Wire it straight into CI / scripts as a gate.

Sample output (contract mode):

```
扫描主题: examples/dev-intro
  题数: 10 / 闪卡: 4 / 课程文件: ['git-basics.html', 'linux-basics.html']
  考点排布表: 4 个考点（契约模式）

方向 1 · 题 → 课
  ✓ 暂存区: 课程 14 次命中
方向 2 · 大纲 → 题（排布表对账）
  ✓ EP-01 暂存区: single×3, multi×1, judge×1 共 5 题，day D1 一致
  ✓ 闪卡数对账: 表合计 = 实际 = 4 张
方向 3 · 闪卡覆盖
  ✓ 暂存区: 闪卡已覆盖
  ○ 相对路径: 排布表声明 0 卡（了解级不配卡），跳过

结论: 全绿（△ 为略提警告，不算失败）
```

---

## Contract mode: the exam-point table

When a theme's MISSION.md has a `## 考点排布表` (exam-point table) section, contract mode kicks in — exam points come from the table instead of built-in keywords, so **switching themes requires no script changes**:

```markdown
## 考点排布表

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | 暂存区 | 掌握 | single×3, multi×1, judge×1 | D1 | 1 |
```

- **The 考点 (exam point) column holds core keywords**: directions 1/3 substring-match on it (whitespace-stripped count over course text; flashcard front/back/topic), so it must be a word that actually appears in course and question text.
- **深度 (depth)**: 掌握 / 理解 / 了解 — for human reference, not machine-judged.
- **闪卡数 0 = the syllabus declares no cards for this point**: direction 3 skips it (common for "awareness-level" points); the sum of the flashcard column must equal the actual count in flashcards.json.

Contract-mode rules:

- **Direction 1 (quiz → course)**: each point's keyword must hit the course HTML (whitespace-stripped) ≥3 times to count as covered; 1-2 hits is △ barely covered; 0 hits is ✗ must add.
- **Direction 2 (syllabus → quiz, reconciliation)**: a question whose `examPoint` names a nonexistent point id is ✗; unlabeled ones only get a △ reminder and stay out of reconciliation (the field itself is optional, but in contract mode every question should carry it). Each point's actual question count and type distribution must equal the "题型×题量" column; a question's `day` must equal the point row's day; flashcard totals reconcile. Any mismatch is ✗.
- **Direction 3 (flashcard coverage)**: for points declared with ≥1 flashcard, the keyword must hit some flashcard's front / back / topic.

---

## Fallback mode (no table)

Themes whose MISSION.md has no table fall back to high-frequency-term scanning: the script counts **built-in keywords** (the dev-intro git/Linux exam-point terms) appearing ≥3 times in stems + analyses, then runs directions 1/3 with a ⚠ warning. Old themes are unaffected, but adding a table is recommended — fallback mode has no direction-2 reconciliation, and its keywords are dev-intro's.

---

## When to run

After any artifact changes (details in the "when to run checks" section of [`four-alignment.en.md`](./four-alignment.en.md)):

1. after generating a new course
2. after changing question examPoint / day / counts
3. after editing flashcards.json
4. after a grill CLI batch of deep-dives

---

## Script limitations

The script does **coarse-grained scanning**; it doesn't replace human review. It catches hard gaps like "the course never teaches X" or "question counts don't match the syllabus", but not "the course teaches X wrongly" or "question and course use the same word with different meanings". Treat it as a **first line of defense**; complex semantic alignment stays with the theme author.

The contract's black-box tests live in `apps/quiz-app/scripts/lib/bidirectional-contract.test.mjs` (three fixture themes: correct table reconciliation / tableless fallback / mismatch blocked), run automatically by `pnpm test`.

The source of truth is [`scripts/bidirectional-check.py`](https://github.com/jerryjiao/ai-study-kit/blob/main/scripts/bidirectional-check.py) in the repo.
