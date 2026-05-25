/**
 * Structural metadata extracted from a Python source file by the
 * line-oriented parser.
 */
export interface PythonResult {
  /**
   * Every import statement encountered in the file.
   *
   * - `from X import Y, Z` → `{ module: "X", names: ["Y", "Z"] }`
   * - `import X`           → `{ module: "X", names: [] }`
   * - `import X as Y`      → `{ module: "X", names: [] }` (alias dropped)
   */
  imports: Array<{ module: string; names: string[] }>;
  /** Names of all class definitions (`class Foo`). */
  classes: string[];
  /** Names of all function/method definitions (`def foo`). */
  functions: string[];
}

/**
 * Extracts structural metadata from Python source code using lightweight
 * line-by-line regex matching.
 *
 * ## Approach
 * Rather than building a full AST, the parser processes lines sequentially
 * with targeted regular expressions. This is intentionally simple and fast:
 * Python syntax is regular enough at the top-level that regex matching is
 * sufficient for the metadata ContextForge needs (imports, class names,
 * function names).
 *
 * ## Limitations
 * - Multi-line import parentheses (`from X import (\n  A,\n  B\n)`) are
 *   partially supported: the opening line is matched but continuation lines
 *   on subsequent source rows are **not** merged — only what appears on the
 *   `from … import (…)` line itself is captured.
 * - Nested class/function definitions are collected alongside top-level ones
 *   because indentation is not tracked.
 * - Type-annotated assignments (`x: int = 1`) are not extracted.
 *
 * @param _filePath - Unused; accepted for interface consistency with other
 *   parsers that need the path to determine file type.
 * @param content   - Full source text of the Python file.
 * @returns Resolved `PythonResult` with extracted metadata, or an all-empty
 *   object if an unexpected error occurs.
 */
export async function parsePython(_filePath: string, content: string): Promise<PythonResult> {
  const empty: PythonResult = { imports: [], classes: [], functions: [] };

  try {
    const imports: PythonResult['imports'] = [];
    const classes: string[] = [];
    const functions: string[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // ── `from X import Y, Z` ─────────────────────────────────────────────
      // Strip optional surrounding parentheses and backslash continuations,
      // split on commas, and discard wildcard `*` imports and inline comments.
      const fromImportMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
      if (fromImportMatch) {
        const module = fromImportMatch[1];
        const names = fromImportMatch[2]
          .replace(/[()\\]/g, '')        // remove parens / backslash continuation
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n && n !== '*' && !n.startsWith('#'));
        imports.push({ module, names });
        continue;
      }

      // ── `import X` / `import X as Y` / `import X, Y` ────────────────────
      // Multiple modules on one line are split on commas.  `as` aliases are
      // stripped so only the original module name is recorded.
      const importMatch = trimmed.match(/^import\s+(.+)/);
      if (importMatch) {
        const modules = importMatch[1]
          .split(',')
          .map((m) => m.trim().split(/\s+as\s+/)[0].trim())  // drop alias
          .filter(Boolean);
        for (const module of modules) {
          imports.push({ module, names: [] });
        }
        continue;
      }

      // ── Class definitions ─────────────────────────────────────────────────
      // Matches `class Foo`, `class Foo(Base)`, `class Foo(Base1, Base2)`, etc.
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        classes.push(classMatch[1]);
        continue;
      }

      // ── Function / method definitions ────────────────────────────────────
      // Matches `def foo(…):` regardless of indentation level.  This means
      // both top-level functions and class methods are recorded together.
      const funcMatch = trimmed.match(/^def\s+(\w+)/);
      if (funcMatch) {
        functions.push(funcMatch[1]);
      }
    }

    return { imports, classes, functions };
  } catch {
    return empty;
  }
}
