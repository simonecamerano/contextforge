import { describe, it, expect } from 'vitest';
import { parseCSharp } from './csharp.js';

const FILE = 'Program.cs';

describe('parseCSharp', () => {
  describe('using statements (imports)', () => {
    it('parses a using statement', async () => {
      const result = await parseCSharp(FILE, 'using System.Collections.Generic;');
      expect(result.imports).toEqual([{ from: 'System.Collections.Generic', names: [] }]);
    });

    it('parses multiple using statements', async () => {
      const code = 'using System;\nusing System.IO;';
      const result = await parseCSharp(FILE, code);
      expect(result.imports).toHaveLength(2);
    });

    it('does not parse a using variable declaration as an import', async () => {
      const result = await parseCSharp(FILE, '    using var conn = new SqlConnection();');
      expect(result.imports).toHaveLength(0);
    });
  });

  describe('classes and interfaces', () => {
    it('parses a public class and adds it to exports', async () => {
      const result = await parseCSharp(FILE, 'public class Foo {}');
      expect(result.classes[0].name).toBe('Foo');
      expect(result.exports).toContain('Foo');
    });

    it('does not add a non-public class to exports', async () => {
      const result = await parseCSharp(FILE, 'class Helper {}');
      expect(result.classes[0].name).toBe('Helper');
      expect(result.exports).not.toContain('Helper');
    });

    it('parses a public interface', async () => {
      const result = await parseCSharp(FILE, 'public interface IService {}');
      expect(result.classes[0].name).toBe('IService');
      expect(result.exports).toContain('IService');
    });

    it('parses public methods inside a class', async () => {
      const code = 'public class Foo {\n    public void Bar() {}\n    public string Baz() { return ""; }\n}';
      const result = await parseCSharp(FILE, code);
      expect(result.classes[0].methods).toEqual(['Bar', 'Baz']);
      expect(result.functions).not.toContain('Bar');
    });

    it('attributes methods to the correct class in a multi-class file', async () => {
      const code = 'public class A {\n    public void Foo() {}\n}\npublic class B {\n    public void Bar() {}\n}';
      const result = await parseCSharp(FILE, code);
      expect(result.classes[0].methods).toEqual(['Foo']);
      expect(result.classes[1].methods).toEqual(['Bar']);
    });

    it('does not capture private or protected methods', async () => {
      const code = 'public class Foo {\n    private void Secret() {}\n    protected void Internal() {}\n}';
      const result = await parseCSharp(FILE, code);
      expect(result.classes[0].methods).toHaveLength(0);
    });
  });

  describe('top-level static functions', () => {
    it('parses a public static function outside a class', async () => {
      const result = await parseCSharp(FILE, 'public static string ComputeHash(string input) {}');
      expect(result.functions).toContain('ComputeHash');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseCSharp(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseCSharp(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
