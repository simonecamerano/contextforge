# Roadmap Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native roadmap tracking to ContextForge so that `roadmap.md` in the project root is automatically parsed at scan/update time and rendered into `active-context.md` and `ai-brief.md`.

**Architecture:** New `parseRoadmap` parser in `src/core/scanner/parsers/roadmap.ts` follows the existing parser pattern. `ProjectSummary` gains a `roadmap: RoadmapItem[]` field. The two generators (`active-context.ts`, `ai-brief.ts`) render from that field. `init.ts` scaffolds a blank `roadmap.md` template.

**Tech Stack:** TypeScript, Node.js `fs/promises`, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/core/scanner/parsers/roadmap.ts` | **Create** — parser + `RoadmapItem` type |
| `src/core/scanner/parsers/roadmap.test.ts` | **Create** — unit tests for parser |
| `src/core/scanner/summarizer.ts` | **Modify** — import `RoadmapItem`, add `roadmap` field to `ProjectSummary`, read and parse `roadmap.md` |
| `src/core/scanner/summarizer.test.ts` | **Modify** — add roadmap integration tests, fix 2 broken `Once` mock sequences |
| `src/core/generators/active-context.ts` | **Modify** — render Roadmap section |
| `src/core/generators/ai-brief.ts` | **Modify** — render Open Tasks section |
| `src/core/generators/generators.test.ts` | **Modify** — add `roadmap: []` to `baseSummary`, add roadmap rendering tests |
| `src/core/updater/selective-update.test.ts` | **Modify** — add `roadmap: []` to `baseSummary` |
| `src/cli/commands/init.ts` | **Modify** — scaffold `roadmap.md` template, update `DEFAULT_SCELTA_MODELLO_TEMPLATE` |
| `.agent/rules/scelta_modello.md` | **Modify** — add roadmap instruction to Section 7 |

---

## Task 1: `parseRoadmap` parser

**Files:**
- Create: `src/core/scanner/parsers/roadmap.ts`
- Create: `src/core/scanner/parsers/roadmap.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/core/scanner/parsers/roadmap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRoadmap } from './roadmap.js';

