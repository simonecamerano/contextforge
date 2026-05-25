export interface PythonResult {
  imports: Array<{ module: string; names: string[] }>;
  classes: string[];
  functions: string[];
}

export async function parsePython(_filePath: string, content: string): Promise<PythonResult> {
  const empty: PythonResult = { imports: [], classes: [], functions: [] };

  try {
    const imports: PythonResult['imports'] = [];
    const classes: string[] = [];
    const functions: string[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      const fromImportMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
      if (fromImportMatch) {
        const module = fromImportMatch[1];
        const names = fromImportMatch[2]
          .replace(/[()\\]/g, '')
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n && n !== '*' && !n.startsWith('#'));
        imports.push({ module, names });
        continue;
      }

      const importMatch = trimmed.match(/^import\s+(.+)/);
      if (importMatch) {
        const modules = importMatch[1]
          .split(',')
          .map((m) => m.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        for (const module of modules) {
          imports.push({ module, names: [] });
        }
        continue;
      }

      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        classes.push(classMatch[1]);
        continue;
      }

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
