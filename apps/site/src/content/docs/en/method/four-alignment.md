---
title: Four-Alignment
description: Courses, quizzes, flashcards and wrong-question deep-dives must stay aligned around the same knowledge points
---

When learning any topic, four artifacts must stay aligned around <strong>the same knowledge points</strong> — the course (explanation), the quiz (practice), the flashcards (memory anchors), and the wrong-question deep-dive (mistake forensics). Any drift between them creates silent learning gaps.

---

## The four artifacts

| # | Artifact | Location | What it does |
|---|----------|----------|--------------|
| 1 | **Courses** | `examples/<theme>/lessons/*.html` | Systematically explain concepts, build mental models |
| 2 | **Quizzes** | `examples/<theme>/questions.json` | Practice and validation, grading, wrong-answer collection |
| 3 | **Flashcards** | `examples/<theme>/flashcards.json` | Spaced-repetition memory anchors for core concepts |
| 4 | **Deep-dives** | `examples/<theme>/wrong-questions/cluster-*.html` | Expand high-frequency mistakes in depth |

They are not isolated — they coordinate around <strong>one set of exam points</strong>. The course explains a concept, the quiz tests it, the flashcard anchors it, and the deep-dive excavates its confusions when you get it wrong.

---

## Why alignment is mandatory (two real pits)

This principle comes from real pain, not theoretical fastidiousness:

### Pit 1: quiz without course (quiz → course gap)

One day the quiz had 20 questions on "half adders" while the corresponding lesson never covered the concept. Users hit them with no idea what was being tested.

**Root cause**: questions were mechanically assigned to a day by "module" without checking course coverage.
**Fix**: teach the missing concept and add bidirectional checking (below).

### Pit 2: course without quiz (course → quiz gap)

One day's lesson taught a core method, but every related question was scheduled on another day. Learn with nothing to drill, or drill what was never learned.

**Root cause**: the questions' "day tags" weren't split along lesson boundaries.
**Fix**: day tags must follow lesson content, with bidirectional checking.

---

## Three alignment checks

**Alignment is bidirectional plus a coverage layer**:

### Direction 1: quiz → course (if a day's quiz covers it, that day's course must teach it)

Extract high-frequency exam-point words from a day's questions (concepts appearing ≥3 times) and check coverage in the corresponding lesson HTML:

- **Coverage = raw mentions in the lesson** (whitespace-stripped)
- **≥3**: ✓ covered
- **1–2**: △ mentioned — expand it
- **0**: ✗ not taught — must be added

### Direction 2: course → quiz (if the course teaches it, the quiz must schedule it that day)

Extract core concepts from the lesson HTML and check whether they appear in that day's questions:

- Heavily taught but 0 questions that day → questions are mis-scheduled; check moduleMap / day tags
- Taught but related questions scattered on other days → move them or cross-link

### Direction 3: flashcard coverage

Every core concept of the day (≥3 mentions) should have ≥1 flashcard covering it (front/back match):

- Course concept without a card → missing memory anchor
- Card concept absent from the course → card is detached; teach it or drop the card

---

## When to run the checks

After any artifact changes:

1. **After generating new lessons** — which points are covered? Are they scheduled on the right day? Any cards?
2. **After changing moduleMap / day tags** — rescheduling can desynchronize course and quiz.
3. **After editing flashcards.json** — card changes can desynchronize from the course.
4. **After a grill-wrong-questions run** — deep-dive points must trace back to that day's course (deep-dive → course reverse check).

---

## A worked example: dev-intro

Open `examples/dev-intro/` for a complete aligned example:

| Knowledge point | Course | Quiz | Card | Deep-dive |
|-----------------|--------|------|------|-----------|
| **git's three areas** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git reset vs revert** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `wrong-questions/cluster-01-git-reset-vs-revert.html` |
| **chmod permissions** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | — |
| **relative path `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

Note: not every point needs all four artifacts. But <strong>high-frequency mistakes</strong> must have all four (like git reset vs revert) — that's the core output of the grill workflow.

---

## Further reading

- [Bidirectional Check](/ai-study-kit/en/maintain/bidirectional-check/) — the three directions as runnable Python
- [Methodology](/ai-study-kit/en/method/methodology/) — the full framework
- [AI CLI Guide](/ai-study-kit/en/ai/ai-cli/) — producing aligned content with teach / grill CLIs
