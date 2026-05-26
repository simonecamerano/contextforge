import { describe, it, expect } from 'vitest';
import { parseRuby } from './ruby.js';

const FILE = 'test.rb';

describe('parseRuby', () => {
  describe('require statements (imports)', () => {
    it('parses require', async () => {
      const result = await parseRuby(FILE, "require 'json'");
      expect(result.imports).toEqual([{ from: 'json', names: [] }]);
    });

    it('parses require_relative', async () => {
      const result = await parseRuby(FILE, "require_relative '../models/user'");
      expect(result.imports).toEqual([{ from: '../models/user', names: [] }]);
    });

    it('parses multiple require statements', async () => {
      const code = "require 'json'\nrequire 'net/http'";
      const result = await parseRuby(FILE, code);
      expect(result.imports).toHaveLength(2);
      expect(result.imports[1]).toEqual({ from: 'net/http', names: [] });
    });
  });

  describe('classes and modules', () => {
    it('parses a class and adds it to exports', async () => {
      const result = await parseRuby(FILE, 'class Animal\nend');
      expect(result.classes).toEqual([{ name: 'Animal', methods: [] }]);
      expect(result.exports).toContain('Animal');
    });

    it('parses a module', async () => {
      const result = await parseRuby(FILE, 'module Utils\nend');
      expect(result.classes[0].name).toBe('Utils');
      expect(result.exports).toContain('Utils');
    });

    it('parses public methods inside a class', async () => {
      const code = 'class Dog\n  def bark\n  end\n  def fetch\n  end\nend';
      const result = await parseRuby(FILE, code);
      expect(result.classes[0].methods).toEqual(['bark', 'fetch']);
      expect(result.functions).not.toContain('bark');
    });
  });

  describe('top-level functions', () => {
    it('parses a top-level def', async () => {
      const result = await parseRuby(FILE, 'def greet\nend');
      expect(result.functions).toContain('greet');
    });

    it('parses def self.method inside class as method', async () => {
      const code = 'class Foo\n  def self.create\n  end\nend';
      const result = await parseRuby(FILE, code);
      expect(result.classes[0].methods).toContain('create');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseRuby(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseRuby(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
