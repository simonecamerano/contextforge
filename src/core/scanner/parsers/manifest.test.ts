import { describe, it, expect } from 'vitest';
import { parseManifest } from './manifest.js';

// ── parseManifest (dispatch) ─────────────────────────────────────────────────

describe('parseManifest', () => {
  it('dispatches to package.json parser', async () => {
    const result = await parseManifest('/project/package.json', '{"name":"my-app"}');
    expect(result.name).toBe('my-app');
  });

  it('dispatches to requirements.txt parser', async () => {
    const result = await parseManifest('/project/requirements.txt', 'requests==2.28.0\n');
    expect(result.packages).toContain('requests');
  });

  it('dispatches to pyproject.toml parser', async () => {
    const result = await parseManifest('/project/pyproject.toml', 'name = "my-lib"\n');
    expect(result.name).toBe('my-lib');
  });

  it('returns empty object for unknown file types', async () => {
    const result = await parseManifest('/project/Gemfile', 'gem "rails"');
    expect(result).toEqual({});
  });

  it('returns empty object when parser throws', async () => {
    const result = await parseManifest('/project/package.json', '{invalid json}');
    expect(result).toEqual({});
  });
});

// ── package.json ─────────────────────────────────────────────────────────────

describe('parseManifest — package.json', () => {
  const FILE = '/project/package.json';

  it('parses name and version', async () => {
    const content = JSON.stringify({ name: 'my-pkg', version: '1.2.3' });
    const result = await parseManifest(FILE, content);
    expect(result.name).toBe('my-pkg');
    expect(result.version).toBe('1.2.3');
  });

  it('parses dependencies', async () => {
    const content = JSON.stringify({ dependencies: { express: '^4.18.0', lodash: '^4.17.21' } });
    const result = await parseManifest(FILE, content);
    expect(result.dependencies).toEqual({ express: '^4.18.0', lodash: '^4.17.21' });
  });

  it('parses devDependencies', async () => {
    const content = JSON.stringify({ devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' } });
    const result = await parseManifest(FILE, content);
    expect(result.devDependencies).toEqual({ vitest: '^1.0.0', typescript: '^5.0.0' });
  });

  it('parses scripts', async () => {
    const content = JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } });
    const result = await parseManifest(FILE, content);
    expect(result.scripts).toEqual({ build: 'tsc', test: 'vitest' });
  });

  it('parses a full realistic package.json', async () => {
    const content = JSON.stringify({
      name: 'full-app',
      version: '2.0.0',
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0' },
      scripts: { dev: 'vite', build: 'vite build' },
    });
    const result = await parseManifest(FILE, content);
    expect(result.name).toBe('full-app');
    expect(result.version).toBe('2.0.0');
    expect(result.dependencies).toEqual({ react: '^18.0.0' });
    expect(result.devDependencies).toEqual({ vite: '^5.0.0' });
    expect(result.scripts).toEqual({ dev: 'vite', build: 'vite build' });
  });

  it('returns empty object for invalid JSON', async () => {
    const result = await parseManifest(FILE, '{ not valid json }');
    expect(result).toEqual({});
  });

  it('returns empty object for empty string', async () => {
    const result = await parseManifest(FILE, '');
    expect(result).toEqual({});
  });

  it('returns object with undefined fields when keys are absent', async () => {
    const result = await parseManifest(FILE, '{}');
    expect(result.name).toBeUndefined();
    expect(result.version).toBeUndefined();
    expect(result.dependencies).toBeUndefined();
  });
});

// ── requirements.txt ─────────────────────────────────────────────────────────

