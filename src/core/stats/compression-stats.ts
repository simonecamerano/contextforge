import fs from 'node:fs';
import path from 'node:path';

export interface CompressionStats {
  rawChars: number;
  forgedChars: number;
  compressionRatio: number;
}

export function computeCompressionStats(files: string[], contextForgeDir: string): CompressionStats {
  const cwd = path.dirname(contextForgeDir);

  let rawChars = 0;
  for (const file of files) {
    const absolutePath = path.join(cwd, file);
    if (fs.existsSync(absolutePath)) {
      const stat = fs.statSync(absolutePath);
      if (stat.isFile()) {
        rawChars += stat.size;
      }
    }
  }

  let forgedChars = 0;
  if (fs.existsSync(contextForgeDir)) {
    for (const entry of fs.readdirSync(contextForgeDir)) {
      if (entry === 'local') continue;
      const entryPath = path.join(contextForgeDir, entry);
      const stat = fs.statSync(entryPath);
      if (stat.isFile() && entry.endsWith('.md')) {
        forgedChars += stat.size;
      }
    }
  }

  const compressionRatio = rawChars === 0 ? 0 : Math.round((1 - forgedChars / rawChars) * 100);

  return { rawChars, forgedChars, compressionRatio };
}
