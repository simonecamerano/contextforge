import fs from 'node:fs';
import path from 'node:path';
import ignore, { Ignore } from 'ignore';

export class IgnoreEngine {
  private ig: Ignore;

  constructor(projectRoot: string = process.cwd()) {
    // @ts-ignore - ignore default import compatibility
    const ignoreFactory = typeof ignore === 'function' ? ignore : (ignore as any).default;
    this.ig = ignoreFactory();

    this.ig.add([
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      'coverage/',
      '.contextforge/',
      '.DS_Store'
    ]);

    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      this.ig.add(content);
    }

    const cfignorePath = path.join(projectRoot, '.contextforgeignore');
    if (fs.existsSync(cfignorePath)) {
      const content = fs.readFileSync(cfignorePath, 'utf8');
      this.ig.add(content);
    }
  }

  public shouldIgnore(relativeFilePath: string, projectRoot: string = process.cwd()): boolean {
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
        if (stat.size > 500 * 1024) {
          return true;
        }

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
      return true;
    }

    return false;
  }
}
