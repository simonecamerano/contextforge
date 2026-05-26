import { describe, it, expect } from 'vitest';
import { parseRust } from './rust.js';

const FILE = 'main.rs';

describe('parseRust', () => {
  describe('use statements (imports)', () => {
    it('parses a simple use statement', async () => {
      const result = await parseRust(FILE, 'use std::collections::HashMap;');
      expect(result.imports).toEqual([{ from: 'std::collections', names: ['HashMap'] }]);
    });

    it('parses a grouped use statement', async () => {
      const result = await parseRust(FILE, 'use std::collections::{HashMap, BTreeMap};');
      expect(result.imports[0].names).toEqual(['HashMap', 'BTreeMap']);
    });

    it('parses multiple use statements', async () => {
      const code = 'use std::io;\nuse std::fs;';
      const result = await parseRust(FILE, code);
      expect(result.imports).toHaveLength(2);
    });
  });

  describe('pub structs and enums', () => {
    it('parses a pub struct and adds it to exports', async () => {
      const result = await parseRust(FILE, 'pub struct Server {}');
      expect(result.classes[0].name).toBe('Server');
      expect(result.exports).toContain('Server');
    });

    it('parses a pub enum and adds it to exports', async () => {
      const result = await parseRust(FILE, 'pub enum Status { Ok, Err }');
      expect(result.classes[0].name).toBe('Status');
      expect(result.exports).toContain('Status');
    });

    it('does not add a private struct to exports', async () => {
      const result = await parseRust(FILE, 'struct InternalState {}');
      expect(result.classes[0].name).toBe('InternalState');
      expect(result.exports).not.toContain('InternalState');
    });

    it('parses pub fn methods inside an impl block', async () => {
      const code = 'pub struct Server {}\nimpl Server {\n    pub fn start(&self) {}\n    pub fn stop(&self) {}\n}';
      const result = await parseRust(FILE, code);
      expect(result.classes[0].methods).toEqual(['start', 'stop']);
      expect(result.functions).not.toContain('start');
    });

    it('parses a method from an impl block declared before its struct', async () => {
      const code = 'impl Server {\n    pub fn start(&self) {}\n}\npub struct Server {}';
      const result = await parseRust(FILE, code);
      expect(result.classes[0].methods).toContain('start');
    });
  });

  describe('pub fn top-level functions', () => {
    it('parses a top-level pub fn and adds it to exports', async () => {
      const result = await parseRust(FILE, 'pub fn main() {}');
      expect(result.functions).toContain('main');
      expect(result.exports).toContain('main');
    });

    it('does not collect private fn', async () => {
      const result = await parseRust(FILE, 'fn helper() {}');
      expect(result.functions).not.toContain('helper');
      expect(result.exports).not.toContain('helper');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseRust(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseRust(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
