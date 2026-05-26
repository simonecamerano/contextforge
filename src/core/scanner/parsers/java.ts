export interface JavaResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseJava(_filePath: string, content: string): Promise<JavaResult> {
  const empty: JavaResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: JavaResult['imports'] = [];
    const exports: string[] = [];
    const classes: JavaResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const importMatch = trimmed.match(/^import\s+([\w.*]+);/);
      if (importMatch) {
        const parts = importMatch[1].split('.');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('.');
        imports.push({ from, names: [name] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:public\s+)?(?:(?:abstract|final)\s+)*(?:class|interface|enum)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const methodMatch = trimmed.match(/^public\s+(?:static\s+)?(?:(?:[\w<>\[\]]+)\s+)+(\w+)\s*\(/);
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
