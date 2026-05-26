import { describe, it, expect } from 'vitest';
import { parseVue } from './vue.js';

const FILE = 'Component.vue';

describe('parseVue', () => {
  it('extracts imports from the <script> block', async () => {
    const code = '<template><div/></template>\n<script>\nimport { ref } from "vue";\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.imports.some((i) => i.from === 'vue')).toBe(true);
  });

  it('extracts exports from the <script> block', async () => {
    const code = '<script>\nexport function useCounter() {}\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.exports).toContain('useCounter');
  });

  it('handles <script lang="ts"> attribute', async () => {
    const code = '<script lang="ts">\nimport { ref } from "vue";\nexport function setup() {}\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.imports.some((i) => i.from === 'vue')).toBe(true);
    expect(result.exports).toContain('setup');
  });

  it('returns empty result when there is no <script> block', async () => {
    const code = '<template><div>Hello</div></template>';
    const result = await parseVue(FILE, code);
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });

  it('returns empty result for empty string', async () => {
    const result = await parseVue(FILE, '');
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });
});
