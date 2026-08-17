---
title: Four-Alignment
description: Courses, quizzes, flashcards and wrong-question deep-dives must stay aligned around the same knowledge points
---

When learning any topic, four artifacts must stay aligned around **the same knowledge points**: the course (explanation), the quiz (practice), the flashcards (memory anchors), and the wrong-question deep-dive (mistake forensics). They are four independent files in the repo — editing one doesn't move the other three. Misalignment never throws an error; it just leaves silent learning gaps: drilling questions you never learned, finishing a lesson with nothing to drill, or core concepts without a card.

---

## The four artifacts

| # | Artifact | Location | What it does |
|---|----------|----------|--------------|
| 1 | **Courses** | `examples/<theme>/lessons/*.html` | Systematically explain concepts, build mental models |
| 2 | **Quizzes** | `examples/<theme>/questions.json` | Practice and validation, grading, wrong-answer collection |
| 3 | **Flashcards** | `examples/<theme>/flashcards.json` | Spaced-repetition memory anchors for core concepts |
| 4 | **Deep-dives** | `examples/<theme>/wrong-questions/cluster-*.html` | Expand high-frequency mistakes in depth |

They are not isolated — they coordinate around **one set of exam points**. The course explains a concept, the quiz tests it, the flashcard anchors it, and the deep-dive excavates its confusions when you get it wrong.

---

## Why alignment is mandatory (two real pits)

This principle comes from real pain, not theoretical fastidiousness.

### Pit 1: quiz without course (quiz → course gap)

One question bank had 20 questions on "half adders" while the corresponding lesson never covered the concept. Learners hit them with no idea what was being tested.

- **Root cause**: questions were mechanically grouped by module without checking course coverage.
- **Fix**: teach the missing concept and add automated checking (below).

### Pit 2: course without quiz (course → quiz gap)

A lesson taught a core method in depth, but the related questions never followed — learn with nothing to drill, or drill what was never learned.

- **Root cause**: the questions' grouping tags weren't split along lesson content.
- **Fix**: align the questions' `topic` groups (and optional `day` schedule tags) with the course, with bidirectional checking.

---

## Three alignment checks

Alignment is bidirectional plus a coverage layer.

### Direction 1: quiz → course (whatever the quiz tests, the course must teach)

Extract high-frequency exam-point words from the questions (concepts appearing ≥3 times) and check coverage in the lesson HTML (raw mentions after stripping whitespace):

- **≥3**: ✓ covered
- **1–2**: △ mentioned — expand it
- **0**: ✗ not taught — must be added

### Direction 2: course → quiz (whatever the course teaches, the quiz must drill)

Extract core concepts from the lesson HTML and check the question bank:

- Heavily taught but 0 related questions → missing practice; add questions for that point
- Related questions scattered in other groups → adjust the questions' `topic` (or `day` tags) so learning and drilling close within the same group

### Direction 3: flashcard coverage

Every core concept of the course (≥3 mentions) should have ≥1 flashcard covering it (front/back match):

- Course concept without a card → missing memory anchor
- Card concept absent from the course → card is detached; teach it or drop the card

---

## When to run the checks

After any artifact changes:

1. **After generating new lessons** — which points are covered? Do they have questions? Any cards?
2. **After changing the questions' topic / day grouping** — regrouping can desynchronize course and quiz.
3. **After editing flashcards.json** — card changes can desynchronize from the course.
4. **After a grill CLI run** — deep-dive points must trace back to the course (deep-dive → course reverse check).

---

## A worked example: dev-intro

Open `examples/dev-intro/` for a complete aligned example:

| Knowledge point | Course | Quiz | Card | Deep-dive |
|-----------------|--------|------|------|-----------|
| **git's three areas** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git reset vs revert** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `wrong-questions/cluster-01-git-reset-vs-revert.html` |
| **chmod permissions** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | — |
| **relative path `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

Not every point needs all four artifacts, but **high-frequency mistakes** must have all four (like git reset vs revert) — that's the core scenario the grill CLI exists for.

---

## Further reading

- [Bidirectional Check](/ai-study-kit/en/maintain/bidirectional-check/) — two of the directions as runnable Python
- [Methodology](/ai-study-kit/en/method/methodology/) — the full framework
- [AI CLI Guide](/ai-study-kit/en/ai/ai-cli/) — producing aligned content with teach / grill CLIs
