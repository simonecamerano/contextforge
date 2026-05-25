import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walkDirectory } from './file-walker.js';
import type { IgnoreEngine } from './ignore-engine.js';

vi.mock('node:fs/promises');

import fs from 'node:fs/promises';

const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);

function makeStat(isDir: boolean, isFile: boolean) {
  return { isDirectory: () => isDir, isFile: () => isFile } as Awaited<ReturnType<typeof fs.stat>>;
}

function makeIgnoreEngine(ignoredPaths: string[] = []): IgnoreEngine {
  return {
    shouldIgnore: (relPath: string) => ignoredPaths.includes(relPath),
  } as unknown as IgnoreEngine;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('walkDirectory', () => {
  it('returns relative paths of files in a flat directory', async () => {
    mockReaddir.mockResolvedValue(['a.ts', 'b.ts'] as any);
    mockStat.mockResolvedValue(makeStat(false, true));

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual(['a.ts', 'b.ts']);
  });

  it('recursively collects files from subdirectories', async () => {
    mockReaddir
      .mockResolvedValueOnce(['src'] as any)           // root readdir
      .mockResolvedValueOnce(['index.ts'] as any);     // src readdir

    mockStat
      .mockResolvedValueOnce(makeStat(true, false))    // src → directory
      .mockResolvedValueOnce(makeStat(false, true));   // index.ts → file

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual(['src/index.ts']);
  });

  it('skips entries that are ignored by the IgnoreEngine', async () => {
    mockReaddir.mockResolvedValue(['secret.ts', 'ok.ts'] as any);
    mockStat.mockResolvedValue(makeStat(false, true));

    const result = await walkDirectory('/root', makeIgnoreEngine(['secret.ts']), '/root');

    expect(result).toEqual(['ok.ts']);
    // stat should only be called for ok.ts
    expect(mockStat).toHaveBeenCalledTimes(1);
  });

  it('skips ignored subdirectories entirely', async () => {
    mockReaddir.mockResolvedValue(['node_modules', 'src'] as any);

    mockStat
      .mockResolvedValueOnce(makeStat(false, true)); // src → file (node_modules is ignored before stat)

    const result = await walkDirectory(
      '/root',
      makeIgnoreEngine(['node_modules']),
      '/root'
    );

    expect(result).toEqual(['src']);
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it('returns empty array for an empty directory', async () => {
    mockReaddir.mockResolvedValue([] as any);

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual([]);
    expect(mockStat).not.toHaveBeenCalled();
  });

  it('returns empty array and logs error when readdir fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReaddir.mockRejectedValue(new Error('EACCES: permission denied'));

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it('skips a file and logs error when stat fails, continuing with others', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReaddir.mockResolvedValue(['broken.ts', 'ok.ts'] as any);

    mockStat
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(makeStat(false, true));

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual(['ok.ts']);
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it('ignores entries that are neither files nor directories (e.g. symlinks)', async () => {
    mockReaddir.mockResolvedValue(['link'] as any);
    mockStat.mockResolvedValue(makeStat(false, false));

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual([]);
  });

  it('uses dirPath as projectRoot when projectRoot is omitted', async () => {
    mockReaddir.mockResolvedValue(['file.ts'] as any);
    mockStat.mockResolvedValue(makeStat(false, true));

    const result = await walkDirectory('/root', makeIgnoreEngine());

    expect(result).toEqual(['file.ts']);
  });

  it('handles deeply nested directories', async () => {
    mockReaddir
      .mockResolvedValueOnce(['a'] as any)
      .mockResolvedValueOnce(['b'] as any)
      .mockResolvedValueOnce(['deep.ts'] as any);

    mockStat
      .mockResolvedValueOnce(makeStat(true, false))
      .mockResolvedValueOnce(makeStat(true, false))
      .mockResolvedValueOnce(makeStat(false, true));

    const result = await walkDirectory('/root', makeIgnoreEngine(), '/root');

    expect(result).toEqual(['a/b/deep.ts']);
  });
});
