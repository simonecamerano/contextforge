import { describe, it, expect } from 'vitest';
import { generateProjectOverview } from './project-overview.js';
import { generateArchitecture } from './architecture.js';
import { generateActiveContext } from './active-context.js';
import { generateAIBrief } from './ai-brief.js';
import type { ProjectSummary } from '../scanner/summarizer.js';

const baseSummary: ProjectSummary = {
  name: 'my-project',
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

// ---------------------------------------------------------------------------
// generateProjectOverview
// ---------------------------------------------------------------------------

describe('generateProjectOverview', () => {
  it('includes project name, version and languages', () => {
    const result = generateProjectOverview({
      ...baseSummary,
      languages: ['TypeScript', 'Python'],
    });
    expect(result).toContain('**Project Name:** my-project');
    expect(result).toContain('**Version:** 1.0.0');
    expect(result).toContain('**Languages:** TypeScript, Python');
  });

  it('renders scripts table when scripts are present', () => {
    const result = generateProjectOverview({
      ...baseSummary,
      scripts: { build: 'tsc', test: 'vitest run' },
    });
    expect(result).toContain('## Scripts');
    expect(result).toContain('| `build` | `tsc` |');
    expect(result).toContain('| `test` | `vitest run` |');
  });

  it('renders fallback message when no scripts are defined', () => {
    const result = generateProjectOverview(baseSummary);
    expect(result).toContain('No scripts configured.');
  });

  it('renders production dependencies section', () => {
    const result = generateProjectOverview({
      ...baseSummary,
      dependencies: { react: '^18.0.0', zod: '^3.0.0' },
    });
    expect(result).toContain('### Production Dependencies');
    expect(result).toContain('- `react`: `^18.0.0`');
    expect(result).toContain('- `zod`: `^3.0.0`');
  });

  it('renders dev dependencies section', () => {
    const result = generateProjectOverview({
      ...baseSummary,
      devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
    });
    expect(result).toContain('### Dev Dependencies');
    expect(result).toContain('- `vitest`: `^1.0.0`');
    expect(result).toContain('- `typescript`: `^5.0.0`');
  });

  it('omits dependencies sections when empty', () => {
    const result = generateProjectOverview(baseSummary);
    expect(result).not.toContain('### Production Dependencies');
    expect(result).not.toContain('### Dev Dependencies');
  });

  it('starts with the # Project Overview heading', () => {
    const result = generateProjectOverview(baseSummary);
    expect(result.startsWith('# Project Overview')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateArchitecture
// ---------------------------------------------------------------------------

describe('generateArchitecture', () => {
  it('starts with the # Architecture heading', () => {
    const result = generateArchitecture(baseSummary);
    expect(result.startsWith('# Architecture')).toBe(true);
  });

  it('omits module sections when both tsModules and pythonModules are empty', () => {
    const result = generateArchitecture(baseSummary);
    expect(result).not.toContain('## TypeScript / JavaScript Modules');
    expect(result).not.toContain('## Python Modules');
  });

  it('renders TypeScript module section with exports', () => {
    const result = generateArchitecture({
      ...baseSummary,
      tsModules: [
        {
          path: 'src/index.ts',
          exports: ['foo', 'bar'],
          classes: [],
          functions: [],
          imports: [],
        },
      ],
    });
    expect(result).toContain('## TypeScript / JavaScript Modules');
    expect(result).toContain('src/index.ts');
    expect(result).toContain('`foo`');
    expect(result).toContain('`bar`');
  });

  it('shows *none* when a TypeScript module has no exports', () => {
    const result = generateArchitecture({
      ...baseSummary,
      tsModules: [
        {
          path: 'src/empty.ts',
          exports: [],
          classes: [],
          functions: [],
          imports: [],
        },
      ],
    });
    expect(result).toContain('*none*');
  });

  it('renders TypeScript module classes with methods', () => {
    const result = generateArchitecture({
      ...baseSummary,
      tsModules: [
        {
          path: 'src/service.ts',
          exports: ['MyService'],
          classes: [{ name: 'MyService', methods: ['run', 'stop'] }],
          functions: [],
          imports: [],
        },
      ],
    });
    expect(result).toContain('**Classes:**');
    expect(result).toContain('`MyService`');
    expect(result).toContain('`run`');
    expect(result).toContain('`stop`');
  });

  it('renders TypeScript module functions', () => {
    const result = generateArchitecture({
      ...baseSummary,
      tsModules: [
        {
          path: 'src/utils.ts',
          exports: ['helper'],
          classes: [],
          functions: ['helper', 'parse'],
          imports: [],
        },
      ],
    });
    expect(result).toContain('**Functions:**');
    expect(result).toContain('`helper`');
    expect(result).toContain('`parse`');
  });

  it('renders TypeScript module imports', () => {
    const result = generateArchitecture({
      ...baseSummary,
      tsModules: [
        {
          path: 'src/app.ts',
          exports: [],
          classes: [],
          functions: [],
          imports: [{ from: 'node:fs', names: ['readFile'] }],
        },
      ],
    });
    expect(result).toContain('**Imports from:**');
    expect(result).toContain('`node:fs`');
  });

  it('renders Python module section', () => {
    const result = generateArchitecture({
      ...baseSummary,
      pythonModules: [
        {
          path: 'src/main.py',
          exports: [],
          classes: [{ name: 'Processor', methods: [] }],
          functions: ['run'],
          imports: [{ module: 'os', names: [] }],
        },
      ],
    });
    expect(result).toContain('## Python Modules');
    expect(result).toContain('src/main.py');
    expect(result).toContain('`Processor`');
    expect(result).toContain('`run`');
    expect(result).toContain('`os`');
  });
});

// ---------------------------------------------------------------------------
// generateActiveContext
// ---------------------------------------------------------------------------

describe('generateActiveContext', () => {
  it('starts with the # Active Context heading', () => {
    const result = generateActiveContext(baseSummary);
    expect(result.startsWith('# Active Context')).toBe(true);
  });

  it('shows current git branch', () => {
    const result = generateActiveContext({ ...baseSummary, gitBranch: 'feature/auth' });
    expect(result).toContain('`feature/auth`');
  });

  it('shows fallback when git branch is missing', () => {
    const result = generateActiveContext({ ...baseSummary, gitBranch: '' });
    expect(result).toContain('`not detected`');
  });

  it('renders recent commits when present', () => {
    const result = generateActiveContext({
      ...baseSummary,
      gitCommits: ['abc1234 fix: typo', 'def5678 feat: add login'],
    });
    expect(result).toContain('`abc1234 fix: typo`');
    expect(result).toContain('`def5678 feat: add login`');
  });

  it('renders fallback message when no commits', () => {
    const result = generateActiveContext({ ...baseSummary, gitCommits: [] });
    expect(result).toContain('No recent commits found');
  });

  it('renders TODO/FIXME table when todos are present', () => {
    const result = generateActiveContext({
      ...baseSummary,
      todos: [
        { file: 'src/index.ts', line: 10, type: 'TODO', text: 'refactor this' },
        { file: 'src/utils.ts', line: 42, type: 'FIXME', text: 'handle edge case' },
      ],
    });
    expect(result).toContain('| File | Line | Type | Message |');
    expect(result).toContain('src/index.ts');
    expect(result).toContain('**TODO**');
    expect(result).toContain('refactor this');
    expect(result).toContain('src/utils.ts');
    expect(result).toContain('**FIXME**');
    expect(result).toContain('handle edge case');
  });

  it('renders fallback message when no todos', () => {
    const result = generateActiveContext({ ...baseSummary, todos: [] });
    expect(result).toContain('No TODO or FIXME comments found in the code.');
  });
});

// ---------------------------------------------------------------------------
// generateAIBrief
// ---------------------------------------------------------------------------

describe('generateAIBrief', () => {
  const TOKEN_BUDGET = 8000;

  it('starts with the # AI Brief heading', () => {
    const result = generateAIBrief(baseSummary, TOKEN_BUDGET);
    expect(result.startsWith('# AI Brief')).toBe(true);
  });

  it('includes project name, languages and branch', () => {
    const result = generateAIBrief(
      { ...baseSummary, languages: ['TypeScript'], gitBranch: 'develop' },
      TOKEN_BUDGET,
    );
    expect(result).toContain('my-project');
    expect(result).toContain('TypeScript');
    expect(result).toContain('develop');
  });

  it('shows "not detected" when git branch is empty', () => {
    const result = generateAIBrief({ ...baseSummary, gitBranch: '' }, TOKEN_BUDGET);
    expect(result).toContain('not detected');
  });

  it('renders all dependencies when there are 10 or fewer', () => {
    const deps = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`dep-${i}`, `^${i}.0.0`]),
    );
    const result = generateAIBrief({ ...baseSummary, dependencies: deps }, TOKEN_BUDGET);
    expect(result).toContain('### Key Dependencies');
    for (const key of Object.keys(deps)) {
      expect(result).toContain(`\`${key}\``);
    }
  });

  it('truncates dependencies list when more than 10 deps and budget allows', () => {
    const deps = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [`dep-${i}`, `^${i}.0.0`]),
    );
    const result = generateAIBrief({ ...baseSummary, dependencies: deps }, TOKEN_BUDGET);
    expect(result).toContain('and');
  });

  it('renders TypeScript module details within budget', () => {
    const result = generateAIBrief(
      {
        ...baseSummary,
        tsModules: [
          {
            path: 'src/api.ts',
            exports: ['createServer', 'stopServer'],
            classes: [{ name: 'ApiServer', methods: [] }],
            functions: [],
            imports: [],
          },
        ],
      },
      TOKEN_BUDGET,
    );
    expect(result).toContain('#### TypeScript/JavaScript Modules');
    expect(result).toContain('src/api.ts');
    expect(result).toContain('**Exports:**');
    expect(result).toContain('`createServer`');
    expect(result).toContain('**Classes:**');
    expect(result).toContain('`ApiServer`');
  });

  it('abbreviates exports list when module has more than 5 exports', () => {
    const result = generateAIBrief(
      {
        ...baseSummary,
        tsModules: [
          {
            path: 'src/big.ts',
            exports: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            classes: [],
            functions: [],
            imports: [],
          },
        ],
      },
      TOKEN_BUDGET,
    );
    expect(result).toContain('others');
  });

  it('renders Python module details within budget', () => {
    const result = generateAIBrief(
      {
        ...baseSummary,
        pythonModules: [
          {
            path: 'scripts/process.py',
            exports: [],
            classes: [{ name: 'Processor', methods: [] }],
            functions: ['run', 'cleanup'],
            imports: [],
          },
        ],
      },
      TOKEN_BUDGET,
    );
    expect(result).toContain('#### Python Modules');
    expect(result).toContain('scripts/process.py');
    expect(result).toContain('`Processor`');
    expect(result).toContain('`run`');
  });

  it('abbreviates python functions list when more than 5 functions', () => {
    const result = generateAIBrief(
      {
        ...baseSummary,
        pythonModules: [
          {
            path: 'scripts/big.py',
            exports: [],
            classes: [],
            functions: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
            imports: [],
          },
        ],
      },
      TOKEN_BUDGET,
    );
    expect(result).toContain('others');
  });

  it('renders all todos when 5 or fewer', () => {
    const todos = Array.from({ length: 4 }, (_, i) => ({
      file: `src/file${i}.ts`,
      line: i + 1,
      type: 'TODO' as const,
      text: `task ${i}`,
    }));
    const result = generateAIBrief({ ...baseSummary, todos }, TOKEN_BUDGET);
    expect(result).toContain('### Active Todos');
    for (const todo of todos) {
      expect(result).toContain(todo.text);
    }
  });

  it('truncates todos list when more than 5 and budget allows', () => {
    const todos = Array.from({ length: 8 }, (_, i) => ({
      file: `src/file${i}.ts`,
      line: i + 1,
      type: 'TODO' as const,
      text: `task ${i}`,
    }));
    const result = generateAIBrief({ ...baseSummary, todos }, TOKEN_BUDGET);
    expect(result).toContain('and');
    expect(result).toContain('other todos in the code');
  });

  it('truncates output when token budget is exceeded', () => {
    // baseSummary alone produces ~200 chars (~50 tokens); use budget=10 to force truncation
    const tinyBudget = 10;
    const result = generateAIBrief(baseSummary, tinyBudget);
    expect(result).toContain('TRUNCATED - BUDGET LIMIT EXCEEDED');
  });

  it('does not truncate output when token budget is sufficient', () => {
    const result = generateAIBrief(baseSummary, TOKEN_BUDGET);
    expect(result).not.toContain('TRUNCATED');
  });
});
