import fs from 'node:fs';
import path from 'node:path';

/**
 * A single scored excerpt from a context document.
 */
export interface RetrievedChunk {
  /** Basename of the source `.md` file (e.g. `"architecture.md"`). */
  file: string;
  /**
   * Title of the section this chunk belongs to.  Derived from the nearest
   * `##` or `###` heading above the chunk, or the file's basename (without
   * extension) for content that precedes the first heading.
   */
  section: string;
  /** Trimmed text content of the section. */
  content: string;
  /**
   * Relevance score in the range `[0, 1]`.  Computed as the fraction of
   * non-trivial query terms that appear in the concatenation of `section`
   * and `content`.  A score of `1` means every query term was found; `0`
   * means none were found.
   */
  score: number;
}

/**
 * Retrieves the most relevant sections from the ContextForge context documents
 * for a given natural-language query.
 *
 * ## Algorithm
 *
 * 1. **Discovery** – all `.md` files in `contextForgeDir` except `ai-brief.md`
 *    are read.  `ai-brief.md` is excluded because it is a summary of the other
 *    documents and would dilute results with duplicate content.
 *
 * 2. **Chunking** – each file is split into sections at `##` and `###`
 *    headings.  Content before the first heading is kept as a chunk attributed
 *    to the file's base name (without extension).
 *
 * 3. **Scoring** – the query is tokenised into terms longer than two characters
 *    (short words like "a", "is", "of" are discarded as stop-words).  Each
 *    chunk receives a score equal to `(matched terms) / (total query terms)`,
 *    i.e. the fraction of the query covered.  The score is `0` when the query
 *    has no eligible terms.
 *
 * 4. **Ranking** – chunks are sorted by descending score and the top 5 are
 *    returned so the caller receives a focused, token-efficient context window.
 *
 * @param query           - Natural-language question or keyword string.
 * @param contextForgeDir - Absolute path to the `.contextforge/` directory.
 * @returns Up to 5 {@link RetrievedChunk} objects ordered by relevance.
 */
export async function retrieveContext(
  query: string,
  contextForgeDir: string
): Promise<RetrievedChunk[]> {
  const entries = fs.readdirSync(contextForgeDir, { withFileTypes: true });
  // Exclude ai-brief.md: it summarises the other files and including it would
  // surface the same information twice, wasting the caller's context budget.
  const mdFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.md') && e.name !== 'ai-brief.md')
    .map(e => e.name);

  const chunks: Omit<RetrievedChunk, 'score'>[] = [];

  for (const fileName of mdFiles) {
    const filePath = path.join(contextForgeDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');

    // Seed with the file's base name so content before the first heading is
    // attributed to a meaningful section label rather than an empty string.
    let currentSection = fileName.replace(/\.md$/, '');
    let currentLines: string[] = [];

    for (const line of lines) {
      // A new section starts at any `##` or `###` heading.
      // `#` (H1) is intentionally excluded — H1 is typically the document
      // title and its content usually belongs to the intro chunk that was
      // already started.
      if (/^#{2,3}\s/.test(line)) {
        // Flush the accumulated lines of the previous section before starting
        // a new one, but only if there is non-whitespace content to keep.
        if (currentLines.join('').trim()) {
          chunks.push({ file: fileName, section: currentSection, content: currentLines.join('\n').trim() });
        }
        currentSection = line.replace(/^#{2,3}\s+/, '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // Flush the final section of the file.
    if (currentLines.join('').trim()) {
      chunks.push({ file: fileName, section: currentSection, content: currentLines.join('\n').trim() });
    }
  }

  // Tokenise the query: split on non-word characters and drop tokens that are
  // two characters or shorter (they are typically stop-words or punctuation
  // fragments that would match too broadly).
  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

  const scored: RetrievedChunk[] = chunks.map(chunk => {
    const haystack = `${chunk.section} ${chunk.content}`.toLowerCase();
    // Count how many distinct query terms appear anywhere in the chunk text.
    const hits = queryTerms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
    // Normalise to [0, 1]; guard against division by zero when the query
    // produced no eligible terms.
    const score = queryTerms.length > 0 ? hits / queryTerms.length : 0;
    return { ...chunk, score };
  });

  // Return the top 5 results; ties are broken by the original file/section
  // order (stable sort behaviour in V8).
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
