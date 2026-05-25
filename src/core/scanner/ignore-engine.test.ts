import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { IgnoreEngine } from './ignore-engine';

vi.mock('node:fs');

const mockedFs = vi.mocked(fs);

function makeNormalFileStat(size = 1024): fs.Stats {
  return {
    isFile: () => true,
    isDirectory: () => false,
    size,
  } as unknown as fs.Stats;
}

function makeDirStat(): fs.Stats {
  return {
    isFile: () => false,
    isDirectory: () => true,
    size: 0,
  } as unknown as fs.Stats;
}

function setupNormalFile(size = 1024) {
  mockedFs.existsSync.mockReturnValue(true);
  mockedFs.statSync.mockReturnValue(makeNormalFileStat(size));
  mockedFs.openSync.mockReturnValue(3);
  mockedFs.readSync.mockReturnValue(size < 1024 ? size : 1024);
  mockedFs.closeSync.mockReturnValue(undefined);
  // Fill the buffer with non-null bytes (simulate text file)
  mockedFs.readSync.mockImplementation((_fd, buffer) => {
    (buffer as Buffer).fill(0x41); // 'A'
    return 1024;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // By default no ignore files exist
  mockedFs.existsSync.mockReturnValue(false);
  mockedFs.readFileSync.mockReturnValue('');
});

describe('IgnoreEngine — constructor', () => {
  it('creates an instance without reading ignore files when they do not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(() => new IgnoreEngine('/project')).not.toThrow();
  });

  it('reads .gitignore when it exists', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('.gitignore')
    );
    mockedFs.readFileSync.mockReturnValue('*.log\n');
    new IgnoreEngine('/project');
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.gitignore'),
      'utf8'
    );
  });

  it('reads .contextforgeignore when it exists', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('.contextforgeignore')
    );
    mockedFs.readFileSync.mockReturnValue('secret/\n');
    new IgnoreEngine('/project');
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.contextforgeignore'),
      'utf8'
    );
  });

  it('reads both ignore files when both exist', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('');
    new IgnoreEngine('/project');
    expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
  });
});

describe('IgnoreEngine — default ignore rules', () => {
  let engine: IgnoreEngine;

  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(false);
    engine = new IgnoreEngine('/project');
  });

  it.each([
    'node_modules/lodash/index.js',
    '.git/config',
    'dist/bundle.js',
    'build/output.js',
    'coverage/lcov.info',
    '.contextforge/cache.json',
    '.DS_Store',
  ])('ignores %s by default', (filePath) => {
    expect(engine.shouldIgnore(filePath, '/project')).toBe(true);
  });

  it('does not ignore a regular source file', () => {
    setupNormalFile();
    expect(engine.shouldIgnore('src/index.ts', '/project')).toBe(false);
  });
});

describe('IgnoreEngine — .gitignore patterns', () => {
  it('ignores files matching patterns from .gitignore', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('.gitignore')
    );
    mockedFs.readFileSync.mockReturnValue('*.log\ntmp/\n');
    const engine = new IgnoreEngine('/project');

    // These match the .gitignore patterns so they're ignored before fs checks
    expect(engine.shouldIgnore('app.log', '/project')).toBe(true);
    expect(engine.shouldIgnore('tmp/data.json', '/project')).toBe(true);
  });

  it('does not ignore files not matching .gitignore patterns', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('.gitignore')
    );
    mockedFs.readFileSync.mockReturnValue('*.log\n');
    const engine = new IgnoreEngine('/project');

    setupNormalFile();
    expect(engine.shouldIgnore('src/app.ts', '/project')).toBe(false);
  });
});

describe('IgnoreEngine — .contextforgeignore patterns', () => {
  it('ignores files matching patterns from .contextforgeignore', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('.contextforgeignore')
    );
    mockedFs.readFileSync.mockReturnValue('secrets/\nprivate.key\n');
    const engine = new IgnoreEngine('/project');

    expect(engine.shouldIgnore('secrets/credentials.json', '/project')).toBe(true);
    expect(engine.shouldIgnore('private.key', '/project')).toBe(true);
  });
});

