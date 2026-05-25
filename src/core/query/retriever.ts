import fs from 'node:fs';
import path from 'node:path';

export interface RetrievedChunk {
  file: string;
  section: string;
  content: string;
  score: number;
}

export async function retrieveContext(
  query: string,
  contextForgeDir: string
): Promise<RetrievedChunk[]> {
  const entries = fs.readdirSync(contextForgeDir, { withFileTypes: true });
  const mdFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md') && e.name !== 'ai-brief.md')
    .map(e => e.name);

  const chunks: Omit<RetrievedChunk, 'score'>[] = [];

  for (const fileName of mdFiles) {
    const filePath = path.join(contextForgeDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');

    let currentSection = fileName.replace(/\.md$/, '');
    let currentLines: string[] = [];

    for (const line of lines) {
      if (/^#{2,3}\s/.test(line)) {
        if (currentLines.join('').trim()) {
          chunks.push({ file: fileName, section: currentSection, content: currentLines.join('\n').trim() });
        }
        currentSection = line.replace(/^#{2,3}\s+/, '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.join('').trim()) {
      chunks.push({ file: fileName, section: currentSection, content: currentLines.join('\n').trim() });
    }
  }

  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

  const scored: RetrievedChunk[] = chunks.map(chunk => {
    const haystack = `${chunk.section} ${chunk.content}`.toLowerCase();
    const hits = queryTerms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
    const score = queryTerms.length > 0 ? hits / queryTerms.length : 0;
    return { ...chunk, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
