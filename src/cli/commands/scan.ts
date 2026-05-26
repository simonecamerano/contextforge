import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Command } from 'commander';
import { IgnoreEngine } from '../../core/scanner/ignore-engine.js';
import { walkDirectory } from '../../core/scanner/file-walker.js';
import { summarizeProject } from '../../core/scanner/summarizer.js';
import { generateProjectOverview } from '../../core/generators/project-overview.js';
import { generateArchitecture } from '../../core/generators/architecture.js';
import { generateActiveContext } from '../../core/generators/active-context.js';

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Analizza il codebase e genera la memoria del progetto')
    .action(async () => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const localDir = path.join(contextForgeDir, 'local');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Errore: ContextForge non è inizializzato in questa directory. Esegui prima "contextforge init".');
        process.exit(1);
      }

      console.log('Avvio scansione del repository...');
      try {
        const ignoreEngine = new IgnoreEngine(cwd);
        const files = await walkDirectory(cwd, ignoreEngine);
        
        console.log(`Trovati ${files.length} file da analizzare.`);
        const summary = await summarizeProject(files, cwd);

        // Generate overview
        const overviewContent = generateProjectOverview(summary);
        fs.writeFileSync(path.join(contextForgeDir, 'project-overview.md'), overviewContent, 'utf8');
        console.log('Aggiornato: .contextforge/project-overview.md');

        // Generate architecture
        const architectureContent = generateArchitecture(summary);
        fs.writeFileSync(path.join(contextForgeDir, 'architecture.md'), architectureContent, 'utf8');
        console.log('Aggiornato: .contextforge/architecture.md');

        // Generate active context
        const activeContextContent = generateActiveContext(summary);
        fs.writeFileSync(path.join(contextForgeDir, 'active-context.md'), activeContextContent, 'utf8');
        console.log('Aggiornato: .contextforge/active-context.md');

        // Compute and save hashes for meta.json
        const fileHashes: Record<string, string> = {};
        for (const file of files) {
          const absolutePath = path.join(cwd, file);
          if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
            const content = fs.readFileSync(absolutePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            fileHashes[file] = hash;
          }
        }

        const meta = {
          version: '0.1.0',
          lastScan: new Date().toISOString(),
          fileHashes
        };

        fs.writeFileSync(
          path.join(localDir, 'meta.json'),
          JSON.stringify(meta, null, 2),
          'utf8'
        );
        console.log('Aggiornato: .contextforge/local/meta.json');
        
        console.log('\nScansione completata con successo!');
      } catch (error) {
        console.error('Errore durante la scansione:', error);
        process.exit(1);
      }
    });
}
