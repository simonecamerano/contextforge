export interface RustResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseRust(_filePath: string, content: string): Promise<RustResult> {
  const empty: RustResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    if (!content) return empty;

    const imports: RustResult['imports'] = [];
    const exports: string[] = [];
    const classes: RustResult['classes'] = [];
    const functions: string[] = [];

    let currentImpl: string | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      // Grouped use: `use a::b::{X, Y};`
      const useGrouped = trimmed.match(/^use\s+([\w:]+)::\{([^}]+)\};/);
      if (useGrouped) {
        const names = useGrouped[2].split(',').map((n) => n.trim()).filter(Boolean);
        imports.push({ from: useGrouped[1], names });
        continue;
      }

      // Single use: `use a::b::C;`
      const useSingle = trimmed.match(/^use\s+([\w:]+);/);
      if (useSingle) {
        const parts = useSingle[1].split('::');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('::');
        imports.push({ from: from || useSingle[1], names: [name] });
        continue;
      }

      // pub struct / pub enum (with optional `pub`)
      const structMatch = trimmed.match(/^(pub\s+)?(?:struct|enum)\s+(\w+)/);
      if (structMatch && !isIndented) {
        const name = structMatch[2];
        classes.push({ name, methods: [] });
        if (structMatch[1]) exports.push(name);
        continue;
      }

      // impl block: `impl Server { ... }` or `impl<T> Server { ... }`
      const implMatch = trimmed.match(/^impl(?:<[^>]*>)?\s+(\w+)/);
      if (implMatch && !isIndented) {
        currentImpl = implMatch[1];
        continue;
      }

      // pub fn (or private fn — only pub goes to exports/functions)
      const fnMatch = trimmed.match(/^(pub\s+)?(?:async\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        const isPub = !!fnMatch[1];
        const name = fnMatch[2];
        if (isIndented && currentImpl) {
          const cls = classes.find((c) => c.name === currentImpl);
          if (cls && isPub) cls.methods.push(name);
        } else if (!isIndented && isPub) {
          functions.push(name);
          exports.push(name);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
