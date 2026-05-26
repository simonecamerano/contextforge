import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { IgnoreEngine } from '../../core/scanner/ignore-engine.js';
import { walkDirectory } from '../../core/scanner/file-walker.js';
import { summarizeProject } from '../../core/scanner/summarizer.js';
import { detectChanges } from '../../core/updater/change-detector.js';
import { selectiveUpdate } from '../../core/updater/selective-update.js';

interface Meta {
  version: string;
  lastScan: string;
  fileHashes: Record<string, string>;
}

export function registerUpdateCommand(program: Command) {
  program
    .command('update')
    .description('Selectively update project memory based on modified files')
    .action(async () => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const metaPath = path.join(contextForgeDir, 'local', 'meta.json');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Error: ContextForge is not initialized. Run "contextforge init" first.');
        process.exit(1);
      }

      if (!fs.existsSync(metaPath)) {
        console.error('Error: No meta.json file found. Run "contextforge scan" first.');
        process.exit(1);
      }

      try {
        const meta: Meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const previousHashes = meta.fileHashes ?? {};

        const ignoreEngine = new IgnoreEngine(cwd);
        const files = await walkDirectory(cwd, ignoreEngine);

        console.log(`Found ${files.length} files. Detecting changes...`);

        const changed = await detectChanges(files, cwd, previousHashes);
        const totalChanged = changed.modified.length + changed.added.length + changed.removed.length;

        if (totalChanged === 0) {
          console.log('No changes detected. Memory is already up to date.');
          return;
        }

        console.log(
          `Changes detected: ${changed.modified.length} modified, ${changed.added.length} added, ${changed.removed.length} removed.`
        );

        const summary = await summarizeProject(files, cwd);
        await selectiveUpdate(changed, summary, contextForgeDir);

        const updatedMeta: Meta = {
          version: meta.version,
          lastScan: new Date().toISOString(),
          fileHashes: changed.newHashes,
        };

        fs.writeFileSync(metaPath, JSON.stringify(updatedMeta, null, 2), 'utf8');
        console.log('Updated: .contextforge/local/meta.json');

        console.log('\nUpdate completed successfully!');
      } catch (error) {
        console.error("Error during update:", error);
        process.exit(1);
      }
    });
}
