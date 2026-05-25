import fs from 'node:fs/promises';
import path from 'node:path';
import { IgnoreEngine } from './ignore-engine.js';

export async function walkDirectory(
  dirPath: string,
  ignoreEngine: IgnoreEngine,
  projectRoot: string = dirPath
): Promise<string[]> {
  let result: string[] = [];

  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(projectRoot, fullPath);

      if (ignoreEngine.shouldIgnore(relativePath, projectRoot)) {
        continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const subFiles = await walkDirectory(fullPath, ignoreEngine, projectRoot);
          result = result.concat(subFiles);
        } else if (stat.isFile()) {
          result.push(relativePath);
        }
      } catch (err) {
        console.error(`Impossibile leggere lo stato di ${fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error(`Errore durante la scansione della cartella ${dirPath}:`, err);
  }

  return result;
}
