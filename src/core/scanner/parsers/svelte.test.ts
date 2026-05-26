import { describe, it, expect } from 'vitest';
import { parseSvelte } from './svelte.js';

const FILE = 'App.svelte';

describe('parseSvelte', () => {
  it('extracts imports from the <script> block', async () => {
    const code = '<script>\nimport { writable } from "svelte/store";\n</script>\n<div/>';
    const result = await parseSvelte(FILE, code);
    expect(result.imports.some((i) => i.from === 'svelte/store')).toBe(true);
  });

  it('extracts exports from the <script> block', async () => {
    const code = '<script>\nexport let count = 0;\n</script>';
    const result = await parseSvelte(FILE, code);
    expect(result.exports).toContain('count');
  });

  it('handles <script lang="ts"> attribute', async () => {
    const code = '<script lang="ts">\nimport { writable } from "svelte/store";\nexport let name: string = "";\n</script>';
    const result = await parseSvelte(FILE, code);
    expect(result.imports.some((i) => i.from === 'svelte/store')).toBe(true);
    expect(result.exports).toContain('name');
  });

  it('returns empty result when there is no <script> block', async () => {
    const code = '<div>Hello</div>';
    const result = await parseSvelte(FILE, code);
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });

  it('returns empty result for empty string', async () => {
    const result = await parseSvelte(FILE, '');
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });
});
