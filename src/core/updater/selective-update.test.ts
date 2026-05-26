import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectiveUpdate } from './selective-update.js';
import { ProjectSummary } from '../scanner/summarizer.js';

vi.mock('node:fs/promises');
vi.mock('../generators/project-overview.js');
vi.mock('../generators/architecture.js');
vi.mock('../generators/active-context.js');

import fs from 'node:fs/promises';
import { generateProjectOverview } from '../generators/project-overview.js';
import { generateArchitecture } from '../generators/architecture.js';
import { generateActiveContext } from '../generators/active-context.js';

const mockWriteFile = vi.mocked(fs.writeFile);
const mockGenerateProjectOverview = vi.mocked(generateProjectOverview);
const mockGenerateArchitecture = vi.mocked(generateArchitecture);
const mockGenerateActiveContext = vi.mocked(generateActiveContext);

const CONTEXT_DIR = '/project/.contextforge';

const baseSummary: ProjectSummary = {
  name: 'test-project',
  version: '1.0.0',
  dependencies: {},
  devDependencies: {},
  scripts: {},
  tsModules: [],
  pythonModules: [],
  languages: ['TypeScript'],
  gitBranch: 'main',
  gitCommits: [],
  todos: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteFile.mockResolvedValue(undefined);
  mockGenerateProjectOverview.mockReturnValue('# Project Overview\n');
  mockGenerateArchitecture.mockReturnValue('# Architecture\n');
  mockGenerateActiveContext.mockReturnValue('# Active Context\n');
});

describe('selectiveUpdate', () => {
  describe('active-context.md', () => {
    it('always writes active-context.md regardless of changes', async () => {
      await selectiveUpdate({ modified: [], added: [], removed: [], newHashes: {} }, baseSummary, CONTEXT_DIR);

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/active-context.md`,
        '# Active Context\n',
        'utf8'
      );
    });

    it('calls generateActiveContext with the provided summary', async () => {
      await selectiveUpdate({ modified: [], added: [], removed: [], newHashes: {} }, baseSummary, CONTEXT_DIR);

      expect(mockGenerateActiveContext).toHaveBeenCalledWith(baseSummary);
    });
  });

  describe('project-overview.md', () => {
    it('writes project-overview.md when a manifest file is modified', async () => {
      await selectiveUpdate(
        { modified: ['package.json'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/project-overview.md`,
        '# Project Overview\n',
        'utf8'
      );
    });

    it('writes project-overview.md when a manifest file is added', async () => {
      await selectiveUpdate(
        { modified: [], added: ['requirements.txt'], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/project-overview.md`,
        expect.any(String),
        'utf8'
      );
    });

    it('writes project-overview.md when a manifest file is removed', async () => {
      await selectiveUpdate(
        { modified: [], added: [], removed: ['pyproject.toml'], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/project-overview.md`,
        expect.any(String),
        'utf8'
      );
    });

    it('does NOT write project-overview.md when only source files change', async () => {
      await selectiveUpdate(
        { modified: ['src/index.ts'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).not.toContain(`${CONTEXT_DIR}/project-overview.md`);
    });

    it('does NOT write project-overview.md when no files change', async () => {
      await selectiveUpdate({ modified: [], added: [], removed: [], newHashes: {} }, baseSummary, CONTEXT_DIR);

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).not.toContain(`${CONTEXT_DIR}/project-overview.md`);
    });

    it('calls generateProjectOverview with the provided summary', async () => {
      await selectiveUpdate(
        { modified: ['package.json'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockGenerateProjectOverview).toHaveBeenCalledWith(baseSummary);
    });

    it('recognises manifest files by basename regardless of directory path', async () => {
      await selectiveUpdate(
        { modified: ['subdir/package.json'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).toContain(`${CONTEXT_DIR}/project-overview.md`);
    });
  });

  describe('architecture.md', () => {
    it('writes architecture.md when a TypeScript source file is modified', async () => {
      await selectiveUpdate(
        { modified: ['src/app.ts'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/architecture.md`,
        '# Architecture\n',
        'utf8'
      );
    });

    it('writes architecture.md when a JavaScript file is added', async () => {
      await selectiveUpdate(
        { modified: [], added: ['src/utils.js'], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/architecture.md`,
        expect.any(String),
        'utf8'
      );
    });

    it('writes architecture.md when a Python file is removed', async () => {
      await selectiveUpdate(
        { modified: [], added: [], removed: ['main.py'], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/architecture.md`,
        expect.any(String),
        'utf8'
      );
    });

    it('writes architecture.md for .tsx and .jsx files', async () => {
      await selectiveUpdate(
        { modified: ['src/App.tsx'], added: ['src/Button.jsx'], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).toContain(`${CONTEXT_DIR}/architecture.md`);
    });

    it('does NOT write architecture.md when only manifest files change', async () => {
      await selectiveUpdate(
        { modified: ['package.json'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).not.toContain(`${CONTEXT_DIR}/architecture.md`);
    });

    it('does NOT write architecture.md when no files change', async () => {
      await selectiveUpdate({ modified: [], added: [], removed: [], newHashes: {} }, baseSummary, CONTEXT_DIR);

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).not.toContain(`${CONTEXT_DIR}/architecture.md`);
    });

    it('does NOT write architecture.md for non-source file changes', async () => {
      await selectiveUpdate(
        { modified: ['README.md', 'docs/guide.md'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).not.toContain(`${CONTEXT_DIR}/architecture.md`);
    });

    it('calls generateArchitecture with the provided summary', async () => {
      await selectiveUpdate(
        { modified: ['src/index.ts'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockGenerateArchitecture).toHaveBeenCalledWith(baseSummary);
    });
  });

  describe('combined changes', () => {
    it('writes all three files when both manifest and source files change', async () => {
      await selectiveUpdate(
        { modified: ['package.json', 'src/index.ts'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      const paths = mockWriteFile.mock.calls.map((c) => c[0]);
      expect(paths).toContain(`${CONTEXT_DIR}/project-overview.md`);
      expect(paths).toContain(`${CONTEXT_DIR}/architecture.md`);
      expect(paths).toContain(`${CONTEXT_DIR}/active-context.md`);
    });

    it('writes only active-context.md when no relevant files change', async () => {
      await selectiveUpdate(
        { modified: ['README.md'], added: [], removed: [], newHashes: {} },
        baseSummary,
        CONTEXT_DIR
      );

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        `${CONTEXT_DIR}/active-context.md`,
        expect.any(String),
        'utf8'
      );
    });

    it('uses the contextForgeDir to build output paths', async () => {
      const customDir = '/custom/output/dir';
      await selectiveUpdate(
        { modified: ['package.json', 'src/main.ts'], added: [], removed: [], newHashes: {} },
        baseSummary,
        customDir
      );

      for (const call of mockWriteFile.mock.calls) {
        expect((call[0] as string).startsWith(customDir)).toBe(true);
      }
    });
  });
});
