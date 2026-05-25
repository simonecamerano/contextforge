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
    .description('Aggiorna selettivamente la memoria del progetto in base ai file modificati')
    .action(async () => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const metaPath = path.join(contextForgeDir, 'local', 'meta.json');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Errore: ContextForge non è inizializzato. Esegui prima "contextforge init".');
        process.exit(1);
      }

      if (!fs.existsSync(metaPath)) {
        console.error('Errore: Nessun file meta.json trovato. Esegui prima "contextforge scan".');
        process.exit(1);
      }

      try {
        const meta: Meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const previousHashes = meta.fileHashes ?? {};

        const ignoreEngine = new IgnoreEngine(cwd);
        const files = await walkDirectory(cwd, ignoreEngine);

        console.log(`Trovati ${files.length} file. Rilevamento modifiche...`);

        const changed = await detectChanges(files, cwd, previousHashes);
        const totalChanged = changed.modified.length + changed.added.length + changed.removed.length;

        if (totalChanged === 0) {
          console.log('Nessuna modifica rilevata. La memoria è già aggiornata.');
          return;
        }

        console.log(
          `Rilevate modifiche: ${changed.modified.length} modificati, ${changed.added.length} aggiunti, ${changed.removed.length} rimossi.`
        );

        const summary = await summarizeProject(files, cwd);
        await selectiveUpdate(changed, summary, contextForgeDir);

        const updatedMeta: Meta = {
          version: meta.version,
          lastScan: new Date().toISOString(),
          fileHashes: changed.newHashes,
        };

        fs.writeFileSync(metaPath, JSON.stringify(updatedMeta, null, 2), 'utf8');
        console.log('Aggiornato: .contextforge/local/meta.json');

        console.log('\nAggiornamento completato con successo!');
      } catch (error) {
        console.error("Errore durante l'aggiornamento:", error);
        process.exit(1);
      }
    });
}
