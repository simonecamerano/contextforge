export interface CSharpResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseCSharp(_filePath: string, content: string): Promise<CSharpResult> {
  const empty: CSharpResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: CSharpResult['imports'] = [];
    const exports: string[] = [];
    const classes: CSharpResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      // `using var x = ...` is a variable declaration, not a namespace import
      const usingMatch = !isIndented && !trimmed.includes('=') && trimmed.match(/^using\s+([\w.]+);/);
      if (usingMatch) {
        imports.push({ from: usingMatch[1], names: [] });
        continue;
      }

      const classMatch = trimmed.match(/^(public\s+)?(?:(?:static|abstract|sealed|partial)\s+)*(?:class|interface|record|struct)\s+(\w+)/);
      if (classMatch && !isIndented) {
        const name = classMatch[2];
        currentClass = { name, methods: [] };
        classes.push(currentClass);
        if (classMatch[1]) exports.push(name);
        continue;
      }

      const methodMatch = trimmed.match(/^public\s+(?:static\s+)?(?:async\s+)?(?:[\w<>\[\]?]+\s+)+(\w+)\s*[(<]/);
      if (methodMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(methodMatch[1]);
        } else if (!isIndented) {
          functions.push(methodMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
