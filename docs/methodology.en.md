# Methodology

[简体中文](methodology.md) · **English** · [Español](methodology.es.md) · [Русский](methodology.ru.md)

This toolkit encodes a learning pattern distilled from real practice. The one-line version: **a syllabus defines what to learn → reference materials build the concepts → quizzes validate the result**. Each step has its own source of authority and the order matters — drilling before defining a syllabus, or quizzing concepts you never grounded in material, wastes effort. Below is the neutralized pattern you can apply to any topic.

---

## The core pattern: syllabus → materials → quizzes

A domain offers three kinds of material, **different in nature and priority**:

| Material | Role | Examples | Authority |
|----------|------|----------|-----------|
| **Syllabus / exam outline** | Defines **what to learn and how deep** | Course outlines, certification bulletins, interview question lists, OKR learning goals | **The only authority** |
| **Reference materials** | Build the **concept system** | Classic textbooks, official docs, open courses, high-quality blogs, AI tutor explanations | High (yields to the syllabus on conflict) |
| **Practice questions** | **Validate** mastery | Real exams, mock exams, self-written questions, flashcards, wrong-answer book | Medium (questions can be biased) |

The syllabus is the authority; materials and questions are tools. When the three disagree about a concept, the syllabus wins — content covered by questions or materials isn't necessarily required by the syllabus, and syllabus requirements must be learned even if your question bank doesn't cover them.

### What to learn, when

- **If the syllabus lists it, you must cover it** — a hard requirement for certifications, tests and interviews.
- **If it doesn't, don't force it** — the signal is "safe to skip", not "learn everything related".
- **If a syllabus item has levels** (L1 intro / L2 advanced / L3 mastery) — prepare for your target level; don't blindly aim for the top.

---

## The complete learning loop

The tool organizes five kinds of artifacts around the same exam points, plus a coach line and a learning-trail directory.

### Five artifacts

1. **Quiz app** — drilling, grading, wrong-answer collection, automatic cross-device progress sync.
2. **Course lessons** (teach CLI output) — scattered concepts strung into systematic explanations, a self-contained HTML mini-site. A lesson only counts toward progress after you explicitly mark it "✓ done" — opening it doesn't count.
3. **Flashcards (SRS)** — memory anchors for core concepts, SM-2 + Anki learning-step spaced repetition.
4. **Wrong-question deep-dives** (grill CLI output) — high-frequency mistakes clustered and expanded per cluster: why you got it wrong and where the confusing boundaries lie, not just the correct answer.
5. **Review podcasts** (podcast CLI output) — courses, questions and deep-dives turned into two-host audio for commutes and workouts.

### The coach line: `/ai-study-kit`

Once there are many features, "what exactly should I do today?" becomes a burden in itself. The `/ai-study-kit` study coach does the routing: it first scans your learning state read-only, recommends one action with a reason, then walks you through the playbook once you pick. Two of its flows map directly onto deeper claims of this methodology:

- **F10 coached tutoring** — lessons are one-way, tutoring is a dialogue: teach each exam point thoroughly (what / why / when to use), quiz on the spot, correct misconceptions on the spot. An interactive complement to "build concepts from reference materials".
- **F11 pre-deadline sprint** — within 7 days of the exam date you enter the harvest window: only harvest what you've already learned (anchor phrases, wrong-answer archives), no new lessons; memorize, then validate with a mock exam.

### The learning trail: `study/`

Learning output inside a theme pack lives under `study/`, sorted into four kinds:

| Directory | Contents | Nature |
|-----------|----------|--------|
| `study/records/` | Tutoring progress records (per-exam-point notes, anchor phrases) | Learner-private, **never published with the static site** |
| `study/notes/` | Stage notes (tutoring output, handed over to drilling) | Distributed with the theme pack |
| `study/wrong-questions/` | Wrong-question deep-dives (grill output) | Distributed with the theme pack |
| `study/sprint/` | Sprint packages (phrase sheets / pitfall warnings / must-memorize lists / checklists) | Distributed with the theme pack |

AI participates at every layer: question writing (an agent authors questions point by point from the syllabus — see the F2 flow of [`ai-study-kit.en.md`](./ai-study-kit.en.md)), teaching (teach), tutoring (F10 dialogue), card-making (distilling concepts from the course), mistake forensics (grill), and podcast synthesis (podcast). How these artifacts stay around one set of exam points is the [Four-Alignment](./four-alignment.en.md) principle.

---

## Workflow overview

```
        ┌─────────────────┐
        │  Syllabus (authority) │
        └────────┬────────┘
                 │ defines points + level
                 ▼
   ┌─────────────────────────┐
   │  Reference materials    │ ← textbooks / docs / courses / AI tutor
   └────────┬─────────────────┘
            │ AI-assisted structuring
            ▼
   ┌─────────────────────────┐
   │  teach course HTML      │ ← systematic lessons + F10 tutored dialogue
   └────────┬─────────────────┘
            │ four-alignment
            ▼
   ┌─────────────────────────┐
   │  Quizzes + flashcards   │ ← same exam points covered across artifacts
   │  + wrong-question dives │
   └────────┬─────────────────┘
            │ continuous practice
            ▼
   ┌─────────────────────────┐
   │  accuracy = outcome     │
   └─────────────────────────┘
            ↓
   wrong answers → grill cluster deep-dives → patch → redo
   exam approaching → F11 sprint harvest → mock-exam validation
```

---

## A note to theme authors

Apply this methodology to your own topic (K8s, React, vocabulary, any subject):

1. **Define the syllabus first** — don't start drilling right away. Decide what to learn and how deep, and write it into `examples/<theme>/MISSION.md`. Even a coarse goal like "I want to be able to deploy a K8s cluster on my own" beats having none.
2. **Collect authoritative materials** — prefer official docs and classic textbooks; collect links into `examples/<theme>/RESOURCES.md`. An AI tutor needs authoritative input too — don't let it lecture from thin air.
3. **Generate the course** — put goal, audience, depth and material links into `examples/<theme>/course-spec.json`, then run `pnpm run ai:teach`.
4. **Validate with questions** — real exams, mocks or self-written all work; the key is that it's **quantifiable**. Accuracy isn't the goal, it's a diagnostic signal.
5. **Dig into wrong answers** — don't just read the correct answer; ask "why was I wrong, where's the confusion boundary, how would a variant look". Let them pile up, then let the grill CLI cluster and expand them.

You don't have to walk this manually — once the `/ai-study-kit` coach is installed, say "I want to learn X" and the F2 new-theme flow walks you through the steps above.

---

## Further reading

- [`four-alignment.en.md`](./four-alignment.en.md) — the Four-Alignment principle in detail
- [`bidirectional-check.en.md`](./bidirectional-check.en.md) — the automated verification script
- [`ai-cli-guide.en.md`](./ai-cli-guide.en.md) — teach / grill / podcast CLI usage
- `examples/dev-intro/` — a complete git + Linux example showing what the aligned loop looks like
