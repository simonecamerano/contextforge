export interface GoResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseGo(_filePath: string, content: string): Promise<GoResult> {
  const empty: GoResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: GoResult['imports'] = [];
    const exports: string[] = [];
    const classes: GoResult['classes'] = [];
    const functions: string[] = [];

    const lines = content.split('\n');

    // Pass 1: collect all struct declarations so method receivers can be matched
    // regardless of declaration order within the file.
    for (const line of lines) {
      const structMatch = line.trim().match(/^type\s+(\w+)\s+struct/);
      if (structMatch) {
        const name = structMatch[1];
        classes.push({ name, methods: [] });
        if (/^[A-Z]/.test(name)) exports.push(name);
      }
    }

    // Pass 2: collect imports, methods, and exported functions.
    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();

      const singleImport = trimmed.match(/^import\s+"([^"]+)"/);
      if (singleImport) {
        imports.push({ from: singleImport[1], names: [] });
        i++;
        continue;
      }

      if (trimmed.startsWith('import (')) {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(')')) {
          const pkgMatch = lines[i].trim().match(/(?:\w+\s+)?"([^"]+)"/);
          if (pkgMatch) imports.push({ from: pkgMatch[1], names: [] });
          i++;
        }
        i++;
        continue;
      }

      // Skip struct declarations — already collected in pass 1.
      if (trimmed.match(/^type\s+\w+\s+struct/)) {
        i++;
        continue;
      }

      const methodMatch = trimmed.match(/^func\s+\(\w+\s+\*?(\w+)\)\s+(\w+)/);
      if (methodMatch) {
        const cls = classes.find((c) => c.name === methodMatch[1]);
        if (cls && /^[A-Z]/.test(methodMatch[2])) cls.methods.push(methodMatch[2]);
        i++;
        continue;
      }

      const funcMatch = trimmed.match(/^func\s+(\w+)/);
      if (funcMatch && /^[A-Z]/.test(funcMatch[1])) {
        functions.push(funcMatch[1]);
        exports.push(funcMatch[1]);
      }

      i++;
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
