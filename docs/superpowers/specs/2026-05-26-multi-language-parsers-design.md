# Multi-Language Parser Support Design

**Date:** 2026-05-26
**Status:** Approved

---

## Goal

Extend ContextForge's scanner to support structural parsing for 9 additional languages (Vue, Svelte, PHP, Ruby, Go, Java, Kotlin, C#, Rust) and language detection (without structural parsing) for 6 more file types (SCSS/CSS/Less, HTML, Shell, YAML, Dockerfile), plus a generic fallback that preserves TODO/FIXME scanning for any unknown extension.

---

## 1. Architecture

Replace the current if-else dispatch in `summarizeProject()` with a **parser registry map** (`PARSER_REGISTRY`). This makes adding future languages a single one-liner and eliminates branching logic.

```ts
type ParserFn = (file: string, content: string) => Promise<Omit<SummarizedModule, 'path'>>;

const PARSER_REGISTRY: Record<string, ParserFn> = {
  '.ts': parseTypeScript, '.tsx': parseTypeScript,
  '.js': parseTypeScript, '.jsx': parseTypeScript,
  '.py': parsePython,
  '.vue': parseVue, '.svelte': parseSvelte,
  '.php': parsePHP, '.rb': parseRuby,
  '.go': parseGo, '.java': parseJava,
  '.kt': parseKotlin, '.cs': parseCSharp, '.rs': parseRust,
};
```

Dispatch logic becomes:

```ts
const parser = PARSER_REGISTRY[ext];
if (parser) {
  const parsed = await parser(file, content);
  summary.tsModules.push({ path: file, ...parsed });
}
// No parser found → TODO scanning already done above, structural parsing skipped
```

The `SummarizedModule` interface remains **unchanged** — all new parsers map their language concepts into the existing fields (`imports`, `exports`, `classes`, `functions`).

---

## 2. File Structure

### New files to create

```
src/core/scanner/parsers/
  vue.ts          + vue.test.ts
  svelte.ts       + svelte.test.ts
  php.ts          + php.test.ts
  ruby.ts         + ruby.test.ts
  go.ts           + go.test.ts
  java.ts         + java.test.ts
  kotlin.ts       + kotlin.test.ts
  csharp.ts       + csharp.test.ts
  rust.ts         + rust.test.ts
```

### Files to modify

- `src/core/scanner/summarizer.ts` — add registry, update `extMap`, replace dispatch
- `src/core/scanner/summarizer.test.ts` — add integration tests for registry and new extension detection

### Existing files (unchanged)

- `src/core/scanner/parsers/typescript.ts`
- `src/core/scanner/parsers/python.ts`
- `src/core/scanner/parsers/manifest.ts`
- `src/core/scanner/parsers/roadmap.ts`

---

## 3. Parser Extraction Mapping

Each parser returns `Omit<SummarizedModule, 'path'>` with these fields populated:

| Language | `imports` | `exports` | `classes` | `functions` |
|---|---|---|---|---|
| **Vue** | from `<script>` block via `parseTypeScript()` | idem | idem | idem |
| **Svelte** | from `<script>` block via `parseTypeScript()` | idem | idem | idem |
| **PHP** | `use Foo\Bar` → `{ names: ['Bar'], from: 'Foo\\Bar' }` | public class/function names | classes + public method names | top-level function names |
| **Ruby** | `require`/`require_relative` → `{ names: [], module: 'path' }` | module/class names | classes + public method names | top-level `def` names |
| **Go** | import block → `{ names: [], from: 'pkg/path' }` | capitalized function/type names | struct names + method names | exported `func` names |
| **Java** | `import a.b.C` → `{ names: ['C'], from: 'a.b' }` | public class/interface names | classes + public method names | public static method names |
| **Kotlin** | `import a.b.C` → `{ names: ['C'], from: 'a.b' }` | public/top-level declaration names | class names + method names | top-level function names |
| **C#** | `using A.B` → `{ names: [], from: 'A.B' }` | public class/interface names | classes + public method names | public static method names |
| **Rust** | `use a::b::C` → `{ names: ['C'], from: 'a::b' }` | `pub fn`/`pub struct` names | struct names + impl method names | `pub fn` function names |

Implementation approach: **regex-based line-by-line parsing** (~80–120 lines per parser), same technique as the existing `python.ts` parser. No AST dependency.

### Vue / Svelte special case

Both SFC formats embed JS/TS inside a `<script>` block. The parser:
1. Extracts the block with a simple regex: `/<script[^>]*>([\s\S]*?)<\/script>/i`
2. Passes the extracted content to the existing `parseTypeScript()` function
3. Returns the result unchanged

This reuses proven parsing logic and handles `<script lang="ts">` automatically.

---

## 4. Language Detection and Fallback

### `extMap` additions (language detection only — no structural parsing)

```ts
'.vue': 'Vue',
'.svelte': 'Svelte',
'.php': 'PHP',
'.rb': 'Ruby',
'.go': 'Go',
'.java': 'Java',
'.kt': 'Kotlin',
'.cs': 'C#',
'.rs': 'Rust',
'.scss': 'SCSS',
'.css': 'CSS',
'.less': 'Less',
'.html': 'HTML',
'.sh': 'Shell',
'.bash': 'Shell',
'.yml': 'YAML',
'.yaml': 'YAML',
```

### Dockerfile detection

Dockerfile has no extension. Detect with:

```ts
if (path.basename(file) === 'Dockerfile') {
  if (!summary.languages.includes('Dockerfile')) summary.languages.push('Dockerfile');
}
```

This runs before the `extMap` lookup in the file loop.

### Generic fallback behavior

When a file has no parser in `PARSER_REGISTRY`:
- Language detection via `extMap` still runs (language added to `summary.languages`)
- TODO/FIXME scanning still runs (all files are scanned)
- Structural parsing is **silently skipped** (no error, no empty entry pushed)

This ensures `summary.todos` captures TODOs from shell scripts, YAML, HTML, etc., even without structural parsing.

---

## 5. Testing Strategy

### Per-parser tests (4–5 tests each, pattern mirrors `python.test.ts`)

1. **Happy path** — well-formed source → correct imports, exports, classes, functions extracted
2. **Empty file** — all fields return empty arrays, no error thrown
3. **Comments ignored** — commented-out declarations not included in results
4. **Nested/complex case** — multiple classes/functions in one file
5. **Vue/Svelte only: `<script lang="ts">`** — lang attribute handled correctly

### `summarizer.ts` integration tests (additions to existing suite)

- New extensions are detected in `summary.languages` (e.g., `.go`, `.scss`, `.yml`)
- Dockerfile is detected when `path.basename(file) === 'Dockerfile'`
- New parsers are called and results pushed to `summary.tsModules`
- Files with unknown extensions still get TODO scanning (fallback behavior)
- Registry dispatch: mock individual parsers to verify correct parser called per extension

### Test tooling

Same as existing: **Vitest** + `vi.mock()` + `vi.mocked()`. Parser tests are pure unit tests with no file I/O. Summarizer tests mock `fs.readFile` and individual parser modules.

---

## 6. Non-Goals

- No AST-level parsing (regex is sufficient for the metadata ContextForge needs)
- No support for binary files, images, fonts, or compiled artifacts
- No modification to `SummarizedModule` interface or the context generator output format
- No language-server integration
- No incremental/cached parsing (out of scope for this feature)