describe('IgnoreEngine — shouldIgnore file system checks', () => {
  let engine: IgnoreEngine;

  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(false);
    engine = new IgnoreEngine('/project');
  });

  it('returns true when the file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(engine.shouldIgnore('src/missing.ts', '/project')).toBe(true);
  });

  it('returns true for files larger than 500 KB', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue(makeNormalFileStat(501 * 1024));
    expect(engine.shouldIgnore('src/huge.ts', '/project')).toBe(true);
  });

  it('returns false for files exactly at 500 KB', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue(makeNormalFileStat(500 * 1024));
    mockedFs.openSync.mockReturnValue(3);
    mockedFs.readSync.mockImplementation((_fd, buffer) => {
      (buffer as Buffer).fill(0x41);
      return 1024;
    });
    mockedFs.closeSync.mockReturnValue(undefined);
    expect(engine.shouldIgnore('src/boundary.ts', '/project')).toBe(false);
  });

  it('returns true for binary files containing null bytes', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue(makeNormalFileStat(2048));
    mockedFs.openSync.mockReturnValue(3);
    mockedFs.readSync.mockImplementation((_fd, buffer) => {
      const buf = buffer as Buffer;
      buf.fill(0x41);
      buf[512] = 0x00; // null byte → binary
      return 1024;
    });
    mockedFs.closeSync.mockReturnValue(undefined);
    expect(engine.shouldIgnore('src/image.png', '/project')).toBe(true);
  });

  it('returns false for plain text files', () => {
    setupNormalFile();
    expect(engine.shouldIgnore('src/app.ts', '/project')).toBe(false);
  });

  it('returns true when an fs error is thrown', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockImplementation(() => {
      throw new Error('permission denied');
    });
    expect(engine.shouldIgnore('src/protected.ts', '/project')).toBe(true);
  });

  it('does not call fs.stat for directories because stat.isFile() is false', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue(makeDirStat());
    // Directories are not files — no binary / size check should run
    expect(engine.shouldIgnore('src/mydir', '/project')).toBe(false);
    expect(mockedFs.openSync).not.toHaveBeenCalled();
  });
});

describe('IgnoreEngine — path normalisation', () => {
  let engine: IgnoreEngine;

  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(false);
    engine = new IgnoreEngine('/project');
  });

  it('normalises Windows-style backslash paths', () => {
    // node_modules\lodash\index.js should be treated like node_modules/lodash/index.js
    expect(engine.shouldIgnore('node_modules\\lodash\\index.js', '/project')).toBe(true);
  });

  it('resolves relative paths against projectRoot for fs checks', () => {
    setupNormalFile();
    // Should not throw even for a deeply nested relative path
    expect(engine.shouldIgnore('src/utils/helper.ts', '/project')).toBe(false);
    expect(mockedFs.existsSync).toHaveBeenCalledWith('/project/src/utils/helper.ts');
  });

  it('throws when an absolute path is passed (ignore library requires relative paths)', () => {
    // The `ignore` library only accepts relative paths; absolute paths throw a RangeError
    // before any fs call is made.
    expect(() => engine.shouldIgnore('/project/src/app.ts', '/project')).toThrow(RangeError);
  });
});

describe('IgnoreEngine — default projectRoot fallback', () => {
  it('uses process.cwd() when no root is supplied to the constructor', () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(() => new IgnoreEngine()).not.toThrow();
  });

  it('uses process.cwd() when no root is supplied to shouldIgnore', () => {
    mockedFs.existsSync.mockReturnValue(false);
    const engine = new IgnoreEngine('/project');
    // Calling without second arg — must not throw
    expect(() => engine.shouldIgnore('some/file.ts')).not.toThrow();
  });
});
