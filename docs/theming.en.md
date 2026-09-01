# Theme presentation config (theme-config.json)

[简体中文](theming.md) · **English** · [Español](theming.es.md) · [Русский](theming.ru.md)

Every presentation-layer customization of the quiz app — home-page ordering, display names, subtopic expansion, source badges, core/extension layers, exam-point depth badges, card colors — lives in the theme pack's `theme-config.json`, **no app code required**. The file is fully optional: without it the app runs on fallback semantics and never errors.

Full example: [`examples/dev-intro/theme-config.json`](../examples/dev-intro/theme-config.json).

---

## Sync pipeline

Before dev / build / test, `sync-examples.mjs` copies `examples/<theme>/theme-config.json` to `apps/quiz-app/src/data/theme-config.json` (a sync artifact — hand edits are overwritten). Themes without this file sync an empty config `{}` and the app runs as usual.

---

## Field reference

Every field is optional; whatever is missing falls back:

| Field | Type | Purpose | Fallback when unset |
|---|---|---|---|
| `topicLabels` | `{topicId: display name}` | UI display names for major groups (the topic id is the stable data-layer identifier; presentation goes through this map) | show the raw topic id |
| `topicOrder` | `[topicId]` | learning order of major groups (shallow → deep); unlisted topics fall to the end alphabetically | everything alphabetical |
| `subtopics` | `{topicId: [full subtopic name]}` | exam-point-ordered subtopic lists; configured groups expand a second-level nav on the home page | no expansion (one card per group) |
| `sourceLabels` | `{source: short name}` | display names for question-card source badges | show the raw source |
| `sourceLayers` | `{source: core\|extension}` | source → learning-priority layer mapping | no layer concept (`layerOf` returns null) |
| `layerTopics` | `[topicId]` | which major groups have layers (scopes practice-page layer chips / home depth badges) | no theme has layers |
| `lessonTopics` | `{"<lesson filename>": topicId}` | lesson → question-set direct link: after finishing a lesson, the "drill this lesson's questions" button jumps to the matching set | direct link only when the filename (minus `.html`) happens to equal a bank topic; otherwise the button isn't rendered |
| `epDepth` | `{point base name: master\|understand\|aware}` | exam-point depth badge for subtopics; block suffixes are stripped before lookup (`线性表一` → `线性表`) | no badge |
| `topicStyles` | `{topicId: {cls, childCls, icon}}` | group card colors (Tailwind class strings) + icon name | default styling |

A minimal config looks like this (display names and order for two groups only):

```json
{
  "topicLabels": {
    "git-basics": "Git basics",
    "linux-commands": "Linux commands"
  },
  "topicOrder": ["git-basics", "linux-commands"]
}
```

---

## Fallback semantics (design principle)

The config is **purely additive**: each field works independently, every absence has a defined fallback, and an incomplete config never errors. The core notion is **in-plan** (main progress) — `isPlanned = source layer ≠ extension`: without `sourceLayers`, every question of a theme automatically counts as in-plan, and the progress denominator / home-page counters / random pool are unchanged.

---

## Icon names

`topicStyles.icon` takes a string name (e.g. `"Boxes"`, `"Layers"`); the app resolves it through a whitelist map in `apps/quiz-app/src/lib/themeConfig.ts` to a lucide component — config is data, components are code, and the map is the bridge. Unknown names fall back to `Boxes`; to add icons, extend that map (tree-shaking only bundles whitelisted components).

---

## Subtopic naming convention

A full `subtopic` name = `{topicId}·{display name}{Chinese-numeral block suffix}`, e.g. `git-basics·工作流`, or when volume requires splitting `xxx·线性表一` / `xxx·线性表二`. The prefix must be a complete ASCII identifier (`[a-z0-9-]`); separators accept the three historical forms `·` `:` `-` — the UI strips the prefix at the ASCII-identifier boundary so a hyphen inside a topic name is never mistaken for a separator. Blocks under the same base sort by Chinese numeral order (一<二<…<十一, via a lookup table — `localeCompare` is unreliable for Chinese numerals).

---

## Layers (core / extension)

A layer is a question's **learning priority**, derived from its source, shown as a card badge + practice-page filter chip; it is not a navigation dimension. While the settings-panel "extension drills" toggle is off (default), the layer concept doesn't exist at all: no chips, `&layer=` deep links disabled, every list contains only in-plan questions; toggled on, you get "core by default, three-state chips (all / core / extension)". A subtopic block with 0 in-plan and >0 extension questions is a "pure extension block" — invisible with the toggle off, shown with a gray "extension N" badge when on.
