import ts from 'typescript';

/**
 * Structured representation of a TypeScript/JavaScript file's public API
 * and dependency surface, as extracted by the static AST parser.
 */
export interface TypeScriptResult {
  /** Every `import` statement found in the file. */
  imports: Array<{ from: string; names: string[] }>;
  /** Names of all top-level symbols that are explicitly exported. */
  exports: string[];
  /** Every class declaration together with its method names. */
  classes: Array<{ name: string; methods: string[] }>;
  /** Names of all top-level function declarations. */
  functions: string[];
}

/**
 * Parses a TypeScript or JavaScript source file and extracts its structural
 * metadata without executing or type-checking it.
 *
 * The parser walks the AST produced by the TypeScript compiler API and
 * collects:
 * - **imports** – both default imports and named/namespace bindings.
 * - **exports** – symbols exported via `export function`, `export class`,
 *   `export const/let/var`, and `export { … }` re-export statements.
 * - **classes** – declaration names and the names of their methods.
 * - **functions** – top-level `function` declarations.
 *
 * Only _top-level_ nodes are targeted; nested declarations (e.g. a class
 * declared inside a function body) are traversed by `ts.forEachChild` but
 * are not explicitly collected.
 *
 * On any parse or traversal error an empty result is returned so that callers
 * can continue scanning other files without interruption.
 *
 * @param filePath - Path to the file, used only to hint the TypeScript parser
 *   about the file extension (`.ts` vs `.tsx` vs `.js` etc.).
 * @param content  - Full source text of the file.
 * @returns Resolved `TypeScriptResult` with the extracted metadata, or an
 *   all-empty object on failure.
 */
export async function parseTypeScript(filePath: string, content: string): Promise<TypeScriptResult> {
  const empty: TypeScriptResult = { imports: [], exports: [], classes: [], functions: [] };

  try {
    // `setParentNodes: true` is required so that parent-node traversal works
    // correctly when walking the AST with `ts.forEachChild`.
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const imports: TypeScriptResult['imports'] = [];
    const exports: string[] = [];
    const classes: TypeScriptResult['classes'] = [];
    const functions: string[] = [];

    /**
     * Recursive AST visitor. Inspects each node for the constructs we care
     * about, then delegates to `ts.forEachChild` to continue the walk.
     *
     * Using a local recursive function (rather than a class-based visitor)
     * keeps the collected arrays in its closure scope, avoiding the need to
     * pass accumulator objects through every call.
     */
    function visit(node: ts.Node): void {
      // ── Import declarations ──────────────────────────────────────────────
      // Handles all three import shapes:
      //   import Foo from '…'        → default import, pushed as name
      //   import * as Foo from '…'   → namespace import, pushed as "* as Foo"
      //   import { A, B } from '…'   → named imports, each pushed by name
      if (ts.isImportDeclaration(node)) {
        const from = (node.moduleSpecifier as ts.StringLiteral).text;
        const names: string[] = [];
        if (node.importClause) {
          if (node.importClause.name) {
            names.push(node.importClause.name.text);
          }
          const bindings = node.importClause.namedBindings;
          if (bindings) {
            if (ts.isNamespaceImport(bindings)) {
              names.push(`* as ${bindings.name.text}`);
            } else if (ts.isNamedImports(bindings)) {
              for (const el of bindings.elements) {
                names.push(el.name.text);
              }
            }
          }
        }
        imports.push({ from, names });
      }

      // ── Function declarations ────────────────────────────────────────────
      // Captures `function foo(…) { … }` at any nesting level and also
      // records it as an export if the `export` modifier is present.
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name?.text;
        if (name) {
          functions.push(name);
          if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            exports.push(name);
          }
        }
      }

      // ── Class declarations ───────────────────────────────────────────────
      // Collects the class name, all of its method names, and records the
      // class as an export if the `export` modifier is present.
      if (ts.isClassDeclaration(node)) {
        const name = node.name?.text;
        if (name) {
          const methods: string[] = [];
          for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.name) {
              const methodName = (member.name as ts.Identifier).text;
              if (methodName) methods.push(methodName);
            }
          }
          classes.push({ name, methods });
          if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            exports.push(name);
          }
        }
      }

      // ── Exported variable statements ─────────────────────────────────────
      // Handles `export const foo = …`, `export let bar = …`, etc.
      // Destructuring patterns (e.g. `export const { a, b } = …`) are not
      // collected because they are uncommon in public APIs and add complexity.
      if (ts.isVariableStatement(node)) {
        if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              exports.push(decl.name.text);
            }
          }
        }
      }

      // ── Re-export declarations ───────────────────────────────────────────
      // Captures `export { A, B }` and `export { A as B }` forms.
      // `export * from '…'` is intentionally ignored because it does not
      // enumerate individual symbol names.
      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        for (const el of node.exportClause.elements) {
          exports.push(el.name.text);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