describe('parseManifest — requirements.txt', () => {
  const FILE = '/project/requirements.txt';

  it('parses a plain package name', async () => {
    const result = await parseManifest(FILE, 'flask\n');
    expect(result.packages).toEqual(['flask']);
  });

  it('parses package with == version', async () => {
    const result = await parseManifest(FILE, 'requests==2.28.0\n');
    expect(result.packages).toContain('requests');
    expect(result.packages).not.toContain('requests==2.28.0');
  });

  it('parses package with >= version', async () => {
    const result = await parseManifest(FILE, 'numpy>=1.24.0\n');
    expect(result.packages).toContain('numpy');
  });

  it('parses package with ~= version', async () => {
    const result = await parseManifest(FILE, 'django~=4.2\n');
    expect(result.packages).toContain('django');
  });

  it('parses package with extras (square bracket)', async () => {
    const result = await parseManifest(FILE, 'celery[redis]\n');
    expect(result.packages).toContain('celery');
  });

  it('skips comment lines starting with #', async () => {
    const result = await parseManifest(FILE, '# this is a comment\nrequests\n');
    expect(result.packages).toEqual(['requests']);
    expect(result.packages).not.toContain('# this is a comment');
  });

  it('skips blank lines', async () => {
    const result = await parseManifest(FILE, '\nrequests\n\nflask\n');
    expect(result.packages).toEqual(['requests', 'flask']);
  });

  it('skips http:// URL lines', async () => {
    const result = await parseManifest(FILE, 'http://example.com/pkg.tar.gz\nrequests\n');
    expect(result.packages).toEqual(['requests']);
  });

  it('skips https:// URL lines', async () => {
    const result = await parseManifest(FILE, 'https://example.com/pkg.tar.gz\nrequests\n');
    expect(result.packages).toEqual(['requests']);
  });

  it('skips lines starting with - (flags like -r or -e)', async () => {
    const result = await parseManifest(FILE, '-r other.txt\n-e .\nrequests\n');
    expect(result.packages).toEqual(['requests']);
  });

  it('parses multiple packages', async () => {
    const content = 'requests==2.28.0\nflask>=2.0\nnumpy\n';
    const result = await parseManifest(FILE, content);
    expect(result.packages).toEqual(['requests', 'flask', 'numpy']);
  });

  it('returns empty packages array for empty file', async () => {
    const result = await parseManifest(FILE, '');
    expect(result.packages).toEqual([]);
  });

  it('handles inline semicolon environment markers', async () => {
    const result = await parseManifest(FILE, 'pywin32;sys_platform=="win32"\n');
    expect(result.packages).toContain('pywin32');
  });
});

// ── pyproject.toml ───────────────────────────────────────────────────────────

describe('parseManifest — pyproject.toml', () => {
  const FILE = '/project/pyproject.toml';

  it('parses name from [tool.poetry] or [project]', async () => {
    const content = `[tool.poetry]\nname = "my-lib"\nversion = "0.1.0"\n`;
    const result = await parseManifest(FILE, content);
    expect(result.name).toBe('my-lib');
  });

  it('parses version', async () => {
    const content = `[tool.poetry]\nname = "pkg"\nversion = "3.0.1"\n`;
    const result = await parseManifest(FILE, content);
    expect(result.version).toBe('3.0.1');
  });

  it('parses poetry dependencies (excludes python)', async () => {
    const content = [
      '[tool.poetry.dependencies]',
      'python = "^3.11"',
      'requests = "^2.28.0"',
      'click = "^8.0"',
    ].join('\n');
    const result = await parseManifest(FILE, content);
    expect(result.dependencies).toBeDefined();
    expect(result.dependencies!['requests']).toBe('^2.28.0');
    expect(result.dependencies!['click']).toBe('^8.0');
    expect(result.dependencies!['python']).toBeUndefined();
  });

  it('parses PEP 621 [project] dependencies array', async () => {
    const content = [
      '[project]',
      'name = "my-project"',
      'version = "1.0.0"',
      'dependencies = [',
      '  "requests>=2.28",',
      '  "click>=8.0",',
      ']',
    ].join('\n');
    const result = await parseManifest(FILE, content);
    expect(result.dependencies).toBeDefined();
    expect(result.dependencies!['requests']).toBeDefined();
    expect(result.dependencies!['click']).toBeDefined();
  });

  it('returns empty object for empty content', async () => {
    const result = await parseManifest(FILE, '');
    expect(result).toEqual({});
  });

  it('returns no dependencies key when no dependencies are found', async () => {
    const content = `[tool.poetry]\nname = "bare-pkg"\nversion = "0.1.0"\n`;
    const result = await parseManifest(FILE, content);
    expect(result.dependencies).toBeUndefined();
  });

  it('parses name with double quotes', async () => {
    const result = await parseManifest(FILE, 'name = "double-quoted"\n');
    expect(result.name).toBe('double-quoted');
  });

  it('parses name with single quotes', async () => {
    const result = await parseManifest(FILE, "name = 'single-quoted'\n");
    expect(result.name).toBe('single-quoted');
  });

  it('parses a realistic full pyproject.toml (Poetry)', async () => {
    const content = [
      '[tool.poetry]',
      'name = "my-service"',
      'version = "2.1.0"',
      '',
      '[tool.poetry.dependencies]',
      'python = "^3.11"',
      'fastapi = "^0.100.0"',
      'uvicorn = "^0.23.0"',
      '',
      '[build-system]',
      'requires = ["poetry-core"]',
    ].join('\n');
    const result = await parseManifest(FILE, content);
    expect(result.name).toBe('my-service');
    expect(result.version).toBe('2.1.0');
    expect(result.dependencies!['fastapi']).toBe('^0.100.0');
    expect(result.dependencies!['uvicorn']).toBe('^0.23.0');
    expect(result.dependencies!['python']).toBeUndefined();
  });
});
