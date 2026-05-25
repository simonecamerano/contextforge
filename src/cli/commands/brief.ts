import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { IgnoreEngine } from '../../core/scanner/ignore-engine.js';
import { walkDirectory } from '../../core/scanner/file-walker.js';
import { summarizeProject } from '../../core/scanner/summarizer.js';
import { generateAIBrief } from '../../core/generators/ai-brief.js';

export function registerBriefCommand(program: Command) {
  program
    .command('brief')
    .description('Genera un file brief riassuntivo (.contextforge/ai-brief.md) ottimizzato per LLM')
    .option('-b, --budget <tokens>', 'Budget di token massimo per il brief', '4000')
    .action(async (options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      
      if (!fs.existsSync(contextForgeDir)) {
        console.error('Errore: ContextForge non è inizializzato. Esegui prima "contextforge init".');
        process.exit(1);
      }

      const budget = parseInt(options.budget, 10);
      if (isNaN(budget) || budget <= 0) {
        console.error('Errore: Il budget deve essere un numero intero positivo.');
        process.exit(1);
      }

      console.log(`Generazione AI Brief con un budget di ${budget} token...`);
      
      try {
        const ignoreEngine = new IgnoreEngine(cwd);
        const files = await walkDirectory(cwd, ignoreEngine);
        const summary = await summarizeProject(files, cwd);

        const briefContent = generateAIBrief(summary, budget);
        const briefPath = path.join(contextForgeDir, 'ai-brief.md');
        
        fs.writeFileSync(briefPath, briefContent, 'utf8');
        
        const estimatedTokens = Math.ceil(briefContent.length / 4);
        console.log(`Aggiornato: .contextforge/ai-brief.md`);
        console.log(`Dimensione stimata del brief: ~${estimatedTokens} token (su ${budget} max).`);
      } catch (error) {
        console.error('Errore durante la generazione del brief:', error);
        process.exit(1);
      }
    });
}
