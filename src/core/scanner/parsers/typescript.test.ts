import { describe, it, expect } from 'vitest';
import { parseTypeScript } from './typescript.js';

const FILE = 'test.ts';

describe('parseTypeScript', () => {
  // ── imports ────────────────────────────────────────────────────────────────

  describe('imports', () => {
    it('parses a default import', async () => {
      const result = await parseTypeScript(FILE, `import fs from 'node:fs';`);
      expect(result.imports).toEqual([{ from: 'node:fs', names: ['fs'] }]);
    });

    it('parses named imports', async () => {
      const result = await parseTypeScript(FILE, `import { readFile, writeFile } from 'node:fs/promises';`);
      expect(result.imports).toEqual([
        { from: 'node:fs/promises', names: ['readFile', 'writeFile'] },
      ]);
    });

    it('parses a namespace import', async () => {
      const result = await parseTypeScript(FILE, `import * as path from 'node:path';`);
      expect(result.imports).toEqual([{ from: 'node:path', names: ['* as path'] }]);
    });

    it('parses a default import alongside named imports', async () => {
      const result = await parseTypeScript(FILE, `import React, { useState, useEffect } from 'react';`);
      expect(result.imports).toEqual([
        { from: 'react', names: ['React', 'useState', 'useEffect'] },
      ]);
    });

    it('parses a side-effect-only import (no names)', async () => {
      const result = await parseTypeScript(FILE, `import './styles.css';`);
      expect(result.imports).toEqual([{ from: './styles.css', names: [] }]);
    });

    it('parses multiple import statements', async () => {
      const code = `
        import fs from 'node:fs';
        import { join } from 'node:path';
      `;
      const result = await parseTypeScript(FILE, code);
      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toEqual({ from: 'node:fs', names: ['fs'] });
      expect(result.imports[1]).toEqual({ from: 'node:path', names: ['join'] });
    });
  });

  // ── functions ──────────────────────────────────────────────────────────────

  describe('functions', () => {
    it('collects a regular function declaration', async () => {
      const result = await parseTypeScript(FILE, `function greet(name: string) {}`);
      expect(result.functions).toContain('greet');
    });

    it('does not include anonymous function declarations', async () => {
      const result = await parseTypeScript(FILE, `export default function() {}`);
      expect(result.functions).toHaveLength(0);
    });

    it('collects multiple function declarations', async () => {
      const code = `
        function foo() {}
        function bar() {}
      `;
      const result = await parseTypeScript(FILE, code);
      expect(result.functions).toEqual(['foo', 'bar']);
    });

    it('adds exported function to exports', async () => {
      const result = await parseTypeScript(FILE, `export function doWork() {}`);
      expect(result.functions).toContain('doWork');
      expect(result.exports).toContain('doWork');
    });

    it('does not add non-exported function to exports', async () => {
      const result = await parseTypeScript(FILE, `function helper() {}`);
      expect(result.functions).toContain('helper');
      expect(result.exports).not.toContain('helper');
    });
  });

  // ── classes ────────────────────────────────────────────────────────────────

  describe('classes', () => {
    it('collects a class declaration', async () => {
      const result = await parseTypeScript(FILE, `class Animal {}`);
      expect(result.classes).toEqual([{ name: 'Animal', methods: [] }]);
    });

    it('collects class methods', async () => {
      const code = `
        class Dog {
          bark() {}
          fetch() {}
        }
      `;
      const result = await parseTypeScript(FILE, code);
      expect(result.classes).toEqual([{ name: 'Dog', methods: ['bark', 'fetch'] }]);
    });

    it('adds exported class to exports', async () => {
      const result = await parseTypeScript(FILE, `export class Service {}`);
      expect(result.classes[0]?.name).toBe('Service');
      expect(result.exports).toContain('Service');
    });

    it('does not add non-exported class to exports', async () => {
      const result = await parseTypeScript(FILE, `class Internal {}`);
      expect(result.exports).not.toContain('Internal');
    });

    it('handles multiple classes', async () => {
      const code = `
        class A { run() {} }
        export class B { stop() {} }
      `;
      const result = await parseTypeScript(FILE, code);
      expect(result.classes).toHaveLength(2);
      expect(result.exports).toEqual(['B']);
    });
  });

  // ── exports ────────────────────────────────────────────────────────────────

  describe('exports', () => {
    it('collects exported variable declarations', async () => {
      const result = await parseTypeScript(FILE, `export const VERSION = '1.0.0';`);
      expect(result.exports).toContain('VERSION');
    });

    it('collects multiple exported variables in one statement', async () => {
      const result = await parseTypeScript(FILE, `export const A = 1, B = 2;`);
      expect(result.exports).toEqual(expect.arrayContaining(['A', 'B']));
    });

    it('collects named re-exports', async () => {
      const result = await parseTypeScript(FILE, `export { foo, bar } from './utils';`);
      expect(result.exports).toEqual(expect.arrayContaining(['foo', 'bar']));
    });

    it('collects local named export declarations', async () => {
      const code = `
        const x = 42;
        export { x };
      `;
      const result = await parseTypeScript(FILE, code);
      expect(result.exports).toContain('x');
    });
  });

  // ── combined / realistic snippets ─────────────────────────────────────────

  describe('combined scenarios', () => {
    it('parses a realistic module with imports, a class, and functions', async () => {
      const code = `
        import { EventEmitter } from 'node:events';
        import type { Logger } from './logger.js';

        export class Worker extends EventEmitter {
          start() {}
          stop() {}
        }

        export function createWorker(): Worker {
          return new Worker();
        }

        function internalHelper() {}
      `;
      const result = await parseTypeScript(FILE, code);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toEqual({ from: 'node:events', names: ['EventEmitter'] });
      expect(result.imports[1]).toEqual({ from: './logger.js', names: ['Logger'] });

      expect(result.classes).toEqual([{ name: 'Worker', methods: ['start', 'stop'] }]);
      expect(result.functions).toEqual(['createWorker', 'internalHelper']);

      expect(result.exports).toEqual(expect.arrayContaining(['Worker', 'createWorker']));
      expect(result.exports).not.toContain('internalHelper');
    });
  });

  // ── error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns empty result for an empty string', async () => {
      const result = await parseTypeScript(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result when content throws during traversal', async () => {
      // Pass something that would cause ts.createSourceFile to behave unexpectedly;
      // the catch block should return the empty object.
      const result = await parseTypeScript(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
