import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ChangeResult {
  modified: string[];
  added: string[];
  removed: string[];
  newHashes: Record<string, string>;
}

export async function detectChanges(
  files: string[],
  projectRoot: string,
  previousHashes: Record<string, string>
): Promise<ChangeResult> {
  const newHashes: Record<string, string> = {};
  const modified: string[] = [];
  const added: string[] = [];

  for (const file of files) {
    const absolutePath = path.join(projectRoot, file);
    try {
      const content = await fs.readFile(absolutePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      newHashes[file] = hash;

      if (previousHashes[file] === undefined) {
        added.push(file);
      } else if (previousHashes[file] !== hash) {
        modified.push(file);
      }
    } catch {
      // unreadable file, ignored
    }
  }

  const currentFiles = new Set(files);
  const removed = Object.keys(previousHashes).filter((f) => !currentFiles.has(f));

  return { modified, added, removed, newHashes };
}
