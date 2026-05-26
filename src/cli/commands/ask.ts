import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { retrieveContext } from '../../core/query/retriever.js';
import { getLLMProvider } from '../../providers/factory.js';

export function registerAskCommand(program: Command) {
  program
    .command('ask <question>')
    .description('Ask a question about the project using local context and an optional LLM')
    .option('-p, --provider <name>', 'LLM provider (ollama, deepseek, null)')
    .option('-m, --model <name>', 'LLM model')
    .action(async (question: string, options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Error: ContextForge is not initialized. Run "contextforge init" first.');
        process.exit(1);
      }

      const chunks = await retrieveContext(question, contextForgeDir);
      const provider = getLLMProvider(options.provider, options.model);
      const offline = provider.name === 'null' || !(await provider.isAvailable());

      if (offline) {
        console.log(`\nLocal results for: "${question}"\n`);
        
        // Keep relevant chunks with a score > 0
        const relevantChunks = chunks.filter(c => c.score > 0);
        if (relevantChunks.length === 0) {
          console.log('No relevant context found.');
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

      const systemPrompt = `You are a technical assistant. Answer the user's question using exclusively the project context provided below.\n\nCONTEXT:\n${contextBlock}`;

      try {
        const response = await provider.complete(question, { systemPrompt, maxTokens: 1024 });
        console.log(response);
      } catch (error) {
        console.error('Error during LLM call:', error);
        process.exit(1);
      }
    });
}
