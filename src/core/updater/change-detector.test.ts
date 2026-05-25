import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { detectChanges } from './change-detector.js';

vi.mock('node:fs/promises');

import fs from 'node:fs/promises';

const mockReadFile = vi.mocked(fs.readFile);

function hashOf(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const ROOT = '/project';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detectChanges', () => {
  it('detects added files (not present in previousHashes)', async () => {
    const content = Buffer.from('hello');
    mockReadFile.mockResolvedValue(content as any);

    const result = await detectChanges(['src/new.ts'], ROOT, {});

    expect(result.added).toEqual(['src/new.ts']);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.newHashes['src/new.ts']).toBe(hashOf(content));
  });

  it('detects modified files (hash changed since last run)', async () => {
    const oldContent = Buffer.from('old');
    const newContent = Buffer.from('new');
    mockReadFile.mockResolvedValue(newContent as any);

    const previousHashes = { 'src/file.ts': hashOf(oldContent) };
    const result = await detectChanges(['src/file.ts'], ROOT, previousHashes);

    expect(result.modified).toEqual(['src/file.ts']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.newHashes['src/file.ts']).toBe(hashOf(newContent));
  });

  it('detects removed files (in previousHashes but not in current files list)', async () => {
    const result = await detectChanges([], ROOT, { 'src/gone.ts': 'abc123' });

    expect(result.removed).toEqual(['src/gone.ts']);
    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.newHashes).toEqual({});
  });

  it('does not report unchanged files', async () => {
    const content = Buffer.from('stable content');
    const hash = hashOf(content);
    mockReadFile.mockResolvedValue(content as any);

    const previousHashes = { 'src/stable.ts': hash };
    const result = await detectChanges(['src/stable.ts'], ROOT, previousHashes);

    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.newHashes['src/stable.ts']).toBe(hash);
  });

  it('handles a mix of added, modified, removed, and unchanged files', async () => {
    const unchangedContent = Buffer.from('unchanged');
    const modifiedNewContent = Buffer.from('modified');
    const addedContent = Buffer.from('added');

    mockReadFile
      .mockResolvedValueOnce(unchangedContent as any) // src/unchanged.ts
      .mockResolvedValueOnce(modifiedNewContent as any) // src/modified.ts
      .mockResolvedValueOnce(addedContent as any); // src/added.ts

    const previousHashes = {
      'src/unchanged.ts': hashOf(unchangedContent),
      'src/modified.ts': hashOf(Buffer.from('old content')),
      'src/removed.ts': 'deadbeef',
    };

    const result = await detectChanges(
      ['src/unchanged.ts', 'src/modified.ts', 'src/added.ts'],
      ROOT,
      previousHashes
    );

    expect(result.added).toEqual(['src/added.ts']);
    expect(result.modified).toEqual(['src/modified.ts']);
    expect(result.removed).toEqual(['src/removed.ts']);
    expect(result.newHashes['src/unchanged.ts']).toBe(hashOf(unchangedContent));
    expect(result.newHashes['src/modified.ts']).toBe(hashOf(modifiedNewContent));
    expect(result.newHashes['src/added.ts']).toBe(hashOf(addedContent));
    expect(result.newHashes['src/removed.ts']).toBeUndefined();
  });

  it('returns all-empty results when both files and previousHashes are empty', async () => {
    const result = await detectChanges([], ROOT, {});

    expect(result.added).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.newHashes).toEqual({});
  });

  it('silently ignores unreadable files and excludes them from newHashes', async () => {
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT: no such file'))
      .mockResolvedValueOnce(Buffer.from('ok') as any);

    const result = await detectChanges(['src/missing.ts', 'src/ok.ts'], ROOT, {});

    expect(result.added).toEqual(['src/ok.ts']);
    expect(result.newHashes['src/missing.ts']).toBeUndefined();
    expect(result.newHashes['src/ok.ts']).toBe(hashOf(Buffer.from('ok')));
  });

  it('reads files using paths joined from projectRoot', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('data') as any);

    await detectChanges(['src/index.ts'], '/my/root', {});

    expect(mockReadFile).toHaveBeenCalledWith('/my/root/src/index.ts');
  });

  it('correctly identifies multiple removed files', async () => {
    const previousHashes = {
      'a.ts': 'hash1',
      'b.ts': 'hash2',
      'c.ts': 'hash3',
    };

    const result = await detectChanges([], ROOT, previousHashes);

    expect(result.removed).toHaveLength(3);
    expect(result.removed).toContain('a.ts');
    expect(result.removed).toContain('b.ts');
    expect(result.removed).toContain('c.ts');
  });
});
