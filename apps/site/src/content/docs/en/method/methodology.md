---
title: Methodology
description: Syllabus defines scope, materials build concepts, quizzes validate mastery
---

This toolkit encodes a learning pattern distilled from real practice: **a syllabus defines scope → reference materials build concepts → quizzes validate mastery**, with AI assisting at every layer. Below is the neutralized pattern you can apply to any topic.

---

## The core pattern: syllabus → materials → quizzes

A domain offers three kinds of material, **different in nature and priority**:

| Material | Role | Examples | Authority |
|----------|------|----------|-----------|
| **Syllabus / exam outline** | Defines **what to learn and how deep** | Course outlines, certification bulletins, interview question lists, OKR learning goals | **The only authority** |
| **Reference materials** | Build the **concept system** | Classic textbooks, official docs, open courses, high-quality blogs, AI tutor explanations | High (yields to the syllabus on conflict) |
| **Practice questions** | **Validate** mastery | Real exams, mock exams, self-written questions, flashcards, wrong-answer book | Medium (questions can be biased) |

**Key insight**: the syllabus is the <strong>authority</strong>; materials and questions are <strong>tools</strong>. When the three disagree about a concept, the syllabus wins — content covered by questions or materials isn't necessarily required by the syllabus, and syllabus requirements must be learned even if your question bank doesn't cover them.

### What to learn, when

- **If the syllabus lists it, you must cover it** — that's a hard requirement for certifications, tests and interviews.
- **If it doesn't, don't force it** — the signal is "safe to skip", not "learn everything related".
- **If a syllabus item has levels** (L1 intro / L2 advanced / L3 mastery) — prepare for your target level; don't blindly aim for the top.

---

## The complete learning loop (5 pillars)

The tool aligns five artifacts around the same knowledge points:

1. **Quiz app**: drilling, grading, wrong-answer collection, automatic cross-device progress sync.
2. **Course lessons** (teach output): scattered concepts strung into systematic explanations — a self-contained HTML mini-site.
3. **Flashcards (SRS)**: memory anchors for core concepts, SM-2 + Anki learning-step spaced repetition.
4. **Wrong-question deep-dives** (grill output): after drilling, high-frequency mistakes are clustered and expanded — not just the correct answer, but <strong>why you got it wrong</strong> and where the confusing boundaries lie.
5. **Review podcasts** (podcast output): turn courses/questions/wrong-answers into two-host audio for commutes and workouts.

**AI participates at every layer**:

- Question writing: AI helps generate variants, adapt questions, analyze mistakes.
- Teaching: AI (the teach workflow) structures materials into course HTML.
- Flashcards: AI distills core concepts into cards.
- Deep-dives: AI clusters and expands wrong answers.
- Podcasts: AI synthesizes the two-host dialogue.

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
   │  teach course HTML      │ ← systematic, self-contained
   └────────┬─────────────────┘
            │ four-alignment
            ▼
   ┌─────────────────────────┐
   │  Quizzes + cards + deep-dives │ ← same points across artifacts
   └────────┬─────────────────┘
            │ keep drilling
            ▼
   ┌─────────────────────────┐
   │  Accuracy = learning signal │
   └─────────────────────────┘
            ↓
   Wrong answers → grill clustering → reinforce → redo
```

See [Four-Alignment](/ai-study-kit/en/method/four-alignment/) for the alignment rules and [Bidirectional Check](/ai-study-kit/en/maintain/bidirectional-check/) for the automated checker.

---

## A word to theme authors

To apply this methodology to your own topic (K8s, React, vocabulary, any subject):

1. **Define the syllabus first** — don't start drilling. Know what you're learning and to what depth. Even "deploy a K8s cluster independently" beats nothing.
2. **Find authoritative materials** — official docs and classic textbooks first. Don't let an AI tutor lecture from nothing; AI needs authoritative input too.
3. **Produce courses with the teach workflow** — it requires maintaining `RESOURCES.md` (an external resource list) which the AI consults before generating.
4. **Validate with questions** — real, mock or self-written; the key is that it's <strong>quantifiable</strong>. Accuracy isn't the goal, it's a diagnostic signal.
5. **Expand on mistakes** — don't just read the correct answer; ask "why was I wrong, where's the confusion, how would a variant look".

---

## Further reading

- [Four-Alignment](/ai-study-kit/en/method/four-alignment/) — the detailed alignment rules
- [Bidirectional Check](/ai-study-kit/en/maintain/bidirectional-check/) — automated verification script
- [AI CLI Guide](/ai-study-kit/en/ai/ai-cli/) — teach / grill / podcast CLI usage
- `examples/dev-intro/` — a complete git + Linux example showing the full aligned loop
