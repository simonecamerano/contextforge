import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  shims: true,
  external: ['typescript', 'commander', 'cosmiconfig', 'eta', 'ignore', 'zod'],
});
