# Four-Alignment Principle

[简体中文](four-alignment.md) · **English** · [Español](four-alignment.es.md) · [Русский](four-alignment.ru.md)

When learning any topic, four artifacts must stay aligned around **the same knowledge points**: the course (explanation), the quiz (practice), the flashcards (memory anchors), and the wrong-question deep-dive (mistake forensics). They are four independent files in the repo — edit any one of them and the other three don't move. Misalignment fails silently: it just leaves hidden learning gaps — drilling questions you were never taught, finishing lessons with nothing to practice, core concepts with no cards.

---

## What the four artifacts are

| # | Artifact | File location | What it does |
|---|----------|---------------|--------------|
| 1 | **Course** | `examples/<theme>/lessons/*.html` | Explains concepts systematically, builds mental models |
| 2 | **Questions** | `examples/<theme>/questions.json` | Practice and validation, grading, wrong-answer collection |
| 3 | **Flashcards** | `examples/<theme>/flashcards.json` | Spaced-repetition memory anchors for core concepts |
| 4 | **Wrong-question deep-dives** | `examples/<theme>/study/wrong-questions/cluster-*.html` | Deep expansion of high-frequency mistakes |

The four aren't isolated; they cooperate around the same exam points: the course explains a concept, a question tests it, a flashcard helps memorize it, and the deep-dive expands its confusion boundaries when you get it wrong.

---

## Why alignment is mandatory (two real pitfalls)

This principle comes from real incidents, not theoretical fastidiousness.

### Pitfall 1: questions the course never taught (quiz → course gap)

At one point the question bank had 20 questions on "half adders" — and the course never mentioned the concept at all. You hit these questions with a blank stare, having no idea what's being tested.

- **Root cause**: questions were mechanically grouped by module, without checking course coverage.
- **Fix**: teach the missing concepts and add automated verification (below).

### Pitfall 2: lessons with no questions to drill (course → quiz gap)

The course devoted a core methodology to a full section, but the related questions never followed — you finish the lesson with nothing to practice, while drillers never learned it.

- **Root cause**: question grouping labels weren't split along course content.
- **Fix**: align the questions' `topic` groups (and optional `day` schedule labels) with the course, plus bidirectional checks.

---

## The three verification directions

Alignment needs checking in both directions, plus a flashcard coverage pass.

### Direction 1: quiz → course (what questions test, the course must teach)

Extract high-frequency exam-point terms from question stems (concepts appearing ≥3 times), then check each against course HTML coverage (hit count over whitespace-stripped text):

- **≥3 hits**: ✓ covered
- **1-2 hits**: △ barely mentioned, expand
- **0 hits**: ✗ not taught, must add

### Direction 2: course → quiz (what the course teaches, questions must drill)

Extract core concepts from the course HTML and check the question bank for matching practice:

- Heavily taught in the course, 0 related questions in the bank → missing practice, add questions for that point
- Related questions scattered into other groups → adjust their `topic` (or `day` labels) so learning and drilling close within the same group

### Direction 3: flashcard coverage

Every core course concept (exam-point terms with ≥3 hits) should be covered by ≥1 flashcard (hit in front / back):

- A taught concept with no flashcard → missing memory anchor
- A flashcard concept the course never mentions → detached card; either teach it or delete the card

---

## When to run the checks

Run after any artifact changes:

1. **After generating a new course** — which points does it cover? Do those points have questions? Flashcards?
2. **After changing question topic / day grouping** — regrouping can decouple course and questions.
3. **After editing flashcards.json** — adding/removing cards can detach them from the course.
4. **After a grill CLI batch of deep-dives** — every deep-dive point must trace back to a course (wrong-answer → course reverse check).

---

## The dev-intro example, aligned

Open `examples/dev-intro/` for a complete aligned example:

| Knowledge point | Course | Question | Flashcard | Deep-dive |
|-----------------|--------|----------|-----------|-----------|
| **git three areas** | `lessons/git-basics.html` §1-2 | GIT-006 | FC-DEV-01 | — |
| **git commit & undo** | `lessons/git-basics.html` §4 | GIT-007 | FC-DEV-03 | `study/wrong-questions/cluster-01-git-提交与撤销操作.html` |
| **chmod permissions** | `lessons/linux-basics.html` §3-4 | LNX-002 | FC-DEV-02 | `study/wrong-questions/cluster-02-linux-权限与路径.html` |
| **relative path `..`** | `lessons/linux-basics.html` §2 | LNX-003 | — | — |

Not every knowledge point needs all four artifacts — but **high-frequency mistake points** must have all four (like git commit & undo). That's the grill CLI's core scenario.

---

## Further reading

- [`bidirectional-check.en.md`](./bidirectional-check.en.md) — the automated script that turns the directions above into Python
- [`methodology.en.md`](./methodology.en.md) — the full methodology framework
- [`ai-cli-guide.en.md`](./ai-cli-guide.en.md) — producing aligned content with the teach / grill CLIs
