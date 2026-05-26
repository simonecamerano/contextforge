# Multi-Language Parser Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structural parsers for 9 languages (PHP, Ruby, Go, Java, Kotlin, C#, Rust, Vue, Svelte) and language detection for SCSS/CSS/Less/HTML/Shell/YAML/Dockerfile, replacing the if-else parser dispatch in `summarizer.ts` with a registry map.

**Architecture:** Each new parser is a standalone `~80–120 line` file using line-by-line regex (same pattern as `python.ts`). Vue and Svelte extract their `<script>` block and delegate to the existing `parseTypeScript()`. All 9 new parsers register in a `PARSER_REGISTRY: Record<string, ParserFn>` map that replaces the current if-else in `summarizeProject()`. Python keeps its special mapping (pushes to `pythonModules`); manifests keep their filename-based dispatch; everything else goes through the registry.

**Tech Stack:** TypeScript, Vitest, Node.js built-ins only (no new dependencies).

---

## File Map

**Create:**
- `src/core/scanner/parsers/php.ts` + `php.test.ts`
- `src/core/scanner/parsers/ruby.ts` + `ruby.test.ts`
- `src/core/scanner/parsers/go.ts` + `go.test.ts`
- `src/core/scanner/parsers/java.ts` + `java.test.ts`
- `src/core/scanner/parsers/kotlin.ts` + `kotlin.test.ts`
- `src/core/scanner/parsers/csharp.ts` + `csharp.test.ts`
- `src/core/scanner/parsers/rust.ts` + `rust.test.ts`
- `src/core/scanner/parsers/vue.ts` + `vue.test.ts`
- `src/core/scanner/parsers/svelte.ts` + `svelte.test.ts`

**Modify:**
- `src/core/scanner/summarizer.ts` — add registry + 9 imports + expand `extMap` + Dockerfile detection
- `src/core/scanner/summarizer.test.ts` — add mocks + new language/registry/fallback tests

---

## Task 1: PHP Parser

**Files:**
- Create: `src/core/scanner/parsers/php.test.ts`
- Create: `src/core/scanner/parsers/php.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/php.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- php
```

Expected: FAIL — `Cannot find module './php.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/php.ts`**

```ts
export interface PHPResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parsePHP(_filePath: string, content: string): Promise<PHPResult> {
  const empty: PHPResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: PHPResult['imports'] = [];
    const exports: string[] = [];
    const classes: PHPResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const useMatch = trimmed.match(/^use\s+([\w\\]+)(?:\s+as\s+\w+)?;/);
      if (useMatch) {
        const parts = useMatch[1].split('\\');
        imports.push({ from: useMatch[1], names: [parts[parts.length - 1]] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:(?:abstract|final)\s+)*class\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const funcMatch = trimmed.match(/^(?:public\s+)?(?:static\s+)?function\s+(\w+)/);
      if (funcMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(funcMatch[1]);
        } else if (!isIndented) {
          functions.push(funcMatch[1]);
          exports.push(funcMatch[1]);
          currentClass = null;
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- php
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/php.ts src/core/scanner/parsers/php.test.ts
git commit -m "feat: add PHP parser"
```

---

## Task 2: Ruby Parser

**Files:**
- Create: `src/core/scanner/parsers/ruby.test.ts`
- Create: `src/core/scanner/parsers/ruby.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/ruby.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- ruby
```

Expected: FAIL — `Cannot find module './ruby.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/ruby.ts`**

```ts
export interface RubyResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseRuby(_filePath: string, content: string): Promise<RubyResult> {
  const empty: RubyResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: RubyResult['imports'] = [];
    const exports: string[] = [];
    const classes: RubyResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const requireMatch = trimmed.match(/^require(?:_relative)?\s+['"]([^'"]+)['"]/);
      if (requireMatch) {
        imports.push({ from: requireMatch[1], names: [] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:class|module)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const defMatch = trimmed.match(/^def\s+(?:self\.)?(\w+)/);
      if (defMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(defMatch[1]);
        } else if (!isIndented) {
          functions.push(defMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- ruby
```

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/ruby.ts src/core/scanner/parsers/ruby.test.ts
git commit -m "feat: add Ruby parser"
```

---

## Task 3: Go Parser

**Files:**
- Create: `src/core/scanner/parsers/go.test.ts`
- Create: `src/core/scanner/parsers/go.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/go.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- go.test
```

Expected: FAIL — `Cannot find module './go.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/go.ts`**

