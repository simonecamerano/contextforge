# ContextForge Native Roadmap Support — Design Spec

**Date:** 2026-05-26  
**Status:** Approved  
**Scope:** Add native roadmap tracking to ContextForge so agents can maintain a `roadmap.md` that is automatically parsed and included in generated context files.

---

## Problem

The agentic workflow described in `.agent/rules/scelta_modello.md` requires agents to maintain a project roadmap and keep it updated. Currently ContextForge has no awareness of roadmap state: it is not parsed, not reflected in `active-context.md` or `ai-brief.md`, and not scaffolded by `contextforge init`. Agents either skip it or maintain it outside the memory loop, making it invisible to subsequent agent sessions.

---

## Solution

Approach B: a dedicated parser module following the existing `parsers/typescript.ts` / `parsers/python.ts` pattern. `roadmap.md` in the project root is parsed at scan/update time, roadmap items are added to `ProjectSummary`, and existing generators render them into context files automatically.

---

## Data Model

### New type: `RoadmapItem` (added to `summarizer.ts`)

```ts
export interface RoadmapItem {
  text: string;
  done: boolean;
  section?: string; // heading under which the task appears, e.g. "Phase 1"
}
```

### `ProjectSummary` change

Add one optional field:

```ts
roadmap: RoadmapItem[]; // empty array when roadmap.md does not exist
```

---

## New File: `src/core/scanner/parsers/roadmap.ts`

**Responsibility:** Parse a `roadmap.md` string into `RoadmapItem[]`.

**Parsing rules:**
- Lines matching `## heading` or `### heading` set the current `section` context.
- Lines matching `- [ ] text` produce `{ text, done: false, section }`.
- Lines matching `- [x] text` or `- [X] text` produce `{ text, done: true, section }`.
- All other lines (paragraphs, blank lines, the `> comment` block in the template) are ignored.

**Signature:**
```ts
export function parseRoadmap(content: string): RoadmapItem[]
```

**Edge cases:**
- Empty file → `[]`
- Tasks before any heading → `section` is `undefined`
- Case-insensitive `[X]` counts as done

---

## `summarizeProject()` Integration

Before iterating the file list, attempt to read `roadmap.md` from the project root:

```ts
try {
  const roadmapContent = await fs.readFile(
    path.join(projectRoot, 'roadmap.md'), 'utf8'
  );
  summary.roadmap = parseRoadmap(roadmapContent);
} catch {
  summary.roadmap = [];
}
```

This keeps the failure mode silent and non-blocking — if `roadmap.md` does not exist, the rest of the scan is unaffected.

---

## Generator Changes

### `active-context.ts`

When `summary.roadmap.length > 0`, append a **Roadmap** section at the end of the generated document:

```markdown
## Roadmap

**Progress:** 3/7 tasks completed (43%)

### Phase 1 — Setup
- [x] Define project structure
- [x] Configure TypeScript
- [ ] Add authentication

### Phase 2 — Core Features
- [ ] Build dashboard
- [ ] Connect database
```

- Progress line: `X/Y tasks completed (Z%)`.
- Tasks grouped by `section`; tasks with no section rendered under an implicit top-level list.
- When `summary.roadmap` is empty, the section is omitted entirely.

### `ai-brief.ts`

When there are open tasks, append a compact **Open Tasks** block:

```markdown
### Open Tasks
- [ ] Add authentication  *(Phase 1 — Setup)*
- [ ] Build dashboard  *(Phase 2 — Core Features)*
```

- Only `done: false` items.
- Section name appended inline in italics for quick orientation.
- Completed tasks are excluded (no noise in token-sensitive prompts).
- When all tasks are done or roadmap is empty, the block is omitted.

---

## `contextforge init` Changes

During `init`, after creating the `.contextforge/` directory and the agent rules, create `roadmap.md` in the project root:

```markdown
# Roadmap

> Fill in your planned tasks below using `- [ ] task` for open and `- [x] task` for completed.
> Group tasks under `##` phase headings. ContextForge tracks progress automatically.

## Phase 1 — Setup
- [ ] 

## Phase 2 — Core Features
- [ ] 

## Phase 3 — Polish
- [ ] 
```

**Guard:** if `roadmap.md` already exists, skip creation without error.

---

## System Prompt Update

In `.agent/rules/scelta_modello.md`, Section 7 (ContextForge Integration), add after step 1:

> After `contextforge init`, populate `roadmap.md` in the project root with the approved plan tasks before running `contextforge scan`. ContextForge will track progress automatically in `active-context.md` and `ai-brief.md`.

---

## Testing

### `src/core/scanner/parsers/roadmap.test.ts` (new)
- Open task `- [ ]` parsed correctly
- Closed task `- [x]` and `- [X]` parsed as `done: true`
- `##` and `###` headings set `section`
- Tasks before any heading have `section: undefined`
- Mixed content (paragraphs, blank lines, `>` quotes) ignored
- Empty string → `[]`

### `src/core/scanner/summarizer.test.ts` (additions)
- When `roadmap.md` exists → `summary.roadmap` populated
- When `roadmap.md` absent → `summary.roadmap = []`, no error thrown

### `src/core/generators/generators.test.ts` (additions)
- `generateActiveContext` with non-empty roadmap → section present, progress line correct
- `generateActiveContext` with empty roadmap → no Roadmap section
- `generateAIBrief` → only open tasks rendered, completed excluded
- `generateAIBrief` with all tasks done → Open Tasks block omitted

---

## Files Changed

| File | Change |
|---|---|
| `src/core/scanner/parsers/roadmap.ts` | New |
| `src/core/scanner/parsers/roadmap.test.ts` | New |
| `src/core/scanner/summarizer.ts` | Add `RoadmapItem` type, `roadmap` field to `ProjectSummary`, call `parseRoadmap` |
| `src/core/generators/active-context.ts` | Render Roadmap section |
| `src/core/generators/ai-brief.ts` | Render Open Tasks block |
| `src/core/generators/generators.test.ts` | Add roadmap rendering tests |
| `src/core/scanner/summarizer.test.ts` | Add roadmap integration tests |
| `src/cli/commands/init.ts` | Create `roadmap.md` template |
| `.agent/rules/scelta_modello.md` | Add roadmap instruction to Section 7 |
