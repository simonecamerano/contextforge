export interface PHPResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parsePHP(_filePath: string, content: string): Promise<PHPResult> {
  const empty: PHPResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: PHPResult['imports'] = [];
    const exports: string[] = [];
    const classes: PHPResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const useMatch = trimmed.match(/^use\s+([\w\\]+)(?:\s+as\s+\w+)?;/);
      if (useMatch) {
        const parts = useMatch[1].split('\\');
        imports.push({ from: useMatch[1], names: [parts[parts.length - 1]] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:(?:abstract|final)\s+)*class\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const funcMatch = trimmed.match(/^(?:public\s+)?(?:static\s+)?function\s+(\w+)/);
      if (funcMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(funcMatch[1]);
        } else if (!isIndented) {
          functions.push(funcMatch[1]);
          exports.push(funcMatch[1]);
          currentClass = null;
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
