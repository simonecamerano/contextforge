import fs from 'node:fs';
import path from 'node:path';
import ignore, { Ignore } from 'ignore';

/**
 * Determines which files should be excluded from scanning and indexing.
 *
 * Ignore rules are layered in priority order:
 * 1. Hard-coded defaults (node_modules, .git, dist, …)
 * 2. Project `.gitignore`
 * 3. Project `.contextforgeignore` (ContextForge-specific overrides)
 *
 * Beyond pattern matching the engine also performs runtime checks on each
 * candidate file: files that do not exist, exceed 500 KB, or contain null
 * bytes (binary files) are silently excluded.
 */
export class IgnoreEngine {
  private ig: Ignore;

  /**
   * Initialises the engine and loads all ignore rule sources.
   *
   * @param projectRoot - Absolute path to the root of the project being
   *   scanned. Defaults to `process.cwd()`.
   */
  constructor(projectRoot: string = process.cwd()) {
    // The `ignore` package ships both CJS and ESM builds; the factory
    // function may therefore appear on the module's default export rather
    // than as the module itself — guard against both shapes.
    const ignoreFactory = typeof ignore === 'function' ? ignore : (ignore as Record<string, unknown>).default as () => Ignore;
    this.ig = ignoreFactory();

    // Always skip these directories/files regardless of any ignore file.
    this.ig.add([
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      'coverage/',
      '.contextforge/',
      '.DS_Store'
    ]);

    // Merge the project's own .gitignore so ContextForge respects the same
    // exclusions that Git does.
    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      this.ig.add(content);
    }

    // Allow project-specific ContextForge exclusions that go beyond .gitignore.
    const cfignorePath = path.join(projectRoot, '.contextforgeignore');
    if (fs.existsSync(cfignorePath)) {
      const content = fs.readFileSync(cfignorePath, 'utf8');
      this.ig.add(content);
    }
  }

  /**
   * Returns `true` when the given file should be excluded from processing.
   *
   * The method performs checks in this order:
   * 1. Pattern matching against all loaded ignore rules.
   * 2. Existence check — missing paths are treated as ignored.
   * 3. Size check — files larger than 500 KB are skipped to keep memory usage
   *    bounded and to avoid processing generated artefacts (e.g. bundled JS).
   * 4. Binary detection — the first 1 024 bytes are read synchronously; if any
   *    null byte (`0x00`) is found the file is considered binary and excluded.
   *    This heuristic is the same one used by Git itself.
   *
   * Any filesystem error during checks causes the file to be treated as
   * ignored (fail-safe approach).
   *
   * @param relativeFilePath - Path to the file relative to `projectRoot`.
   *   Back-slashes are normalised to forward-slashes before pattern matching
   *   so that the engine works correctly on Windows.
   * @param projectRoot - Absolute path used to resolve `relativeFilePath` for
   *   filesystem operations. Defaults to `process.cwd()`.
   * @returns `true` if the file should be excluded, `false` otherwise.
   */
  public shouldIgnore(relativeFilePath: string, projectRoot: string = process.cwd()): boolean {
    // Normalise path separators so the `ignore` library (which uses POSIX
    // globs) matches correctly even when running on Windows.
    const normalizedPath = relativeFilePath.replace(/\\/g, '/');
    if (this.ig.ignores(normalizedPath)) {
      return true;
    }

    const absolutePath = path.isAbsolute(relativeFilePath)
      ? relativeFilePath
      : path.join(projectRoot, relativeFilePath);

    try {
      if (!fs.existsSync(absolutePath)) {
        return true;
      }
      const stat = fs.statSync(absolutePath);
      if (stat.isFile()) {
        // Skip large files (> 500 KB) to prevent memory spikes and avoid
        // processing minified bundles or other generated artefacts.
        if (stat.size > 500 * 1024) {
          return true;
        }

        // Binary detection: read the first 1 KB and look for a null byte.
        // A null byte (`0x00`) almost never appears in text files but is
        // common in compiled/binary formats — the same heuristic Git uses.
        const fd = fs.openSync(absolutePath, 'r');
        const buffer = Buffer.alloc(1024);
        const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);

        for (let i = 0; i < bytesRead; i++) {
          if (buffer[i] === 0) {
            return true;
          }
        }
      }
    } catch {
      // Any unexpected error (permissions, broken symlink, etc.) causes the
      // file to be excluded so the scanner never crashes on edge cases.
      return true;
    }

    return false;
  }
}
