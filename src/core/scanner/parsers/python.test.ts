import { describe, it, expect } from 'vitest';
import { parsePython } from './python.js';

const FILE = 'test.py';

describe('parsePython', () => {
  // ── from … import ──────────────────────────────────────────────────────────

  describe('from … import', () => {
    it('parses a simple from-import', async () => {
      const result = await parsePython(FILE, 'from os import path');
      expect(result.imports).toEqual([{ module: 'os', names: ['path'] }]);
    });

    it('parses multiple names from a single from-import', async () => {
      const result = await parsePython(FILE, 'from os.path import join, exists, dirname');
      expect(result.imports).toEqual([
        { module: 'os.path', names: ['join', 'exists', 'dirname'] },
      ]);
    });

    it('parses a dotted module path', async () => {
      const result = await parsePython(FILE, 'from my.package.module import SomeClass');
      expect(result.imports).toEqual([{ module: 'my.package.module', names: ['SomeClass'] }]);
    });

    it('strips parentheses from multi-line style imports', async () => {
      const result = await parsePython(FILE, 'from typing import (Optional, List, Dict)');
      expect(result.imports).toEqual([
        { module: 'typing', names: ['Optional', 'List', 'Dict'] },
      ]);
    });

    it('ignores wildcard (*) in from-imports', async () => {
      const result = await parsePython(FILE, 'from os.path import *');
      expect(result.imports).toEqual([{ module: 'os.path', names: [] }]);
    });

    it('ignores inline comment tokens after #', async () => {
      const result = await parsePython(FILE, 'from os import path, # comment');
      const names = result.imports[0]?.names ?? [];
      expect(names).not.toContain('# comment');
      expect(names).toContain('path');
    });

    it('trims whitespace from imported names', async () => {
      const result = await parsePython(FILE, 'from os import  path ,  getcwd ');
      expect(result.imports[0]?.names).toEqual(['path', 'getcwd']);
    });
  });

  // ── import … ───────────────────────────────────────────────────────────────

  describe('import …', () => {
    it('parses a plain module import', async () => {
      const result = await parsePython(FILE, 'import os');
      expect(result.imports).toEqual([{ module: 'os', names: [] }]);
    });

    it('parses multiple modules in one import statement', async () => {
      const result = await parsePython(FILE, 'import os, sys, re');
      expect(result.imports).toEqual([
        { module: 'os', names: [] },
        { module: 'sys', names: [] },
        { module: 're', names: [] },
      ]);
    });

    it('strips "as" alias from import', async () => {
      const result = await parsePython(FILE, 'import numpy as np');
      expect(result.imports).toEqual([{ module: 'numpy', names: [] }]);
    });

    it('strips aliases from multiple modules in one import', async () => {
      const result = await parsePython(FILE, 'import os as operating_system, sys as system');
      expect(result.imports).toEqual([
        { module: 'os', names: [] },
        { module: 'sys', names: [] },
      ]);
    });

    it('parses a dotted module import', async () => {
      const result = await parsePython(FILE, 'import xml.etree.ElementTree');
      expect(result.imports).toEqual([{ module: 'xml.etree.ElementTree', names: [] }]);
    });
  });

  // ── classes ────────────────────────────────────────────────────────────────

  describe('classes', () => {
    it('parses a simple class definition', async () => {
      const result = await parsePython(FILE, 'class Animal:');
      expect(result.classes).toEqual(['Animal']);
    });

    it('parses a class with base class', async () => {
      const result = await parsePython(FILE, 'class Dog(Animal):');
      expect(result.classes).toEqual(['Dog']);
    });

    it('parses multiple class definitions', async () => {
      const code = `
class Foo:
    pass

class Bar(Foo):
    pass
      `;
      const result = await parsePython(FILE, code);
      expect(result.classes).toEqual(['Foo', 'Bar']);
    });

    it('does not pick up "class" in a comment or string', async () => {
      const code = `
# class NotAClass:
x = "class FakeClass:"
class RealClass:
    pass
      `;
      const result = await parsePython(FILE, code);
      expect(result.classes).toEqual(['RealClass']);
    });
  });

  // ── functions ──────────────────────────────────────────────────────────────

  describe('functions', () => {
    it('parses a simple function definition', async () => {
      const result = await parsePython(FILE, 'def greet():');
      expect(result.functions).toEqual(['greet']);
    });

    it('parses a function with parameters', async () => {
      const result = await parsePython(FILE, 'def add(a, b):');
      expect(result.functions).toEqual(['add']);
    });

    it('parses multiple function definitions', async () => {
      const code = `
def foo():
    pass

def bar(x, y):
    return x + y
      `;
      const result = await parsePython(FILE, code);
      expect(result.functions).toEqual(['foo', 'bar']);
    });

    it('does not parse async def (parser only matches lines starting with "def")', async () => {
      // The regex is /^def\s+(\w+)/ so "async def" is not captured — known limitation.
      const result = await parsePython(FILE, 'async def fetch():');
      expect(result.functions).not.toContain('fetch');
    });

    it('does not pick up "def" in a comment or string', async () => {
      const code = `
# def not_a_function():
x = "def also_not()"
def real_function():
    pass
      `;
      const result = await parsePython(FILE, code);
      expect(result.functions).toEqual(['real_function']);
    });
  });

  // ── combined / realistic snippets ─────────────────────────────────────────

  describe('combined scenarios', () => {
    it('parses a realistic module', async () => {
      const code = `
from typing import List, Optional
import os
import sys as system

class Animal:
    pass

class Dog(Animal):
    pass

def make_dog(name: str) -> Dog:
    return Dog()

def list_animals() -> List[str]:
    return []
      `;
      const result = await parsePython(FILE, code);

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0]).toEqual({ module: 'typing', names: ['List', 'Optional'] });
      expect(result.imports[1]).toEqual({ module: 'os', names: [] });
      expect(result.imports[2]).toEqual({ module: 'sys', names: [] });

      expect(result.classes).toEqual(['Animal', 'Dog']);
      expect(result.functions).toEqual(['make_dog', 'list_animals']);
    });

    it('handles indented class methods as top-level functions when not inside a class block', async () => {
      const code = `
class MyClass:
    def method_one(self):
        pass
    def method_two(self):
        pass
      `;
      // The parser is line-based and matches all `def` lines regardless of indentation
      const result = await parsePython(FILE, code);
      expect(result.functions).toEqual(['method_one', 'method_two']);
    });
  });

  // ── error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns empty result for an empty string', async () => {
      const result = await parsePython(FILE, '');
      expect(result).toEqual({ imports: [], classes: [], functions: [] });
    });

    it('returns empty result for whitespace-only content', async () => {
      const result = await parsePython(FILE, '   \n\n   ');
      expect(result).toEqual({ imports: [], classes: [], functions: [] });
    });

    it('returns empty result when content is null-like (catch path)', async () => {
      const result = await parsePython(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], classes: [], functions: [] });
    });
  });
});
