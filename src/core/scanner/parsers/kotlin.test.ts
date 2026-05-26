import { describe, it, expect } from 'vitest';
import { parseKotlin } from './kotlin.js';

const FILE = 'Main.kt';

describe('parseKotlin', () => {
  describe('import statements', () => {
    it('parses a standard import', async () => {
      const result = await parseKotlin(FILE, 'import kotlin.collections.List');
      expect(result.imports).toEqual([{ from: 'kotlin.collections', names: ['List'] }]);
    });

    it('parses multiple imports', async () => {
      const code = 'import kotlin.collections.List\nimport kotlin.collections.Map';
      const result = await parseKotlin(FILE, code);
      expect(result.imports).toHaveLength(2);
    });
  });

  describe('classes and objects', () => {
    it('parses a class and adds it to exports', async () => {
      const result = await parseKotlin(FILE, 'class Greeter {}');
      expect(result.classes[0].name).toBe('Greeter');
      expect(result.exports).toContain('Greeter');
    });

    it('parses a data class', async () => {
      const result = await parseKotlin(FILE, 'data class User(val name: String)');
      expect(result.classes[0].name).toBe('User');
    });

    it('parses an object declaration', async () => {
      const result = await parseKotlin(FILE, 'object Singleton {}');
      expect(result.classes[0].name).toBe('Singleton');
    });

    it('parses methods inside a class', async () => {
      const code = 'class Greeter {\n    fun greet() {}\n    fun farewell() {}\n}';
      const result = await parseKotlin(FILE, code);
      expect(result.classes[0].methods).toEqual(['greet', 'farewell']);
    });

    it('attributes methods to the correct class in a multi-class file', async () => {
      const code = 'class A {\n    fun foo() {}\n}\nclass B {\n    fun bar() {}\n}';
      const result = await parseKotlin(FILE, code);
      expect(result.classes[0].methods).toEqual(['foo']);
      expect(result.classes[1].methods).toEqual(['bar']);
    });
  });

  describe('top-level functions', () => {
    it('parses a top-level fun', async () => {
      const result = await parseKotlin(FILE, 'fun main() {}');
      expect(result.functions).toContain('main');
      expect(result.exports).toContain('main');
    });

    it('does not add indented fun to top-level functions', async () => {
      const code = 'class Foo {\n    fun bar() {}\n}';
      const result = await parseKotlin(FILE, code);
      expect(result.functions).not.toContain('bar');
    });

    it('does not export a private top-level fun', async () => {
      const result = await parseKotlin(FILE, 'private fun helper() {}');
      expect(result.functions).not.toContain('helper');
      expect(result.exports).not.toContain('helper');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseKotlin(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseKotlin(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
