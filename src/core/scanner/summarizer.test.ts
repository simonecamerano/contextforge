import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeProject } from './summarizer.js';

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('./parsers/typescript.js', () => ({
  parseTypeScript: vi.fn(),
}));

vi.mock('./parsers/python.js', () => ({
  parsePython: vi.fn(),
}));

vi.mock('./parsers/manifest.js', () => ({
  parseManifest: vi.fn(),
}));

vi.mock('./parsers/roadmap.js', () => ({
  parseRoadmap: vi.fn(),
}));

vi.mock('./parsers/vue.js', () => ({ parseVue: vi.fn() }));
vi.mock('./parsers/svelte.js', () => ({ parseSvelte: vi.fn() }));
vi.mock('./parsers/php.js', () => ({ parsePHP: vi.fn() }));
vi.mock('./parsers/ruby.js', () => ({ parseRuby: vi.fn() }));
vi.mock('./parsers/go.js', () => ({ parseGo: vi.fn() }));
vi.mock('./parsers/java.js', () => ({ parseJava: vi.fn() }));
vi.mock('./parsers/kotlin.js', () => ({ parseKotlin: vi.fn() }));
vi.mock('./parsers/csharp.js', () => ({ parseCSharp: vi.fn() }));
vi.mock('./parsers/rust.js', () => ({ parseRust: vi.fn() }));

// ── Typed mock accessors ─────────────────────────────────────────────────────

import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { parseTypeScript } from './parsers/typescript.js';
import { parsePython } from './parsers/python.js';
import { parseManifest } from './parsers/manifest.js';
import { parseRoadmap } from './parsers/roadmap.js';
import { parseVue } from './parsers/vue.js';
import { parseSvelte } from './parsers/svelte.js';
import { parsePHP } from './parsers/php.js';
import { parseRuby } from './parsers/ruby.js';
import { parseGo } from './parsers/go.js';
import { parseJava } from './parsers/java.js';
import { parseKotlin } from './parsers/kotlin.js';
import { parseCSharp } from './parsers/csharp.js';
import { parseRust } from './parsers/rust.js';

const mockReadFile = vi.mocked(fs.readFile) as ReturnType<typeof vi.fn>;
const mockParseRoadmap = vi.mocked(parseRoadmap);
const mockExecSync = vi.mocked(execSync);
const mockParseTypeScript = vi.mocked(parseTypeScript);
const mockParsePython = vi.mocked(parsePython);
const mockParseManifest = vi.mocked(parseManifest);
const mockParseVue = vi.mocked(parseVue);
const mockParseSvelte = vi.mocked(parseSvelte);
const mockParsePHP = vi.mocked(parsePHP);
const mockParseRuby = vi.mocked(parseRuby);
const mockParseGo = vi.mocked(parseGo);
const mockParseJava = vi.mocked(parseJava);
const mockParseKotlin = vi.mocked(parseKotlin);
const mockParseCSharp = vi.mocked(parseCSharp);
const mockParseRust = vi.mocked(parseRust);

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = '/fake/project';

const emptyTsResult = { imports: [], exports: [], classes: [], functions: [] };
const emptyPyResult = { imports: [], classes: [], functions: [] };
const emptyManifestResult = {};

