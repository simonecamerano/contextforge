import { describe, it, expect } from 'vitest';
import { parsePHP } from './php.js';

const FILE = 'test.php';

describe('parsePHP', () => {
  describe('use statements (imports)', () => {
    it('parses a simple use statement', async () => {
      const result = await parsePHP(FILE, 'use Foo\\Bar;');
      expect(result.imports).toEqual([{ from: 'Foo\\Bar', names: ['Bar'] }]);
    });

    it('parses a use statement with alias (alias is ignored, original name kept)', async () => {
      const result = await parsePHP(FILE, 'use Foo\\Bar as Baz;');
      expect(result.imports).toEqual([{ from: 'Foo\\Bar', names: ['Bar'] }]);
    });

    it('parses multiple use statements', async () => {
      const code = 'use Foo\\Bar;\nuse Baz\\Qux;';
      const result = await parsePHP(FILE, code);
      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toEqual({ from: 'Foo\\Bar', names: ['Bar'] });
      expect(result.imports[1]).toEqual({ from: 'Baz\\Qux', names: ['Qux'] });
    });
  });

  describe('classes', () => {
    it('parses a class and adds it to exports', async () => {
      const result = await parsePHP(FILE, 'class Foo {}');
      expect(result.classes).toEqual([{ name: 'Foo', methods: [] }]);
      expect(result.exports).toContain('Foo');
    });

    it('parses an abstract class', async () => {
      const result = await parsePHP(FILE, 'abstract class Base {}');
      expect(result.classes[0].name).toBe('Base');
    });

    it('parses public methods inside a class body', async () => {
      const code = 'class Foo {\n    public function bar() {}\n    public function baz() {}\n}';
      const result = await parsePHP(FILE, code);
      expect(result.classes[0].methods).toEqual(['bar', 'baz']);
      expect(result.functions).not.toContain('bar');
    });
  });

  describe('functions', () => {
    it('parses a top-level function and adds it to exports', async () => {
      const result = await parsePHP(FILE, 'function greet() {}');
      expect(result.functions).toContain('greet');
      expect(result.exports).toContain('greet');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parsePHP(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parsePHP(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
