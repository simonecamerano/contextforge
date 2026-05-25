import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveContext, type RetrievedChunk } from './retriever.js';

vi.mock('node:fs');

import fs from 'node:fs';

const mockReaddirSync = vi.mocked(fs.readdirSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

function makeDirent(name: string, isFile = true) {
  return { name, isFile: () => isFile } as unknown as ReturnType<typeof fs.readdirSync>[number];
}

const DIR = '/ctx';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

describe('retrieveContext – file reading', () => {
  it('reads all .md files in the directory (excluding ai-brief.md)', async () => {
    mockReaddirSync.mockReturnValue([
      makeDirent('overview.md'),
      makeDirent('ai-brief.md'),
      makeDirent('notes.txt'),
      makeDirent('sub-dir', false),
    ]);
    mockReadFileSync.mockReturnValue('content about something');

    await retrieveContext('something', DIR);

    // only overview.md should be read
    expect(mockReadFileSync).toHaveBeenCalledOnce();
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('overview.md'), 'utf8');
  });

  it('returns an empty array when no eligible .md files exist', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('ai-brief.md'), makeDirent('image.png')]);

    const result = await retrieveContext('query', DIR);

    expect(result).toEqual([]);
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns RetrievedChunk objects with the correct file name', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('arch.md')]);
    mockReadFileSync.mockReturnValue('Some architecture content');

    const result = await retrieveContext('architecture content', DIR);

    expect(result[0].file).toBe('arch.md');
  });
});

// ---------------------------------------------------------------------------
// Splitting by headings
// ---------------------------------------------------------------------------

describe('retrieveContext – heading-based splitting', () => {
  it('treats content before the first heading as a chunk with the filename as section', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('intro.md')]);
    mockReadFileSync.mockReturnValue('Preamble line\nAnother line');

    const result = await retrieveContext('preamble', DIR);

    expect(result[0].section).toBe('intro');
    expect(result[0].content).toContain('Preamble line');
  });

  it('splits content into separate chunks at ## headings', async () => {
    const raw = [
      '## Alpha',
      'Alpha content here',
      '## Beta',
      'Beta content here',
    ].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('alpha beta', DIR);

    const sections = result.map(c => c.section);
    expect(sections).toContain('Alpha');
    expect(sections).toContain('Beta');
  });

  it('splits content into separate chunks at ### headings', async () => {
    const raw = ['### Setup', 'Setup steps here', '### Teardown', 'Teardown steps'].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('guide.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('setup teardown', DIR);

    const sections = result.map(c => c.section);
    expect(sections).toContain('Setup');
    expect(sections).toContain('Teardown');
  });

  it('does NOT split on # (h1) headings', async () => {
    const raw = ['# Title', 'Intro text', '## Section', 'Section text'].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('page.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('title intro section', DIR);

    // The "# Title" line should be part of the pre-heading chunk, not its own section
    const sectionNames = result.map(c => c.section);
    expect(sectionNames).not.toContain('Title');
  });

  it('discards empty sections (whitespace-only content)', async () => {
    const raw = ['## Empty', '   ', '## HasContent', 'Real content here'].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('sparse.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('content', DIR);

    expect(result.every(c => c.section !== 'Empty')).toBe(true);
  });

  it('handles files with no headings as a single chunk', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('flat.md')]);
    mockReadFileSync.mockReturnValue('Line one\nLine two\nLine three');

    const result = await retrieveContext('line', DIR);

    expect(result).toHaveLength(1);
    expect(result[0].section).toBe('flat');
  });
});

// ---------------------------------------------------------------------------
// BM25 / keyword scoring
// ---------------------------------------------------------------------------

describe('retrieveContext – keyword scoring', () => {
  it('gives score 1.0 when all query terms appear in a chunk', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Overview\nauthentication and authorization details');

    const result = await retrieveContext('authentication authorization', DIR);

    expect(result[0].score).toBe(1);
  });

  it('gives score 0.5 when half the query terms match', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nauthentication only');

    const result = await retrieveContext('authentication authorization', DIR);

    expect(result[0].score).toBe(0.5);
  });

  it('gives score 0.0 when no query terms appear in a chunk', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nunrelated filler text here');

    const result = await retrieveContext('database migration schema', DIR);

    expect(result[0].score).toBe(0);
  });

  it('scores are case-insensitive', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nDEPLOYMENT Pipeline CONFIG');

    const result = await retrieveContext('deployment config', DIR);

    expect(result[0].score).toBe(1);
  });

  it('matches query terms found in the section heading, not just the body', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Deployment\nsome body text without the keyword');

    const result = await retrieveContext('deployment', DIR);

    expect(result[0].score).toBe(1);
  });

  it('ignores query terms shorter than 3 characters', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nsome content here');

    // "is", "an" are ≤2 chars → filtered → all 0-length queryTerms → score 0
    const result = await retrieveContext('is an', DIR);

    expect(result[0].score).toBe(0);
  });

  it('gives score 0 for every chunk when the query is empty', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nsome content here');

    const result = await retrieveContext('', DIR);

    expect(result[0].score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sorting and top-5 filtering
// ---------------------------------------------------------------------------

describe('retrieveContext – sorting and top-5 filtering', () => {
  it('returns results sorted by score descending', async () => {
    // Two sections: one matches both terms, one matches one term
    const raw = [
      '## Full Match',
      'database schema migration',
      '## Partial Match',
      'database notes',
    ].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('database migration', DIR);

    expect(result[0].section).toBe('Full Match');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('returns at most 5 chunks even when more exist', async () => {
    // Build a file with 8 distinct sections all matching the query
    const sections = Array.from({ length: 8 }, (_, i) =>
      [`## Section ${i}`, `content keyword${i} here`].join('\n')
    ).join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('big.md')]);
    mockReadFileSync.mockReturnValue(sections);

    const result = await retrieveContext('content here', DIR);

    expect(result).toHaveLength(5);
  });

  it('returns fewer than 5 chunks when fewer are available', async () => {
    const raw = ['## One', 'content one', '## Two', 'content two'].join('\n');

    mockReaddirSync.mockReturnValue([makeDirent('small.md')]);
    mockReadFileSync.mockReturnValue(raw);

    const result = await retrieveContext('content', DIR);

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('aggregates chunks across multiple files', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('a.md'), makeDirent('b.md')]);
    mockReadFileSync
      .mockReturnValueOnce('## Alpha\nalpha content here')
      .mockReturnValueOnce('## Beta\nbeta content here');

    const result = await retrieveContext('content', DIR);

    const files = result.map(c => c.file);
    expect(files).toContain('a.md');
    expect(files).toContain('b.md');
  });

  it('each returned chunk conforms to the RetrievedChunk shape', async () => {
    mockReaddirSync.mockReturnValue([makeDirent('doc.md')]);
    mockReadFileSync.mockReturnValue('## Section\nsome content here');

    const result = await retrieveContext('content', DIR);

    for (const chunk of result) {
      expect(chunk).toMatchObject<Partial<RetrievedChunk>>({
        file: expect.any(String),
        section: expect.any(String),
        content: expect.any(String),
        score: expect.any(Number),
      });
    }
  });
});
