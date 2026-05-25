import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { retrieveContext } from '../../core/query/retriever.js';
import { getLLMProvider } from '../../providers/factory.js';

export function registerAskCommand(program: Command) {
  program
    .command('ask <question>')
    .description('Pone una domanda al progetto usando il contesto locale e un LLM opzionale')
    .option('-p, --provider <name>', 'Provider LLM (ollama, deepseek, null)')
    .option('-m, --model <name>', 'Modello LLM')
    .action(async (question: string, options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Errore: ContextForge non è inizializzato. Esegui prima "contextforge init".');
        process.exit(1);
      }

      const chunks = await retrieveContext(question, contextForgeDir);
      const provider = getLLMProvider(options.provider, options.model);
      const offline = provider.name === 'null' || !(await provider.isAvailable());

      if (offline) {
        console.log(`\nRisultati locali per: "${question}"\n`);
        
        // Filtra chunk rilevanti con punteggio > 0
        const relevantChunks = chunks.filter(c => c.score > 0);
        if (relevantChunks.length === 0) {
          console.log('Nessun contesto rilevante trovato.');
          return;
        }
        
        for (const chunk of relevantChunks) {
          console.log(`--- [${chunk.file}] ${chunk.section} (score: ${chunk.score.toFixed(2)}) ---`);
          console.log(chunk.content);
          console.log();
        }
        return;
      }

      const contextBlock = chunks
        .map(c => `### [${c.file}] ${c.section}\n${c.content}`)
        .join('\n\n');

      const systemPrompt = `Sei un assistente tecnico. Rispondi alla domanda dell'utente usando esclusivamente il contesto del progetto fornito di seguito.\n\nCONTESTO:\n${contextBlock}`;

      try {
        const response = await provider.complete(question, { systemPrompt, maxTokens: 1024 });
        console.log(response);
      } catch (error) {
        console.error('Errore durante la chiamata LLM:', error);
        process.exit(1);
      }
    });
}
