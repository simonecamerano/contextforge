export interface KotlinResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseKotlin(_filePath: string, content: string): Promise<KotlinResult> {
  const empty: KotlinResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: KotlinResult['imports'] = [];
    const exports: string[] = [];
    const classes: KotlinResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const importMatch = trimmed.match(/^import\s+([\w.]+)/);
      if (importMatch) {
        const parts = importMatch[1].split('.');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('.');
        imports.push({ from, names: [name] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:(?:data|sealed|open|abstract|inner)\s+)*(?:class|object|interface)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const funMatch = trimmed.match(/^(?:override\s+)?(?:(?:private|internal|protected)\s+)?fun\s+(\w+)/);
      if (funMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(funMatch[1]);
        } else if (!isIndented) {
          functions.push(funMatch[1]);
          exports.push(funMatch[1]);
          currentClass = null;
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
