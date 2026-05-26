import { describe, it, expect } from 'vitest';
import { parseJava } from './java.js';

const FILE = 'Main.java';

describe('parseJava', () => {
  describe('import statements', () => {
    it('parses a standard import', async () => {
      const result = await parseJava(FILE, 'import java.util.List;');
      expect(result.imports).toEqual([{ from: 'java.util', names: ['List'] }]);
    });

    it('parses multiple imports', async () => {
      const code = 'import java.util.List;\nimport java.util.Map;';
      const result = await parseJava(FILE, code);
      expect(result.imports).toHaveLength(2);
    });

    it('parses wildcard import with empty names', async () => {
      const result = await parseJava(FILE, 'import java.util.*;');
      expect(result.imports[0].names).toEqual(['*']);
    });

    it('skips static imports', async () => {
      const result = await parseJava(FILE, 'import static java.util.Collections.sort;');
      expect(result.imports).toHaveLength(0);
    });
  });

  describe('classes and interfaces', () => {
    it('parses a public class and adds it to exports', async () => {
      const result = await parseJava(FILE, 'public class Foo {}');
      expect(result.classes).toEqual([{ name: 'Foo', methods: [] }]);
      expect(result.exports).toContain('Foo');
    });

    it('parses a public interface', async () => {
      const result = await parseJava(FILE, 'public interface IService {}');
      expect(result.classes[0].name).toBe('IService');
      expect(result.exports).toContain('IService');
    });

    it('parses public methods inside a class', async () => {
      const code = 'public class Foo {\n    public void bar() {}\n    public String baz() { return ""; }\n}';
      const result = await parseJava(FILE, code);
      expect(result.classes[0].methods).toEqual(['bar', 'baz']);
      expect(result.functions).not.toContain('bar');
    });

    it('does not add a package-private class to exports', async () => {
      const result = await parseJava(FILE, 'class Helper {}');
      expect(result.classes[0].name).toBe('Helper');
      expect(result.exports).not.toContain('Helper');
    });

    it('parses an abstract class', async () => {
      const result = await parseJava(FILE, 'public abstract class Base {}');
      expect(result.classes[0].name).toBe('Base');
      expect(result.exports).toContain('Base');
    });

    it('attributes methods to the correct class in a multi-class file', async () => {
      const code = 'public class A {\n    public void foo() {}\n}\npublic class B {\n    public void bar() {}\n}';
      const result = await parseJava(FILE, code);
      expect(result.classes[0].methods).toEqual(['foo']);
      expect(result.classes[1].methods).toEqual(['bar']);
    });

    it('does not capture protected or private methods', async () => {
      const code = 'public class Foo {\n    protected void helper() {}\n    private void secret() {}\n}';
      const result = await parseJava(FILE, code);
      expect(result.classes[0].methods).toHaveLength(0);
    });
  });

  describe('top-level static functions', () => {
    it('parses a public static top-level method', async () => {
      const result = await parseJava(FILE, 'public static void main(String[] args) {}');
      expect(result.functions).toContain('main');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseJava(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseJava(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