describe('parseRoadmap', () => {
  it('returns empty array for empty content', () => {
    expect(parseRoadmap('')).toEqual([]);
  });

  it('parses an open task', () => {
    expect(parseRoadmap('- [ ] Set up project')).toEqual([
      { text: 'Set up project', done: false, section: undefined },
    ]);
  });

  it('parses a completed task with lowercase x', () => {
    expect(parseRoadmap('- [x] Deploy to production')).toEqual([
      { text: 'Deploy to production', done: true, section: undefined },
    ]);
  });

  it('parses a completed task with uppercase X', () => {
    expect(parseRoadmap('- [X] Deploy to production')).toEqual([
      { text: 'Deploy to production', done: true, section: undefined },
    ]);
  });

  it('assigns section from ## heading', () => {
    expect(parseRoadmap('## Phase 1\n- [ ] Init project')).toEqual([
      { text: 'Init project', done: false, section: 'Phase 1' },
    ]);
  });

  it('assigns section from ### heading', () => {
    expect(parseRoadmap('### Sub-phase\n- [ ] Do something')).toEqual([
      { text: 'Do something', done: false, section: 'Sub-phase' },
    ]);
  });

  it('tasks before any heading have section undefined', () => {
    const result = parseRoadmap('- [ ] Early task\n## Phase 1\n- [ ] Late task');
    expect(result[0].section).toBeUndefined();
    expect(result[1].section).toBe('Phase 1');
  });

  it('ignores non-task lines (paragraphs, blank lines, blockquotes, h1)', () => {
    const content = '# Title\n> A note\nSome paragraph.\n\n- [ ] Real task';
    const result = parseRoadmap(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real task');
  });

  it('groups tasks under the correct section when sections change', () => {
    const content = [
      '## Phase 1',
      '- [x] Task A',
      '- [ ] Task B',
      '## Phase 2',
      '- [ ] Task C',
    ].join('\n');
    const result = parseRoadmap(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: 'Task A', done: true, section: 'Phase 1' });
    expect(result[1]).toEqual({ text: 'Task B', done: false, section: 'Phase 1' });
    expect(result[2]).toEqual({ text: 'Task C', done: false, section: 'Phase 2' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/scanner/parsers/roadmap.test.ts
```
Expected: FAIL — `Cannot find module './roadmap.js'`

- [ ] **Step 3: Implement the parser**

Create `src/core/scanner/parsers/roadmap.ts`:

```ts
export interface RoadmapItem {
  text: string;
  done: boolean;
  section?: string;
}

export function parseRoadmap(content: string): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  let currentSection: string | undefined;

  for (const line of content.split('\n')) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    const taskMatch = line.match(/^-\s+\[( |x|X)\]\s+(.+)/);
    if (taskMatch) {
      items.push({
        text: taskMatch[2].trim(),
        done: taskMatch[1].toLowerCase() === 'x',
        section: currentSection,
      });
    }
  }

  return items;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/scanner/parsers/roadmap.test.ts
```
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/roadmap.ts src/core/scanner/parsers/roadmap.test.ts
git commit -m "feat: add parseRoadmap parser with RoadmapItem type"
```

---

## Task 2: Integrate roadmap into `ProjectSummary` and `summarizeProject`

**Files:**
- Modify: `src/core/scanner/summarizer.ts`
- Modify: `src/core/scanner/summarizer.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/core/scanner/summarizer.test.ts`:

At the top, add the roadmap mock (after the existing `vi.mock` calls):
```ts
vi.mock('./parsers/roadmap.js', () => ({
  parseRoadmap: vi.fn(),
}));
```

After the existing imports block, add:
```ts
import { parseRoadmap } from './parsers/roadmap.js';
const mockParseRoadmap = vi.mocked(parseRoadmap);
```

In `setupDefaultMocks()`, add:
```ts
mockParseRoadmap.mockReturnValue([]);
```

Then add a new describe block at the end of the file:
```ts
describe('roadmap integration', () => {
  it('populates summary.roadmap from roadmap.md when it exists', async () => {
    const items = [{ text: 'Setup', done: false, section: 'Phase 1' }];
    mockReadFile.mockResolvedValueOnce('# Roadmap\n- [ ] Setup');
    mockParseRoadmap.mockReturnValue(items);

    const result = await summarizeProject([], ROOT);

    expect(mockReadFile).toHaveBeenCalledWith(
      `${ROOT}/roadmap.md`,
      'utf8'
    );
    expect(result.roadmap).toEqual(items);
  });

  it('sets summary.roadmap to [] when roadmap.md does not exist', async () => {
    mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await summarizeProject([], ROOT);

    expect(result.roadmap).toEqual([]);
  });
});
```

Also fix the two existing tests that use `mockResolvedValueOnce` — they break because the roadmap read now consumes the first `Once` value. Find these two tests and prepend a roadmap mock to each:

**Test "collects todos from multiple files"** — change from:
```ts
mockReadFile
  .mockResolvedValueOnce('// TODO: first file\n')
  .mockResolvedValueOnce('// FIXME: second file\n');
```
To:
```ts
mockReadFile
  .mockResolvedValueOnce('') // roadmap.md
  .mockResolvedValueOnce('// TODO: first file\n')
  .mockResolvedValueOnce('// FIXME: second file\n');
```

**Test "skips files that fail to read and continues processing the rest"** — change from:
```ts
mockReadFile
  .mockRejectedValueOnce(new Error('ENOENT'))
  .mockResolvedValueOnce('// TODO: second file\n');
```
To:
```ts
mockReadFile
  .mockResolvedValueOnce('') // roadmap.md
  .mockRejectedValueOnce(new Error('ENOENT'))
  .mockResolvedValueOnce('// TODO: second file\n');
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/scanner/summarizer.test.ts
```
Expected: new roadmap tests FAIL — `summary.roadmap` is undefined

- [ ] **Step 3: Implement the changes in `summarizer.ts`**

At the top of `src/core/scanner/summarizer.ts`, add the import:
```ts
import { parseRoadmap, RoadmapItem } from './parsers/roadmap.js';
```

Add `roadmap` to the `ProjectSummary` interface (after `todos`):
```ts
  todos: TodoItem[];
  roadmap: RoadmapItem[];
```

Add `roadmap: []` to the initial `summary` object (after `todos: []`):
```ts
    todos: [],
    roadmap: [],
```

Add the roadmap read block immediately after the `summary` object initialisation and before the `for (const file of files)` loop:
```ts
  try {
    const roadmapContent = await fs.readFile(path.join(projectRoot, 'roadmap.md'), 'utf8');
    summary.roadmap = parseRoadmap(roadmapContent);
  } catch {
    summary.roadmap = [];
  }
```

Also re-export `RoadmapItem` so consumers can import it from `summarizer.js`:
```ts
export type { RoadmapItem } from './parsers/roadmap.js';
```
Add this line right after the existing `import` block, before the interface declarations.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/scanner/summarizer.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Fix TypeScript errors in test files caused by the new required field**

`generators.test.ts` and `selective-update.test.ts` both define a `baseSummary: ProjectSummary` that is now missing `roadmap`. Add `roadmap: []` to both:

In `src/core/generators/generators.test.ts`, find `baseSummary`:
```ts
const baseSummary: ProjectSummary = {
  // ... existing fields ...
  todos: [],
};
```
Change to:
```ts
const baseSummary: ProjectSummary = {
  // ... existing fields ...
  todos: [],
  roadmap: [],
};
```

Apply the same change to `src/core/updater/selective-update.test.ts`.

- [ ] **Step 6: Verify the full test suite passes**

```bash
npm run test
```
Expected: all existing tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/core/scanner/summarizer.ts src/core/scanner/summarizer.test.ts \
        src/core/generators/generators.test.ts \
        src/core/updater/selective-update.test.ts
git commit -m "feat: add roadmap field to ProjectSummary and parse roadmap.md in summarizeProject"
```

---

## Task 3: Render Roadmap section in `active-context.ts`

**Files:**
- Modify: `src/core/generators/active-context.ts`
- Modify: `src/core/generators/generators.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `src/core/generators/generators.test.ts` inside the existing `describe('generateActiveContext', ...)`:

```ts
describe('roadmap section', () => {
  it('renders roadmap section with progress line when tasks are present', () => {
    const result = generateActiveContext({
      ...baseSummary,
      roadmap: [
        { text: 'Setup project', done: true, section: 'Phase 1' },
        { text: 'Add auth', done: false, section: 'Phase 1' },
        { text: 'Build UI', done: false, section: 'Phase 2' },
      ],
    });
    expect(result).toContain('## Roadmap');
    expect(result).toContain('**Progress:** 1/3 tasks completed (33%)');
    expect(result).toContain('### Phase 1');
    expect(result).toContain('- [x] Setup project');
    expect(result).toContain('- [ ] Add auth');
    expect(result).toContain('### Phase 2');
    expect(result).toContain('- [ ] Build UI');
  });

  it('omits roadmap section when roadmap is empty', () => {
    const result = generateActiveContext({ ...baseSummary, roadmap: [] });
    expect(result).not.toContain('## Roadmap');
  });

  it('renders tasks with no section without emitting a heading for them', () => {
    const result = generateActiveContext({
      ...baseSummary,
      roadmap: [{ text: 'Unsectioned task', done: false, section: undefined }],
    });
    expect(result).toContain('- [ ] Unsectioned task');
    expect(result).not.toContain('### undefined');
  });

  it('shows 100% when all tasks are done', () => {
    const result = generateActiveContext({
      ...baseSummary,
      roadmap: [{ text: 'Done', done: true, section: 'Phase 1' }],
    });
    expect(result).toContain('1/1 tasks completed (100%)');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/generators/generators.test.ts
```
Expected: new roadmap tests FAIL — no Roadmap section in output

- [ ] **Step 3: Implement the Roadmap section in `active-context.ts`**

Add the `RoadmapItem` import at the top of `src/core/generators/active-context.ts`:
```ts
import type { RoadmapItem } from '../scanner/summarizer.js';
```

Append the following block at the end of `generateActiveContext`, before the `return` statement:

```ts
  if (summary.roadmap.length > 0) {
    const done = summary.roadmap.filter((item) => item.done).length;
    const total = summary.roadmap.length;
    const pct = Math.round((done / total) * 100);

    markdown += `\n## Roadmap\n\n`;
    markdown += `**Progress:** ${done}/${total} tasks completed (${pct}%)\n\n`;

    const sections = new Map<string | undefined, RoadmapItem[]>();
    for (const item of summary.roadmap) {
      if (!sections.has(item.section)) sections.set(item.section, []);
      sections.get(item.section)!.push(item);
    }

    for (const [section, items] of sections) {
      if (section) {
        markdown += `### ${section}\n`;
      }
      for (const item of items) {
        markdown += `- [${item.done ? 'x' : ' '}] ${item.text}\n`;
      }
      markdown += '\n';
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/generators/generators.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/generators/active-context.ts src/core/generators/generators.test.ts
git commit -m "feat: render Roadmap section in active-context.md generator"
```

---

## Task 4: Render Open Tasks section in `ai-brief.ts`

**Files:**
- Modify: `src/core/generators/ai-brief.ts`
- Modify: `src/core/generators/generators.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block inside `describe('generateAIBrief', ...)` in `generators.test.ts`:

```ts
describe('open tasks section', () => {
  it('renders only open tasks with section note', () => {
    const result = generateAIBrief({
      ...baseSummary,
      roadmap: [
        { text: 'Done task', done: true, section: 'Phase 1' },
        { text: 'Open task', done: false, section: 'Phase 1' },
      ],
    });
    expect(result).toContain('### Open Tasks');
    expect(result).toContain('- [ ] Open task *(Phase 1)*');
    expect(result).not.toContain('Done task');
  });

  it('omits open tasks section when roadmap is empty', () => {
    const result = generateAIBrief({ ...baseSummary, roadmap: [] });
    expect(result).not.toContain('Open Tasks');
  });

  it('omits open tasks section when all tasks are done', () => {
    const result = generateAIBrief({
      ...baseSummary,
      roadmap: [{ text: 'Done', done: true, section: 'Phase 1' }],
    });
    expect(result).not.toContain('Open Tasks');
  });

  it('renders task without section note when section is undefined', () => {
    const result = generateAIBrief({
      ...baseSummary,
      roadmap: [{ text: 'Unsectioned task', done: false, section: undefined }],
    });
    expect(result).toContain('- [ ] Unsectioned task\n');
    expect(result).not.toContain('*(undefined)*');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/core/generators/generators.test.ts
```
Expected: new open-tasks tests FAIL — no Open Tasks section in output

- [ ] **Step 3: Implement the Open Tasks section in `ai-brief.ts`**

Append the following block at the end of `generateAIBrief`, before the `return` statement:

```ts
  const openTasks = summary.roadmap.filter((item) => !item.done);
  if (openTasks.length > 0) {
    markdown += `### Open Tasks\n`;
    for (const item of openTasks) {
      const sectionNote = item.section ? ` *(${item.section})*` : '';
      markdown += `- [ ] ${item.text}${sectionNote}\n`;
    }
    markdown += '\n';
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/core/generators/generators.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/generators/ai-brief.ts src/core/generators/generators.test.ts
git commit -m "feat: render Open Tasks section in ai-brief.md generator"
```

---

## Task 5: Scaffold `roadmap.md` in `init` and update agent rules

**Files:**
- Modify: `src/cli/commands/init.ts`
- Modify: `.agent/rules/scelta_modello.md`

- [ ] **Step 1: Add `roadmap.md` template creation to `init.ts`**

In `src/cli/commands/init.ts`, after the block that creates `.agent/rules/scelta_modello.md` (around line 288) and before `console.log('\nInitialization complete! ...')`, add:

```ts
        const roadmapPath = path.join(cwd, 'roadmap.md');
        if (!fs.existsSync(roadmapPath)) {
          const roadmapTemplate = [
            '# Roadmap',
            '',
            '> Fill in your planned tasks below using `- [ ] task` for open and `- [x] task` for completed.',
            '> Group tasks under `##` phase headings. ContextForge tracks progress automatically in active-context.md.',
            '',
            '## Phase 1 — Setup',
            '- [ ] ',
            '',
            '## Phase 2 — Core Features',
            '- [ ] ',
            '',
            '## Phase 3 — Polish',
            '- [ ] ',
            '',
          ].join('\n');
          fs.writeFileSync(roadmapPath, roadmapTemplate, 'utf8');
          console.log('Created roadmap.md template in project root.');
        }
```

- [ ] **Step 2: Update `DEFAULT_SCELTA_MODELLO_TEMPLATE` in `init.ts`**

Inside the `DEFAULT_SCELTA_MODELLO_TEMPLATE` string, find Section 7 and locate the line:

```
1. **Auto-Update Context**: Before formulating a plan...
```

Add the following line immediately before it (after the `When working on a project...` intro line):

```
> After \`contextforge init\`, populate \`roadmap.md\` in the project root with the approved plan tasks before running \`contextforge scan\`. ContextForge will track progress automatically in \`active-context.md\` and \`ai-brief.md\`.
\n
```

So the Section 7 block becomes:
```
## 7. Context-Aware Agent Workflow (ContextForge Integration)

When working on a project that has a \`.contextforge/\` directory initialized:

> After \`contextforge init\`, populate \`roadmap.md\` in the project root with the approved plan tasks before running \`contextforge scan\`. ContextForge will track progress automatically in \`active-context.md\` and \`ai-brief.md\`.

1. **Auto-Update Context**: ...
```

- [ ] **Step 3: Update the live `.agent/rules/scelta_modello.md` file**

The `init.ts` template only affects new projects. Update the existing file directly. In `.agent/rules/scelta_modello.md`, find Section 7 and add the same line before step 1:

```markdown
> After `contextforge init`, populate `roadmap.md` in the project root with the approved plan tasks before running `contextforge scan`. ContextForge will track progress automatically in `active-context.md` and `ai-brief.md`.
```

- [ ] **Step 4: Run the full test suite**

```bash
npm run test
```
Expected: all tests PASS

- [ ] **Step 5: Build and smoke test**

```bash
npm run build
```
Expected: build succeeds with no TypeScript errors.

Then initialise ContextForge in a temp directory to verify the template is created:
```bash
mkdir /tmp/test-roadmap-init && cd /tmp/test-roadmap-init
node /home/simone/Documenti/start2impact/Progetti\ personali/ContextForge/dist/index.js init
```
Select option 3 (Offline). Expected output includes:
```
Created roadmap.md template in project root.
```
Verify the file exists: `cat /tmp/test-roadmap-init/roadmap.md`

- [ ] **Step 6: Commit**

```bash
cd "/home/simone/Documenti/start2impact/Progetti personali/ContextForge"
git add src/cli/commands/init.ts .agent/rules/scelta_modello.md
git commit -m "feat: scaffold roadmap.md template in contextforge init and update agent rules"
```
