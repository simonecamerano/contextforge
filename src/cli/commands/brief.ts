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
    .description('Generate a summary brief file (.contextforge/ai-brief.md) optimized for LLM')
    .option('-b, --budget <tokens>', 'Maximum token budget for the brief', '4000')
    .action(async (options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      
      if (!fs.existsSync(contextForgeDir)) {
        console.error('Error: ContextForge is not initialized. Run "contextforge init" first.');
        process.exit(1);
      }

      const budget = parseInt(options.budget, 10);
      if (isNaN(budget) || budget <= 0) {
        console.error('Error: Budget must be a positive integer.');
        process.exit(1);
      }

      console.log(`Generating AI Brief with a budget of ${budget} tokens...`);
      
      try {
        const ignoreEngine = new IgnoreEngine(cwd);
        const files = await walkDirectory(cwd, ignoreEngine);
        const summary = await summarizeProject(files, cwd);

        const briefContent = generateAIBrief(summary, budget);
        const briefPath = path.join(contextForgeDir, 'ai-brief.md');
        
        fs.writeFileSync(briefPath, briefContent, 'utf8');
        
        const estimatedTokens = Math.ceil(briefContent.length / 4);
        console.log(`Updated: .contextforge/ai-brief.md`);
        console.log(`Estimated brief size: ~${estimatedTokens} tokens (out of ${budget} max).`);
      } catch (error) {
        console.error('Error during brief generation:', error);
        process.exit(1);
      }
    });
}
