import { parseTypeScript } from './typescript.js';

export async function parseSvelte(filePath: string, content: string) {
  const empty = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return empty;
    return parseTypeScript(filePath, match[1]);
  } catch {
    return empty;
  }
}