```ts
export interface GoResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseGo(_filePath: string, content: string): Promise<GoResult> {
  const empty: GoResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: GoResult['imports'] = [];
    const exports: string[] = [];
    const classes: GoResult['classes'] = [];
    const functions: string[] = [];

    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      const singleImport = trimmed.match(/^import\s+"([^"]+)"/);
      if (singleImport) {
        imports.push({ from: singleImport[1], names: [] });
        i++;
        continue;
      }

      if (trimmed === 'import (' || trimmed.startsWith('import (')) {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(')')) {
          const pkgMatch = lines[i].trim().match(/(?:\w+\s+)?"([^"]+)"/);
          if (pkgMatch) imports.push({ from: pkgMatch[1], names: [] });
          i++;
        }
        i++;
        continue;
      }

      const structMatch = trimmed.match(/^type\s+(\w+)\s+struct/);
      if (structMatch) {
        const name = structMatch[1];
        classes.push({ name, methods: [] });
        if (/^[A-Z]/.test(name)) exports.push(name);
        i++;
        continue;
      }

      const methodMatch = trimmed.match(/^func\s+\(\w+\s+\*?(\w+)\)\s+(\w+)/);
      if (methodMatch) {
        const cls = classes.find((c) => c.name === methodMatch[1]);
        if (cls && /^[A-Z]/.test(methodMatch[2])) cls.methods.push(methodMatch[2]);
        i++;
        continue;
      }

      const funcMatch = trimmed.match(/^func\s+(\w+)/);
      if (funcMatch && /^[A-Z]/.test(funcMatch[1])) {
        functions.push(funcMatch[1]);
        exports.push(funcMatch[1]);
      }

      i++;
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- go.test
```

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/go.ts src/core/scanner/parsers/go.test.ts
git commit -m "feat: add Go parser"
```

---

## Task 4: Java Parser

**Files:**
- Create: `src/core/scanner/parsers/java.test.ts`
- Create: `src/core/scanner/parsers/java.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/java.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- java
```

Expected: FAIL — `Cannot find module './java.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/java.ts`**

```ts
export interface JavaResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseJava(_filePath: string, content: string): Promise<JavaResult> {
  const empty: JavaResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: JavaResult['imports'] = [];
    const exports: string[] = [];
    const classes: JavaResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const importMatch = trimmed.match(/^import\s+([\w.*]+);/);
      if (importMatch) {
        const parts = importMatch[1].split('.');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('.');
        imports.push({ from, names: [name] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:public\s+)?(?:(?:abstract|final)\s+)*(?:class|interface|enum)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const methodMatch = trimmed.match(/^public\s+(?:static\s+)?(?:(?:[\w<>\[\]]+)\s+)+(\w+)\s*\(/);
      if (methodMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(methodMatch[1]);
        } else if (!isIndented) {
          functions.push(methodMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- java
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/java.ts src/core/scanner/parsers/java.test.ts
git commit -m "feat: add Java parser"
```

---

## Task 5: Kotlin Parser

**Files:**
- Create: `src/core/scanner/parsers/kotlin.test.ts`
- Create: `src/core/scanner/parsers/kotlin.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/kotlin.test.ts`:

```ts
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
  });

  describe('top-level functions', () => {
    it('parses a top-level fun', async () => {
      const result = await parseKotlin(FILE, 'fun main() {}');
      expect(result.functions).toContain('main');
      expect(result.exports).toContain('main');
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- kotlin
```

Expected: FAIL — `Cannot find module './kotlin.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/kotlin.ts`**

