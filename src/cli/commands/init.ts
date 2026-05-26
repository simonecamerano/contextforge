import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize ContextForge in the current repository')
    .action(() => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const localDir = path.join(contextForgeDir, 'local');
      
      if (fs.existsSync(contextForgeDir)) {
        console.warn('Warning: The .contextforge folder already exists in this repository.');
        return;
      }

      try {
        fs.mkdirSync(contextForgeDir, { recursive: true });
        fs.mkdirSync(localDir, { recursive: true });
        console.log('Created .contextforge/ and .contextforge/local/ directories');

        const markdownFiles = {
          'project-overview.md': '# Project Overview\n\nGeneral overview of the project, description and technologies.',
          'architecture.md': '# Architecture\n\nModule structure and main architectural decisions.',
          'active-context.md': '# Active Context\n\nCurrent work state, active branch and extracted TODOs.',
          'coding-rules.md': '# Coding Rules\n\nGuidelines for writing code and project style conventions.',
          'technical-decisions.md': '# Technical Decisions\n\nHistorical record of architectural decisions (ADR).',
          'open-questions.md': '# Open Questions\n\nOpen questions, tracked bugs and points to clarify.',
          'ai-brief.md': '# AI Brief\n\nSummarized brief optimized for LLM context.'
        };

        for (const [filename, content] of Object.entries(markdownFiles)) {
          const filePath = path.join(contextForgeDir, filename);
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Created memory file: .contextforge/${filename}`);
        }

        const gitignorePath = path.join(cwd, '.gitignore');
        const ignoreLine = '.contextforge/local/';

        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf8');
          if (!content.includes(ignoreLine)) {
            const separator = content.endsWith('\n') ? '' : '\n';
            fs.writeFileSync(gitignorePath, `${content}${separator}${ignoreLine}\n`, 'utf8');
            console.log('Updated .gitignore with ContextForge local directory.');
          }
        } else {
          fs.writeFileSync(gitignorePath, `${ignoreLine}\n`, 'utf8');
          console.log('Created .gitignore with ContextForge local directory.');
        }

        console.log('\nInitialization complete! ContextForge is ready.');
      } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
      }
    });
}
