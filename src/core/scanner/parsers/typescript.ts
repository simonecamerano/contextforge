import ts from 'typescript';

export interface TypeScriptResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseTypeScript(filePath: string, content: string): Promise<TypeScriptResult> {
  const empty: TypeScriptResult = { imports: [], exports: [], classes: [], functions: [] };

  try {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const imports: TypeScriptResult['imports'] = [];
    const exports: string[] = [];
    const classes: TypeScriptResult['classes'] = [];
    const functions: string[] = [];

    function visit(node: ts.Node): void {
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

      if (ts.isFunctionDeclaration(node)) {
        const name = node.name?.text;
        if (name) {
          functions.push(name);
          if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            exports.push(name);
          }
        }
      }

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

      if (ts.isVariableStatement(node)) {
        if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              exports.push(decl.name.text);
            }
          }
        }
      }

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
