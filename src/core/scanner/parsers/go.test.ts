import { describe, it, expect } from 'vitest';
import { parseGo } from './go.js';

const FILE = 'main.go';

describe('parseGo', () => {
  describe('import statements', () => {
    it('parses a single-line import', async () => {
      const result = await parseGo(FILE, 'import "fmt"');
      expect(result.imports).toEqual([{ from: 'fmt', names: [] }]);
    });

    it('parses a multi-line import block', async () => {
      const code = 'import (\n\t"fmt"\n\t"os"\n)';
      const result = await parseGo(FILE, code);
      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toEqual({ from: 'fmt', names: [] });
      expect(result.imports[1]).toEqual({ from: 'os', names: [] });
    });

    it('parses aliased imports in import block', async () => {
      const code = 'import (\n\tlog "github.com/sirupsen/logrus"\n)';
      const result = await parseGo(FILE, code);
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].from).toBe('github.com/sirupsen/logrus');
    });
  });

  describe('structs and exported names', () => {
    it('parses an exported struct', async () => {
      const result = await parseGo(FILE, 'type Server struct {}');
      expect(result.classes).toEqual([{ name: 'Server', methods: [] }]);
      expect(result.exports).toContain('Server');
    });

    it('does not export an unexported struct', async () => {
      const result = await parseGo(FILE, 'type server struct {}');
      expect(result.classes[0].name).toBe('server');
      expect(result.exports).not.toContain('server');
    });

    it('parses a method on a struct', async () => {
      const code = 'type Server struct {}\nfunc (s *Server) Start() {}';
      const result = await parseGo(FILE, code);
      expect(result.classes[0].methods).toContain('Start');
      expect(result.functions).not.toContain('Start');
    });

    it('parses a method declared before its struct', async () => {
      const code = 'func (s *Server) Start() {}\ntype Server struct {}';
      const result = await parseGo(FILE, code);
      expect(result.classes[0].methods).toContain('Start');
      expect(result.functions).not.toContain('Start');
    });
  });

  describe('exported functions', () => {
    it('parses an exported top-level function', async () => {
      const result = await parseGo(FILE, 'func NewServer() *Server {}');
      expect(result.functions).toContain('NewServer');
      expect(result.exports).toContain('NewServer');
    });

    it('does not export an unexported function', async () => {
      const result = await parseGo(FILE, 'func helper() {}');
      expect(result.functions).not.toContain('helper');
      expect(result.exports).not.toContain('helper');
    });
  });

  describe('error handling', () => {
    it('returns empty result for empty string', async () => {
      const result = await parseGo(FILE, '');
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });

    it('returns empty result on null-like input', async () => {
      const result = await parseGo(FILE, null as unknown as string);
      expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
    });
  });
});