function setupDefaultMocks() {
  mockReadFile.mockResolvedValue('');
  mockParseTypeScript.mockResolvedValue(emptyTsResult);
  mockParsePython.mockResolvedValue(emptyPyResult);
  mockParseManifest.mockResolvedValue(emptyManifestResult);
  mockParseRoadmap.mockReturnValue([]);
  mockParseVue.mockResolvedValue(emptyTsResult);
  mockParseSvelte.mockResolvedValue(emptyTsResult);
  mockParsePHP.mockResolvedValue(emptyTsResult);
  mockParseRuby.mockResolvedValue(emptyTsResult);
  mockParseGo.mockResolvedValue(emptyTsResult);
  mockParseJava.mockResolvedValue(emptyTsResult);
  mockParseKotlin.mockResolvedValue(emptyTsResult);
  mockParseCSharp.mockResolvedValue(emptyTsResult);
  mockParseRust.mockResolvedValue(emptyTsResult);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('summarizeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // ── Git integration ─────────────────────────────────────────────────────────

  describe('git integration', () => {
    it('reads the current git branch', async () => {
      mockExecSync
        .mockReturnValueOnce('main\n')
        .mockReturnValueOnce('abc1234 first commit\n');

      const result = await summarizeProject([], ROOT);

      expect(result.gitBranch).toBe('main');
    });

    it('parses git log into individual commit lines', async () => {
      mockExecSync
        .mockReturnValueOnce('feature/xyz\n')
        .mockReturnValueOnce('abc1234 feat: add feature\ndef5678 fix: bug\n0000000 chore: init\n');

      const result = await summarizeProject([], ROOT);

      expect(result.gitCommits).toEqual([
        'abc1234 feat: add feature',
        'def5678 fix: bug',
        '0000000 chore: init',
      ]);
    });

    it('filters empty lines from git log output', async () => {
      mockExecSync
        .mockReturnValueOnce('main\n')
        .mockReturnValueOnce('\nabc1234 only commit\n\n');

      const result = await summarizeProject([], ROOT);

      expect(result.gitCommits).toEqual(['abc1234 only commit']);
    });

    it('calls execSync with the correct cwd for both git commands', async () => {
      mockExecSync.mockReturnValueOnce('main\n').mockReturnValueOnce('');

      await summarizeProject([], ROOT);

      expect(mockExecSync).toHaveBeenCalledWith('git branch --show-current', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      expect(mockExecSync).toHaveBeenCalledWith('git log --oneline -n 10', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    });

    it('returns empty gitBranch and gitCommits when execSync throws', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      const result = await summarizeProject([], ROOT);

      expect(result.gitBranch).toBe('');
      expect(result.gitCommits).toEqual([]);
    });

    it('uses the project root directory as the summary name', async () => {
      mockExecSync.mockReturnValue('');
      const result = await summarizeProject([], '/some/path/my-project');
      expect(result.name).toBe('my-project');
    });
  });

  // ── TODO / FIXME detection ──────────────────────────────────────────────────

  describe('TODO/FIXME detection', () => {
    it('detects a // TODO comment', async () => {
      mockReadFile.mockResolvedValue('const x = 1;\n// TODO: refactor this\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/file.ts'], ROOT);

      expect(result.todos).toEqual([
        { file: 'src/file.ts', line: 2, type: 'TODO', text: 'refactor this' },
      ]);
    });

    it('detects a // FIXME comment', async () => {
      mockReadFile.mockResolvedValue('// FIXME: broken logic\nconst y = 2;\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/file.ts'], ROOT);

      expect(result.todos).toEqual([
        { file: 'src/file.ts', line: 1, type: 'FIXME', text: 'broken logic' },
      ]);
    });

    it('detects a # TODO comment in Python files', async () => {
      mockReadFile.mockResolvedValue('x = 1\n# TODO: improve performance\n');
      mockParsePython.mockResolvedValue(emptyPyResult);

      const result = await summarizeProject(['script.py'], ROOT);

      expect(result.todos).toEqual([
        { file: 'script.py', line: 2, type: 'TODO', text: 'improve performance' },
      ]);
    });

    it('detects a /// TODO comment (triple-slash style)', async () => {
      mockReadFile.mockResolvedValue('/// TODO: document this\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/a.ts'], ROOT);

      expect(result.todos).toEqual([
        { file: 'src/a.ts', line: 1, type: 'TODO', text: 'document this' },
      ]);
    });

    it('is case-insensitive for todo/fixme keywords', async () => {
      mockReadFile.mockResolvedValue('// todo: lowercase\n// fixme: also lowercase\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/b.ts'], ROOT);

      expect(result.todos[0].type).toBe('TODO');
      expect(result.todos[1].type).toBe('FIXME');
    });

    it('collects todos from multiple files', async () => {
      mockReadFile
        .mockResolvedValueOnce('') // roadmap.md
        .mockResolvedValueOnce('// TODO: first file\n')
        .mockResolvedValueOnce('// FIXME: second file\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/a.ts', 'src/b.ts'], ROOT);

      expect(result.todos).toHaveLength(2);
      expect(result.todos[0].file).toBe('src/a.ts');
      expect(result.todos[1].file).toBe('src/b.ts');
    });

    it('does not collect todos from lines without comment markers', async () => {
      mockReadFile.mockResolvedValue('const TODO = "not a comment";\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/c.ts'], ROOT);

      expect(result.todos).toHaveLength(0);
    });

    it('does not collect todos from mid-line string literals containing // TODO', async () => {
      mockReadFile.mockResolvedValue('mockFn.mockResolvedValue(\'// TODO: fixture\');\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/c.ts'], ROOT);

      expect(result.todos).toHaveLength(0);
    });

    it('records the correct 1-based line number', async () => {
      mockReadFile.mockResolvedValue('line 1\nline 2\nline 3\n// TODO: on line four\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['src/d.ts'], ROOT);

      expect(result.todos[0].line).toBe(4);
    });
  });

  // ── Parser dispatch ─────────────────────────────────────────────────────────

  describe('parser dispatch', () => {
    it('calls parseTypeScript for .ts files and pushes to tsModules', async () => {
      const tsResult = {
        imports: [{ from: 'react', names: ['React'] }],
        exports: ['MyComponent'],
        classes: [],
        functions: ['MyComponent'],
      };
      mockReadFile.mockResolvedValue('export function MyComponent() {}');
      mockParseTypeScript.mockResolvedValue(tsResult);

      const result = await summarizeProject(['src/component.ts'], ROOT);

      expect(mockParseTypeScript).toHaveBeenCalledWith('src/component.ts', 'export function MyComponent() {}');
      expect(result.tsModules).toHaveLength(1);
      expect(result.tsModules[0]).toEqual({ path: 'src/component.ts', ...tsResult });
    });

    it('calls parseTypeScript for .tsx files', async () => {
      mockReadFile.mockResolvedValue('<div />');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      await summarizeProject(['src/App.tsx'], ROOT);

      expect(mockParseTypeScript).toHaveBeenCalledWith('src/App.tsx', '<div />');
    });

    it('calls parseTypeScript for .js files', async () => {
      mockReadFile.mockResolvedValue('module.exports = {}');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      await summarizeProject(['index.js'], ROOT);

      expect(mockParseTypeScript).toHaveBeenCalledWith('index.js', 'module.exports = {}');
    });

    it('calls parseTypeScript for .jsx files', async () => {
      mockReadFile.mockResolvedValue('const App = () => <div/>;');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      await summarizeProject(['App.jsx'], ROOT);

      expect(mockParseTypeScript).toHaveBeenCalledWith('App.jsx', 'const App = () => <div/>;');
    });

    it('calls parsePython for .py files and pushes to pythonModules', async () => {
      const pyResult = {
        imports: [{ module: 'os', names: [] }],
        classes: ['MyClass'],
        functions: ['my_func'],
      };
      mockReadFile.mockResolvedValue('import os\nclass MyClass:\n  pass\ndef my_func(): pass\n');
      mockParsePython.mockResolvedValue(pyResult);

      const result = await summarizeProject(['script.py'], ROOT);

      expect(mockParsePython).toHaveBeenCalledWith('script.py', expect.any(String));
      expect(result.pythonModules).toHaveLength(1);
      expect(result.pythonModules[0].path).toBe('script.py');
      expect(result.pythonModules[0].functions).toEqual(['my_func']);
    });

    it('maps python classes to SummarizedModule shape with empty methods', async () => {
      const pyResult = { imports: [], classes: ['Parser', 'Runner'], functions: [] };
      mockReadFile.mockResolvedValue('');
      mockParsePython.mockResolvedValue(pyResult);

      const result = await summarizeProject(['tools.py'], ROOT);

      expect(result.pythonModules[0].classes).toEqual([
        { name: 'Parser', methods: [] },
        { name: 'Runner', methods: [] },
      ]);
    });

    it('combines python classes and functions as exports', async () => {
      const pyResult = { imports: [], classes: ['MyClass'], functions: ['helper'] };
      mockReadFile.mockResolvedValue('');
      mockParsePython.mockResolvedValue(pyResult);

      const result = await summarizeProject(['mod.py'], ROOT);

      expect(result.pythonModules[0].exports).toEqual(['helper', 'MyClass']);
    });

    it('calls parseManifest for package.json and merges result into summary', async () => {
      const manifestResult = {
        name: 'my-app',
        version: '2.0.0',
        dependencies: { react: '^18.0.0' },
        devDependencies: { vitest: '^1.0.0' },
        scripts: { test: 'vitest run' },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(manifestResult));
      mockParseManifest.mockResolvedValue(manifestResult);

      const result = await summarizeProject(['package.json'], ROOT);

      expect(mockParseManifest).toHaveBeenCalledWith('package.json', expect.any(String));
      expect(result.name).toBe('my-app');
      expect(result.version).toBe('2.0.0');
      expect(result.dependencies).toEqual({ react: '^18.0.0' });
      expect(result.devDependencies).toEqual({ vitest: '^1.0.0' });
      expect(result.scripts).toEqual({ test: 'vitest run' });
    });

    it('calls parseManifest for requirements.txt and adds packages as latest deps', async () => {
      mockReadFile.mockResolvedValue('requests\nflask\n');
      mockParseManifest.mockResolvedValue({ packages: ['requests', 'flask'] });

      const result = await summarizeProject(['requirements.txt'], ROOT);

      expect(result.dependencies).toEqual({ requests: 'latest', flask: 'latest' });
    });

    it('calls parseManifest for pyproject.toml', async () => {
      mockReadFile.mockResolvedValue('[project]\nname = "mylib"\n');
      mockParseManifest.mockResolvedValue({ name: 'mylib', version: '0.2.0' });

      const result = await summarizeProject(['pyproject.toml'], ROOT);

      expect(mockParseManifest).toHaveBeenCalledWith('pyproject.toml', expect.any(String));
      expect(result.name).toBe('mylib');
    });

    it('does not call any parser for unsupported extensions', async () => {
      mockReadFile.mockResolvedValue('# just a readme');

      await summarizeProject(['README.md'], ROOT);

      expect(mockParseTypeScript).not.toHaveBeenCalled();
      expect(mockParsePython).not.toHaveBeenCalled();
      expect(mockParseManifest).not.toHaveBeenCalled();
    });
  });

  // ── Language detection ──────────────────────────────────────────────────────

  describe('language detection', () => {
    it.each([
      ['src/app.ts', 'TypeScript'],
      ['src/app.tsx', 'React'],
      ['src/app.js', 'JavaScript'],
      ['src/app.jsx', 'React'],
      ['script.py', 'Python'],
      ['data.json', 'JSON'],
      ['notes.txt', 'Text'],
      ['config.toml', 'TOML'],
      ['README.md', 'Markdown'],
    ])('detects "%s" as %s', async (file, language) => {
      mockReadFile.mockResolvedValue('');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);
      mockParsePython.mockResolvedValue(emptyPyResult);

      const result = await summarizeProject([file], ROOT);

      expect(result.languages).toContain(language);
    });

    it('does not duplicate languages for multiple files of the same type', async () => {
      mockReadFile.mockResolvedValue('');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['a.ts', 'b.ts', 'c.ts'], ROOT);

      const tsEntries = result.languages.filter((l) => l === 'TypeScript');
      expect(tsEntries).toHaveLength(1);
    });

    it('collects multiple different languages', async () => {
      mockReadFile.mockResolvedValue('');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);
      mockParsePython.mockResolvedValue(emptyPyResult);

      const result = await summarizeProject(['src/a.ts', 'script.py', 'README.md'], ROOT);

      expect(result.languages).toContain('TypeScript');
      expect(result.languages).toContain('Python');
      expect(result.languages).toContain('Markdown');
    });

    it('ignores unknown extensions', async () => {
      mockReadFile.mockResolvedValue('');

      const result = await summarizeProject(['binary.exe'], ROOT);

      expect(result.languages).toHaveLength(0);
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('skips files that fail to read and continues processing the rest', async () => {
      mockReadFile
        .mockResolvedValueOnce('') // roadmap.md
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce('// TODO: second file\n');
      mockParseTypeScript.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['missing.ts', 'present.ts'], ROOT);

      expect(result.todos).toHaveLength(1);
      expect(result.todos[0].file).toBe('present.ts');
    });

    it('returns a valid summary even when all files fail to read', async () => {
      mockReadFile.mockRejectedValue(new Error('permission denied'));
      mockExecSync.mockReturnValue('');

      const result = await summarizeProject(['a.ts', 'b.ts'], ROOT);

      expect(result.tsModules).toHaveLength(0);
      expect(result.todos).toHaveLength(0);
    });
  });

  // ── Default shape ───────────────────────────────────────────────────────────

  describe('default summary shape', () => {
    it('returns sensible defaults when called with an empty file list', async () => {
      mockExecSync.mockReturnValue('');

      const result = await summarizeProject([], '/project/my-lib');

      expect(result).toMatchObject({
        name: 'my-lib',
        version: '0.1.0',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        tsModules: [],
        pythonModules: [],
        languages: [],
        gitBranch: '',
        gitCommits: [],
        todos: [],
        roadmap: [],
      });
    });
  });

  // ── Roadmap integration ─────────────────────────────────────────────────────

  describe('roadmap integration', () => {
    it('populates summary.roadmap from roadmap.md when it exists', async () => {
      const items = [{ text: 'Setup', done: false, section: 'Phase 1' }];
      mockReadFile.mockResolvedValueOnce('# Roadmap\n- [ ] Setup');
      mockParseRoadmap.mockReturnValue(items);

      const result = await summarizeProject([], ROOT);

      expect(mockReadFile).toHaveBeenCalledWith(
        `${ROOT}/roadmap.md`,
        'utf8'
      );
      expect(mockParseRoadmap).toHaveBeenCalledWith('# Roadmap\n- [ ] Setup');
      expect(result.roadmap).toEqual(items);
    });

    it('sets summary.roadmap to [] when roadmap.md does not exist', async () => {
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await summarizeProject([], ROOT);

      expect(result.roadmap).toEqual([]);
    });
  });

  // ── New language detection ──────────────────────────────────────────────────

  describe('new language detection', () => {
    it.each([
      ['Component.vue', 'Vue'],
      ['App.svelte', 'Svelte'],
      ['index.php', 'PHP'],
      ['app.rb', 'Ruby'],
      ['main.go', 'Go'],
      ['Main.java', 'Java'],
      ['Main.kt', 'Kotlin'],
      ['Program.cs', 'C#'],
      ['main.rs', 'Rust'],
      ['styles.scss', 'SCSS'],
      ['styles.css', 'CSS'],
      ['styles.less', 'Less'],
      ['index.html', 'HTML'],
      ['deploy.sh', 'Shell'],
      ['config.yml', 'YAML'],
      ['config.yaml', 'YAML'],
    ])('detects "%s" as %s', async (file, language) => {
      mockReadFile.mockResolvedValue('');
      const result = await summarizeProject([file], ROOT);
      expect(result.languages).toContain(language);
    });

    it('detects Dockerfile as Dockerfile language', async () => {
      mockReadFile.mockResolvedValue('FROM node:18\n');
      const result = await summarizeProject(['Dockerfile'], ROOT);
      expect(result.languages).toContain('Dockerfile');
    });

    it('does not detect a file named NotDockerfile as Dockerfile', async () => {
      mockReadFile.mockResolvedValue('');
      const result = await summarizeProject(['NotDockerfile'], ROOT);
      expect(result.languages).not.toContain('Dockerfile');
    });
  });

  // ── Registry dispatch ───────────────────────────────────────────────────────

  describe('registry dispatch', () => {
    it('calls parseVue for .vue files and pushes to tsModules', async () => {
      mockReadFile.mockResolvedValue('<script>export default {}</script>');
      mockParseVue.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['Component.vue'], ROOT);

      expect(mockParseVue).toHaveBeenCalledWith('Component.vue', expect.any(String));
      expect(result.tsModules).toHaveLength(1);
      expect(result.tsModules[0].path).toBe('Component.vue');
    });

    it('calls parsePHP for .php files and pushes to tsModules', async () => {
      mockReadFile.mockResolvedValue('<?php class Foo {}');
      mockParsePHP.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['index.php'], ROOT);

      expect(mockParsePHP).toHaveBeenCalledWith('index.php', expect.any(String));
      expect(result.tsModules).toHaveLength(1);
    });

    it('calls parseGo for .go files and pushes to tsModules', async () => {
      mockReadFile.mockResolvedValue('package main');
      mockParseGo.mockResolvedValue(emptyTsResult);

      const result = await summarizeProject(['main.go'], ROOT);

      expect(mockParseGo).toHaveBeenCalledWith('main.go', expect.any(String));
      expect(result.tsModules).toHaveLength(1);
    });

    it.each([
      ['App.svelte', 'parseSvelte', '.svelte', mockParseSvelte],
      ['app.rb', 'parseRuby', '.rb', mockParseRuby],
      ['Main.java', 'parseJava', '.java', mockParseJava],
      ['Main.kt', 'parseKotlin', '.kt', mockParseKotlin],
      ['Program.cs', 'parseCSharp', '.cs', mockParseCSharp],
      ['main.rs', 'parseRust', '.rs', mockParseRust],
    ] as const)('calls correct parser for %s and pushes to tsModules', async (file, _parserName, _ext, mockParser) => {
      mockReadFile.mockResolvedValue('');
      (mockParser as ReturnType<typeof vi.fn>).mockResolvedValue(emptyTsResult);

      const result = await summarizeProject([file], ROOT);

      expect(mockParser).toHaveBeenCalledWith(file, expect.any(String));
      expect(result.tsModules).toHaveLength(1);
      expect(result.tsModules[0].path).toBe(file);
    });

    it('does not push to tsModules for detection-only extensions (e.g. .scss)', async () => {
      mockReadFile.mockResolvedValue('.body { color: red; }');

      const result = await summarizeProject(['styles.scss'], ROOT);

      expect(result.tsModules).toHaveLength(0);
      expect(result.languages).toContain('SCSS');
    });
  });

  // ── Fallback TODO scanning ──────────────────────────────────────────────────

  describe('fallback TODO scanning', () => {
    it('scans TODOs in .scss files even without a structural parser', async () => {
      mockReadFile.mockResolvedValue('// TODO: fix dark mode\n.body {}');

      const result = await summarizeProject(['styles.scss'], ROOT);

      expect(result.todos).toHaveLength(1);
      expect(result.todos[0].file).toBe('styles.scss');
      expect(result.todos[0].text).toBe('fix dark mode');
    });

    it('scans TODOs in Dockerfile even without a structural parser', async () => {
      mockReadFile.mockResolvedValue('FROM node:18\n# TODO: pin exact version\n');

      const result = await summarizeProject(['Dockerfile'], ROOT);

      expect(result.todos).toHaveLength(1);
      expect(result.todos[0].file).toBe('Dockerfile');
    });
  });
});