```ts
export interface KotlinResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseKotlin(_filePath: string, content: string): Promise<KotlinResult> {
  const empty: KotlinResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: KotlinResult['imports'] = [];
    const exports: string[] = [];
    const classes: KotlinResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const importMatch = trimmed.match(/^import\s+([\w.]+)/);
      if (importMatch) {
        const parts = importMatch[1].split('.');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('.');
        imports.push({ from, names: [name] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:(?:data|sealed|open|abstract|inner)\s+)*(?:class|object|interface)\s+(\w+)/);
      if (classMatch && !isIndented) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const funMatch = trimmed.match(/^(?:override\s+)?(?:(?:private|internal|protected)\s+)?fun\s+(\w+)/);
      if (funMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(funMatch[1]);
        } else if (!isIndented) {
          functions.push(funMatch[1]);
          exports.push(funMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- kotlin
```

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/kotlin.ts src/core/scanner/parsers/kotlin.test.ts
git commit -m "feat: add Kotlin parser"
```

---

## Task 6: C# Parser

**Files:**
- Create: `src/core/scanner/parsers/csharp.test.ts`
- Create: `src/core/scanner/parsers/csharp.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/csharp.test.ts`:

```ts
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
  });

  describe('classes and interfaces', () => {
    it('parses a public class and adds it to exports', async () => {
      const result = await parseCSharp(FILE, 'public class Foo {}');
      expect(result.classes[0].name).toBe('Foo');
      expect(result.exports).toContain('Foo');
    });

    it('parses a public interface', async () => {
      const result = await parseCSharp(FILE, 'public interface IService {}');
      expect(result.classes[0].name).toBe('IService');
    });

    it('parses public methods inside a class', async () => {
      const code = 'public class Foo {\n    public void Bar() {}\n    public string Baz() { return ""; }\n}';
      const result = await parseCSharp(FILE, code);
      expect(result.classes[0].methods).toEqual(['Bar', 'Baz']);
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- csharp
```

Expected: FAIL — `Cannot find module './csharp.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/csharp.ts`**

```ts
export interface CSharpResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseCSharp(_filePath: string, content: string): Promise<CSharpResult> {
  const empty: CSharpResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: CSharpResult['imports'] = [];
    const exports: string[] = [];
    const classes: CSharpResult['classes'] = [];
    const functions: string[] = [];

    let currentClass: { name: string; methods: string[] } | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const usingMatch = trimmed.match(/^using\s+([\w.]+);/);
      if (usingMatch) {
        imports.push({ from: usingMatch[1], names: [] });
        continue;
      }

      const classMatch = trimmed.match(/^(?:public\s+)?(?:(?:static|abstract|sealed|partial)\s+)*(?:class|interface|record|struct)\s+(\w+)/);
      if (classMatch) {
        currentClass = { name: classMatch[1], methods: [] };
        classes.push(currentClass);
        exports.push(classMatch[1]);
        continue;
      }

      const methodMatch = trimmed.match(/^public\s+(?:static\s+)?(?:async\s+)?(?:[\w<>\[\]?]+\s+)+(\w+)\s*[(<]/);
      if (methodMatch) {
        if (isIndented && currentClass) {
          currentClass.methods.push(methodMatch[1]);
        } else if (!isIndented) {
          functions.push(methodMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- csharp
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/csharp.ts src/core/scanner/parsers/csharp.test.ts
git commit -m "feat: add C# parser"
```

---

## Task 7: Rust Parser

**Files:**
- Create: `src/core/scanner/parsers/rust.test.ts`
- Create: `src/core/scanner/parsers/rust.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/rust.test.ts`:

```ts
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

    it('parses pub fn methods inside an impl block', async () => {
      const code = 'pub struct Server {}\nimpl Server {\n    pub fn start(&self) {}\n    pub fn stop(&self) {}\n}';
      const result = await parseRust(FILE, code);
      expect(result.classes[0].methods).toEqual(['start', 'stop']);
      expect(result.functions).not.toContain('start');
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- rust
```

Expected: FAIL — `Cannot find module './rust.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/rust.ts`**

```ts
export interface RustResult {
  imports: Array<{ from: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export async function parseRust(_filePath: string, content: string): Promise<RustResult> {
  const empty: RustResult = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const imports: RustResult['imports'] = [];
    const exports: string[] = [];
    const classes: RustResult['classes'] = [];
    const functions: string[] = [];

    let currentImpl: string | null = null;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');

      const useGrouped = trimmed.match(/^use\s+([\w:]+)::\{([^}]+)\};/);
      if (useGrouped) {
        const names = useGrouped[2].split(',').map((n) => n.trim()).filter(Boolean);
        imports.push({ from: useGrouped[1], names });
        continue;
      }

      const useSingle = trimmed.match(/^use\s+([\w:]+);/);
      if (useSingle) {
        const parts = useSingle[1].split('::');
        const name = parts[parts.length - 1];
        const from = parts.slice(0, -1).join('::');
        imports.push({ from: from || useSingle[1], names: [name] });
        continue;
      }

      const structMatch = trimmed.match(/^pub\s+(?:struct|enum)\s+(\w+)/);
      if (structMatch) {
        classes.push({ name: structMatch[1], methods: [] });
        exports.push(structMatch[1]);
        continue;
      }

      const implMatch = trimmed.match(/^impl(?:<[^>]*>)?\s+(\w+)/);
      if (implMatch && !isIndented) {
        currentImpl = implMatch[1];
        continue;
      }

      const fnMatch = trimmed.match(/^pub\s+(?:async\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        if (isIndented && currentImpl) {
          const cls = classes.find((c) => c.name === currentImpl);
          if (cls) cls.methods.push(fnMatch[1]);
        } else if (!isIndented) {
          functions.push(fnMatch[1]);
          exports.push(fnMatch[1]);
        }
      }
    }

    return { imports, exports, classes, functions };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- rust
```

Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/rust.ts src/core/scanner/parsers/rust.test.ts
git commit -m "feat: add Rust parser"
```

---

## Task 8: Vue Parser

**Files:**
- Create: `src/core/scanner/parsers/vue.test.ts`
- Create: `src/core/scanner/parsers/vue.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/vue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseVue } from './vue.js';

const FILE = 'Component.vue';

describe('parseVue', () => {
  it('extracts imports from the <script> block', async () => {
    const code = '<template><div/></template>\n<script>\nimport { ref } from "vue";\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.imports.some((i) => i.from === 'vue')).toBe(true);
  });

  it('extracts exports from the <script> block', async () => {
    const code = '<script>\nexport function useCounter() {}\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.exports).toContain('useCounter');
  });

  it('handles <script lang="ts"> attribute', async () => {
    const code = '<script lang="ts">\nimport { ref } from "vue";\nexport function setup() {}\n</script>';
    const result = await parseVue(FILE, code);
    expect(result.imports.some((i) => i.from === 'vue')).toBe(true);
    expect(result.exports).toContain('setup');
  });

  it('returns empty result when there is no <script> block', async () => {
    const code = '<template><div>Hello</div></template>';
    const result = await parseVue(FILE, code);
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });

  it('returns empty result for empty string', async () => {
    const result = await parseVue(FILE, '');
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- vue
```

Expected: FAIL — `Cannot find module './vue.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/vue.ts`**

```ts
import { parseTypeScript } from './typescript.js';

export async function parseVue(filePath: string, content: string) {
  const empty = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return empty;
    return parseTypeScript(filePath, match[1]);
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- vue
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/vue.ts src/core/scanner/parsers/vue.test.ts
git commit -m "feat: add Vue SFC parser (delegates to TypeScript parser)"
```

---

## Task 9: Svelte Parser

**Files:**
- Create: `src/core/scanner/parsers/svelte.test.ts`
- Create: `src/core/scanner/parsers/svelte.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/scanner/parsers/svelte.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSvelte } from './svelte.js';

const FILE = 'App.svelte';

describe('parseSvelte', () => {
  it('extracts imports from the <script> block', async () => {
    const code = '<script>\nimport { writable } from "svelte/store";\n</script>\n<div/>';
    const result = await parseSvelte(FILE, code);
    expect(result.imports.some((i) => i.from === 'svelte/store')).toBe(true);
  });

  it('extracts exports from the <script> block', async () => {
    const code = '<script>\nexport let count = 0;\n</script>';
    const result = await parseSvelte(FILE, code);
    expect(result.exports).toContain('count');
  });

  it('handles <script lang="ts"> attribute', async () => {
    const code = '<script lang="ts">\nimport { writable } from "svelte/store";\nexport let name: string = "";\n</script>';
    const result = await parseSvelte(FILE, code);
    expect(result.imports.some((i) => i.from === 'svelte/store')).toBe(true);
    expect(result.exports).toContain('name');
  });

  it('returns empty result when there is no <script> block', async () => {
    const code = '<div>Hello</div>';
    const result = await parseSvelte(FILE, code);
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });

  it('returns empty result for empty string', async () => {
    const result = await parseSvelte(FILE, '');
    expect(result).toEqual({ imports: [], exports: [], classes: [], functions: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- svelte
```

Expected: FAIL — `Cannot find module './svelte.js'`

- [ ] **Step 3: Implement `src/core/scanner/parsers/svelte.ts`**

```ts
import { parseTypeScript } from './typescript.js';

export async function parseSvelte(filePath: string, content: string) {
  const empty = { imports: [], exports: [], classes: [], functions: [] };
  try {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return empty;
    return parseTypeScript(filePath, match[1]);
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- svelte
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/parsers/svelte.ts src/core/scanner/parsers/svelte.test.ts
git commit -m "feat: add Svelte SFC parser (delegates to TypeScript parser)"
```

---

## Task 10: Summarizer Refactor — Registry, extMap, and Dockerfile Detection

**Files:**
- Modify: `src/core/scanner/summarizer.ts`
- Modify: `src/core/scanner/summarizer.test.ts`

- [ ] **Step 1: Add new parser mocks and failing integration tests to `summarizer.test.ts`**

Add the following blocks to `src/core/scanner/summarizer.test.ts`. Place the `vi.mock()` calls alongside the existing ones (after the `vi.mock('./parsers/roadmap.js', ...)` call). Place the typed mock accessors and imports alongside the existing ones. Add the new `setupDefaultMocks` mock returns. Add the new test `describe` blocks at the end of the top-level `describe('summarizeProject', ...)`.

**New `vi.mock()` declarations** (add after `vi.mock('./parsers/roadmap.js', ...)`):

```ts
vi.mock('./parsers/vue.js', () => ({ parseVue: vi.fn() }));
vi.mock('./parsers/svelte.js', () => ({ parseSvelte: vi.fn() }));
vi.mock('./parsers/php.js', () => ({ parsePHP: vi.fn() }));
vi.mock('./parsers/ruby.js', () => ({ parseRuby: vi.fn() }));
vi.mock('./parsers/go.js', () => ({ parseGo: vi.fn() }));
vi.mock('./parsers/java.js', () => ({ parseJava: vi.fn() }));
vi.mock('./parsers/kotlin.js', () => ({ parseKotlin: vi.fn() }));
vi.mock('./parsers/csharp.js', () => ({ parseCSharp: vi.fn() }));
vi.mock('./parsers/rust.js', () => ({ parseRust: vi.fn() }));
```

**New imports** (add after `import { parseRoadmap } from './parsers/roadmap.js';`):

```ts
import { parseVue } from './parsers/vue.js';
import { parseSvelte } from './parsers/svelte.js';
import { parsePHP } from './parsers/php.js';
import { parseRuby } from './parsers/ruby.js';
import { parseGo } from './parsers/go.js';
import { parseJava } from './parsers/java.js';
import { parseKotlin } from './parsers/kotlin.js';
import { parseCSharp } from './parsers/csharp.js';
import { parseRust } from './parsers/rust.js';
```

**New typed mock accessors** (add after `const mockParseManifest = ...`):

```ts
const mockParseVue = vi.mocked(parseVue);
const mockParseSvelte = vi.mocked(parseSvelte);
const mockParsePHP = vi.mocked(parsePHP);
const mockParseRuby = vi.mocked(parseRuby);
const mockParseGo = vi.mocked(parseGo);
const mockParseJava = vi.mocked(parseJava);
const mockParseKotlin = vi.mocked(parseKotlin);
const mockParseCSharp = vi.mocked(parseCSharp);
const mockParseRust = vi.mocked(parseRust);
```

**Update `setupDefaultMocks()`** (add these lines inside the function body, after `mockParseRoadmap.mockReturnValue([])`):

```ts
mockParseVue.mockResolvedValue(emptyTsResult);
mockParseSvelte.mockResolvedValue(emptyTsResult);
mockParsePHP.mockResolvedValue(emptyTsResult);
mockParseRuby.mockResolvedValue(emptyTsResult);
mockParseGo.mockResolvedValue(emptyTsResult);
mockParseJava.mockResolvedValue(emptyTsResult);
mockParseKotlin.mockResolvedValue(emptyTsResult);
mockParseCSharp.mockResolvedValue(emptyTsResult);
mockParseRust.mockResolvedValue(emptyTsResult);
```

**New `describe` blocks** (add at the end of `describe('summarizeProject', ...)`, after the `roadmap integration` block):

```ts
// ── New language detection ──────────────────────────────────────────────────

describe('new language detection', () => {
  it.each([
    ['Component.vue', 'Vue'],
    ['App.svelte', 'Svelte'],
    ['index.php', 'PHP'],
    ['app.rb', 'Ruby'],
    ['main.go', 'Go'],
    ['Main.java', 'Java'],
    ['Main.kt', 'Kotlin'],
    ['Program.cs', 'C#'],
    ['main.rs', 'Rust'],
    ['styles.scss', 'SCSS'],
    ['styles.css', 'CSS'],
    ['styles.less', 'Less'],
    ['index.html', 'HTML'],
    ['deploy.sh', 'Shell'],
    ['config.yml', 'YAML'],
    ['config.yaml', 'YAML'],
  ])('detects "%s" as %s', async (file, language) => {
    mockReadFile.mockResolvedValue('');
    const result = await summarizeProject([file], ROOT);
    expect(result.languages).toContain(language);
  });

  it('detects Dockerfile as Dockerfile language', async () => {
    mockReadFile.mockResolvedValue('FROM node:18\n');
    const result = await summarizeProject(['Dockerfile'], ROOT);
    expect(result.languages).toContain('Dockerfile');
  });

  it('does not detect a file named NotDockerfile as Dockerfile', async () => {
    mockReadFile.mockResolvedValue('');
    const result = await summarizeProject(['NotDockerfile'], ROOT);
    expect(result.languages).not.toContain('Dockerfile');
  });
});

// ── Registry dispatch ───────────────────────────────────────────────────────

describe('registry dispatch', () => {
  it('calls parseVue for .vue files and pushes to tsModules', async () => {
    mockReadFile.mockResolvedValue('<script>export default {}</script>');
    mockParseVue.mockResolvedValue(emptyTsResult);

    const result = await summarizeProject(['Component.vue'], ROOT);

    expect(mockParseVue).toHaveBeenCalledWith('Component.vue', expect.any(String));
    expect(result.tsModules).toHaveLength(1);
    expect(result.tsModules[0].path).toBe('Component.vue');
  });

  it('calls parsePHP for .php files and pushes to tsModules', async () => {
    mockReadFile.mockResolvedValue('<?php class Foo {}');
    mockParsePHP.mockResolvedValue(emptyTsResult);

    const result = await summarizeProject(['index.php'], ROOT);

    expect(mockParsePHP).toHaveBeenCalledWith('index.php', expect.any(String));
    expect(result.tsModules).toHaveLength(1);
  });

  it('calls parseGo for .go files and pushes to tsModules', async () => {
    mockReadFile.mockResolvedValue('package main');
    mockParseGo.mockResolvedValue(emptyTsResult);

    const result = await summarizeProject(['main.go'], ROOT);

    expect(mockParseGo).toHaveBeenCalledWith('main.go', expect.any(String));
    expect(result.tsModules).toHaveLength(1);
  });

  it('does not push to tsModules for detection-only extensions (e.g. .scss)', async () => {
    mockReadFile.mockResolvedValue('.body { color: red; }');

    const result = await summarizeProject(['styles.scss'], ROOT);

    expect(result.tsModules).toHaveLength(0);
    expect(result.languages).toContain('SCSS');
  });
});

// ── Fallback (TODO scanning for non-parser extensions) ──────────────────────

describe('fallback TODO scanning', () => {
  it('scans TODOs in .scss files even without a structural parser', async () => {
    mockReadFile.mockResolvedValue('// TODO: fix dark mode\n.body {}');

    const result = await summarizeProject(['styles.scss'], ROOT);

    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].file).toBe('styles.scss');
    expect(result.todos[0].text).toBe('fix dark mode');
  });

  it('scans TODOs in Dockerfile even without a structural parser', async () => {
    mockReadFile.mockResolvedValue('FROM node:18\n# TODO: pin exact version\n');

    const result = await summarizeProject(['Dockerfile'], ROOT);

    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].file).toBe('Dockerfile');
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
npm test -- summarizer
```

Expected: most new tests FAIL because `summarizer.ts` still uses the old if-else dispatch and has no registry imports.

- [ ] **Step 3: Replace `src/core/scanner/summarizer.ts` with the refactored version**

Write the complete file:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parseTypeScript } from './parsers/typescript.js';
import { parsePython } from './parsers/python.js';
import { parseManifest } from './parsers/manifest.js';
import { parseRoadmap, type RoadmapItem } from './parsers/roadmap.js';
import { parseVue } from './parsers/vue.js';
import { parseSvelte } from './parsers/svelte.js';
import { parsePHP } from './parsers/php.js';
import { parseRuby } from './parsers/ruby.js';
import { parseGo } from './parsers/go.js';
import { parseJava } from './parsers/java.js';
import { parseKotlin } from './parsers/kotlin.js';
import { parseCSharp } from './parsers/csharp.js';
import { parseRust } from './parsers/rust.js';

export type { RoadmapItem } from './parsers/roadmap.js';

export interface SummarizedModule {
  path: string;
  imports: Array<{ from?: string; module?: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export interface TodoItem {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME';
  text: string;
}

export interface ProjectSummary {
  name: string;
  version: string;
  projectRoot: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  tsModules: SummarizedModule[];
  pythonModules: SummarizedModule[];
  languages: string[];
  gitBranch: string;
  gitCommits: string[];
  todos: TodoItem[];
  roadmap: RoadmapItem[];
}

type ParserFn = (file: string, content: string) => Promise<Omit<SummarizedModule, 'path'>>;

const PARSER_REGISTRY: Record<string, ParserFn> = {
  '.ts': parseTypeScript as ParserFn,
  '.tsx': parseTypeScript as ParserFn,
  '.js': parseTypeScript as ParserFn,
  '.jsx': parseTypeScript as ParserFn,
  '.vue': parseVue as ParserFn,
  '.svelte': parseSvelte as ParserFn,
  '.php': parsePHP as ParserFn,
  '.rb': parseRuby as ParserFn,
  '.go': parseGo as ParserFn,
  '.java': parseJava as ParserFn,
  '.kt': parseKotlin as ParserFn,
  '.cs': parseCSharp as ParserFn,
  '.rs': parseRust as ParserFn,
};

export async function summarizeProject(files: string[], projectRoot: string): Promise<ProjectSummary> {
  let gitBranch = '';
  let gitCommits: string[] = [];

  try {
    gitBranch = execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    gitCommits = execSync('git log --oneline -n 10', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);
  } catch {
    // Not a Git repository, or Git is not installed
  }

  const summary: ProjectSummary = {
    name: path.basename(projectRoot),
    version: '0.1.0',
    projectRoot,
    dependencies: {},
    devDependencies: {},
    scripts: {},
    tsModules: [],
    pythonModules: [],
    languages: [],
    gitBranch,
    gitCommits,
    todos: [],
    roadmap: [],
  };

  try {
    const roadmapContent = await fs.readFile(path.join(projectRoot, 'roadmap.md'), 'utf8');
    summary.roadmap = parseRoadmap(roadmapContent);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Warning: could not read roadmap.md:', err);
    }
    summary.roadmap = [];
  }

  const extMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.json': 'JSON',
    '.txt': 'Text',
    '.toml': 'TOML',
    '.md': 'Markdown',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.cs': 'C#',
    '.rs': 'Rust',
    '.scss': 'SCSS',
    '.css': 'CSS',
    '.less': 'Less',
    '.html': 'HTML',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.yml': 'YAML',
    '.yaml': 'YAML',
  };

  for (const file of files) {
    const absolutePath = path.join(projectRoot, file);
    const ext = path.extname(file).toLowerCase();

    if (path.basename(file) === 'Dockerfile') {
      if (!summary.languages.includes('Dockerfile')) {
        summary.languages.push('Dockerfile');
      }
    }

    const lang = extMap[ext];
    if (lang && !summary.languages.includes(lang)) {
      summary.languages.push(lang);
    }

    try {
      const content = await fs.readFile(absolutePath, 'utf8');

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const todoMatch = line.match(/^\s*(?:\/\/\/|\/\/|#)\s*(TODO|FIXME)\s*[:-]?\s*(.+)/i);
        if (todoMatch) {
          summary.todos.push({
            file,
            line: i + 1,
            type: todoMatch[1].toUpperCase() as 'TODO' | 'FIXME',
            text: todoMatch[2].trim(),
          });
        }
      }

      const parser = PARSER_REGISTRY[ext];
      if (parser) {
        const parsed = await parser(file, content);
        summary.tsModules.push({ path: file, ...parsed });
      } else if (ext === '.py') {
        const parsed = await parsePython(file, content);
        summary.pythonModules.push({
          path: file,
          imports: parsed.imports,
          exports: parsed.functions.concat(parsed.classes),
          classes: parsed.classes.map((name) => ({ name, methods: [] })),
          functions: parsed.functions,
        });
      } else if (file === 'package.json' || file === 'requirements.txt' || file === 'pyproject.toml') {
        const parsed = await parseManifest(file, content);
        if (parsed.name) summary.name = parsed.name;
        if (parsed.version) summary.version = parsed.version;
        if (parsed.dependencies) {
          summary.dependencies = { ...summary.dependencies, ...parsed.dependencies };
        }
        if (parsed.devDependencies) {
          summary.devDependencies = { ...summary.devDependencies, ...parsed.devDependencies };
        }
        if (parsed.scripts) {
          summary.scripts = { ...summary.scripts, ...parsed.scripts };
        }
        if (parsed.packages) {
          for (const pkg of parsed.packages) {
            summary.dependencies[pkg] = 'latest';
          }
        }
      }
    } catch (err) {
      console.error(`Summarizer error for file ${file}:`, err);
    }
  }

  return summary;
}
```

- [ ] **Step 4: Run the full test suite to verify all tests pass**

```bash
npm test
```

Expected: PASS — all existing tests plus all new tests green. No regressions.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner/summarizer.ts src/core/scanner/summarizer.test.ts
git commit -m "feat: replace if-else parser dispatch with registry map, expand language detection"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✅ 9 structural parsers (PHP, Ruby, Go, Java, Kotlin, C#, Rust, Vue, Svelte) — Tasks 1–9
  - ✅ PARSER_REGISTRY replaces if-else — Task 10 Step 3
  - ✅ `extMap` expanded with all 17 new extensions — Task 10 Step 3
  - ✅ Dockerfile basename detection — Task 10 Step 3
  - ✅ Fallback: TODO scanning for non-parser extensions — covered by existing loop + new test
  - ✅ Python remains outside registry (keeps `pythonModules` mapping) — Task 10 Step 3
  - ✅ `SummarizedModule` interface unchanged — Task 10 Step 3
  - ✅ Vue/Svelte `<script>` block extraction via regex — Tasks 8–9
  - ✅ 4–5 tests per parser + summarizer integration tests — all tasks

- **Type consistency:**
  - All new parsers return `{ imports: Array<{from: string, names: string[]}>, exports: string[], classes: Array<{name: string, methods: string[]}>, functions: string[] }` — compatible with `Omit<SummarizedModule, 'path'>` after `as ParserFn` cast
  - `PARSER_REGISTRY` uses `as ParserFn` cast to bridge the minor import-field variance

- **No placeholders:** All steps contain complete code.
