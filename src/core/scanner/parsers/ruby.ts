export interface RubyResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseRuby(_filePath: string, content: string): Promise<RubyResult> {
  const empty: RubyResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: RubyResult['imports'] = [];
    const exports: string[] = [];
    const classes: RubyResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const requireMatch = trimmed.match(/^require(?:_relative)?\s+['"]([^'"]+)['"]/);
      if (requireMatch) {
        imports.push({ from: requireMatch[1], names: [] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:class|module)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const defMatch = trimmed.match(/^def\s+(?:self\.)?(\w+)/);
      if (defMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(defMatch[1]);
        } else if (!isIndented) {
          functions.push(defMatch[1]);
        }
      }

      if (trimmed === 'end' && !isIndented) {
        currentClass = null;
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
