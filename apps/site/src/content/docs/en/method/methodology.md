---
title: Methodology
description: A syllabus defines scope, materials build concepts, quizzes validate mastery
---

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

## The complete learning loop (5 pillars)

The tool aligns five artifacts around the same knowledge points:

1. **Quiz app** — drilling, grading, wrong-answer collection, automatic cross-device progress sync.
2. **Course lessons** (teach CLI output) — scattered concepts strung into systematic explanations, a self-contained HTML mini-site.
3. **Flashcards (SRS)** — memory anchors for core concepts, SM-2 + Anki learning-step spaced repetition.
4. **Wrong-question deep-dives** (grill CLI output) — high-frequency mistakes clustered and expanded per cluster: why you got it wrong and where the confusing boundaries lie, not just the correct answer.
5. **Review podcasts** (podcast CLI output) — courses, questions and deep-dives turned into two-host audio for commutes and workouts.

AI participates at every layer: question writing (an agent authors questions point by point from the syllabus — see the F2 flow of `/study-coach`), teaching (teach), card-making (distilling concepts from the course), mistake forensics (grill), and podcast synthesis (podcast). How these artifacts stay around one set of exam points is the [Four-Alignment](/ai-study-kit/en/method/four-alignment/) principle.

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
   Wrong answers → grill CLI clustering → reinforce → redo
```

---

## A word to theme authors

To apply this methodology to your own topic (K8s, React, vocabulary, any subject):

1. **Define the syllabus first** — don't start drilling. Decide what you're learning and to what depth, and write it into `examples/<theme>/MISSION.md`. Even "deploy a K8s cluster independently" beats nothing.
2. **Collect authoritative materials** — official docs and classic textbooks first; gather links into `examples/<theme>/RESOURCES.md`. AI tutors need authoritative input too — don't let them lecture from nothing.
3. **Produce courses** — put goal, audience, depth and material links into `examples/<theme>/course-spec.json` and run `pnpm run ai:teach`.
4. **Validate with questions** — real, mock or self-written; the key is that it's **quantifiable**. Accuracy isn't the goal, it's a diagnostic signal.
5. **Expand on mistakes** — don't just read the correct answer; ask "why was I wrong, where's the confusion, how would a variant look". Accumulate wrong answers and let the grill CLI cluster them into deep-dives.

---

## Further reading

- [Four-Alignment](/ai-study-kit/en/method/four-alignment/) — the detailed alignment rules
- [Bidirectional Check](/ai-study-kit/en/maintain/bidirectional-check/) — automated verification script
- [AI CLI Guide](/ai-study-kit/en/ai/ai-cli/) — teach / grill / podcast CLI usage
- `examples/dev-intro/` — a complete git + Linux example showing the full aligned loop
